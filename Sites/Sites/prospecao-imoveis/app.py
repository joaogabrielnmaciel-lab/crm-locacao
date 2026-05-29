from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import sqlite3
import json
import os
import uuid
from datetime import datetime
from werkzeug.utils import secure_filename

app = Flask(__name__, static_folder='static')
CORS(app)

DB_PATH = os.path.join(os.path.dirname(__file__), 'prospecao.db')
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), 'static', 'uploads')
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp', 'gif'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    db = get_db()
    db.executescript('''
        CREATE TABLE IF NOT EXISTS imoveis_prospectados (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            lat          REAL NOT NULL,
            lng          REAL NOT NULL,
            endereco     TEXT DEFAULT '',
            tipo         TEXT DEFAULT 'casa',
            status       TEXT DEFAULT 'nao_prospectado',
            proprietario TEXT DEFAULT '',
            telefones    TEXT DEFAULT '[]',
            observacoes  TEXT DEFAULT '',
            fotos        TEXT DEFAULT '[]',
            created_at   TEXT DEFAULT (datetime('now','localtime')),
            updated_at   TEXT DEFAULT (datetime('now','localtime'))
        );
    ''')
    db.commit()
    db.close()

def row_to_dict(row):
    d = dict(row)
    d['telefones'] = json.loads(d.get('telefones') or '[]')
    d['fotos'] = json.loads(d.get('fotos') or '[]')
    return d

# ── Static ────────────────────────────────────────────────────
@app.route('/')
def index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/uploads/<path:filename>')
def uploads(filename):
    return send_from_directory(UPLOAD_DIR, filename)

# ── IMOVEIS ───────────────────────────────────────────────────
@app.route('/api/imoveis', methods=['GET'])
def list_imoveis():
    db = get_db()
    status = request.args.get('status', '')
    tipo   = request.args.get('tipo', '')
    sql    = 'SELECT * FROM imoveis_prospectados WHERE 1=1'
    params = []
    if status:
        sql += ' AND status=?'; params.append(status)
    if tipo:
        sql += ' AND tipo=?'; params.append(tipo)
    sql += ' ORDER BY created_at DESC'
    rows = db.execute(sql, params).fetchall()
    db.close()
    return jsonify([row_to_dict(r) for r in rows])

@app.route('/api/imoveis', methods=['POST'])
def create_imovel():
    data = request.json or {}
    db   = get_db()
    telefones = json.dumps(data.get('telefones', []))
    cur = db.execute('''
        INSERT INTO imoveis_prospectados
            (lat, lng, endereco, tipo, status, proprietario, telefones, observacoes)
        VALUES (?,?,?,?,?,?,?,?)
    ''', (
        data.get('lat', 0),
        data.get('lng', 0),
        data.get('endereco', ''),
        data.get('tipo', 'casa'),
        data.get('status', 'nao_prospectado'),
        data.get('proprietario', ''),
        telefones,
        data.get('observacoes', ''),
    ))
    db.commit()
    row = db.execute('SELECT * FROM imoveis_prospectados WHERE id=?', (cur.lastrowid,)).fetchone()
    db.close()
    return jsonify(row_to_dict(row)), 201

@app.route('/api/imoveis/<int:imovel_id>', methods=['GET'])
def get_imovel(imovel_id):
    db  = get_db()
    row = db.execute('SELECT * FROM imoveis_prospectados WHERE id=?', (imovel_id,)).fetchone()
    db.close()
    if not row:
        return jsonify({'error': 'Not found'}), 404
    return jsonify(row_to_dict(row))

@app.route('/api/imoveis/<int:imovel_id>', methods=['PUT'])
def update_imovel(imovel_id):
    data = request.json or {}
    db   = get_db()
    row  = db.execute('SELECT * FROM imoveis_prospectados WHERE id=?', (imovel_id,)).fetchone()
    if not row:
        db.close()
        return jsonify({'error': 'Not found'}), 404
    cur_data = row_to_dict(row)

    telefones = json.dumps(data.get('telefones', cur_data['telefones']))
    db.execute('''
        UPDATE imoveis_prospectados SET
            endereco=?, tipo=?, status=?, proprietario=?,
            telefones=?, observacoes=?,
            updated_at=datetime('now','localtime')
        WHERE id=?
    ''', (
        data.get('endereco', cur_data['endereco']),
        data.get('tipo', cur_data['tipo']),
        data.get('status', cur_data['status']),
        data.get('proprietario', cur_data['proprietario']),
        telefones,
        data.get('observacoes', cur_data['observacoes']),
        imovel_id,
    ))
    db.commit()
    updated = db.execute('SELECT * FROM imoveis_prospectados WHERE id=?', (imovel_id,)).fetchone()
    db.close()
    return jsonify(row_to_dict(updated))

@app.route('/api/imoveis/<int:imovel_id>', methods=['DELETE'])
def delete_imovel(imovel_id):
    db = get_db()
    row = db.execute('SELECT fotos FROM imoveis_prospectados WHERE id=?', (imovel_id,)).fetchone()
    if row:
        fotos = json.loads(row['fotos'] or '[]')
        for f in fotos:
            path = os.path.join(UPLOAD_DIR, os.path.basename(f))
            if os.path.exists(path):
                os.remove(path)
    db.execute('DELETE FROM imoveis_prospectados WHERE id=?', (imovel_id,))
    db.commit()
    db.close()
    return jsonify({'ok': True})

# ── FOTOS ─────────────────────────────────────────────────────
@app.route('/api/imoveis/<int:imovel_id>/fotos', methods=['POST'])
def upload_foto(imovel_id):
    db  = get_db()
    row = db.execute('SELECT * FROM imoveis_prospectados WHERE id=?', (imovel_id,)).fetchone()
    if not row:
        db.close()
        return jsonify({'error': 'Not found'}), 404

    if 'foto' not in request.files:
        db.close()
        return jsonify({'error': 'Nenhum arquivo enviado'}), 400

    file = request.files['foto']
    if not file or not allowed_file(file.filename):
        db.close()
        return jsonify({'error': 'Tipo de arquivo não permitido'}), 400

    ext      = file.filename.rsplit('.', 1)[1].lower()
    filename = f"{uuid.uuid4().hex}.{ext}"
    file.save(os.path.join(UPLOAD_DIR, filename))

    fotos = json.loads(row['fotos'] or '[]')
    fotos.append(f'/uploads/{filename}')
    db.execute("UPDATE imoveis_prospectados SET fotos=?, updated_at=datetime('now','localtime') WHERE id=?",
               (json.dumps(fotos), imovel_id))
    db.commit()
    updated = db.execute('SELECT * FROM imoveis_prospectados WHERE id=?', (imovel_id,)).fetchone()
    db.close()
    return jsonify(row_to_dict(updated)), 201

@app.route('/api/imoveis/<int:imovel_id>/fotos/<int:foto_idx>', methods=['DELETE'])
def delete_foto(imovel_id, foto_idx):
    db  = get_db()
    row = db.execute('SELECT * FROM imoveis_prospectados WHERE id=?', (imovel_id,)).fetchone()
    if not row:
        db.close()
        return jsonify({'error': 'Not found'}), 404
    fotos = json.loads(row['fotos'] or '[]')
    if foto_idx < 0 or foto_idx >= len(fotos):
        db.close()
        return jsonify({'error': 'Índice inválido'}), 400
    path = os.path.join(UPLOAD_DIR, os.path.basename(fotos[foto_idx]))
    if os.path.exists(path):
        os.remove(path)
    fotos.pop(foto_idx)
    db.execute("UPDATE imoveis_prospectados SET fotos=?, updated_at=datetime('now','localtime') WHERE id=?",
               (json.dumps(fotos), imovel_id))
    db.commit()
    updated = db.execute('SELECT * FROM imoveis_prospectados WHERE id=?', (imovel_id,)).fetchone()
    db.close()
    return jsonify(row_to_dict(updated))

# ── DASHBOARD ─────────────────────────────────────────────────
@app.route('/api/dashboard')
def dashboard():
    db = get_db()
    total       = db.execute('SELECT COUNT(*) FROM imoveis_prospectados').fetchone()[0]
    prospectado = db.execute("SELECT COUNT(*) FROM imoveis_prospectados WHERE status='prospectado'").fetchone()[0]
    nao         = db.execute("SELECT COUNT(*) FROM imoveis_prospectados WHERE status='nao_prospectado'").fetchone()[0]
    por_tipo    = {r['tipo']: r['cnt'] for r in
                   db.execute('SELECT tipo, COUNT(*) cnt FROM imoveis_prospectados GROUP BY tipo').fetchall()}
    db.close()
    return jsonify({
        'total': total,
        'prospectado': prospectado,
        'nao_prospectado': nao,
        'por_tipo': por_tipo,
    })

init_db()

if __name__ == '__main__':
    port  = int(os.environ.get('PORT', 8060))
    debug = os.environ.get('FLASK_ENV') != 'production'
    print(f'\n🗺️  Sistema de Prospecção iniciado! Acesse: http://localhost:{port}\n')
    app.run(debug=debug, host='0.0.0.0', port=port)
