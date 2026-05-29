export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/robots.txt') {
      return new Response(
        'User-agent: *\nAllow: /\n\nSitemap: https://floresdesalemtijucas.com.br/sitemap.xml\n',
        { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=86400' } }
      );
    }
    return env.ASSETS.fetch(request);
  }
};
