'use strict';

const { toCents } = require('./money');

function listItems(db) {
  return db.prepare('SELECT * FROM catalog_items ORDER BY name COLLATE NOCASE').all();
}

function createItem(db, item) {
  const info = db.prepare(
    'INSERT INTO catalog_items (name, description, unit, default_price_cents) VALUES (?, ?, ?, ?)'
  ).run(
    String(item.name || '').trim() || 'Untitled item',
    String(item.description || ''),
    String(item.unit || 'each'),
    toCents(item.default_price_cents)
  );
  return db.prepare('SELECT * FROM catalog_items WHERE id = ?').get(info.lastInsertRowid);
}

function updateItem(db, id, item) {
  db.prepare(
    'UPDATE catalog_items SET name = ?, description = ?, unit = ?, default_price_cents = ? WHERE id = ?'
  ).run(
    String(item.name || '').trim() || 'Untitled item',
    String(item.description || ''),
    String(item.unit || 'each'),
    toCents(item.default_price_cents),
    id
  );
  return db.prepare('SELECT * FROM catalog_items WHERE id = ?').get(id);
}

function deleteItem(db, id) {
  db.prepare('DELETE FROM catalog_items WHERE id = ?').run(id);
  return true;
}

module.exports = { listItems, createItem, updateItem, deleteItem };
