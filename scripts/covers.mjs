// Renders the two project cover PNGs (screenshot on a tinted backdrop, tilted bezel) at 2x.
// Local step, not part of the Action. Needs Playwright:
//   PLAYWRIGHT=~/.claude/scripts/node_modules/playwright/index.js node scripts/covers.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const pw = await import(process.env.PLAYWRIGHT ?? 'playwright');
const { chromium } = pw.default ?? pw;

const W = 406, H = 240;
const covers = [
  { name: 'bookswipe', src: 'assets/src/bookswipe-1440.jpg', bg: '#f3b84b', glow: 'rgba(255,255,255,0.45)', glowAt: '20% 15%', shadow: 'rgba(60,30,0,0.35)', bezel: '#ffffff' },
  { name: 'timescroll', src: 'assets/src/timescroll-1440.jpg', bg: '#101317', glow: 'rgba(212,168,67,0.45)', glowAt: '80% 20%', shadow: 'rgba(0,0,0,0.6)', bezel: '#2a2f38', border: '#30363d' },
];

const html = (c, dataUri) => `<!doctype html><html><head><meta charset="utf-8"><style>
  html, body { margin: 0; background: transparent; }
  .card { width: ${W}px; height: ${H}px; border-radius: 12px; overflow: hidden; position: relative; background: ${c.bg}; box-sizing: border-box; border: 1px solid ${c.border ?? 'transparent'}; }
  .glow { position: absolute; inset: 0; background: radial-gradient(circle at ${c.glowAt}, ${c.glow}, transparent 55%); }
  .shot { position: absolute; left: 40px; top: 36px; width: 420px; height: 262px; border-radius: 10px; overflow: hidden;
          box-shadow: 0 20px 40px ${c.shadow}; transform: rotate(-4deg); border: 3px solid ${c.bezel}; box-sizing: border-box; }
  .shot img { width: 100%; height: 100%; object-fit: cover; object-position: top; display: block; }
</style></head><body><div class="card"><div class="glow"></div><div class="shot"><img src="${dataUri}"></div></div></body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
for (const c of covers) {
  const dataUri = `data:image/jpeg;base64,${readFileSync(c.src).toString('base64')}`;
  await page.setContent(html(c, dataUri), { waitUntil: 'load' });
  const buf = await page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: W, height: H } });
  writeFileSync(`assets/cover-${c.name}.png`, buf);
  console.log(`assets/cover-${c.name}.png ${buf.length} bytes`);
}
await browser.close();
