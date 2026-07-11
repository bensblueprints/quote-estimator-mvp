'use strict';

// Quotewell — thin Electron shell. All business logic lives in src/ (plain Node).

const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');

const { openDb } = require('./src/db');
const catalog = require('./src/catalog');
const quotes = require('./src/quotes');
const settings = require('./src/settings');
const { quoteHtml } = require('./src/quotehtml');

let win = null;
let db = null;

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: '#0b0d12',
    autoHideMenuBar: true,
    title: 'Quotewell',
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false // preload requires src/money.js for synchronous totals
    }
  });
  win.loadFile(path.join(__dirname, 'dist', 'index.html'));
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
}

// ---------- IPC: thin glue over src/ modules ----------

const wrap = (fn) => (_e, ...args) => fn(db, ...args);

ipcMain.handle('catalog:list', wrap(catalog.listItems));
ipcMain.handle('catalog:create', wrap(catalog.createItem));
ipcMain.handle('catalog:update', wrap(catalog.updateItem));
ipcMain.handle('catalog:delete', wrap(catalog.deleteItem));

ipcMain.handle('quotes:list', wrap(quotes.listQuotes));
ipcMain.handle('quotes:get', wrap(quotes.getQuote));
ipcMain.handle('quotes:create', wrap(quotes.createQuote));
ipcMain.handle('quotes:update', wrap(quotes.updateQuote));
ipcMain.handle('quotes:delete', wrap(quotes.deleteQuote));
ipcMain.handle('quotes:duplicate', wrap(quotes.duplicateQuote));
ipcMain.handle('quotes:setStatus', wrap(quotes.setStatus));

ipcMain.handle('settings:get', wrap(settings.getSettings));
ipcMain.handle('settings:save', wrap(settings.saveSettings));
ipcMain.handle('templates:list', wrap(settings.listTemplates));
ipcMain.handle('templates:create', wrap(settings.createTemplate));
ipcMain.handle('templates:update', wrap(settings.updateTemplate));
ipcMain.handle('templates:delete', wrap(settings.deleteTemplate));

// ---------- PDF export via printToPDF ----------

ipcMain.handle('quotes:exportPdf', async (_e, quoteId) => {
  const quote = quotes.getQuote(db, quoteId);
  if (!quote) return { ok: false, error: 'quote not found' };
  const tpl = settings.getTemplate(db, quote.template_id);
  const biz = settings.getSettings(db);

  const safeClient = (quote.client_name || 'quote').replace(/[^a-z0-9 _-]/gi, '').trim() || 'quote';
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: 'Export quote as PDF',
    defaultPath: `${quote.quote_number} ${safeClient}.pdf`,
    filters: [{ name: 'PDF', extensions: ['pdf'] }]
  });
  if (canceled || !filePath) return { ok: false, canceled: true };

  const html = quoteHtml(quote, tpl, biz);
  const printWin = new BrowserWindow({ show: false, webPreferences: { sandbox: false } });
  try {
    await printWin.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
    const pdf = await printWin.webContents.printToPDF({ pageSize: 'Letter', printBackground: true });
    fs.writeFileSync(filePath, pdf);
    return { ok: true, path: filePath };
  } catch (err) {
    return { ok: false, error: err.message };
  } finally {
    printWin.destroy();
  }
});

ipcMain.handle('shell:showItem', (_e, p) => { shell.showItemInFolder(p); return true; });

// ---------- lifecycle ----------

app.whenReady().then(() => {
  if (process.platform === 'win32') app.setAppUserModelId('com.bensblueprints.quotewell');
  db = openDb(path.join(app.getPath('userData'), 'quotewell.db'));
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (db) { try { db.close(); } catch { /* ignore */ } db = null; }
  if (process.platform !== 'darwin') app.quit();
});
