'use strict';

const { contextBridge, ipcRenderer } = require('electron');
// Pure money math is exposed synchronously so the editor can live-update totals
// with the EXACT same integer-cent logic used for storage and PDF export.
const { lineTotals, quoteTotals, formatCents, parseMoney } = require('./src/money');

const invoke = (channel) => (...args) => ipcRenderer.invoke(channel, ...args);

contextBridge.exposeInMainWorld('quotewell', {
  catalog: {
    list: invoke('catalog:list'),
    create: invoke('catalog:create'),
    update: invoke('catalog:update'),
    remove: invoke('catalog:delete')
  },
  quotes: {
    list: invoke('quotes:list'),
    get: invoke('quotes:get'),
    create: invoke('quotes:create'),
    update: invoke('quotes:update'),
    remove: invoke('quotes:delete'),
    duplicate: invoke('quotes:duplicate'),
    setStatus: invoke('quotes:setStatus'),
    exportPdf: invoke('quotes:exportPdf')
  },
  settings: {
    get: invoke('settings:get'),
    save: invoke('settings:save')
  },
  templates: {
    list: invoke('templates:list'),
    create: invoke('templates:create'),
    update: invoke('templates:update'),
    remove: invoke('templates:delete')
  },
  shell: { showItem: invoke('shell:showItem') },
  money: {
    lineTotals: (line) => lineTotals(line),
    quoteTotals: (quote, lines) => quoteTotals(quote, lines),
    formatCents: (cents, symbol) => formatCents(cents, symbol),
    parseMoney: (input) => parseMoney(input)
  }
});
