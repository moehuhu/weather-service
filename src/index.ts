
export default {
  async fetch(request, env) {
    console.log(env)
    const position = request.url.split('/').pop()
    const stmt = env.DB.prepare("SELECT * FROM position_weather");
    const { results } = await stmt.all();
    const weatherURL = `https://api.caiyunapp.com/v2.6/${env?.WEATHER_TOKEN}/${position}`
    const weatherResponse = await fetch(weatherURL)
    console.log(weatherResponse)
    const weatherData = await weatherResponse.text()
    console.log(weatherData)
    return new Response(JSON.stringify({ weatherURL, weatherData }));
  },
} satisfies ExportedHandler<Env>;
