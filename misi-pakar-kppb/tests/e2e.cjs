// Ujian hujung-ke-hujung dengan Playwright.
// Jalankan: npm run build && npx vite preview --port 4173 (terminal lain), kemudian: node tests/e2e.cjs
// Pilihan: BASE_URL=http://localhost:4173/ PATTERNS=0,2,4,6,8,10 OUT=./test-output
const { chromium, devices } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = process.env.BASE_URL || 'http://localhost:4173/';
const PATTERNS = (process.env.PATTERNS || '0,2,4,6,8,10').split(',').map(Number);
const OUT = process.env.OUT || path.join(__dirname, '..', 'test-output');
const KEY = [1, 0, 1, 2, 1, 2, 1, 2, 0, 3]; // B A B C B C B C A D
const RANK = (n) => (n <= 1 ? ['PEMULA KPPB', 'TIADA'] : n <= 3 ? ['PERANTIS KPPB', 'GANGSA'] : n <= 5 ? ['PENJELAJAH KPPB', 'PERAK'] : n <= 7 ? ['PENGAMAL KPPB', 'EMAS'] : n <= 9 ? ['STRATEGIS KPPB', 'PLATINUM'] : ['PAKAR KPPB', 'BERLIAN']);

let sheetEnv = null;
const { execFileSync } = require('child_process');
function pdfText(p) { try { return execFileSync('pdftotext', [p, '-'], { encoding: 'utf8' }); } catch { return null; } }

function assert(c, msg) { if (!c) throw new Error('GAGAL: ' + msg); }

async function gatePos(page, i) {
  return page.evaluate((i) => {
    const w = window.__kppb.world;
    const g = w.gates[i].group;
    const v = g.getWorldPosition(g.position.clone());
    v.y += 2.5;
    return { ...w.screenPos(v), W: innerWidth, H: innerHeight };
  }, i);
}

async function cameraSettled(page) {
  for (let k = 0; k < 40; k++) {
    const a = await page.evaluate(() => (({ x, y, z, h }) => [x, y, z, h].map((v) => v.toFixed(3)).join(','))(window.__kppb.world.cam) + window.__kppb.world.busy);
    await page.waitForTimeout(120);
    const b = await page.evaluate(() => (({ x, y, z, h }) => [x, y, z, h].map((v) => v.toFixed(3)).join(','))(window.__kppb.world.cam) + window.__kppb.world.busy);
    if (a === b && !b.endsWith('true')) return;
  }
}

async function clickGate(page, i) {
  for (let attempt = 0; attempt < 3; attempt++) {
    await cameraSettled(page);
    await clickGateOnce(page, i);
    try {
      await page.waitForSelector('#modal-question.open', { timeout: 20000 });
      return;
    } catch {
      console.warn(`  (cubaan semula klik portal ${i + 1})`);
    }
  }
  await page.screenshot({ path: path.join(OUT, `gagal_portal_${i + 1}.png`) });
  throw new Error(`GAGAL: portal ${i + 1} tidak dibuka`);
}

async function clickGateOnce(page, i) {
  // klik pada kedudukan skrin sebenar portal 3D (menguji raycast)
  let pos = await gatePos(page, i);
  if (pos.x < 30 || pos.x > pos.W - 30 || pos.y < 170 || pos.y > pos.H - 150) {
    // seperti pemain menyeret kamera: pusatkan pada portal
    await page.evaluate((i) => {
      const w = window.__kppb.world;
      const v = w.gates[i].group.getWorldPosition(w.gates[i].group.position.clone());
      w.cam.x = v.x; w.cam.z = v.z;
    }, i);
    await page.waitForTimeout(150);
    pos = await gatePos(page, i);
  }
  await page.mouse.click(pos.x, pos.y);
}

async function run(nCorrect, opts = {}) {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await browser.newContext({ acceptDownloads: true, ...(opts.device || { viewport: { width: 1366, height: 800 } }) });
  if (process.env.SHEET_MOCK) {
    // Simulasi Web App Google Apps Script (Code.gs sebenar dijalankan dalam Node)
    const { createEnv } = require('./apps-script-mock.cjs');
    sheetEnv = sheetEnv || createEnv();
    const env = sheetEnv;
    await ctx.route('https://script.google.com/**', async (route) => {
      const req = route.request();
      const body = req.method() === 'POST' ? env.post(JSON.parse(req.postData())) : env.get(Object.fromEntries(new URL(req.url()).searchParams));
      await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) });
    });
  }
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(BASE);
  await page.waitForSelector('#loading.done', { state: 'attached', timeout: 30000 });

  // Kuiz tidak boleh diakses sebelum belajar: MULA MISI membawa ke pembelajaran
  await page.click('#btnStart');
  await page.waitForSelector('#screen-learn.active');
  // butang SELESAI BELAJAR hanya muncul di slaid 8 dan perlu semua slaid dibaca
  assert(await page.isHidden('#btnFinishLearn'), 'SELESAI BELAJAR tersembunyi sebelum slaid 8');
  for (let s = 2; s <= 8; s++) {
    await page.click('#btnNext');
    const t = await page.textContent('#learnCount');
    assert(t.includes(`${s}/8`), `penunjuk slaid ${s}/8 (dapat "${t}")`);
  }
  assert(await page.isEnabled('#btnFinishLearn'), 'SELESAI BELAJAR aktif selepas 8/8');
  await page.click('#btnFinishLearn');
  await page.waitForSelector('#screen-arena.active', { timeout: 10000 });
  await page.waitForTimeout(1200);
  if (opts.shots) await page.screenshot({ path: path.join(OUT, `${opts.tag}_arena.png`) });

  let rankUps = 0;
  for (let i = 0; i < 10; i++) {
    const choice = i < nCorrect ? KEY[i] : (KEY[i] + 1) % 4;
    await clickGate(page, i);
    assert(await page.isDisabled('#qSubmit'), 'SAHKAN dilumpuhkan sebelum pilihan');
    assert(await page.isHidden('#qFeedback'), 'jawapan tidak didedahkan sebelum memilih');
    await page.click(`#qOptions .opt[data-k="${choice}"]`);
    if (opts.shots && i === 0) await page.screenshot({ path: path.join(OUT, `${opts.tag}_question.png`) });
    await page.click('#qSubmit');
    const fb = await page.textContent('#fbTitle');
    assert(i < nCorrect ? fb.startsWith('BETUL') : fb.startsWith('CUBA LAGI'), `maklum balas soalan ${i + 1}: ${fb}`);
    // jawapan dikunci
    assert(await page.isDisabled(`#qOptions .opt[data-k="${(choice + 1) % 4}"]`), 'pilihan dikunci selepas dihantar');
    if (opts.shots && i === 0) await page.screenshot({ path: path.join(OUT, `${opts.tag}_feedback.png`) });
    const score = await page.evaluate(() => window.__kppb.computeResult().score);
    assert(score === Math.min(i + 1, nCorrect) * 10, `mata selepas soalan ${i + 1} = ${score}`);
    await page.click('#qContinue');
    await page.waitForTimeout(300);
    if (await page.isVisible('#modal-rankup')) {
      rankUps++;
      if (opts.shots && rankUps === 1) { await page.waitForTimeout(900); await page.screenshot({ path: path.join(OUT, `${opts.tag}_rankup.png`) }); }
      await page.click('#rankupOk');
      await page.waitForTimeout(300);
    }
    await page.waitForTimeout(1200);
  }
  const expectedRankUps = [2, 4, 6, 8, 10].filter((t) => nCorrect >= t).length;
  assert(rankUps === expectedRankUps, `bilangan animasi naik pangkat ${rankUps} (jangka ${expectedRankUps})`);

  await page.waitForSelector('#modal-results.open', { timeout: 10000 });
  await page.waitForTimeout(900);
  if (opts.shots) await page.screenshot({ path: path.join(OUT, `${opts.tag}_results.png`) });
  const stats = await page.textContent('#resultsStats');
  const [rankName, badge] = RANK(nCorrect);
  assert(stats.includes(`JAWAPAN BETUL${nCorrect}`), 'statistik jawapan betul');
  assert(stats.includes(`JAWAPAN SALAH${10 - nCorrect}`), 'statistik jawapan salah');
  assert(stats.includes(`JUMLAH MARKAH${nCorrect * 10}/100`), 'statistik markah');
  assert(stats.includes(`PERATUS PENCAPAIAN${nCorrect * 10}%`), 'statistik peratus');
  assert(stats.includes(rankName), `pangkat ${rankName}`);
  assert(stats.toUpperCase().includes(badge), `lencana ${badge}`);
  const msg = await page.textContent('#resultsMsg');
  assert(nCorrect === 10 ? msg.includes('ANDA TELAH MENJADI PAKAR KPPB') : msg.includes('TAHNIAH ATAS USAHA ANDA'), 'mesej keputusan');

  // prestasi
  await page.click('#btnPerf');
  assert((await page.$$('#perfList .perf.ok')).length === nCorrect, 'senarai prestasi');
  await page.click('#modal-perf [data-close]');

  // sijil: borang kosong ditolak
  await page.click('#btnCert');
  await page.waitForSelector('#modal-cert.open');
  await page.click('#btnGenerate');
  assert((await page.textContent('#errName')).length > 0 && (await page.textContent('#errKelas')).length > 0, 'borang kosong ditolak');
  const name = nCorrect === 10 ? 'Nur Aisyah binti Ahmad' : `Pelajar Ujian ${nCorrect}`;
  const kelas = `PISMP Ambilan ${nCorrect}`;
  await page.fill('#inName', name);
  await page.fill('#inKelas', kelas);
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), page.click('#btnGenerate')]);
  const fname = dl.suggestedFilename();
  assert(fname === `Sijil_Pencapaian_${name.replace(/ /g, '_')}.pdf`, `nama fail ${fname}`);
  const pdfPath = path.join(OUT, fname);
  await dl.saveAs(pdfPath);
  await page.waitForFunction(() => document.querySelector('#certStatus').textContent.includes('dimuat turun'));
  const txt = pdfText(pdfPath);
  if (txt) {
    assert(txt.includes(name), 'nama dalam PDF');
    assert(txt.includes(kelas), 'kelas dalam PDF');
    assert(txt.includes(`${nCorrect * 10}/100`) && txt.includes(`${nCorrect}/10`), 'markah dalam PDF');
    assert(txt.includes(rankName), 'pangkat dalam PDF');
  }
  if (process.env.SHEET_MOCK) {
    await page.waitForSelector('#sheetStatus.ok', { timeout: 20000 });
    const id = txt && /No\. Sijil: (KPPB-\d{8}-[A-Z0-9]{4})/.exec(txt);
    assert(!txt || id, 'No. Sijil dalam PDF');
    const row = sheetEnv.sheets.Rekod_Sijil.rows.find((r) => r[2] === name && r[3] === kelas);
    assert(row && row[4] === nCorrect * 10 && row[8] === rankName, 'baris Google Sheet tepat');
    if (id) assert(row[1] === id[1], 'No. Sijil Sheet = No. Sijil PDF');
    for (let k = 0; k < 40 && !String(row[12]).includes('drive.google.com'); k++) await page.waitForTimeout(250);
    assert(String(row[12]).includes('drive.google.com'), 'pautan PDF dalam Google Sheet');
  }
  if (opts.shots) await page.screenshot({ path: path.join(OUT, `${opts.tag}_cert.png`) });

  // ulangi permainan
  await page.click('#modal-cert [data-close]').catch(() => {});
  await page.evaluate(() => document.querySelector('#modal-cert').classList.remove('open'));
  await page.click('#btnReplay');
  const after = await page.evaluate(() => window.__kppb.computeResult());
  assert(after.answered === 0 && after.score === 0, 'ulangi permainan menetapkan semula kuiz');

  assert(errors.length === 0, 'ralat JavaScript: ' + errors.join(' | '));
  await browser.close();
  return { nCorrect, rankUps, pdfPath, name, kelas };
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const results = [];
  for (const n of PATTERNS) {
    const t0 = Date.now();
    const r = await run(n, { shots: n === 10 || n === 4, tag: `d${n}` });
    console.log(`✔ ${n}/10 betul — ${r.rankUps} naik pangkat — ${path.basename(r.pdfPath)} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
    results.push(r);
  }
  if (process.env.MOBILE !== '0') {
    const r = await run(8, { device: devices['iPhone 13'], shots: true, tag: 'mobile' });
    console.log(`✔ telefon (iPhone 13) 8/10 — ${path.basename(r.pdfPath)}`);
    results.push(r);
  }
  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 2));
  console.log('SEMUA UJIAN E2E LULUS');
})().catch((e) => { console.error(e); process.exit(1); });
