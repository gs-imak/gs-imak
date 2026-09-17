// Shared helpers for the profile SVG assets. Text is outlined to <path> so the
// SVGs render identically everywhere (GitHub serves README images through a
// proxy that blocks external fonts).
import opentype from 'opentype.js';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const fontDir = join(here, '..', '..', 'assets', 'fonts');

const files = {
  serif: 'InstrumentSerif-Regular.ttf',
  serifItalic: 'InstrumentSerif-Italic.ttf',
  sans: 'Geist-Regular.ttf',
  sansMedium: 'Geist-Medium.ttf',
  sansSemi: 'Geist-SemiBold.ttf',
  mono: 'GeistMono-Regular.ttf',
  monoMedium: 'GeistMono-Medium.ttf',
};

export const fonts = Object.fromEntries(
  Object.entries(files).map(([k, f]) => [k, opentype.loadSync(join(fontDir, f))]),
);

export const THEMES = {
  dark: {
    name: 'dark',
    panel: '#0b0d12',
    panelStroke: '#30363d',
    page: '#0d1117',
    text: '#ffffff',
    body: '#e6edf3',
    muted: '#8b93a3',
    faint: '#5c6470',
    rule: '#262b35',
    chipFill: 'rgba(255,255,255,0.04)',
    chipStroke: 'rgba(255,255,255,0.10)',
    btnPrimaryFill: '#f0f6fc',
    btnPrimaryText: '#0d1117',
    btnLineFill: '#0d1117',
    btnLineStroke: '#30363d',
    btnLineText: '#e6edf3',
  },
  light: {
    name: 'light',
    panel: '#0b0d12',
    panelStroke: '#d0d7de',
    page: '#ffffff',
    text: '#ffffff',
    body: '#e6edf3',
    muted: '#8b93a3',
    faint: '#5c6470',
    rule: '#262b35',
    chipFill: 'rgba(255,255,255,0.04)',
    chipStroke: 'rgba(255,255,255,0.10)',
    btnPrimaryFill: '#1f2328',
    btnPrimaryText: '#ffffff',
    btnLineFill: '#ffffff',
    btnLineStroke: '#d0d7de',
    btnLineText: '#1f2328',
  },
};

export const ACCENT = '#22d3ee';
export const GOLD = '#f5b942';

/** Advance width of a string at a size, letterSpacing in px. */
export function measure(font, str, size, letterSpacing = 0) {
  return font.getAdvanceWidth(str, size, { kerning: true, letterSpacing: letterSpacing / size });
}

/**
 * Outline a string. x is the anchor point (start/middle/end), y the baseline.
 * Returns an SVG <path> string and the measured width.
 */
export function text(font, str, x, y, size, { fill = '#fff', letterSpacing = 0, anchor = 'start', opacity } = {}) {
  for (const ch of str) {
    if (font.charToGlyphIndex(ch) === 0) throw new Error(`glyph missing in ${font.names.fontFamily.en}: U+${ch.codePointAt(0).toString(16)} in "${str}"`);
  }
  const w = measure(font, str, size, letterSpacing);
  const sx = anchor === 'middle' ? x - w / 2 : anchor === 'end' ? x - w : x;
  const d = font.getPath(str, sx, y, size, { kerning: true, letterSpacing: letterSpacing / size }).toPathData(2);
  const op = opacity === undefined ? '' : ` opacity="${opacity}"`;
  return { svg: `<path d="${d}" fill="${fill}"${op}/>`, width: w };
}

export function rect(x, y, w, h, { rx = 0, fill = 'none', stroke, strokeWidth = 1, opacity } = {}) {
  const s = stroke ? ` stroke="${stroke}" stroke-width="${strokeWidth}"` : '';
  const op = opacity === undefined ? '' : ` opacity="${opacity}"`;
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}"${s}${op}/>`;
}

export function svgDoc(w, h, body, { title } = {}) {
  const t = title ? `<title>${title}</title>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${title ?? ''}">${t}${body}</svg>\n`;
}

/** Stroke icons, 24-unit viewBox, placed at (x, y) scaled to `size`. */
export function icon(name, x, y, size, color) {
  const paths = {
    medal: '<circle cx="12" cy="9" r="6"/><path d="M8.5 14.5 7 22l5-2.5 5 2.5-1.5-7.5"/><path d="m12 6.3.9 1.8 2 .3-1.45 1.4.35 2-1.8-.95-1.8.95.35-2L9.1 8.4l2-.3z"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  };
  const s = size / 24;
  return `<g transform="translate(${x} ${y}) scale(${s})" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths[name]}</g>`;
}

export function star(x, y, size, color) {
  const s = size / 24;
  return `<path transform="translate(${x} ${y}) scale(${s})" d="m12 2.5 2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9z" fill="${color}"/>`;
}

/** Dark panel with the fine grid, used by the banner, stack strip and activity card. */
export function panel(id, w, h, theme, { rx = 14, grid = true } = {}) {
  const defs = `<clipPath id="${id}-clip"><rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="${rx}"/></clipPath>` +
    (grid ? `<pattern id="${id}-grid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0V24" fill="none" stroke="rgba(255,255,255,0.04)"/></pattern>` : '');
  const body = rect(0.5, 0.5, w - 1, h - 1, { rx, fill: theme.panel, stroke: theme.panelStroke }) +
    (grid ? `<rect x="0" y="0" width="${w}" height="${h}" fill="url(#${id}-grid)" clip-path="url(#${id}-clip)"/>` : '');
  return { defs, body };
}
