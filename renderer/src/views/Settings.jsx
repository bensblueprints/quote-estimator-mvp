import React, { useRef, useState } from 'react';
import { Save, Plus, Trash2, Image as ImageIcon, X } from 'lucide-react';

const api = window.quotewell;

export default function Settings({ settings, templates, onChanged }) {
  const [biz, setBiz] = useState({ ...settings });
  const [flash, setFlash] = useState('');
  const [tplEdit, setTplEdit] = useState(null);
  const fileRef = useRef(null);

  const saveBiz = async () => {
    await api.settings.save(biz);
    setFlash('Saved'); setTimeout(() => setFlash(''), 1500);
    onChanged();
  };

  const pickLogo = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setBiz((b) => ({ ...b, logo_data_url: String(reader.result) }));
    reader.readAsDataURL(f);
  };

  const saveTpl = async () => {
    if (tplEdit.id) await api.templates.update(tplEdit.id, tplEdit);
    else await api.templates.create(tplEdit);
    setTplEdit(null);
    onChanged();
  };
  const removeTpl = async (t) => {
    if (t.is_default) return;
    if (!confirm(`Delete template "${t.name}"?`)) return;
    await api.templates.remove(t.id);
    onChanged();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Business & templates</h1>
        <p className="text-sm text-slate-500 mt-1">Branding and terms boilerplate that appear on every exported quote.</p>
      </div>

      {/* Branding */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Your business</h2>
          <button className="btn-primary" onClick={saveBiz}>
            <Save size={15} /> Save {flash && <span className="text-emerald-200 text-xs">✓</span>}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Business name</label>
            <input className="field" value={biz.business_name} onChange={(e) => setBiz({ ...biz, business_name: e.target.value })} />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="field" value={biz.business_email} onChange={(e) => setBiz({ ...biz, business_email: e.target.value })} />
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="field" value={biz.business_phone} onChange={(e) => setBiz({ ...biz, business_phone: e.target.value })} />
          </div>
          <div>
            <label className="label">Address</label>
            <input className="field" value={biz.business_address} onChange={(e) => setBiz({ ...biz, business_address: e.target.value })} />
          </div>
          <div>
            <label className="label">Accent color</label>
            <div className="flex gap-2 items-center">
              <input type="color" className="h-9 w-12 rounded-lg bg-ink-800 border border-ink-700 cursor-pointer"
                value={biz.accent_color} onChange={(e) => setBiz({ ...biz, accent_color: e.target.value })} />
              <input className="field !w-28 font-mono text-xs" value={biz.accent_color}
                onChange={(e) => setBiz({ ...biz, accent_color: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">Currency symbol</label>
            <input className="field !w-20" value={biz.currency_symbol} onChange={(e) => setBiz({ ...biz, currency_symbol: e.target.value })} />
          </div>
          <div className="col-span-2">
            <label className="label">Logo (appears on PDF header)</label>
            <div className="flex items-center gap-3">
              {biz.logo_data_url
                ? <img src={biz.logo_data_url} alt="logo" className="h-12 max-w-40 object-contain rounded bg-white/90 p-1" />
                : <div className="h-12 w-24 rounded-lg border border-dashed border-ink-700 flex items-center justify-center text-slate-600"><ImageIcon size={18} /></div>}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickLogo} />
              <button className="btn-ghost" onClick={() => fileRef.current?.click()}>Choose image…</button>
              {biz.logo_data_url && <button className="btn-ghost" onClick={() => setBiz({ ...biz, logo_data_url: '' })}><X size={14} /> Remove</button>}
            </div>
          </div>
        </div>
      </div>

      {/* Templates */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold">Quote templates</h2>
            <p className="text-xs text-slate-500 mt-0.5">Cover note + terms boilerplate, selectable per quote.</p>
          </div>
          <button className="btn-ghost" onClick={() => setTplEdit({ name: '', cover_note: '', terms: '', accent_color: biz.accent_color })}>
            <Plus size={15} /> New template
          </button>
        </div>

        {tplEdit && (
          <div className="rounded-xl border border-accent-600/40 p-4 mb-4 space-y-3">
            <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
              <div>
                <label className="label">Template name</label>
                <input autoFocus className="field" value={tplEdit.name} onChange={(e) => setTplEdit({ ...tplEdit, name: e.target.value })} />
              </div>
              <div className="flex gap-2">
                <button className="btn-primary" onClick={saveTpl}><Save size={15} /> Save</button>
                <button className="btn-ghost" onClick={() => setTplEdit(null)}><X size={15} /></button>
              </div>
            </div>
            <div>
              <label className="label">Cover note (top of quote)</label>
              <textarea className="field min-h-16" value={tplEdit.cover_note} onChange={(e) => setTplEdit({ ...tplEdit, cover_note: e.target.value })} />
            </div>
            <div>
              <label className="label">Terms boilerplate (bottom of quote)</label>
              <textarea className="field min-h-28" value={tplEdit.terms} onChange={(e) => setTplEdit({ ...tplEdit, terms: e.target.value })} />
            </div>
            <div>
              <label className="label">Accent color for this template</label>
              <input type="color" className="h-9 w-12 rounded-lg bg-ink-800 border border-ink-700 cursor-pointer"
                value={tplEdit.accent_color} onChange={(e) => setTplEdit({ ...tplEdit, accent_color: e.target.value })} />
            </div>
          </div>
        )}

        <div className="divide-y divide-ink-800">
          {templates.map((t) => (
            <div key={t.id} className="py-3 flex items-center gap-4">
              <span className="h-4 w-4 rounded-full shrink-0" style={{ background: t.accent_color }} />
              <button className="flex-1 min-w-0 text-left" onClick={() => setTplEdit({ ...t })}>
                <div className="font-medium">
                  {t.name} {t.is_default ? <span className="text-[10px] uppercase tracking-wider text-accent-400 ml-1">default</span> : null}
                </div>
                <div className="text-xs text-slate-500 truncate">{t.terms.split('\n')[0] || 'No terms yet'}</div>
              </button>
              {!t.is_default && (
                <button className="p-2 rounded-lg text-slate-500 hover:text-red-300 hover:bg-red-900/30" onClick={() => removeTpl(t)}>
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
