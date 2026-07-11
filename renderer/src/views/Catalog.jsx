import React, { useState } from 'react';
import { Plus, Pencil, Trash2, Package, X, Check } from 'lucide-react';

const api = window.quotewell;

const EMPTY = { name: '', description: '', unit: 'each', default_price_cents: 0 };

export default function Catalog({ items, settings, onChanged }) {
  const [editing, setEditing] = useState(null); // null | {id?, ...fields}
  const sym = settings?.currency_symbol || '$';
  const fmt = (c) => api.money.formatCents(c, sym);

  const save = async () => {
    if (editing.id) await api.catalog.update(editing.id, editing);
    else await api.catalog.create(editing);
    setEditing(null);
    onChanged();
  };
  const remove = async (id) => {
    if (!confirm('Remove this catalog item? Existing quotes keep their copied prices.')) return;
    await api.catalog.remove(id);
    onChanged();
  };

  return (
    <div>
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Price catalog</h1>
          <p className="text-sm text-slate-500 mt-1">Build it once — quote fast forever. Prices are copied into quotes, so editing here never changes past quotes.</p>
        </div>
        <button className="btn-primary" onClick={() => setEditing({ ...EMPTY })}><Plus size={16} /> Add item</button>
      </div>

      {editing && (
        <div className="card p-4 mb-4 border-accent-600/40">
          <div className="grid grid-cols-[2fr_1fr_1fr_auto] gap-3 items-end">
            <div>
              <label className="label">Name</label>
              <input autoFocus className="field" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Site visit / consultation" />
            </div>
            <div>
              <label className="label">Unit</label>
              <input className="field" value={editing.unit} onChange={(e) => setEditing({ ...editing, unit: e.target.value })} placeholder="each / hour / sq ft" />
            </div>
            <div>
              <label className="label">Default price ({sym})</label>
              <input className="field text-right" defaultValue={(editing.default_price_cents / 100).toFixed(2)}
                onBlur={(e) => setEditing({ ...editing, default_price_cents: api.money.parseMoney(e.target.value) })} />
            </div>
            <div className="flex gap-2">
              <button className="btn-primary" onClick={save}><Check size={15} /> Save</button>
              <button className="btn-ghost" onClick={() => setEditing(null)}><X size={15} /></button>
            </div>
          </div>
          <div className="mt-3">
            <label className="label">Description (shows on the quote)</label>
            <input className="field" value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} placeholder="What's included…" />
          </div>
        </div>
      )}

      {items.length === 0 && !editing ? (
        <div className="card p-12 text-center">
          <Package className="mx-auto text-slate-600 mb-3" size={40} />
          <p className="text-slate-400 font-medium">Your catalog is empty</p>
          <p className="text-sm text-slate-500 mt-1">Add the services and materials you quote most often.</p>
        </div>
      ) : (
        <div className="card divide-y divide-ink-800">
          {items.map((it) => (
            <div key={it.id} className="px-4 py-3 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{it.name}</div>
                {it.description && <div className="text-xs text-slate-500 truncate">{it.description}</div>}
              </div>
              <div className="text-right shrink-0">
                <div className="font-semibold">{fmt(it.default_price_cents)}</div>
                <div className="text-[11px] text-slate-500">per {it.unit}</div>
              </div>
              <div className="flex gap-1 shrink-0">
                <button className="p-2 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-ink-700" onClick={() => setEditing({ ...it })}><Pencil size={15} /></button>
                <button className="p-2 rounded-lg text-slate-500 hover:text-red-300 hover:bg-red-900/30" onClick={() => remove(it.id)}><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
