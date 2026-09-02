// Negative check: text overlap / clipping audit for the K family at several widths.
const { chromium } = require('playwright');
(async () => {
  const url = process.argv[2]; const widths = (process.argv[3] || '1440,1280,1024,390').split(',').map(Number);
  const b = await chromium.launch({ executablePath: process.env.PW_EXE });
  for (const w of widths) {
    const ctx = await b.newContext({ viewport: { width: w, height: 900 }, isMobile: w < 600 }); const p = await ctx.newPage();
    await p.addInitScript(() => { try { localStorage.setItem('mn_cookie_consent', JSON.stringify({ value: 'essential-only', ts: Date.now() })); } catch {} });
    await p.goto(url, { waitUntil: 'networkidle', timeout: 90000 }); await p.waitForTimeout(4500);
    // scroll through the page so scroll-triggered classes/animations settle, then audit in the final state
    const H = await p.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y <= H; y += 700) { await p.evaluate((yy) => window.scrollTo(0, yy), y); await p.waitForTimeout(250); }
    await p.waitForTimeout(2500);
    const res = await p.evaluate(() => {
      const out = [];
      const rect = (el) => el.getBoundingClientRect();
      const inter = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
      const txt = (el) => (el.textContent || '').trim().slice(0, 30);
      // pairs: big word vs sibling column
      document.querySelectorAll('.force').forEach((f) => { const wd = f.querySelector('.word'), col = f.querySelector('.word + div'); if (wd && col) { const i = inter(rect(wd), rect(col)); if (i > 200) out.push(['force word overlaps text', txt(wd), Math.round(i)]); } });
      document.querySelectorAll('.art').forEach((a) => { const n = a.querySelector('.num'), h = a.querySelector('h3'); if (n && h) { const i = inter(rect(n), rect(h)); if (i > 50) out.push(['insight number overlaps title', txt(n), Math.round(i)]); } const r = rect(a); if (r.right > innerWidth + 1) out.push(['insight row overflows', txt(a), Math.round(r.right - innerWidth)]); });
      const spine = document.querySelector('.spine'); if (spine && getComputedStyle(spine).display !== 'none') { const r = rect(spine); if (spine.scrollWidth > r.width + 2 || spine.scrollHeight > r.height + 2) out.push(['spine clipped/overflow', txt(spine), spine.scrollWidth + 'x' + spine.scrollHeight]); }
      // any text element clipped horizontally by viewport
      document.querySelectorAll('h1,h2,h3,p,li,span.l,.num,.big,.word').forEach((el) => { const r = rect(el); if (r.width && (r.right > innerWidth + 1 || r.left < -1)) out.push(['text beyond viewport', txt(el), Math.round(r.right - innerWidth)]); });
      // mid-word breaks: elements with explicit <br> count vs rendered line count
      document.querySelectorAll('h1,h2,.big,.force h3,.art h3').forEach((el) => { const cs = getComputedStyle(el); const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2; const lines = Math.round(el.getBoundingClientRect().height / lh); const brs = el.querySelectorAll('br').length; if (lines > brs + 1 && cs.whiteSpace !== 'nowrap') out.push(['extra line break', txt(el), lines + ' lines vs ' + (brs + 1)]); });
      // headings overlapping the fixed nav band (top 76px) in final state is fine; skip
      return out;
    });
    console.log(w + 'px: ' + (res.length ? JSON.stringify(res) : 'clean')); await ctx.close();
  }
  await b.close();
})();
