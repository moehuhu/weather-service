
export default {
  async fetch(request, env) {
    const stmt = env.DB.prepare("SELECT * FROM comments LIMIT 3");
    const { results } = await stmt.all();

    return new Response(JSON.stringify(results));
  },
} satisfies ExportedHandler<Env>;
