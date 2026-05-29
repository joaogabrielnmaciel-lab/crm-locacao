export default {
  async fetch(request, env) {

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      const body = await request.json();

      const clientIp  = request.headers.get('CF-Connecting-IP') || '';
      const userAgent = request.headers.get('User-Agent') || '';

      const events = (body.events || []).map(ev => ({
        ...ev,
        event_time: ev.event_time || Math.floor(Date.now() / 1000),
        action_source: ev.action_source || 'website',
        user_data: {
          ...ev.user_data,
          client_ip_address: clientIp,
          client_user_agent: userAgent,
        }
      }));

      const payload = { data: events };
      if (env.TEST_EVENT_CODE) payload.test_event_code = env.TEST_EVENT_CODE;

      const metaRes = await fetch(
        `https://graph.facebook.com/v19.0/${env.META_PIXEL_ID}/events?access_token=${env.META_ACCESS_TOKEN}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      const result = await metaRes.json();

      return new Response(JSON.stringify(result), {
        status: metaRes.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      });

    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      });
    }
  }
};
