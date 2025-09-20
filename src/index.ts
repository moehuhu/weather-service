import { SignJWT, importPKCS8 } from "jose";
import { to } from "await-to-js";
import { drizzle } from 'drizzle-orm/d1';
import { eq, and, not } from "drizzle-orm";
import { weatherTable } from "./db/schema";
export interface Env {
  PRIVATE_KEY: string;
  KEY_ID: string;
  PROJECT_ID: string;
  API_HOST: string;
  DB: D1Database;
}
export default {
  async scheduled(controller, env, ctx) {
    const db = drizzle(env.DB)
    //删除表中所有数据以切换到新一天
    await db.delete(weatherTable).where(not(eq(weatherTable.updated_at, Date.now())))
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
      return weatherData
    }

    const db = drizzle(env.DB)
    const getOldWeatherRecord = async (longitude: number, latitude: number) => {
      const weather = await db
        .select()
        .from(weatherTable)
        .where(and(eq(weatherTable.longitude, longitude), eq(weatherTable.latitude, latitude)))
        .limit(1)
      return weather[0]
    }
    const addNewWeather = async (longitude: number, latitude: number, weatherData: string) => {
      await db.insert(weatherTable).values({
        longitude: longitude,
        latitude: latitude,
        weather: weatherData,
        updated_at: Date.now(),
      })
    }
    const updateWeather = async (longitude: number, latitude: number, weatherData: string) => {
      await db.update(weatherTable).set({
        weather: weatherData,
        updated_at: Date.now(),
      }).where(and(eq(weatherTable.longitude, longitude), eq(weatherTable.latitude, latitude)))
    }

    const requestParams = request.url.split('?')?.[1]
    const params: Record<string, string> = {}
    requestParams?.split('&').map(item => item.split('=')).forEach(item => params[item[0]] = item[1])
    const { longitude, latitude } = params
    if (longitude === undefined || latitude === undefined) {
      return new Response(JSON.stringify({ error: { message: 'Invalid request' } }), { status: 400, headers: { 'Content-Type': 'application/json' } })
    }
    const position = `${longitude},${latitude}`

    const weatherRecord = await getOldWeatherRecord(Number(longitude), Number(latitude))
    if (weatherRecord) {
      const isExpired = weatherRecord.updated_at + 30 * 60 * 1000 < Date.now() || new Date(weatherRecord.updated_at).getDate() !== new Date().getDate()
      if (isExpired) {
        const [error, newWeatherData] = await to(fetchWeather(position))
        if (error) {
          return new Response(JSON.stringify({ error: { message: error.message } }), { status: 500, headers: { 'Content-Type': 'application/json' } })
        }
        await updateWeather(Number(longitude), Number(latitude), newWeatherData)
        return new Response(newWeatherData, { headers: { 'Content-Type': 'application/json' } })
      }
      return new Response(weatherRecord.weather, { headers: { 'Content-Type': 'application/json' } })
    }

    const [error, weatherData] = await to(fetchWeather(position))
    if (error) {
      return new Response(JSON.stringify({ error: { message: error.message } }), { status: 500, headers: { 'Content-Type': 'application/json' } })
    }
    await addNewWeather(Number(longitude), Number(latitude), weatherData)
    return new Response(weatherData, { headers: { 'Content-Type': 'application/json' } });
  },
} satisfies ExportedHandler<Env>;
