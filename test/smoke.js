/**
 * Quotewell smoke test — run with `npm test`.
 * Verifies with REAL data against a REAL temp SQLite database:
 *   1. Integer-cent money math edge cases (percent rounding, clamping, formatting)
 *   2. Catalog CRUD
 *   3. Quote build: mixed lines (qty>1, flat discount, % discount, optional line
 *      excluded from totals, fractional qty, tax) with EXACT expected cents
 *   4. Quote-level discounts (flat + percent)
 *   5. Duplicate quote, won/lost status, delete
 *   6. Quote HTML render: client name, formatted totals, HTML escaping
 *   7. Electron probe (+ optional real printToPDF) — skipped loudly if this
 *      machine can't launch Electron (window-class exhaustion).
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const { lineTotals, quoteTotals, formatCents, parseMoney } = require('../src/money');
const { openDb } = require('../src/db');
const catalog = require('../src/catalog');
const quotes = require('../src/quotes');
const settings = require('../src/settings');
const { quoteHtml } = require('../src/quotehtml');

let passed = 0, failed = 0;
function assert(cond, label) {
  if (cond) { passed++; console.log('  ✓ ' + label); }
  else { failed++; console.error('  ✗ FAIL: ' + label); }
}
function assertEq(actual, expected, label) {
  assert(actual === expected, `${label} (expected ${expected}, got ${actual})`);
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'quotewell-test-'));
const outDir = path.join(__dirname, 'out');
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

/* 1. Money math — integer cents everywhere */
console.log('\n[1] Money math (integer cents)');
assertEq(lineTotals({ qty: 3, unit_price_cents: 1999, discount_type: 'percent', discount_value: 10 }).subtotal, 5997, '3 x $19.99 subtotal');
assertEq(lineTotals({ qty: 3, unit_price_cents: 1999, discount_type: 'percent', discount_value: 10 }).discount, 600, '10% of 5997 rounds 599.7 -> 600');
assertEq(lineTotals({ qty: 1, unit_price_cents: 100, discount_type: 'percent', discount_value: 33.333 }).discount, 33, '33.333% of $1.00 -> 33 cents');
assertEq(lineTotals({ qty: 1, unit_price_cents: 5, discount_type: 'percent', discount_value: 10 }).discount, 1, 'Math.round(0.5) rounds half-up to 1 cent');
assertEq(lineTotals({ qty: 1, unit_price_cents: 5000, discount_type: 'flat', discount_value: 99999 }).total, 0, 'flat discount clamps at subtotal (never negative)');
assertEq(lineTotals({ qty: 1.5, unit_price_cents: 8000 }).total, 12000, 'fractional qty 1.5 x $80.00 = $120.00');
assertEq(lineTotals({ qty: 'garbage', unit_price_cents: 'x' }).total, 0, 'garbage input coerces to 0, no NaN');
assertEq(formatCents(123456), '$1,234.56', 'formatCents thousands separator');
assertEq(formatCents(5), '$0.05', 'formatCents pads cents');
assertEq(formatCents(-2500), '-$25.00', 'formatCents negative-safe');
assertEq(parseMoney('1,234.56'), 123456, 'parseMoney strips commas');
assertEq(parseMoney('$19.99'), 1999, 'parseMoney strips currency symbol');
assertEq(quoteTotals({}, []).total, 0, 'empty quote totals to 0');

/* 2. Catalog CRUD on a real temp db */
console.log('\n[2] Catalog CRUD (real SQLite in temp dir)');
const db = openDb(path.join(tmp, 'quotewell.db'));
const item = catalog.createItem(db, { name: 'Site consultation', description: 'On-site walkthrough', unit: 'visit', default_price_cents: 15000 });
assert(item.id > 0 && item.default_price_cents === 15000, 'create catalog item (price stored in cents)');
const item2 = catalog.createItem(db, { name: 'Drywall install', unit: 'sq ft', default_price_cents: 250 });
assertEq(catalog.listItems(db).length, 2, 'list returns both items');
catalog.updateItem(db, item.id, { ...item, default_price_cents: 17500 });
assertEq(catalog.listItems(db).find((i) => i.id === item.id).default_price_cents, 17500, 'update persists new price');
catalog.deleteItem(db, item2.id);
assertEq(catalog.listItems(db).length, 1, 'delete removes item');

/* 3. Quote with mixed lines — exact expected integer-cent totals */
console.log('\n[3] Quote build with mixed lines');
const mixedLines = [
  { item_name: 'Site consultation', qty: 2, unit_price_cents: 15000, discount_type: 'flat', discount_value: 2500 },      // 30000 - 2500
  { item_name: 'Fixture pack', qty: 3, unit_price_cents: 1999, discount_type: 'percent', discount_value: 10 },           // 5997 - 600
  { item_name: 'Premium upgrade', qty: 1, unit_price_cents: 50000, optional: 1 },                                        // EXCLUDED
  { item_name: 'Labor', qty: 1.5, unit_price_cents: 8000 }                                                               // 12000
];
const q1 = quotes.createQuote(db, {
  title: 'Kitchen remodel',
  client_name: 'Jane Doe',
  client_company: 'Doe Holdings',
  client_email: 'jane@example.com',
  valid_until: '2026-08-15',
  notes: 'Excludes permit fees.',
  tax_rate: 8.25,
  lines: mixedLines
});
assert(/^Q-\d{4}-0001$/.test(q1.quote_number), `auto quote number (${q1.quote_number})`);
assertEq(q1.lines.length, 4, 'all 4 lines persisted');
assertEq(q1.totals.subtotal, 47997, 'subtotal = 30000 + 5997 + 12000 (optional excluded)');
assertEq(q1.totals.lineDiscounts, 3100, 'line discounts = 2500 flat + 600 percent');
assertEq(q1.totals.afterLineDiscounts, 44897, 'after line discounts');
assertEq(q1.totals.tax, 3704, 'tax 8.25% of 44897 = round(3704.0025) = 3704');
assertEq(q1.totals.total, 48601, 'grand total 48601 cents ($486.01)');
assertEq(q1.totals.optionalTotal, 50000, 'optional line tracked separately at 50000');
const reread = quotes.getQuote(db, q1.id);
assertEq(reread.totals.total, 48601, 'totals identical after round-trip from SQLite');

/* 4. Quote-level discounts */
console.log('\n[4] Quote-level discounts');
const q2 = quotes.createQuote(db, {
  client_name: 'Pct Client', tax_rate: 8.25,
  discount_type: 'percent', discount_value: 5,
  lines: mixedLines
});
assertEq(q2.totals.quoteDiscount, 2245, '5% of 44897 = round(2244.85) = 2245');
assertEq(q2.totals.taxable, 42652, 'taxable base after quote discount');
assertEq(q2.totals.tax, 3519, 'tax = round(42652 * 0.0825 = 3518.79) = 3519');
assertEq(q2.totals.total, 46171, 'total with quote-level % discount');
const q3 = quotes.createQuote(db, {
  client_name: 'Flat Client', tax_rate: 8.25,
  discount_type: 'flat', discount_value: 10000,
  lines: mixedLines
});
assertEq(q3.totals.quoteDiscount, 10000, 'flat quote discount applied in cents');
assertEq(q3.totals.total, 37776, '34897 + round(2879.0025) = 37776');

/* 5. Duplicate + won/lost + delete */
console.log('\n[5] History: duplicate, won/lost, delete');
const dup = quotes.duplicateQuote(db, q1.id);
assert(dup.id !== q1.id && dup.quote_number !== q1.quote_number, 'duplicate gets a fresh id + quote number');
assertEq(dup.status, 'draft', 'duplicate starts as draft');
assertEq(dup.totals.total, 48601, 'duplicate reproduces exact totals');
assertEq(dup.lines.length, 4, 'duplicate copies all lines');
assert(dup.title.includes('(copy)'), 'duplicate title marked as copy');
const won = quotes.setStatus(db, q1.id, 'won');
assertEq(won.status, 'won', 'mark won');
const lost = quotes.setStatus(db, q2.id, 'lost');
assertEq(lost.status, 'lost', 'mark lost');
let threw = false;
try { quotes.setStatus(db, q1.id, 'maybe'); } catch { threw = true; }
assert(threw, 'invalid status rejected');
const before = quotes.listQuotes(db).length;
quotes.deleteQuote(db, q3.id);
assertEq(quotes.listQuotes(db).length, before - 1, 'delete removes quote');
assertEq(db.prepare('SELECT COUNT(*) n FROM quote_lines WHERE quote_id = ?').get(q3.id).n, 0, 'delete removes its lines too');

/* 6. Quote HTML render (the exact PDF content) */
console.log('\n[6] Quote HTML render');
let tpl = settings.getTemplate(db, null);
assert(tpl && tpl.is_default === 1 && tpl.terms.length > 0, 'default template seeded with terms boilerplate');
tpl = settings.updateTemplate(db, tpl.id, { ...tpl, accent_color: '#0ea5e9' });
const biz = settings.saveSettings(db, { business_name: 'Ben Builds LLC' });
const html = quoteHtml(quotes.getQuote(db, q1.id), tpl, biz);
assert(html.startsWith('<!DOCTYPE html>') && html.includes('</html>'), 'renders a full HTML document');
assert(html.includes('Jane Doe'), 'client name appears');
assert(html.includes('Doe Holdings'), 'client company appears');
assert(html.includes('$486.01'), 'formatted grand total $486.01 appears');
assert(html.includes('$479.97'), 'formatted subtotal $479.97 appears');
assert(html.includes('Tax (8.25%)') && html.includes('$37.04'), 'tax row with formatted amount');
assert(html.includes('Optional / alternate items') && html.includes('$500.00'), 'optional section rendered, priced, excluded from total');
assert(html.includes('Ben Builds LLC'), 'business branding appears');
assert(html.includes('#0ea5e9'), 'accent color applied');
assert(html.includes(q1.quote_number), 'quote number appears');
assert(html.includes('Valid until'), 'valid-until shown');
assert(html.includes('Excludes permit fees.'), 'notes shown');
// escaping — client data must never become markup
const evil = quoteHtml(
  { quote_number: 'Q-X', client_name: '<script>alert(1)</script>', lines: [{ item_name: '<b>bold</b>', qty: 1, unit_price_cents: 100 }] },
  tpl, biz
);
assert(!evil.includes('<script>alert') && evil.includes('&lt;script&gt;'), 'client name HTML is escaped');
assert(!evil.includes('<b>bold</b>'), 'line item HTML is escaped');
fs.writeFileSync(path.join(outDir, 'quote-sample.html'), html);

/* Templates + settings CRUD quick pass */
const t2 = settings.createTemplate(db, { name: 'Premium', terms: 'Net 15.', accent_color: '#22c55e' });
assertEq(settings.listTemplates(db).length, 2, 'template created');
settings.updateTemplate(db, t2.id, { ...t2, terms: 'Net 30.' });
assertEq(settings.listTemplates(db).find((t) => t.id === t2.id).terms, 'Net 30.', 'template update persists');
settings.deleteTemplate(db, t2.id);
assertEq(settings.listTemplates(db).length, 1, 'template deleted');

db.close();

/* 7. Electron probe + optional real printToPDF */
console.log('\n[7] Electron probe (printToPDF path)');
let electronSkipped = false;
let electron = null;
try { electron = require('electron'); } catch { /* not installed */ }
if (!electron) {
  electronSkipped = true;
  console.warn('  ⚠ SKIPPED: electron not installed');
} else {
  const probe = spawnSync(electron, ['--version'], { encoding: 'utf8', timeout: 60000 });
  if (probe.status !== 0 && /register the window class/i.test((probe.stderr || '') + (probe.stdout || ''))) {
    electronSkipped = true;
    console.warn('  ⚠ SKIPPED: Electron GUI blocked on this machine (window-class exhaustion).');
    console.warn('    Core logic is fully verified above; re-run `npm test` after a reboot for the PDF leg.');
  } else if (probe.status !== 0) {
    electronSkipped = true;
    console.warn('  ⚠ SKIPPED: electron --version failed (status ' + probe.status + '): ' + (probe.stderr || '').trim());
  } else {
    console.log('  electron ' + probe.stdout.trim() + ' launches — running real printToPDF');
    const pdfOut = path.join(outDir, 'quote.pdf');
    const res = spawnSync(electron, [path.join(__dirname, 'pdf-runner.js'), pdfOut], { encoding: 'utf8', timeout: 120000 });
    if (res.stdout) process.stdout.write(res.stdout.split('\n').filter((l) => l.startsWith('PDF_')).map((l) => '  ' + l + '\n').join(''));
    assert(res.status === 0, 'electron pdf-runner exits 0');
    assert(fs.existsSync(pdfOut), 'PDF file written');
    if (fs.existsSync(pdfOut)) {
      const buf = fs.readFileSync(pdfOut);
      assert(buf.slice(0, 5).toString() === '%PDF-', 'output is a valid PDF (magic bytes)');
      assert(buf.length > 3000, `PDF has real content (${buf.length} bytes)`);
    }
  }
}

/* cleanup */
fs.rmSync(tmp, { recursive: true, force: true });
fs.rmSync(outDir, { recursive: true, force: true });

console.log(`\n${'='.repeat(48)}\nSMOKE TEST: ${passed} passed, ${failed} failed${electronSkipped ? ' (Electron GUI leg skipped)' : ''}\n${'='.repeat(48)}`);
process.exit(failed ? 1 : 0);
