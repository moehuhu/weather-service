import { SignJWT, importPKCS8 } from "jose";
export default {
  async scheduled() { },
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
      return weatherData
    }
    const position = request.url.split('/').pop()
    const weatherData = await fetchWeather(position)
    await env.DB.prepare("INSERT INTO position_weather (position, weather, date) VALUES (?, ?, ?)")
      .bind(position, weatherData, new Date().toISOString())
      .run()
    return new Response(weatherData);
  },
} satisfies ExportedHandler<Env>;
