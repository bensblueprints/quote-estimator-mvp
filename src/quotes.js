'use strict';

const { quoteTotals, toCents, toRate } = require('./money');

const STATUSES = ['draft', 'sent', 'won', 'lost'];

function nextQuoteNumber(db) {
  const year = new Date().getFullYear();
  const prefix = `Q-${year}-`;
  const row = db.prepare(
    "SELECT quote_number FROM quotes WHERE quote_number LIKE ? ORDER BY id DESC LIMIT 1"
  ).get(prefix + '%');
  let n = 1;
  if (row) {
    const tail = parseInt(row.quote_number.slice(prefix.length), 10);
    if (Number.isFinite(tail)) n = tail + 1;
  }
  return prefix + String(n).padStart(4, '0');
}

function sanitizeQuoteFields(q) {
  return {
    title: String(q.title || ''),
    client_name: String(q.client_name || ''),
    client_company: String(q.client_company || ''),
    client_email: String(q.client_email || ''),
    valid_until: String(q.valid_until || ''),
    notes: String(q.notes || ''),
    discount_type: ['flat', 'percent'].includes(q.discount_type) ? q.discount_type : '',
    discount_value: q.discount_type === 'flat' ? toCents(q.discount_value) : toRate(q.discount_value),
    tax_rate: toRate(q.tax_rate),
    template_id: q.template_id ? Number(q.template_id) : null
  };
}

function sanitizeLine(line, position) {
  return {
    position,
    item_name: String(line.item_name || ''),
    description: String(line.description || ''),
    unit: String(line.unit || 'each'),
    qty: Number.isFinite(Number(line.qty)) && Number(line.qty) > 0 ? Number(line.qty) : 0,
    unit_price_cents: toCents(line.unit_price_cents),
    discount_type: ['flat', 'percent'].includes(line.discount_type) ? line.discount_type : '',
    discount_value: line.discount_type === 'flat' ? toCents(line.discount_value) : toRate(line.discount_value),
    optional: line.optional ? 1 : 0
  };
}

function insertLines(db, quoteId, lines) {
  const ins = db.prepare(`
    INSERT INTO quote_lines
      (quote_id, position, item_name, description, unit, qty, unit_price_cents, discount_type, discount_value, optional)
    VALUES (@quote_id, @position, @item_name, @description, @unit, @qty, @unit_price_cents, @discount_type, @discount_value, @optional)
  `);
  lines.forEach((line, i) => ins.run({ quote_id: quoteId, ...sanitizeLine(line, i) }));
}

function getQuote(db, id) {
  const quote = db.prepare('SELECT * FROM quotes WHERE id = ?').get(id);
  if (!quote) return null;
  const lines = db.prepare('SELECT * FROM quote_lines WHERE quote_id = ? ORDER BY position, id').all(id);
  return { ...quote, lines, totals: quoteTotals(quote, lines) };
}

function listQuotes(db) {
  const quotes = db.prepare('SELECT * FROM quotes ORDER BY id DESC').all();
  const linesFor = db.prepare('SELECT * FROM quote_lines WHERE quote_id = ? ORDER BY position, id');
  return quotes.map((q) => {
    const lines = linesFor.all(q.id);
    return { ...q, line_count: lines.length, totals: quoteTotals(q, lines) };
  });
}

function createQuote(db, data) {
  const fields = sanitizeQuoteFields(data || {});
  const tx = db.transaction(() => {
    const info = db.prepare(`
      INSERT INTO quotes
        (quote_number, title, client_name, client_company, client_email, valid_until, notes,
         discount_type, discount_value, tax_rate, template_id)
      VALUES (@quote_number, @title, @client_name, @client_company, @client_email, @valid_until, @notes,
         @discount_type, @discount_value, @tax_rate, @template_id)
    `).run({ quote_number: nextQuoteNumber(db), ...fields });
    insertLines(db, info.lastInsertRowid, Array.isArray(data.lines) ? data.lines : []);
    return info.lastInsertRowid;
  });
  return getQuote(db, tx());
}

function updateQuote(db, id, data) {
  const fields = sanitizeQuoteFields(data || {});
  const tx = db.transaction(() => {
    db.prepare(`
      UPDATE quotes SET title=@title, client_name=@client_name, client_company=@client_company,
        client_email=@client_email, valid_until=@valid_until, notes=@notes,
        discount_type=@discount_type, discount_value=@discount_value, tax_rate=@tax_rate,
        template_id=@template_id, updated_at=datetime('now')
      WHERE id=@id
    `).run({ id, ...fields });
    db.prepare('DELETE FROM quote_lines WHERE quote_id = ?').run(id);
    insertLines(db, id, Array.isArray(data.lines) ? data.lines : []);
  });
  tx();
  return getQuote(db, id);
}

function deleteQuote(db, id) {
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM quote_lines WHERE quote_id = ?').run(id);
    db.prepare('DELETE FROM quotes WHERE id = ?').run(id);
  });
  tx();
  return true;
}

/** Duplicate a past quote for a similar job: fresh number, draft status, today-based dates. */
function duplicateQuote(db, id) {
  const src = getQuote(db, id);
  if (!src) return null;
  return createQuote(db, {
    ...src,
    title: src.title ? src.title + ' (copy)' : '',
    lines: src.lines
  });
}

function setStatus(db, id, status) {
  if (!STATUSES.includes(status)) throw new Error('invalid status: ' + status);
  db.prepare("UPDATE quotes SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, id);
  return getQuote(db, id);
}

module.exports = {
  STATUSES, nextQuoteNumber, listQuotes, getQuote,
  createQuote, updateQuote, deleteQuote, duplicateQuote, setStatus
};
