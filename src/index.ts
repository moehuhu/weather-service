
export default {
  async fetch(request, env) {
    console.log(env)
    const position = request.url.split('/').pop()
    const stmt = env.DB.prepare("SELECT * FROM position_weather");
    const { results } = await stmt.all();
    const weatherURL = `https://api.caiyunapp.com/v2.6/${env?.WEATHER_TOKEN}`
    const weatherResponse = await fetch(weatherURL)
    const weatherData = await weatherResponse.json()
    console.log(weatherData)
    return new Response(JSON.stringify({ position, weatherData }));
  },
} satisfies ExportedHandler<Env>;
