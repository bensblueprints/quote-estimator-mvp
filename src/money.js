// All money is integer cents, everywhere. Percent math rounds with Math.round.
'use strict';

/** Coerce anything to a safe non-negative integer number of cents. */
function toCents(v) {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Coerce a rate/percent to a finite non-negative number (e.g. 8.25). */
function toRate(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * Per-line math.
 * line: { qty, unit_price_cents, discount_type: ''|'flat'|'percent', discount_value, optional }
 * Returns { subtotal, discount, total } — all integer cents.
 * Flat discount_value is cents; percent discount_value is a percentage (e.g. 10).
 */
function lineTotals(line) {
  const qty = Number(line.qty);
  const safeQty = Number.isFinite(qty) && qty > 0 ? qty : 0;
  const price = toCents(line.unit_price_cents);
  const subtotal = Math.round(safeQty * price);
  let discount = 0;
  if (line.discount_type === 'percent') {
    discount = Math.round(subtotal * toRate(line.discount_value) / 100);
  } else if (line.discount_type === 'flat') {
    discount = toCents(line.discount_value);
  }
  discount = Math.min(discount, subtotal); // never discount below zero
  return { subtotal, discount, total: subtotal - discount };
}

/**
 * Whole-quote math. Optional/alternate lines are shown on the quote but
 * EXCLUDED from every total.
 * quote: { discount_type: ''|'flat'|'percent', discount_value, tax_rate }
 * Returns integer cents: { subtotal, lineDiscounts, afterLineDiscounts,
 *   quoteDiscount, taxable, tax, total, optionalTotal }
 */
function quoteTotals(quote, lines) {
  const q = quote || {};
  const all = Array.isArray(lines) ? lines : [];
  let subtotal = 0, lineDiscounts = 0, optionalTotal = 0;
  for (const line of all) {
    const t = lineTotals(line);
    if (line.optional) { optionalTotal += t.total; continue; }
    subtotal += t.subtotal;
    lineDiscounts += t.discount;
  }
  const afterLineDiscounts = subtotal - lineDiscounts;
  let quoteDiscount = 0;
  if (q.discount_type === 'percent') {
    quoteDiscount = Math.round(afterLineDiscounts * toRate(q.discount_value) / 100);
  } else if (q.discount_type === 'flat') {
    quoteDiscount = toCents(q.discount_value);
  }
  quoteDiscount = Math.min(quoteDiscount, afterLineDiscounts);
  const taxable = afterLineDiscounts - quoteDiscount;
  const tax = Math.round(taxable * toRate(q.tax_rate) / 100);
  return {
    subtotal, lineDiscounts, afterLineDiscounts, quoteDiscount,
    taxable, tax, total: taxable + tax, optionalTotal
  };
}

/** 123456 -> "$1,234.56". Negative-safe. */
function formatCents(cents, symbol = '$') {
  const n = Math.round(Number(cents) || 0);
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  const dollars = Math.floor(abs / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${sign}${symbol}${dollars}.${String(abs % 100).padStart(2, '0')}`;
}

/** "1,234.56" | "1234.5" | 1234.56 -> 123456 integer cents. */
function parseMoney(input) {
  if (typeof input === 'number') return toCents(input * 100);
  const cleaned = String(input || '').replace(/[^0-9.\-]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? Math.max(0, Math.round(n * 100)) : 0;
}

module.exports = { lineTotals, quoteTotals, formatCents, parseMoney, toCents, toRate };
