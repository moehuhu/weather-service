import { SignJWT, importPKCS8 } from "jose";
import { to } from "await-to-js";
export default {
  async scheduled(controller, env, ctx) {
    const stmt = env.DB.prepare("DELETE FROM position_weather WHERE updated_at < ?")
    await stmt.bind(Date.now() - 24 * 60 * 60 * 1000).run()
  },
  async fetch(request, env) {
    const fetchWeather = async (position: string) => {
      const privateKey = await importPKCS8(env.PRIVATE_KEY, 'EdDSA')
      const customHeader = {
        alg: 'EdDSA',
        kid: env.KEY_ID
      }
      const iat = Math.floor(Date.now() / 1000) - 30;
      const exp = iat + 900;
      const customPayload = {
        sub: env.PROJECT_ID,
        iat: iat,
        exp: exp
      }
      const authentication = await new SignJWT(customPayload)
        .setProtectedHeader(customHeader)
        .sign(privateKey)
      const weatherURL = `https://${env.API_HOST}/v7/weather/7d?location=${position}`
      const weatherResponse = await fetch(weatherURL, {
        headers: {
          'Authorization': `Bearer ${authentication}`
        }
      })
      const weatherData = await weatherResponse.text()
      return JSON.parse(weatherData)
    }
    const requestParams = request.url.split('?')?.[1]
    const params: Record<string, string> = {}
    requestParams?.split('&').map(item => item.split('=')).forEach(item => params[item[0]] = item[1])
    const { longitude, latitude } = params
    if (!longitude || !latitude) {
      return new Response('Invalid request', { status: 400 })
    }
    const position = `${longitude},${latitude}`
    const stmt = env.DB.prepare("SELECT * FROM position_weather WHERE longitude = ? AND latitude = ?")
    const { results } = await stmt.bind(longitude, latitude).all()
    if (results.length > 0) {
      const oldWeather = results[0].weather
      const oldDate = results[0].updated_at as number
      if (Date.now() - oldDate > 2 * 60 * 60 * 1000 || !results[0].success) {
        const [error, weatherData] = await to(fetchWeather(position))
        if (error) {
          return new Response(error.message, { status: 500 })
        }
        const success = weatherData.code == 200 ? 1 : 0
        await env.DB.prepare("UPDATE position_weather SET weather = ?, updated_at = ?, success = ? WHERE longitude = ? AND latitude = ?")
          .bind(JSON.stringify(weatherData), Date.now(), success, longitude, latitude)
          .run()
        return new Response(JSON.stringify(weatherData));
      }
      return new Response(oldWeather);
    }
    const [error, weatherData] = await to(fetchWeather(position))
    if (error) {
      return new Response(error.message, { status: 500 })
    }
    const success = weatherData.code == 200 ? 1 : 0
    await env.DB.prepare("INSERT INTO position_weather (longitude, latitude, weather, updated_at, success) VALUES (?, ?, ?, ?, ?)")
      .bind(longitude, latitude, JSON.stringify(weatherData), Date.now(), success)
      .run()
    return new Response(JSON.stringify(weatherData));
  },
} satisfies ExportedHandler<Env>;
