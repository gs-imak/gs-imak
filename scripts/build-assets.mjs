// Builds the static README assets: banner, two buttons, stack strip, in dark and light.
// Run: node scripts/build-assets.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { fonts, THEMES, ACCENT, GOLD, text, rect, svgDoc, icon, star, panel } from './lib/svg.mjs';

const out = new URL('../assets/', import.meta.url);
mkdirSync(out, { recursive: true });
const write = (name, svg) => writeFileSync(new URL(name, out), svg);

// ---------------------------------------------------------------- banner
function banner(theme) {
  const W = 832, H = 300;
  const p = panel('b', W, H, theme);
  let defs = p.defs +
    `<filter id="b-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="80"/></filter>`;
  let body = p.body;

  // accent glow + ring mark, clipped to the panel
  body += `<g clip-path="url(#b-clip)">` +
    `<circle cx="682" cy="70" r="210" fill="${ACCENT}" opacity="0.16" filter="url(#b-glow)"/>` +
    `<circle cx="701" cy="109" r="75" fill="none" stroke="rgba(255,255,255,0.12)"/>` +
    `<circle cx="701" cy="109" r="45" fill="none" stroke="rgba(255,255,255,0.22)"/>` +
    `<circle cx="701" cy="109" r="7" fill="${ACCENT}"/>` +
    `</g>`;

  // type block
  body += text(fonts.serif, 'Georges Simak', 44, 96, 66, { fill: theme.text }).svg;
  body += text(fonts.mono, 'DÉVELOPPEUR FULL STACK · REACT · NODE.JS · TYPESCRIPT', 44, 130, 13, { fill: ACCENT, letterSpacing: 2.2 }).svg;
  body += text(fonts.sans, 'Paris · 100 % à distance · 9 ans de front-end et de back-end', 44, 157, 14, { fill: theme.muted }).svg;

  // rule + credential chips
  body += `<path d="M44 190H788" stroke="${theme.rule}"/>`;
  const chips = [
    { kind: 'medal', label: 'Supermalter', sub: 'statut Malt', hi: true },
    { kind: 'stars', label: '5,0 sur 5', sub: '11 avis clients' },
    { kind: 'check', label: '30 projets', sub: 'livrés via Malt' },
    { kind: 'bolt', label: 'Réponse en 2 h', sub: 'délai moyen' },
  ];
  const gap = 10, cw = (744 - gap * 3) / 4, ch = 55, top = 212;
  chips.forEach((c, i) => {
    const x = 44 + i * (cw + gap);
    body += rect(x + 0.5, top + 0.5, cw - 1, ch - 1, {
      rx: 10,
      fill: c.hi ? 'rgba(255,255,255,0.06)' : theme.chipFill,
      stroke: c.hi ? ACCENT : theme.chipStroke,
    });
    let tx = x + 46;
    if (c.kind === 'stars') {
      for (let s = 0; s < 5; s++) body += star(x + 16 + s * 16, top + 20, 14, GOLD);
      tx = x + 16 + 5 * 16 + 8;
    } else {
      body += icon(c.kind, x + 16, top + 18.5, 18, c.hi ? ACCENT : '#d6dde6');
    }
    body += text(fonts.sansSemi, c.label, tx, top + 25, 14, { fill: theme.text }).svg;
    body += text(fonts.sans, c.sub, tx, top + 41, 11, { fill: theme.muted }).svg;
  });

  return svgDoc(W, H, `<defs>${defs}</defs>${body}`, { title: 'Georges Simak, développeur full stack React, Node.js, TypeScript. Supermalter, 5,0 sur 5 sur 11 avis, 30 projets, réponse en 2 h.' });
}

// ---------------------------------------------------------------- buttons
function button(label, theme, variant) {
  const H = 40, pad = 18, size = 14;
  const { width } = text(fonts.sansSemi, label, 0, 0, size);
  const W = Math.ceil(width + pad * 2);
  const primary = variant === 'primary';
  const body =
    rect(0.5, 0.5, W - 1, H - 1, {
      rx: 8,
      fill: primary ? theme.btnPrimaryFill : theme.btnLineFill,
      stroke: primary ? 'none' : theme.btnLineStroke,
    }) +
    text(fonts.sansSemi, label, W / 2, 25, size, { fill: primary ? theme.btnPrimaryText : theme.btnLineText, anchor: 'middle' }).svg;
  return svgDoc(W, H, body, { title: label });
}

// ---------------------------------------------------------------- stack strip
function stack(theme) {
  const W = 832, H = 60;
  const p = panel('s', W, H, theme, { rx: 12, grid: false });
  let body = p.body;
  let x = 24;
  const lbl = text(fonts.sansMedium, 'STACK', x, 34, 12, { fill: theme.muted, letterSpacing: 1 });
  body += lbl.svg;
  x += lbl.width + 18;
  const pills = ['TypeScript', 'React', 'Next.js', 'Node.js', 'PostgreSQL', 'Supabase', 'Docker', 'Vercel'];
  for (const pll of pills) {
    const t = text(fonts.mono, pll, 0, 0, 12);
    const w = Math.ceil(t.width + 24);
    body += rect(x + 0.5, 17.5, w - 1, 25, { rx: 12.5, fill: 'none', stroke: '#2a3140' });
    body += text(fonts.mono, pll, x + 12, 34, 12, { fill: '#d6dde6' }).svg;
    x += w + 10;
  }
  if (x > W - 24) console.warn(`stack strip overflows by ${x - (W - 24)}px`);
  return svgDoc(W, H, `<defs>${p.defs}</defs>${body}`, { title: 'Stack : TypeScript, React, Next.js, Node.js, PostgreSQL, Supabase, Docker, Vercel' });
}

for (const theme of Object.values(THEMES)) {
  write(`banner-${theme.name}.svg`, banner(theme));
  write(`btn-malt-${theme.name}.svg`, button('Voir le profil Malt', theme, 'primary'));
  write(`btn-linkedin-${theme.name}.svg`, button('LinkedIn', theme, 'line'));
  write(`stack-${theme.name}.svg`, stack(theme));
}
console.log('assets written');
