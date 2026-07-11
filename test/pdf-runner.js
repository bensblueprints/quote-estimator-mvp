/**
 * Runs inside Electron (spawned by test/smoke.js).
 * Builds a real quote in a temp SQLite db, renders it with quoteHtml and
 * exports a real PDF via printToPDF — the exact code path the Export PDF
 * button uses. Usage: electron test/pdf-runner.js <outFile>
 */
'use strict';

const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { openDb } = require('../src/db');
const quotes = require('../src/quotes');
const settings = require('../src/settings');
const { quoteHtml } = require('../src/quotehtml');

const outFile = process.argv[2] || path.join(__dirname, 'out', 'quote.pdf');

app.setPath('userData', path.join(os.tmpdir(), 'quotewell-pdf-test-' + process.pid));
app.disableHardwareAcceleration();

app.whenReady().then(async () => {
  let tmp = null;
  try {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'quotewell-pdfdb-'));
    const db = openDb(path.join(tmp, 'quotewell.db'));
    const q = quotes.createQuote(db, {
      title: 'Kitchen remodel',
      client_name: 'Jane Doe',
      valid_until: '2026-08-15',
      tax_rate: 8.25,
      lines: [
        { item_name: 'Site consultation', qty: 2, unit_price_cents: 15000, discount_type: 'flat', discount_value: 2500 },
        { item_name: 'Fixture pack', qty: 3, unit_price_cents: 1999, discount_type: 'percent', discount_value: 10 },
        { item_name: 'Premium upgrade', qty: 1, unit_price_cents: 50000, optional: 1 }
      ]
    });
    const html = quoteHtml(q, settings.getTemplate(db, null), settings.getSettings(db));
    db.close();

    const win = new BrowserWindow({ show: false, webPreferences: { sandbox: false } });
    await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
    const pdf = await win.webContents.printToPDF({ pageSize: 'Letter', printBackground: true });
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    fs.writeFileSync(outFile, pdf);
    console.log('PDF_OK ' + outFile + ' ' + pdf.length);
    if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
    app.exit(0);
  } catch (err) {
    console.error('PDF_FAIL ' + ((err && err.stack) || err));
    if (tmp) try { fs.rmSync(tmp, { recursive: true, force: true }); } catch { /* ignore */ }
    app.exit(1);
  }
});
