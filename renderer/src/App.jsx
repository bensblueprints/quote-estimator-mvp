import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Package, Settings as SettingsIcon, Plus } from 'lucide-react';
import Quotes from './views/Quotes.jsx';
import QuoteEditor from './views/QuoteEditor.jsx';
import Catalog from './views/Catalog.jsx';
import Settings from './views/Settings.jsx';

const api = window.quotewell;

const NAV = [
  { id: 'quotes', label: 'Quotes', icon: FileText },
  { id: 'catalog', label: 'Price catalog', icon: Package },
  { id: 'settings', label: 'Business & templates', icon: SettingsIcon }
];

export default function App() {
  const [view, setView] = useState('quotes');
  const [editingId, setEditingId] = useState(null); // null = list, 0 = new, >0 = edit
  const [quotes, setQuotes] = useState([]);
  const [catalogItems, setCatalogItems] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [settings, setSettings] = useState(null);

  const refresh = useCallback(async () => {
    const [q, c, t, s] = await Promise.all([
      api.quotes.list(), api.catalog.list(), api.templates.list(), api.settings.get()
    ]);
    setQuotes(q); setCatalogItems(c); setTemplates(t); setSettings(s);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const openEditor = (id) => { setView('quotes'); setEditingId(id); };
  const closeEditor = async () => { setEditingId(null); await refresh(); };

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 border-r border-ink-800 bg-ink-900 flex flex-col">
        <div className="px-5 py-5 border-b border-ink-800">
          <div className="text-lg font-bold tracking-tight">
            Quote<span className="text-accent-400">well</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Quotes & estimates, owned forever</div>
        </div>
        <nav className="p-3 space-y-1 flex-1">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => { setView(id); setEditingId(null); }}
              className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                view === id ? 'bg-accent-600/15 text-accent-400 font-medium' : 'text-slate-400 hover:bg-ink-800 hover:text-slate-200'
              }`}
            >
              <Icon size={16} /> {label}
            </button>
          ))}
        </nav>
        <div className="p-3">
          <button className="btn-primary w-full justify-center" onClick={() => openEditor(0)}>
            <Plus size={16} /> New quote
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={view + ':' + String(editingId)}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="p-6 max-w-6xl mx-auto"
          >
            {view === 'quotes' && editingId === null && (
              <Quotes quotes={quotes} settings={settings} onEdit={openEditor} onChanged={refresh} />
            )}
            {view === 'quotes' && editingId !== null && (
              <QuoteEditor
                quoteId={editingId || null}
                catalogItems={catalogItems}
                templates={templates}
                settings={settings}
                onClose={closeEditor}
              />
            )}
            {view === 'catalog' && (
              <Catalog items={catalogItems} settings={settings} onChanged={refresh} />
            )}
            {view === 'settings' && settings && (
              <Settings settings={settings} templates={templates} onChanged={refresh} />
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
