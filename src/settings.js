'use strict';

// Business branding + template (terms boilerplate) storage.

const SETTING_KEYS = [
  'business_name', 'business_email', 'business_phone', 'business_address',
  'logo_data_url', 'accent_color', 'currency_symbol'
];

const DEFAULTS = {
  business_name: 'Your Business',
  business_email: '',
  business_phone: '',
  business_address: '',
  logo_data_url: '',
  accent_color: '#6366f1',
  currency_symbol: '$'
};

function getSettings(db) {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const out = { ...DEFAULTS };
  for (const r of rows) if (SETTING_KEYS.includes(r.key)) out[r.key] = r.value;
  return out;
}

function saveSettings(db, patch) {
  const up = db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  );
  const tx = db.transaction(() => {
    for (const key of SETTING_KEYS) {
      if (patch && Object.prototype.hasOwnProperty.call(patch, key)) {
        up.run(key, String(patch[key] ?? ''));
      }
    }
  });
  tx();
  return getSettings(db);
}

function listTemplates(db) {
  return db.prepare('SELECT * FROM templates ORDER BY is_default DESC, name COLLATE NOCASE').all();
}

function getTemplate(db, id) {
  if (id) {
    const t = db.prepare('SELECT * FROM templates WHERE id = ?').get(id);
    if (t) return t;
  }
  return db.prepare('SELECT * FROM templates ORDER BY is_default DESC, id LIMIT 1').get() || null;
}

function createTemplate(db, t) {
  const info = db.prepare(
    'INSERT INTO templates (name, terms, cover_note, accent_color, is_default) VALUES (?, ?, ?, ?, 0)'
  ).run(
    String(t.name || '').trim() || 'Untitled template',
    String(t.terms || ''),
    String(t.cover_note || ''),
    String(t.accent_color || '#6366f1')
  );
  return db.prepare('SELECT * FROM templates WHERE id = ?').get(info.lastInsertRowid);
}

function updateTemplate(db, id, t) {
  db.prepare(
    'UPDATE templates SET name = ?, terms = ?, cover_note = ?, accent_color = ? WHERE id = ?'
  ).run(
    String(t.name || '').trim() || 'Untitled template',
    String(t.terms || ''),
    String(t.cover_note || ''),
    String(t.accent_color || '#6366f1'),
    id
  );
  return db.prepare('SELECT * FROM templates WHERE id = ?').get(id);
}

function deleteTemplate(db, id) {
  const t = db.prepare('SELECT * FROM templates WHERE id = ?').get(id);
  if (t && t.is_default) throw new Error('cannot delete the default template');
  db.prepare('DELETE FROM templates WHERE id = ?').run(id);
  return true;
}

module.exports = {
  getSettings, saveSettings,
  listTemplates, getTemplate, createTemplate, updateTemplate, deleteTemplate
};
