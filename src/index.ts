export default {
  async fetch(request, env) {
    if (!request.url.startsWith('/api/')) { return new Response('{}') }
    const position = request.url.split('/').pop()
    const stmt = env.DB.prepare("SELECT * FROM position_weather WHERE position = ?");
    const { results } = await stmt.bind(position).all();
    const weatherURL = `https://api.caiyunapp.com/v2.6/${env?.WEATHER_TOKEN}/${position}/daily?dailysteps=7`

    if (results.length !== 0) {
      const oldWeather = results[0].weather
      const oldDate = new Date(results[0].date)
      if (Date.now() - oldDate.getTime() > 2 * 60 * 60 * 1000) {
        const weatherResponse = await fetch(weatherURL)
        const weatherData = await weatherResponse.text()
        await env.DB.prepare("UPDATE position_weather SET weather = ?, date = ? WHERE position = ?")
          .bind(weatherData, new Date().toISOString(), position)
          .run()
        return new Response(weatherData);
      }
      return new Response(oldWeather);
    }
    const weatherResponse = await fetch(weatherURL)
    const weatherData = await weatherResponse.text()
    await env.DB.prepare("INSERT INTO position_weather (position, weather, date) VALUES (?, ?, ?)")
      .bind(position, weatherData, new Date().toISOString())
      .run()
    return new Response(weatherData);
  },
} satisfies ExportedHandler<Env>;
