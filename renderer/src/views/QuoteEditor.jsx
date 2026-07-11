import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Plus, Trash2, FileDown, Save, PackagePlus, Eye, EyeOff } from 'lucide-react';

const api = window.quotewell;

const EMPTY_LINE = {
  item_name: '', description: '', unit: 'each', qty: 1,
  unit_price_cents: 0, discount_type: '', discount_value: 0, optional: 0
};

const emptyQuote = (templates) => ({
  title: '', client_name: '', client_company: '', client_email: '',
  valid_until: defaultValidUntil(), notes: '',
  discount_type: '', discount_value: 0, tax_rate: 0,
  template_id: templates.find((t) => t.is_default)?.id || templates[0]?.id || null,
  lines: [{ ...EMPTY_LINE }]
});

function defaultValidUntil() {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
}

/** Money input: displays dollars, stores integer cents. */
function MoneyInput({ cents, onCents, className = '', sym = '$' }) {
  const [text, setText] = useState((cents / 100).toFixed(2));
  useEffect(() => { setText((cents / 100).toFixed(2)); }, [cents]);
  return (
    <input
      className={`field text-right ${className}`}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => onCents(api.money.parseMoney(text))}
      placeholder={`${sym}0.00`}
    />
  );
}

export default function QuoteEditor({ quoteId, catalogItems, templates, settings, onClose }) {
  const [quote, setQuote] = useState(null);
  const [savedId, setSavedId] = useState(quoteId || null);
  const [dirty, setDirty] = useState(false);
  const [flash, setFlash] = useState('');
  const sym = settings?.currency_symbol || '$';
  const fmt = (c) => api.money.formatCents(c, sym);

  useEffect(() => {
    (async () => {
      if (quoteId) setQuote(await api.quotes.get(quoteId));
      else setQuote(emptyQuote(templates));
    })();
  }, [quoteId, templates]);

  const totals = useMemo(
    () => (quote ? api.money.quoteTotals(quote, quote.lines) : null),
    [quote]
  );

  if (!quote || !totals) return null;

  const patch = (p) => { setQuote((q) => ({ ...q, ...p })); setDirty(true); };
  const patchLine = (i, p) => {
    setQuote((q) => {
      const lines = q.lines.slice();
      lines[i] = { ...lines[i], ...p };
      return { ...q, lines };
    });
    setDirty(true);
  };
  const addLine = (from) => {
    const line = from
      ? { ...EMPTY_LINE, item_name: from.name, description: from.description, unit: from.unit, unit_price_cents: from.default_price_cents }
      : { ...EMPTY_LINE };
    setQuote((q) => ({ ...q, lines: [...q.lines, line] }));
    setDirty(true);
  };
  const removeLine = (i) => {
    setQuote((q) => ({ ...q, lines: q.lines.filter((_, idx) => idx !== i) }));
    setDirty(true);
  };

  const save = async () => {
    const saved = savedId
      ? await api.quotes.update(savedId, quote)
      : await api.quotes.create(quote);
    setSavedId(saved.id);
    setQuote(saved);
    setDirty(false);
    setFlash('Saved');
    setTimeout(() => setFlash(''), 1500);
    return saved;
  };

  const exportPdf = async () => {
    const saved = dirty || !savedId ? await save() : quote;
    const res = await api.quotes.exportPdf(saved.id || savedId);
    if (res.ok) { setFlash('PDF exported'); setTimeout(() => setFlash(''), 2000); }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button className="btn-ghost" onClick={onClose}><ArrowLeft size={16} /> Back</button>
        <h1 className="text-xl font-bold flex-1">
          {savedId ? `Edit ${quote.quote_number || 'quote'}` : 'New quote'}
          {dirty && <span className="text-accent-400 ml-2 text-sm font-normal">• unsaved</span>}
          {flash && <span className="text-emerald-400 ml-2 text-sm font-normal">{flash}</span>}
        </h1>
        <button className="btn-ghost" onClick={save}><Save size={16} /> Save</button>
        <button className="btn-primary" onClick={exportPdf}><FileDown size={16} /> Export PDF</button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        {/* Client */}
        <div className="card p-4 col-span-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Client name</label>
              <input className="field" value={quote.client_name} onChange={(e) => patch({ client_name: e.target.value })} placeholder="Jane Contractor" />
            </div>
            <div>
              <label className="label">Company</label>
              <input className="field" value={quote.client_company} onChange={(e) => patch({ client_company: e.target.value })} placeholder="Acme LLC" />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="field" value={quote.client_email} onChange={(e) => patch({ client_email: e.target.value })} placeholder="jane@acme.com" />
            </div>
            <div>
              <label className="label">Project / title</label>
              <input className="field" value={quote.title} onChange={(e) => patch({ title: e.target.value })} placeholder="Kitchen remodel" />
            </div>
          </div>
        </div>
        {/* Quote meta */}
        <div className="card p-4 space-y-3">
          <div>
            <label className="label">Valid until</label>
            <input type="date" className="field" value={quote.valid_until} onChange={(e) => patch({ valid_until: e.target.value })} />
          </div>
          <div>
            <label className="label">Template</label>
            <select className="field" value={quote.template_id || ''} onChange={(e) => patch({ template_id: Number(e.target.value) || null })}>
              {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Lines */}
      <div className="card p-4 mb-4">
        <div className="grid grid-cols-[1fr_70px_90px_110px_120px_100px_70px_36px] gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500 px-1 mb-2">
          <div>Item</div><div>Qty</div><div>Unit</div><div className="text-right">Unit price</div>
          <div>Discount</div><div className="text-right">Amount</div><div className="text-center">Optional</div><div />
        </div>
        {quote.lines.map((line, i) => {
          const lt = api.money.lineTotals(line);
          return (
            <div key={i} className={`grid grid-cols-[1fr_70px_90px_110px_120px_100px_70px_36px] gap-2 items-start py-1.5 rounded-lg ${line.optional ? 'opacity-60' : ''}`}>
              <div className="space-y-1">
                <input className="field" list="catalog-list" value={line.item_name}
                  onChange={(e) => {
                    const hit = catalogItems.find((c) => c.name === e.target.value);
                    patchLine(i, hit
                      ? { item_name: hit.name, description: hit.description, unit: hit.unit, unit_price_cents: hit.default_price_cents }
                      : { item_name: e.target.value });
                  }}
                  placeholder="Service or item (type to search catalog)" />
                <input className="field text-xs text-slate-400" value={line.description}
                  onChange={(e) => patchLine(i, { description: e.target.value })} placeholder="Description (optional)" />
              </div>
              <input className="field text-right" type="number" min="0" step="any" value={line.qty}
                onChange={(e) => patchLine(i, { qty: e.target.value })} />
              <input className="field" value={line.unit} onChange={(e) => patchLine(i, { unit: e.target.value })} />
              <MoneyInput cents={line.unit_price_cents} onCents={(c) => patchLine(i, { unit_price_cents: c })} sym={sym} />
              <div className="flex gap-1">
                <select className="field !w-16 !px-1.5" value={line.discount_type}
                  onChange={(e) => patchLine(i, { discount_type: e.target.value, discount_value: 0 })}>
                  <option value="">—</option>
                  <option value="flat">{sym}</option>
                  <option value="percent">%</option>
                </select>
                {line.discount_type === 'flat' && (
                  <MoneyInput cents={line.discount_value} onCents={(c) => patchLine(i, { discount_value: c })} sym={sym} className="!w-full" />
                )}
                {line.discount_type === 'percent' && (
                  <input className="field text-right" type="number" min="0" max="100" step="any" value={line.discount_value}
                    onChange={(e) => patchLine(i, { discount_value: e.target.value })} />
                )}
              </div>
              <div className="text-right text-sm font-medium pt-2">{fmt(lt.total)}</div>
              <div className="text-center pt-1.5">
                <button title={line.optional ? 'Optional — excluded from total' : 'Included in total'}
                  onClick={() => patchLine(i, { optional: line.optional ? 0 : 1 })}
                  className={`p-1.5 rounded-lg ${line.optional ? 'text-amber-400 bg-amber-900/20' : 'text-slate-500 hover:bg-ink-700'}`}>
                  {line.optional ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <button className="p-1.5 mt-1 rounded-lg text-slate-600 hover:text-red-300 hover:bg-red-900/30" onClick={() => removeLine(i)}>
                <Trash2 size={15} />
              </button>
            </div>
          );
        })}
        <datalist id="catalog-list">
          {catalogItems.map((c) => <option key={c.id} value={c.name} />)}
        </datalist>
        <div className="flex gap-2 mt-3">
          <button className="btn-ghost" onClick={() => addLine()}><Plus size={15} /> Blank line</button>
          {catalogItems.length > 0 && (
            <select className="field !w-64" value=""
              onChange={(e) => {
                const hit = catalogItems.find((c) => String(c.id) === e.target.value);
                if (hit) addLine(hit);
              }}>
              <option value="">+ Add from catalog…</option>
              {catalogItems.map((c) => (
                <option key={c.id} value={c.id}>{c.name} — {fmt(c.default_price_cents)}/{c.unit}</option>
              ))}
            </select>
          )}
          {catalogItems.length === 0 && (
            <span className="text-xs text-slate-500 self-center flex items-center gap-1">
              <PackagePlus size={14} /> Tip: save recurring services in the price catalog
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Notes */}
        <div className="card p-4 col-span-2">
          <label className="label">Notes for the client</label>
          <textarea className="field min-h-24" value={quote.notes}
            onChange={(e) => patch({ notes: e.target.value })}
            placeholder="Scope assumptions, exclusions, scheduling…" />
        </div>

        {/* Totals */}
        <div className="card p-4">
          <div className="space-y-2 text-sm">
            <Row label="Subtotal" value={fmt(totals.subtotal)} />
            {totals.lineDiscounts > 0 && <Row label="Line discounts" value={'-' + fmt(totals.lineDiscounts)} />}
            <div className="flex items-center gap-2">
              <select className="field !w-24 !px-1.5" value={quote.discount_type}
                onChange={(e) => patch({ discount_type: e.target.value, discount_value: 0 })}>
                <option value="">No discount</option>
                <option value="flat">{sym} off</option>
                <option value="percent">% off</option>
              </select>
              {quote.discount_type === 'flat' && (
                <MoneyInput cents={quote.discount_value} onCents={(c) => patch({ discount_value: c })} sym={sym} />
              )}
              {quote.discount_type === 'percent' && (
                <input className="field text-right" type="number" min="0" max="100" step="any"
                  value={quote.discount_value} onChange={(e) => patch({ discount_value: e.target.value })} />
              )}
              {totals.quoteDiscount > 0 && <span className="text-slate-400 whitespace-nowrap">-{fmt(totals.quoteDiscount)}</span>}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400 whitespace-nowrap">Tax %</span>
              <input className="field !w-20 text-right" type="number" min="0" step="any" value={quote.tax_rate}
                onChange={(e) => patch({ tax_rate: e.target.value })} />
              <span className="text-slate-400 ml-auto">{fmt(totals.tax)}</span>
            </div>
            <div className="border-t border-ink-700 pt-2 flex justify-between items-baseline">
              <span className="font-semibold">Total</span>
              <span className="text-xl font-bold text-accent-400">{fmt(totals.total)}</span>
            </div>
            {totals.optionalTotal > 0 && (
              <div className="text-[11px] text-amber-400/80">
                + {fmt(totals.optionalTotal)} in optional items (not included)
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-400">{label}</span>
      <span>{value}</span>
    </div>
  );
}
