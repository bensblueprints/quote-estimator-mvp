'use strict';

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

function nativeBindingPath() {
  // Under Electron the Node-ABI binding won't load; use the vendored Electron prebuild.
  if (!process.versions.electron) return null;
  const p = path.join(__dirname, '..', 'vendor', 'better_sqlite3-electron.node')
    .replace('app.asar' + path.sep, 'app.asar.unpacked' + path.sep);
  return fs.existsSync(p) ? p : null;
}

const DEFAULT_TERMS = [
  'This quote is valid until the date shown above. Prices may change after expiry.',
  'A 50% deposit is required to begin work; the balance is due on completion.',
  'Any work outside the scope of this quote will be estimated separately.',
  'Quoted prices exclude any third-party fees unless stated otherwise.'
].join('\n');

function openDb(dbPath) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const nativeBinding = nativeBindingPath();
  const db = new Database(dbPath, nativeBinding ? { nativeBinding } : {});
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS catalog_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      unit TEXT NOT NULL DEFAULT 'each',
      default_price_cents INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      terms TEXT NOT NULL DEFAULT '',
      cover_note TEXT NOT NULL DEFAULT '',
      accent_color TEXT NOT NULL DEFAULT '#6366f1',
      is_default INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS quotes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quote_number TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT '',
      client_name TEXT NOT NULL DEFAULT '',
      client_company TEXT NOT NULL DEFAULT '',
      client_email TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'draft',
      valid_until TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      discount_type TEXT NOT NULL DEFAULT '',
      discount_value REAL NOT NULL DEFAULT 0,
      tax_rate REAL NOT NULL DEFAULT 0,
      template_id INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS quote_lines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quote_id INTEGER NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
      position INTEGER NOT NULL DEFAULT 0,
      item_name TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      unit TEXT NOT NULL DEFAULT 'each',
      qty REAL NOT NULL DEFAULT 1,
      unit_price_cents INTEGER NOT NULL DEFAULT 0,
      discount_type TEXT NOT NULL DEFAULT '',
      discount_value REAL NOT NULL DEFAULT 0,
      optional INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL DEFAULT ''
    );
    CREATE INDEX IF NOT EXISTS idx_quote_lines_quote ON quote_lines(quote_id);
  `);
  db.pragma('foreign_keys = ON');

  // Seed a default template once.
  const count = db.prepare('SELECT COUNT(*) AS n FROM templates').get().n;
  if (count === 0) {
    db.prepare(
      'INSERT INTO templates (name, terms, cover_note, accent_color, is_default) VALUES (?, ?, ?, ?, 1)'
    ).run('Standard', DEFAULT_TERMS, 'Thanks for the opportunity to quote this work. Details below — questions welcome any time.', '#6366f1');
  }
  return db;
}

module.exports = { openDb, DEFAULT_TERMS };
