// ── Helpers ────────────────────────────────────────────────────
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function rowToObj(row) {
  if (!row) return null;
  return {
    ...row,
    telefones: JSON.parse(row.telefones || '[]'),
    fotos:     JSON.parse(row.fotos     || '[]'),
  };
}

function uuid() {
  return crypto.randomUUID().replace(/-/g, '');
}

const ALLOWED_TYPES = ['image/jpeg','image/png','image/webp','image/gif'];
const EXT_MAP = { 'image/jpeg':'jpg', 'image/png':'png', 'image/webp':'webp', 'image/gif':'gif' };
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB max per image

// Convert ArrayBuffer to base64
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// ── Router ─────────────────────────────────────────────────────
export default {
  async fetch(request, env) {
    const url  = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // ── Serve images from D1 ───────────────────────────────────
    if (path.startsWith('/uploads/')) {
      const filename = path.replace('/uploads/', '');
      if (method === 'GET') {
        const foto = await env.DB.prepare('SELECT content_type, data FROM fotos WHERE filename=?')
          .bind(filename).first();
        if (!foto) return new Response('Not found', { status: 404 });
        // Decode base64 back to binary
        const binary = atob(foto.data);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        return new Response(bytes.buffer, {
          headers: {
            'Content-Type': foto.content_type,
            'Cache-Control': 'public, max-age=31536000',
          },
        });
      }
      return new Response('Method not allowed', { status: 405 });
    }

    // ── API routes ──────────────────────────────────────────────
    if (path.startsWith('/api/')) {

      // GET /api/dashboard
      if (path === '/api/dashboard' && method === 'GET') {
        const [tot, prosp, nao, tipos] = await Promise.all([
          env.DB.prepare('SELECT COUNT(*) as n FROM imoveis_prospectados').first(),
          env.DB.prepare("SELECT COUNT(*) as n FROM imoveis_prospectados WHERE status='prospectado'").first(),
          env.DB.prepare("SELECT COUNT(*) as n FROM imoveis_prospectados WHERE status='nao_prospectado'").first(),
          env.DB.prepare('SELECT tipo, COUNT(*) as cnt FROM imoveis_prospectados GROUP BY tipo').all(),
        ]);
        const por_tipo = {};
        (tipos.results || []).forEach(r => { por_tipo[r.tipo] = r.cnt; });
        return json({ total: tot.n, prospectado: prosp.n, nao_prospectado: nao.n, por_tipo });
      }

      // GET /api/imoveis
      if (path === '/api/imoveis' && method === 'GET') {
        let sql = 'SELECT * FROM imoveis_prospectados WHERE 1=1';
        const params = [];
        const status = url.searchParams.get('status');
        const tipo   = url.searchParams.get('tipo');
        if (status) { sql += ' AND status=?'; params.push(status); }
        if (tipo)   { sql += ' AND tipo=?';   params.push(tipo); }
        sql += ' ORDER BY created_at DESC';
        const { results } = await env.DB.prepare(sql).bind(...params).all();
        return json(results.map(rowToObj));
      }

      // POST /api/imoveis
      if (path === '/api/imoveis' && method === 'POST') {
        const data = await request.json();
        const stmt = env.DB.prepare(`
          INSERT INTO imoveis_prospectados
            (lat, lng, endereco, tipo, status, proprietario, telefones, observacoes)
          VALUES (?,?,?,?,?,?,?,?)
        `).bind(
          data.lat || 0, data.lng || 0,
          data.endereco || '',
          data.tipo || 'casa',
          data.status || 'nao_prospectado',
          data.proprietario || '',
          JSON.stringify(data.telefones || []),
          data.observacoes || '',
        );
        const result = await stmt.run();
        const row = await env.DB.prepare('SELECT * FROM imoveis_prospectados WHERE id=?')
          .bind(result.meta.last_row_id).first();
        return json(rowToObj(row), 201);
      }

      // /api/imoveis/:id
      const matchId = path.match(/^\/api\/imoveis\/(\d+)$/);
      if (matchId) {
        const id = parseInt(matchId[1]);

        // GET
        if (method === 'GET') {
          const row = await env.DB.prepare('SELECT * FROM imoveis_prospectados WHERE id=?').bind(id).first();
          if (!row) return json({ error: 'Not found' }, 404);
          return json(rowToObj(row));
        }

        // PUT
        if (method === 'PUT') {
          const data = await request.json();
          const cur  = await env.DB.prepare('SELECT * FROM imoveis_prospectados WHERE id=?').bind(id).first();
          if (!cur) return json({ error: 'Not found' }, 404);
          await env.DB.prepare(`
            UPDATE imoveis_prospectados SET
              endereco=?, tipo=?, status=?, proprietario=?,
              telefones=?, observacoes=?,
              updated_at=datetime('now','localtime')
            WHERE id=?
          `).bind(
            data.endereco    ?? cur.endereco,
            data.tipo        ?? cur.tipo,
            data.status      ?? cur.status,
            data.proprietario?? cur.proprietario,
            JSON.stringify(data.telefones ?? JSON.parse(cur.telefones || '[]')),
            data.observacoes ?? cur.observacoes,
            id,
          ).run();
          const updated = await env.DB.prepare('SELECT * FROM imoveis_prospectados WHERE id=?').bind(id).first();
          return json(rowToObj(updated));
        }

        // DELETE
        if (method === 'DELETE') {
          // Delete photos from D1
          await env.DB.prepare('DELETE FROM fotos WHERE imovel_id=?').bind(id).run();
          await env.DB.prepare('DELETE FROM imoveis_prospectados WHERE id=?').bind(id).run();
          return json({ ok: true });
        }
      }

      // POST /api/imoveis/:id/fotos
      const matchFoto = path.match(/^\/api\/imoveis\/(\d+)\/fotos$/);
      if (matchFoto && method === 'POST') {
        const id  = parseInt(matchFoto[1]);
        const row = await env.DB.prepare('SELECT * FROM imoveis_prospectados WHERE id=?').bind(id).first();
        if (!row) return json({ error: 'Not found' }, 404);

        const formData = await request.formData();
        const file = formData.get('foto');
        if (!file || !ALLOWED_TYPES.includes(file.type))
          return json({ error: 'Tipo de arquivo não permitido' }, 400);

        const buffer = await file.arrayBuffer();
        if (buffer.byteLength > MAX_FILE_SIZE)
          return json({ error: 'Imagem muito grande (máx 2MB)' }, 400);

        const ext      = EXT_MAP[file.type] || 'jpg';
        const filename = `${uuid()}.${ext}`;
        const base64   = arrayBufferToBase64(buffer);

        // Save to D1 fotos table
        await env.DB.prepare(
          'INSERT INTO fotos (imovel_id, filename, content_type, data) VALUES (?,?,?,?)'
        ).bind(id, filename, file.type, base64).run();

        // Update fotos list in imoveis_prospectados
        const fotos = JSON.parse(row.fotos || '[]');
        fotos.push(`/uploads/${filename}`);
        await env.DB.prepare(
          "UPDATE imoveis_prospectados SET fotos=?, updated_at=datetime('now','localtime') WHERE id=?"
        ).bind(JSON.stringify(fotos), id).run();
        const updated = await env.DB.prepare('SELECT * FROM imoveis_prospectados WHERE id=?').bind(id).first();
        return json(rowToObj(updated), 201);
      }

      // DELETE /api/imoveis/:id/fotos/:idx
      const matchFotoIdx = path.match(/^\/api\/imoveis\/(\d+)\/fotos\/(\d+)$/);
      if (matchFotoIdx && method === 'DELETE') {
        const id  = parseInt(matchFotoIdx[1]);
        const idx = parseInt(matchFotoIdx[2]);
        const row = await env.DB.prepare('SELECT * FROM imoveis_prospectados WHERE id=?').bind(id).first();
        if (!row) return json({ error: 'Not found' }, 404);
        const fotos = JSON.parse(row.fotos || '[]');
        if (idx < 0 || idx >= fotos.length) return json({ error: 'Índice inválido' }, 400);
        // Delete from D1
        const filename = fotos[idx].replace('/uploads/', '');
        await env.DB.prepare('DELETE FROM fotos WHERE filename=?').bind(filename).run();
        fotos.splice(idx, 1);
        await env.DB.prepare(
          "UPDATE imoveis_prospectados SET fotos=?, updated_at=datetime('now','localtime') WHERE id=?"
        ).bind(JSON.stringify(fotos), id).run();
        const updated = await env.DB.prepare('SELECT * FROM imoveis_prospectados WHERE id=?').bind(id).first();
        return json(rowToObj(updated));
      }

      return json({ error: 'Not found' }, 404);
    }

    // ── Static assets (index.html via Workers Assets) ───────────
    return env.ASSETS.fetch(request);
  },
};
