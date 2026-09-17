// Renders the "En ce moment" activity card from live GitHub data.
// Run: GH_TOKEN=<token> node scripts/activity.mjs   (falls back to `gh auth token` locally)
//
// The contribution numbers include private repos whatever the token, because the profile setting
// "include private contributions" is on. The language split needs a token that can read the
// private repos: run locally with `gh` (repo scope) it is complete; in the Action, where only the
// public repos are visible, KEEP_LANGUAGES=1 makes it reuse the split from the last committed
// data/activity.json instead of overwriting it with a public-only one.
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fonts, THEMES, ACCENT, text, rect, svgDoc, panel } from './lib/svg.mjs';

const LOGIN = 'gs-imak';
const WEEKS = 16;

function token() {
  if (process.env.GH_TOKEN) return process.env.GH_TOKEN;
  try { return execSync('gh auth token', { encoding: 'utf8' }).trim(); } catch { throw new Error('no GH_TOKEN and gh is not logged in'); }
}

async function graphql(query, variables) {
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { authorization: `bearer ${token()}`, 'content-type': 'application/json', 'user-agent': 'gs-imak-profile' },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (!res.ok || json.errors) throw new Error(`graphql ${res.status}: ${JSON.stringify(json.errors ?? json)}`);
  return json.data;
}

const QUERY = `query($login: String!) {
  user(login: $login) {
    contributionsCollection {
      totalPullRequestContributions
      totalRepositoriesWithContributedCommits
      contributionCalendar { totalContributions weeks { contributionDays { contributionCount date } } }
    }
    repositories(first: 100, ownerAffiliations: OWNER) {
      nodes { name pushedAt languages(first: 6, orderBy: { field: SIZE, direction: DESC }) { edges { size node { name } } } }
    }
  }
}`;

export async function collect() {
  const { user } = await graphql(QUERY, { login: LOGIN });
  const cc = user.contributionsCollection;
  const days = cc.contributionCalendar.weeks.flatMap((w) => w.contributionDays);
  const sum = (arr) => arr.reduce((s, d) => s + d.contributionCount, 0);
  const last30 = days.slice(-30);
  let streak = 0;
  for (let i = days.length - 1; i >= 0 && days[i].contributionCount > 0; i--) streak++;
  let best = 0, cur = 0;
  for (const d of days) { cur = d.contributionCount > 0 ? cur + 1 : 0; best = Math.max(best, cur); }
  const weeks = cc.contributionCalendar.weeks.slice(-WEEKS).map((w) => sum(w.contributionDays));
  const weekStart = cc.contributionCalendar.weeks.at(-WEEKS).contributionDays[0].date;

  const since = new Date(Date.now() - 365 * 864e5).toISOString();
  const bytes = {};
  for (const r of user.repositories.nodes) {
    if (r.pushedAt < since) continue;
    for (const e of r.languages.edges) bytes[e.node.name] = (bytes[e.node.name] ?? 0) + e.size;
  }
  const total = Object.values(bytes).reduce((a, b) => a + b, 0);
  const languages = Object.entries(bytes).sort((a, b) => b[1] - a[1]).slice(0, 4)
    .map(([name, b]) => ({ name, pct: Math.round((100 * b) / total) }));

  const dataFile = new URL('../data/activity.json', import.meta.url);
  const previous = process.env.KEEP_LANGUAGES && existsSync(dataFile) ? JSON.parse(readFileSync(dataFile, 'utf8')) : null;

  return {
    generatedAt: new Date().toISOString(),
    year: cc.contributionCalendar.totalContributions,
    last30: sum(last30),
    activeDays30: last30.filter((d) => d.contributionCount > 0).length,
    streak, bestStreak: best,
    weeks, weekStart,
    pullRequests: cc.totalPullRequestContributions,
    repos: cc.totalRepositoriesWithContributedCommits,
    languages: previous?.languages ?? languages,
    languagesFrom: previous ? previous.languagesFrom ?? previous.generatedAt : new Date().toISOString(),
  };
}

const fr = (n) => n.toLocaleString('fr-FR').replace(/ | /g, ' ');
const frDate = (iso) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
const frMonth = (iso) => new Date(iso).toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '');

export function render(d, theme) {
  const W = 832, H = 250;
  const p = panel('a', W, H, theme, { grid: false });
  let body = p.body;

  // left: 2x2 stats
  const stats = [
    [fr(d.year), 'contributions, 12 mois'],
    [fr(d.last30), '30 derniers jours'],
    [`${d.activeDays30} / 30`, 'jours actifs'],
    [`${d.streak} j`, `d'affilée, record ${d.bestStreak}`],
  ];
  stats.forEach(([n, l], i) => {
    const x = 28 + (i % 2) * 125, y = 24 + Math.floor(i / 2) * 62;
    body += text(fonts.sansSemi, n, x, y + 24, 26, { fill: theme.text, letterSpacing: -0.8 }).svg;
    body += text(fonts.sans, l, x, y + 41, 12, { fill: theme.muted }).svg;
  });
  body += `<path d="M290.5 24V154" stroke="${theme.rule}"/>`;

  // right: weekly bars
  const bx = 322, bw = W - 28 - bx, top = 24;
  body += text(fonts.sans, `Commits par semaine, ${WEEKS} dernières semaines`, bx, top + 10, 12, { fill: theme.muted }).svg;
  const max = Math.max(...d.weeks, 1);
  body += text(fonts.mono, `max ${max}`, W - 28, top + 10, 11, { fill: theme.muted, anchor: 'end' }).svg;
  const chartTop = top + 24, chartH = 84, gap = 6, colW = (bw - gap * (WEEKS - 1)) / WEEKS;
  d.weeks.forEach((v, i) => {
    const h = Math.max(4, Math.round((v / max) * chartH));
    const x = bx + i * (colW + gap);
    body += `<rect x="${x.toFixed(1)}" y="${chartTop + chartH - h}" width="${colW.toFixed(1)}" height="${h}" rx="3" fill="${i === d.weeks.length - 1 ? ACCENT : '#2b3442'}"/>`;
  });
  body += text(fonts.mono, frMonth(d.weekStart), bx, chartTop + chartH + 18, 11, { fill: theme.faint }).svg;
  body += text(fonts.mono, frMonth(d.generatedAt), W - 28, chartTop + chartH + 18, 11, { fill: theme.faint, anchor: 'end' }).svg;

  // languages
  const ly = 176;
  body += `<path d="M28 ${ly - 18}H${W - 28}" stroke="${theme.rule}"/>`;
  body += text(fonts.sans, 'Langages sur les dépôts actifs, 12 mois', 28, ly + 12, 12, { fill: theme.muted }).svg;
  const legend = d.languages.map((l) => `${l.name} ${l.pct} %`);
  const legendW = legend.reduce((s, t) => s + text(fonts.mono, t, 0, 0, 11).width + 14, -14);
  const barX = 290, barW = W - 28 - legendW - 16 - barX;
  let x = barX;
  const shades = [ACCENT, '#6b7280', '#4b5563', '#374151'];
  d.languages.forEach((l, i) => {
    const w = Math.max(2, (barW - 2 * (d.languages.length - 1)) * (l.pct / 100));
    body += rect(x, ly + 4, w, 8, { rx: i === 0 ? 4 : 0, fill: shades[i] });
    x += w + 2;
  });
  let lx = W - 28 - legendW;
  legend.forEach((t, i) => {
    body += text(fonts.mono, t, lx, ly + 12, 11, { fill: i === 0 ? '#d6dde6' : theme.muted }).svg;
    lx += text(fonts.mono, t, 0, 0, 11).width + 14;
  });

  // footnote
  body += text(fonts.mono, `Mis à jour le ${frDate(d.generatedAt)} · ${d.pullRequests} pull requests · ${d.repos} dépôts sur les 12 derniers mois`, 28, 222, 11, { fill: theme.faint }).svg;

  return svgDoc(W, H, `<defs>${p.defs}</defs>${body}`, {
    title: `Activité GitHub : ${fr(d.year)} contributions sur 12 mois, ${fr(d.last30)} sur 30 jours, ${d.activeDays30} jours actifs sur 30, ${d.streak} jours d'affilée.`,
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const data = await collect();
  mkdirSync(new URL('../data/', import.meta.url), { recursive: true });
  writeFileSync(new URL('../data/activity.json', import.meta.url), JSON.stringify(data, null, 2) + '\n');
  for (const theme of Object.values(THEMES)) {
    writeFileSync(new URL(`../assets/activity-${theme.name}.svg`, import.meta.url), render(data, theme));
  }
  console.log(`activity: ${data.year} contributions, ${data.last30} in 30 days, streak ${data.streak}, langs ${data.languages.map((l) => `${l.name} ${l.pct}%`).join(' ')}`);
}
