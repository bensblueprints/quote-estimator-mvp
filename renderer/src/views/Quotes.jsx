import React from 'react';
import { Copy, Trash2, FileDown, ThumbsUp, ThumbsDown, Send, RotateCcw, FileText } from 'lucide-react';

const api = window.quotewell;

const STATUS_STYLE = {
  draft: 'bg-slate-700/40 text-slate-300 border-slate-600/50',
  sent: 'bg-sky-900/40 text-sky-300 border-sky-800/60',
  won: 'bg-emerald-900/40 text-emerald-300 border-emerald-800/60',
  lost: 'bg-red-900/40 text-red-300 border-red-800/60'
};

export default function Quotes({ quotes, settings, onEdit, onChanged }) {
  const sym = settings?.currency_symbol || '$';
  const fmt = (c) => api.money.formatCents(c, sym);

  const setStatus = async (id, status) => { await api.quotes.setStatus(id, status); onChanged(); };
  const duplicate = async (id) => {
    const copy = await api.quotes.duplicate(id);
    onChanged();
    if (copy) onEdit(copy.id);
  };
  const remove = async (id) => {
    if (!confirm('Delete this quote permanently?')) return;
    await api.quotes.remove(id); onChanged();
  };
  const exportPdf = async (id) => { await api.quotes.exportPdf(id); };

  const wonTotal = quotes.filter((q) => q.status === 'won').reduce((a, q) => a + q.totals.total, 0);
  const openTotal = quotes.filter((q) => q.status === 'draft' || q.status === 'sent')
    .reduce((a, q) => a + q.totals.total, 0);

  return (
    <div>
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Quotes</h1>
          <p className="text-sm text-slate-500 mt-1">
            {quotes.length} quote{quotes.length === 1 ? '' : 's'} · open pipeline {fmt(openTotal)} · won {fmt(wonTotal)}
          </p>
        </div>
      </div>

      {quotes.length === 0 ? (
        <div className="card p-12 text-center">
          <FileText className="mx-auto text-slate-600 mb-3" size={40} />
          <p className="text-slate-400 font-medium">No quotes yet</p>
          <p className="text-sm text-slate-500 mt-1">
            Add your services to the price catalog, then hit “New quote”.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {quotes.map((q) => (
            <div key={q.id} className="card px-4 py-3 flex items-center gap-4 hover:border-ink-700 transition-colors">
              <button className="flex-1 min-w-0 text-left" onClick={() => onEdit(q.id)}>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-slate-500">{q.quote_number}</span>
                  <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full border ${STATUS_STYLE[q.status] || STATUS_STYLE.draft}`}>
                    {q.status}
                  </span>
                </div>
                <div className="font-medium mt-0.5 truncate">
                  {q.client_name || 'Unnamed client'}
                  {q.title ? <span className="text-slate-500"> — {q.title}</span> : null}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {q.line_count} line{q.line_count === 1 ? '' : 's'}
                  {q.valid_until ? ` · valid until ${q.valid_until}` : ''}
                </div>
              </button>
              <div className="text-right shrink-0">
                <div className="font-bold">{fmt(q.totals.total)}</div>
                {q.totals.tax > 0 && <div className="text-[11px] text-slate-500">incl. {fmt(q.totals.tax)} tax</div>}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {q.status !== 'won' && (
                  <IconBtn title="Mark won" onClick={() => setStatus(q.id, 'won')}><ThumbsUp size={15} /></IconBtn>
                )}
                {q.status !== 'lost' && (
                  <IconBtn title="Mark lost" onClick={() => setStatus(q.id, 'lost')}><ThumbsDown size={15} /></IconBtn>
                )}
                {q.status === 'draft' && (
                  <IconBtn title="Mark sent" onClick={() => setStatus(q.id, 'sent')}><Send size={15} /></IconBtn>
                )}
                {(q.status === 'won' || q.status === 'lost') && (
                  <IconBtn title="Back to draft" onClick={() => setStatus(q.id, 'draft')}><RotateCcw size={15} /></IconBtn>
                )}
                <IconBtn title="Duplicate for a similar job" onClick={() => duplicate(q.id)}><Copy size={15} /></IconBtn>
                <IconBtn title="Export PDF" onClick={() => exportPdf(q.id)}><FileDown size={15} /></IconBtn>
                <IconBtn title="Delete" danger onClick={() => remove(q.id)}><Trash2 size={15} /></IconBtn>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function IconBtn({ children, title, onClick, danger }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`p-2 rounded-lg transition-colors ${
        danger ? 'text-slate-500 hover:text-red-300 hover:bg-red-900/30'
               : 'text-slate-500 hover:text-slate-200 hover:bg-ink-700'
      }`}
    >
      {children}
    </button>
  );
}
