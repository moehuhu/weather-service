
export default {
  async fetch(request, env) {
    console.log(env)
    const position = request.url.split('/').pop()
    const stmt = env.DB.prepare("SELECT * FROM position_weather");
    const { results } = await stmt.all();
    const weatherURL = `https://api.caiyunapp.com/v2.6/${env?.WEATHER_TOKEN}/${position}/daily?dailysteps=7`
    const weatherResponse = await fetch(weatherURL)
    const weatherData = await weatherResponse.text()
    return new Response(JSON.stringify({ weatherData }));
  },
} satisfies ExportedHandler<Env>;
