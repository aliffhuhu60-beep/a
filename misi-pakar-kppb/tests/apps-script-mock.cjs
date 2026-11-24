// Simulasi ringkas perkhidmatan Google Apps Script untuk menguji google-apps-script/Code.gs dalam Node.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');

function colToNum(c) { return c.split('').reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0); }
function parseA1(a1) {
  const [a, b] = a1.split(':');
  const p = (s) => { const m = /^([A-Z]+)(\d*)$/.exec(s); return [m[2] ? Number(m[2]) : 1000, colToNum(m[1])]; };
  const [r1, c1] = p(a);
  const [r2, c2] = b ? p(b) : [r1, c1];
  return [r1, c1, r2 - r1 + 1, c2 - c1 + 1];
}

class Sheet {
  constructor(name) { this.name = name; this.rows = []; this.hidden = []; }
  cell(r, c) { return (this.rows[r - 1] || [])[c - 1] ?? ''; }
  set(r, c, v) { while (this.rows.length < r) this.rows.push([]); this.rows[r - 1][c - 1] = v; }
  getLastRow() { for (let i = this.rows.length; i > 0; i--) if ((this.rows[i - 1] || []).some((v) => v !== '' && v !== undefined)) return i; return 0; }
  appendRow(vals) { this.rows[this.getLastRow()] = [...vals]; }
  getRange(r, c, nr = 1, nc = 1) {
    if (typeof r === 'string') [r, c, nr, nc] = parseA1(r);
    const sh = this;
    const chain = { setNumberFormat: () => chain, setFontWeight: () => chain, setBackground: () => chain, setFontColor: () => chain, setFontSize: () => chain };
    return Object.assign(chain, {
      setValues(v) { v.forEach((row, i) => row.forEach((x, j) => sh.set(r + i, c + j, x))); return chain; },
      setValue(v) { sh.set(r, c, v); return chain; },
      setFormula(v) { sh.set(r, c, v); return chain; },
      getValue() { return sh.cell(r, c); },
      getValues() { return Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => sh.cell(r + i, c + j))); },
      createTextFinder(text) {
        return { matchEntireCell() { return this; }, findNext() {
          for (let i = 0; i < nr; i++) for (let j = 0; j < nc; j++) if (String(sh.cell(r + i, c + j)) === text) return { getRow: () => r + i };
          return null;
        } };
      },
    });
  }
  setFrozenRows() {}
  hideColumns(c) { this.hidden.push(c); }
  setColumnWidth() {}
}

function createEnv() {
  const sheets = {};
  const files = [];
  const ss = {
    getSheetByName: (n) => sheets[n] || null,
    insertSheet: (n) => (sheets[n] = new Sheet(n)),
    getUrl: () => 'https://docs.google.com/spreadsheets/d/MOCK/edit',
  };
  const folder = { createFile: (blob) => { files.push(blob); return { getUrl: () => `https://drive.google.com/file/d/mock${files.length}/view` }; } };
  let folderMade = false;
  const ctx = {
    SpreadsheetApp: { getActiveSpreadsheet: () => ss },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    Utilities: {
      formatDate: (d, tz, fmt) => fmt.replace('yyyy', d.getFullYear()).replace('M', d.getMonth() + 1).replace('d', d.getDate()),
      getUuid: () => crypto.randomUUID(),
      base64Decode: (b) => [...Buffer.from(b, 'base64')],
      newBlob: (bytes, type, name) => ({ bytes, type, name }),
    },
    DriveApp: {
      getFoldersByName: () => ({ hasNext: () => folderMade, next: () => folder }),
      createFolder: () => { folderMade = true; return folder; },
    },
    ContentService: { createTextOutput: (s) => ({ content: s, setMimeType() { return this; } }), MimeType: { JSON: 'json' } },
    console,
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'google-apps-script', 'Code.gs'), 'utf8'), ctx);
  return {
    ctx, sheets, files,
    post: (obj) => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(obj) } }).content),
    get: (params) => JSON.parse(ctx.doGet({ parameter: params }).content),
  };
}

module.exports = { createEnv };
