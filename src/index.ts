
export default {
  async fetch(request, env) {
    console.log(env)
    const position = request.url.split('/').pop()
    const stmt = env.DB.prepare("SELECT * FROM position_weather WHERE position = ?");
    const { results } = await stmt.bind(position).all();
    if (results.length === 0) {
      const weatherURL = `https://api.caiyunapp.com/v2.6/${env?.WEATHER_TOKEN}/${position}/daily?dailysteps=7`
      const weatherResponse = await fetch(weatherURL)
      const weatherData = await weatherResponse.text()
      env.DB.prepare("INSERT INTO position_weather (position, weather, date) VALUES (?, ?, ?)")
        .bind(position, JSON.stringify(weatherData), new Date().toISOString())
        .run()
      return new Response(JSON.stringify(weatherData));
    }

    return new Response(JSON.stringify(results[0]));
  },
} satisfies ExportedHandler<Env>;
