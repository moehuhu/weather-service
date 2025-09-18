
export default {
  async fetch(request, env) {
    console.log(env)
    const position = request.url
    console.log(position)
    const stmt = env.DB.prepare("SELECT * FROM position_weather");
    const { results } = await stmt.all();

    return new Response(JSON.stringify(results));
  },
} satisfies ExportedHandler<Env>;
