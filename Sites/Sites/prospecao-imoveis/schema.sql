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
