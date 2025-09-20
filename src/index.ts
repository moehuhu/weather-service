import { SignJWT, importPKCS8 } from "jose";
import { to } from "await-to-js";
import { drizzle } from 'drizzle-orm/d1';
import { eq, and } from "drizzle-orm";
import { weatherTable } from "./db/schema";
export interface Env {
  PRIVATE_KEY: string;
  KEY_ID: string;
  PROJECT_ID: string;
  API_HOST: string;
  DB: D1Database;
}
export default {
  async scheduled(controller, env, ctx) { },
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

    const requestParams = request.url.split('?')?.[1]
    const params: Record<string, string> = {}
    requestParams?.split('&').map(item => item.split('=')).forEach(item => params[item[0]] = item[1])
    const { longitude, latitude } = params
    if (longitude === undefined || latitude === undefined) {
      return new Response(JSON.stringify({ error: { message: 'Invalid request' } }), { status: 400, headers: { 'Content-Type': 'application/json' } })
    }

    const db = drizzle(env.DB)
    const weather = await db
      .select()
      .from(weatherTable)
      .where(and(eq(weatherTable.longitude, Number(longitude)), eq(weatherTable.latitude, Number(latitude))))
      .limit(1)
    if (weather.length > 0) {
      return new Response(weather[0].weather, { headers: { 'Content-Type': 'application/json' } })
    }

    const position = `${longitude},${latitude}`
    const [error, weatherData] = await to(fetchWeather(position))
    if (error) {
      return new Response(JSON.stringify({ error: { message: error.message } }), { status: 500, headers: { 'Content-Type': 'application/json' } })
    }
    await db.insert(weatherTable).values({
      longitude: Number(longitude),
      latitude: Number(latitude),
      weather: weatherData,
      updated_at: Date.now(),
      success: weatherData.code == 200 ? 1 : 0
    })
    return new Response(weatherData, { headers: { 'Content-Type': 'application/json' } });
  },
} satisfies ExportedHandler<Env>;
