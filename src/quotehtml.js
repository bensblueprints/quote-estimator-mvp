'use strict';

// Pure HTML rendering of a branded quote document — used by the PDF export
// (Electron printToPDF) and testable without Electron.

const { lineTotals, quoteTotals, formatCents } = require('./money');

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function nl2br(s) {
  return esc(s).replace(/\r?\n/g, '<br>');
}

function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''));
  if (isNaN(d)) return esc(iso);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function discountLabel(line) {
  if (line.discount_type === 'percent' && Number(line.discount_value) > 0) return `-${line.discount_value}%`;
  if (line.discount_type === 'flat' && Number(line.discount_value) > 0) return `-${formatCents(line.discount_value)}`;
  return '';
}

function lineRows(lines, sym) {
  return lines.map((l) => {
    const t = lineTotals(l);
    const disc = discountLabel(l);
    return `<tr>
      <td>
        <div class="li-name">${esc(l.item_name)}</div>
        ${l.description ? `<div class="li-desc">${nl2br(l.description)}</div>` : ''}
      </td>
      <td class="num">${esc(l.qty)} ${esc(l.unit)}</td>
      <td class="num">${formatCents(l.unit_price_cents, sym)}</td>
      <td class="num">${disc ? esc(disc) : '—'}</td>
      <td class="num strong">${formatCents(t.total, sym)}</td>
    </tr>`;
  }).join('\n');
}

/**
 * quoteHtml(quote, template, settings) -> full standalone HTML document.
 * quote must include .lines. All money integer cents.
 */
function quoteHtml(quote, template, settings) {
  const s = settings || {};
  const tpl = template || {};
  const sym = s.currency_symbol || '$';
  const accent = tpl.accent_color || s.accent_color || '#6366f1';
  const lines = Array.isArray(quote.lines) ? quote.lines : [];
  const included = lines.filter((l) => !l.optional);
  const optional = lines.filter((l) => l.optional);
  const totals = quoteTotals(quote, lines);

  const discountRow = totals.quoteDiscount > 0
    ? `<tr><td>Discount${quote.discount_type === 'percent' ? ` (${quote.discount_value}%)` : ''}</td>
       <td class="num">-${formatCents(totals.quoteDiscount, sym)}</td></tr>` : '';
  const lineDiscRow = totals.lineDiscounts > 0
    ? `<tr><td>Line discounts</td><td class="num">-${formatCents(totals.lineDiscounts, sym)}</td></tr>` : '';
  const taxRow = Number(quote.tax_rate) > 0
    ? `<tr><td>Tax (${quote.tax_rate}%)</td><td class="num">${formatCents(totals.tax, sym)}</td></tr>` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${esc(quote.quote_number)} — ${esc(s.business_name || 'Quote')}</title>
<style>
  @page { size: Letter; margin: 18mm 16mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font: 13px/1.55 'Segoe UI', system-ui, -apple-system, sans-serif; color: #1f2430; }
  .head { display: flex; justify-content: space-between; align-items: flex-start;
          border-bottom: 3px solid ${esc(accent)}; padding-bottom: 18px; margin-bottom: 22px; }
  .brand { display: flex; gap: 14px; align-items: center; }
  .brand img { max-height: 56px; max-width: 160px; object-fit: contain; }
  .brand .bn { font-size: 20px; font-weight: 700; }
  .brand .bc { color: #5c6474; font-size: 12px; white-space: pre-line; }
  .qmeta { text-align: right; }
  .qmeta .kind { font-size: 26px; font-weight: 800; letter-spacing: 3px; color: ${esc(accent)}; text-transform: uppercase; }
  .qmeta .num { font-size: 13px; color: #5c6474; margin-top: 2px; }
  .meta-grid { display: flex; justify-content: space-between; gap: 24px; margin-bottom: 22px; }
  .meta-block h3 { font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase; color: ${esc(accent)}; margin-bottom: 4px; }
  .meta-block .big { font-weight: 700; font-size: 14px; }
  .meta-block div { font-size: 12.5px; color: #3a4150; }
  .cover { background: #f5f6fa; border-left: 3px solid ${esc(accent)}; padding: 10px 14px; margin-bottom: 20px;
           font-size: 12.5px; color: #3a4150; border-radius: 0 6px 6px 0; }
  table.lines { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
  table.lines th { text-align: left; font-size: 10px; letter-spacing: 1.2px; text-transform: uppercase;
                   color: #fff; background: ${esc(accent)}; padding: 8px 10px; }
  table.lines th.num, td.num { text-align: right; white-space: nowrap; }
  table.lines td { padding: 9px 10px; border-bottom: 1px solid #e6e8ef; vertical-align: top; }
  .li-name { font-weight: 600; }
  .li-desc { color: #5c6474; font-size: 11.5px; margin-top: 2px; }
  .strong { font-weight: 700; }
  .opt-head { margin: 18px 0 6px; font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; color: #5c6474; }
  .opt-note { font-size: 11px; color: #8a90a0; margin-bottom: 6px; }
  table.opt td { color: #5c6474; }
  .totals-wrap { display: flex; justify-content: flex-end; margin-top: 14px; }
  table.totals { width: 300px; border-collapse: collapse; }
  table.totals td { padding: 6px 10px; font-size: 13px; }
  table.totals tr.grand td { border-top: 2px solid ${esc(accent)}; font-size: 16px; font-weight: 800;
                             color: ${esc(accent)}; padding-top: 10px; }
  .section { margin-top: 26px; }
  .section h3 { font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase; color: ${esc(accent)}; margin-bottom: 6px; }
  .section p { font-size: 12px; color: #3a4150; white-space: pre-line; }
  .foot { margin-top: 34px; padding-top: 12px; border-top: 1px solid #e6e8ef;
          font-size: 11px; color: #8a90a0; text-align: center; }
</style>
</head>
<body>
  <div class="head">
    <div class="brand">
      ${s.logo_data_url ? `<img src="${esc(s.logo_data_url)}" alt="logo">` : ''}
      <div>
        <div class="bn">${esc(s.business_name || 'Your Business')}</div>
        <div class="bc">${[s.business_email, s.business_phone, s.business_address].filter(Boolean).map(esc).join(' · ')}</div>
      </div>
    </div>
    <div class="qmeta">
      <div class="kind">Quote</div>
      <div class="num">${esc(quote.quote_number)}</div>
    </div>
  </div>

  <div class="meta-grid">
    <div class="meta-block">
      <h3>Prepared for</h3>
      <div class="big">${esc(quote.client_name)}</div>
      ${quote.client_company ? `<div>${esc(quote.client_company)}</div>` : ''}
      ${quote.client_email ? `<div>${esc(quote.client_email)}</div>` : ''}
    </div>
    <div class="meta-block" style="text-align:right">
      <h3>Details</h3>
      ${quote.title ? `<div class="big">${esc(quote.title)}</div>` : ''}
      <div>Issued: ${fmtDate((quote.created_at || '').slice(0, 10)) || fmtDate(new Date().toISOString().slice(0, 10))}</div>
      ${quote.valid_until ? `<div>Valid until: <b>${fmtDate(quote.valid_until)}</b></div>` : ''}
    </div>
  </div>

  ${tpl.cover_note ? `<div class="cover">${nl2br(tpl.cover_note)}</div>` : ''}

  <table class="lines">
    <thead><tr>
      <th>Item</th><th class="num">Qty</th><th class="num">Unit price</th><th class="num">Discount</th><th class="num">Amount</th>
    </tr></thead>
    <tbody>${lineRows(included, sym)}</tbody>
  </table>

  <div class="totals-wrap">
    <table class="totals">
      <tr><td>Subtotal</td><td class="num">${formatCents(totals.subtotal, sym)}</td></tr>
      ${lineDiscRow}
      ${discountRow}
      ${taxRow}
      <tr class="grand"><td>Total</td><td class="num">${formatCents(totals.total, sym)}</td></tr>
    </table>
  </div>

  ${optional.length ? `
  <div class="opt-head">Optional / alternate items</div>
  <div class="opt-note">Listed for consideration — not included in the total above.</div>
  <table class="lines opt">
    <tbody>${lineRows(optional, sym)}</tbody>
  </table>` : ''}

  ${quote.notes ? `<div class="section"><h3>Notes</h3><p>${nl2br(quote.notes)}</p></div>` : ''}
  ${tpl.terms ? `<div class="section"><h3>Terms</h3><p>${nl2br(tpl.terms)}</p></div>` : ''}

  <div class="foot">${esc(s.business_name || '')} — quote ${esc(quote.quote_number)}${quote.valid_until ? ` · valid until ${fmtDate(quote.valid_until)}` : ''}</div>
</body>
</html>`;
}

module.exports = { quoteHtml, esc };
