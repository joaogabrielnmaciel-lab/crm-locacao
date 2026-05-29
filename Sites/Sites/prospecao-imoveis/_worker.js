// ── Prospecção de Imóveis — Cloudflare Worker + D1 + R2 ──

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}

function parseRow(row) {
  if (!row) return null;
  return {
    ...row,
    telefones: JSON.parse(row.telefones || '[]'),
    fotos: JSON.parse(row.fotos || '[]'),
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      });
    }

    // ── API Routes ──────────────────────────────────────────

    // GET /api/imoveis
    if (path === '/api/imoveis' && method === 'GET') {
      const status = url.searchParams.get('status') || '';
      const tipo = url.searchParams.get('tipo') || '';
      let sql = 'SELECT * FROM imoveis_prospectados WHERE 1=1';
      const params = [];
      if (status) { sql += ' AND status=?'; params.push(status); }
      if (tipo) { sql += ' AND tipo=?'; params.push(tipo); }
      sql += ' ORDER BY created_at DESC';
      const { results } = await env.DB.prepare(sql).bind(...params).all();
      return json(results.map(parseRow));
    }

    // POST /api/imoveis
    if (path === '/api/imoveis' && method === 'POST') {
      const data = await request.json();
      const telefones = JSON.stringify(data.telefones || []);
      const { meta } = await env.DB.prepare(`
        INSERT INTO imoveis_prospectados (lat, lng, endereco, tipo, status, proprietario, telefones, observacoes)
        VALUES (?,?,?,?,?,?,?,?)
      `).bind(
        data.lat || 0, data.lng || 0, data.endereco || '',
        data.tipo || 'casa', data.status || 'nao_prospectado',
        data.proprietario || '', telefones, data.observacoes || ''
      ).run();
      const row = await env.DB.prepare('SELECT * FROM imoveis_prospectados WHERE id=?').bind(meta.last_row_id).first();
      return json(parseRow(row), 201);
    }

    // GET /api/imoveis/:id
    const getMatch = path.match(/^\/api\/imoveis\/(\d+)$/);
    if (getMatch && method === 'GET') {
      const row = await env.DB.prepare('SELECT * FROM imoveis_prospectados WHERE id=?').bind(Number(getMatch[1])).first();
      if (!row) return json({ error: 'Not found' }, 404);
      return json(parseRow(row));
    }

    // PUT /api/imoveis/:id
    if (getMatch && method === 'PUT') {
      const id = Number(getMatch[1]);
      const data = await request.json();
      const existing = await env.DB.prepare('SELECT * FROM imoveis_prospectados WHERE id=?').bind(id).first();
      if (!existing) return json({ error: 'Not found' }, 404);
      const cur = parseRow(existing);
      const telefones = JSON.stringify(data.telefones !== undefined ? data.telefones : cur.telefones);
      await env.DB.prepare(`
        UPDATE imoveis_prospectados SET
          endereco=?, tipo=?, status=?, proprietario=?,
          telefones=?, observacoes=?, updated_at=datetime('now','localtime')
        WHERE id=?
      `).bind(
        data.endereco !== undefined ? data.endereco : cur.endereco,
        data.tipo !== undefined ? data.tipo : cur.tipo,
        data.status !== undefined ? data.status : cur.status,
        data.proprietario !== undefined ? data.proprietario : cur.proprietario,
        telefones,
        data.observacoes !== undefined ? data.observacoes : cur.observacoes,
        id
      ).run();
      const updated = await env.DB.prepare('SELECT * FROM imoveis_prospectados WHERE id=?').bind(id).first();
      return json(parseRow(updated));
    }

    // DELETE /api/imoveis/:id
    if (getMatch && method === 'DELETE') {
      const id = Number(getMatch[1]);
      const row = await env.DB.prepare('SELECT fotos FROM imoveis_prospectados WHERE id=?').bind(id).first();
      if (row && env.FOTOS) {
        const fotos = JSON.parse(row.fotos || '[]');
        for (const f of fotos) {
          const key = f.replace('/uploads/', '');
          try { await env.FOTOS.delete(key); } catch(e) {}
        }
      }
      await env.DB.prepare('DELETE FROM imoveis_prospectados WHERE id=?').bind(id).run();
      return json({ ok: true });
    }

    // POST /api/imoveis/:id/fotos
    const fotoMatch = path.match(/^\/api\/imoveis\/(\d+)\/fotos$/);
    if (fotoMatch && method === 'POST') {
      const id = Number(fotoMatch[1]);
      const row = await env.DB.prepare('SELECT * FROM imoveis_prospectados WHERE id=?').bind(id).first();
      if (!row) return json({ error: 'Not found' }, 404);

      // Se R2 não está configurado, retorna erro amigável
      if (!env.FOTOS) return json({ error: 'Upload de fotos indisponível. R2 não configurado.' }, 503);

      const formData = await request.formData();
      const file = formData.get('foto');
      if (!file) return json({ error: 'Nenhum arquivo enviado' }, 400);

      const ext = file.name.split('.').pop().toLowerCase();
      const allowed = ['png', 'jpg', 'jpeg', 'webp', 'gif'];
      if (!allowed.includes(ext)) return json({ error: 'Tipo não permitido' }, 400);

      const filename = `${crypto.randomUUID()}.${ext}`;
      await env.FOTOS.put(filename, file.stream(), {
        httpMetadata: { contentType: file.type }
      });

      const fotos = JSON.parse(row.fotos || '[]');
      fotos.push(`/uploads/${filename}`);
      await env.DB.prepare("UPDATE imoveis_prospectados SET fotos=?, updated_at=datetime('now','localtime') WHERE id=?")
        .bind(JSON.stringify(fotos), id).run();
      const updated = await env.DB.prepare('SELECT * FROM imoveis_prospectados WHERE id=?').bind(id).first();
      return json(parseRow(updated), 201);
    }

    // DELETE /api/imoveis/:id/fotos/:idx
    const fotoDelMatch = path.match(/^\/api\/imoveis\/(\d+)\/fotos\/(\d+)$/);
    if (fotoDelMatch && method === 'DELETE') {
      const id = Number(fotoDelMatch[1]);
      const idx = Number(fotoDelMatch[2]);
      const row = await env.DB.prepare('SELECT * FROM imoveis_prospectados WHERE id=?').bind(id).first();
      if (!row) return json({ error: 'Not found' }, 404);
      const fotos = JSON.parse(row.fotos || '[]');
      if (idx < 0 || idx >= fotos.length) return json({ error: 'Índice inválido' }, 400);
      const key = fotos[idx].replace('/uploads/', '');
      if (env.FOTOS) { try { await env.FOTOS.delete(key); } catch(e) {} }
      fotos.splice(idx, 1);
      await env.DB.prepare("UPDATE imoveis_prospectados SET fotos=?, updated_at=datetime('now','localtime') WHERE id=?")
        .bind(JSON.stringify(fotos), id).run();
      const updated = await env.DB.prepare('SELECT * FROM imoveis_prospectados WHERE id=?').bind(id).first();
      return json(parseRow(updated));
    }

    // GET /api/dashboard
    if (path === '/api/dashboard' && method === 'GET') {
      const total = await env.DB.prepare('SELECT COUNT(*) as c FROM imoveis_prospectados').first();
      const prosp = await env.DB.prepare("SELECT COUNT(*) as c FROM imoveis_prospectados WHERE status='prospectado'").first();
      const nao = await env.DB.prepare("SELECT COUNT(*) as c FROM imoveis_prospectados WHERE status='nao_prospectado'").first();
      const tipos = await env.DB.prepare('SELECT tipo, COUNT(*) as cnt FROM imoveis_prospectados GROUP BY tipo').all();
      const por_tipo = {};
      (tipos.results || []).forEach(r => { por_tipo[r.tipo] = r.cnt; });
      return json({
        total: total?.c || 0,
        prospectado: prosp?.c || 0,
        nao_prospectado: nao?.c || 0,
        por_tipo
      });
    }

    // GET /uploads/:filename — serve from R2
    const uploadMatch = path.match(/^\/uploads\/(.+)$/);
    if (uploadMatch && method === 'GET') {
      if (!env.FOTOS) return new Response('R2 não configurado', { status: 503 });
      const obj = await env.FOTOS.get(uploadMatch[1]);
      if (!obj) return new Response('Not found', { status: 404 });
      const headers = new Headers();
      obj.writeHttpMetadata(headers);
      headers.set('Cache-Control', 'public, max-age=31536000');
      return new Response(obj.body, { headers });
    }

    // Let assets binding handle static files (index.html etc)
    return env.ASSETS.fetch(request);
  }
};
