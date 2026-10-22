// Redessine les bâtiments de la ville (assets/bld_*.webp) en vectoriel, net et sans artefacts.
// Usage : node tools/buildings.mjs   (nécessite playwright, comme les tests)
// Chaque image garde la taille logique d'origine (494 px de large) mais est rendue en ×2 pour rester nette.
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';

const VARIANTS = {
  bld_l1: { floors: 1, col: '#2a6fd6', dark: '#1b4f9f' },
  bld_l2: { floors: 2, col: '#2a6fd6', dark: '#1b4f9f' },
  bld_l3: { floors: 3, col: '#2a6fd6', dark: '#1b4f9f', flagRoof: true },
  bld_amb: { floors: 2, col: '#e07a16', dark: '#a6560a' },
  bld_pins: { floors: 1, col: '#2f9a12', dark: '#1f6b0b' },
  bld_port: { floors: 1, col: '#c0291b', dark: '#861b11' }
};
const W = 494, FLOOR = 88, BASE_H = 160, SL = 0.4348, SR = 0.44;

function svg({ floors, col, dark }) {
  const H = 398 + FLOOR * (floors - 1);
  const h = BASE_H + FLOOR * (floors - 1);
  const F = [266, H - 46], LB = [F[0] - 184, F[1] - 80], RB = [F[0] + 200, F[1] - 88], BK = [LB[0] + 200, LB[1] - 88];
  const up = (p, d) => [p[0], p[1] - d];
  const P = (...pts) => pts.map((p) => p.join(',')).join(' ');
  const Lm = `matrix(1,${SL},0,1,${LB[0]},${LB[1]})`;   // left face: u 0→184, v up negative
  const Rm = `matrix(1,${-SR},0,1,${F[0]},${F[1]})`;    // right face: u 0→200
  const Tm = (x, y) => `matrix(1,${-SR},-1,${-SL},${x},${y})`; // roof plane
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W * 2}" height="${H * 2}">
  <defs>
    <linearGradient id="wl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f1e6d6"/><stop offset="1" stop-color="#dccbb5"/></linearGradient>
    <linearGradient id="wr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fdf7ee"/><stop offset="1" stop-color="#efe2cf"/></linearGradient>
    <linearGradient id="gl" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d9f1fb"/><stop offset=".45" stop-color="#9fd3ea"/><stop offset=".55" stop-color="#c7e8f5"/><stop offset="1" stop-color="#7bb9d6"/></linearGradient>
    <linearGradient id="glL" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#bfe2f1"/><stop offset=".5" stop-color="#86bfd9"/><stop offset="1" stop-color="#5f9fbf"/></linearGradient>
    <linearGradient id="roof" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#a39b92"/><stop offset="1" stop-color="#8a8279"/></linearGradient>
    <radialGradient id="bush" cx=".35" cy=".3" r=".75"><stop offset="0" stop-color="#9ad65a"/><stop offset=".6" stop-color="#5aa72c"/><stop offset="1" stop-color="#3a7a1c"/></radialGradient>
    <radialGradient id="bushY" cx=".35" cy=".3" r=".75"><stop offset="0" stop-color="#e6ef6a"/><stop offset=".6" stop-color="#a9c23a"/><stop offset="1" stop-color="#6f8a1f"/></radialGradient>
    <linearGradient id="tree" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#4f9a3a"/><stop offset="1" stop-color="#2d6a24"/></linearGradient>
    <radialGradient id="shadow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#000" stop-opacity=".28"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
  </defs>`;
  /* ground shadow */
  s += `<ellipse cx="${F[0] + 10}" cy="${F[1] - 40}" rx="230" ry="80" fill="url(#shadow)"/>`;
  /* back tree (left) */
  const tx = LB[0] - 46, ty = LB[1] + 6;
  s += `<rect x="${tx - 4}" y="${ty - 30}" width="8" height="30" fill="#6b4524"/>`;
  for (let i = 0; i < 4; i++) { const yy = ty - 28 - i * 30, ww = 40 - i * 7; s += `<path d="M${tx - ww},${yy} L${tx},${yy - 56} L${tx + ww},${yy} Q${tx},${yy + 12} ${tx - ww},${yy}Z" fill="url(#tree)" stroke="#24521b" stroke-width="2.5" stroke-linejoin="round"/>`; }
  /* walls */
  s += `<polygon points="${P(LB, F, up(F, h), up(LB, h))}" fill="url(#wl)" stroke="#5b4a3a" stroke-width="3" stroke-linejoin="round"/>`;
  s += `<polygon points="${P(F, RB, up(RB, h), up(F, h))}" fill="url(#wr)" stroke="#5b4a3a" stroke-width="3" stroke-linejoin="round"/>`;
  /* plinth */
  s += `<g transform="${Lm}"><rect x="0" y="-10" width="184" height="10" fill="#b9a68f"/></g><g transform="${Rm}"><rect x="0" y="-10" width="200" height="10" fill="#cdbba3"/></g>`;
  /* floor bands */
  for (let f = 1; f < floors; f++) {
    const y = -(BASE_H + FLOOR * (f - 1)) + 6;
    s += `<g transform="${Lm}"><rect x="0" y="${y}" width="184" height="6" fill="#cdb99f"/></g><g transform="${Rm}"><rect x="0" y="${y}" width="200" height="6" fill="#e3d3bc"/></g>`;
  }
  /* left face: one window band per floor */
  for (let f = 0; f < floors; f++) {
    const y0 = f === 0 ? -124 : -(BASE_H + FLOOR * (f - 1)) - 70, hh = f === 0 ? 96 : 58;
    s += `<g transform="${Lm}"><rect x="22" y="${y0}" width="132" height="${hh}" fill="url(#glL)" stroke="${dark}" stroke-width="5"/>`;
    for (const x of [55, 88, 121]) s += `<line x1="${x}" y1="${y0}" x2="${x}" y2="${y0 + hh}" stroke="${dark}" stroke-width="4"/>`;
    s += `<path d="M30,${y0 + hh - 8} L60,${y0 + 6}" stroke="#fff" stroke-opacity=".45" stroke-width="5"/><rect x="18" y="${y0 + hh}" width="140" height="5" fill="#cbb79c"/></g>`;
  }
  /* right face: storefront */
  s += `<g transform="${Rm}">
    <rect x="16" y="-98" width="172" height="88" fill="url(#gl)" stroke="${dark}" stroke-width="5"/>
    <line x1="62" y1="-98" x2="62" y2="-10" stroke="${dark}" stroke-width="4"/><line x1="102" y1="-98" x2="102" y2="-10" stroke="${dark}" stroke-width="4"/><line x1="145" y1="-98" x2="145" y2="-10" stroke="${dark}" stroke-width="4"/>
    <rect x="62" y="-98" width="40" height="88" fill="#fff" fill-opacity=".18"/>
    <path d="M24,-20 L50,-90 M110,-20 L134,-88" stroke="#fff" stroke-opacity=".55" stroke-width="6"/>
    <rect x="76" y="-56" width="4" height="16" rx="2" fill="${dark}"/><rect x="85" y="-56" width="4" height="16" rx="2" fill="${dark}"/>
    <rect x="10" y="-105" width="184" height="7" rx="2" fill="${col}"/>
  </g>`;
  /* sign: runner + SOINS on the ground-floor fascia */
  s += `<g transform="${Rm}"><g transform="translate(22,-154)">
    <circle cx="20" cy="2" r="6.5" fill="${col}"/>
    <path d="M17,10 L10,26 M14,17 L2,15 M14,17 L27,22 M10,26 L20,33 L18,44 M10,26 L0,38 L-6,36" stroke="${col}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <text x="38" y="30" font-family="Arial Black, Arial, Helvetica, sans-serif" font-weight="900" font-size="30" fill="${col}" letter-spacing="1">SOINS</text>
  </g></g>`;
  /* right face: upper floors windows */
  for (let f = 1; f < floors; f++) {
    const y0 = -(BASE_H + FLOOR * (f - 1)) - 70;
    s += `<g transform="${Rm}"><rect x="22" y="${y0}" width="160" height="58" fill="url(#gl)" stroke="${dark}" stroke-width="5"/>`;
    for (const x of [62, 102, 142]) s += `<line x1="${x}" y1="${y0}" x2="${x}" y2="${y0 + 58}" stroke="${dark}" stroke-width="4"/>`;
    s += `<path d="M30,${y0 + 50} L50,${y0 + 6} M110,${y0 + 50} L128,${y0 + 8}" stroke="#fff" stroke-opacity=".5" stroke-width="5"/><rect x="18" y="${y0 + 58}" width="168" height="5" fill="#d8c6ad"/></g>`;
  }
  /* roof with parapet */
  const tF = up(F, h), tL = up(LB, h), tR = up(RB, h), tB = up(BK, h);
  s += `<polygon points="${P(tF, tR, tB, tL)}" fill="#f6eee2" stroke="#5b4a3a" stroke-width="3" stroke-linejoin="round"/>`;
  const ins = (p, q, k) => [p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k];
  const c = [(tF[0] + tB[0]) / 2, (tF[1] + tB[1]) / 2], K = 0.1;
  const iF = ins(tF, c, K), iR = ins(tR, c, K * 1.1), iB = ins(tB, c, K), iL = ins(tL, c, K * 1.1);
  s += `<polygon points="${P(iF, iR, iB, iL)}" fill="url(#roof)" stroke="#6e655c" stroke-width="2"/>`;
  s += `<polygon points="${P(iL, iB, [iB[0], iB[1] + 7], [iL[0], iL[1] + 7])}" fill="#000" fill-opacity=".12"/>`;
  /* AC units on the roof */
  const box = (x, y, w, d, hh) => {
    const a = [x, y], b = [x + w, y - w * SR], e = [x - d, y - d * SL], g = [b[0] - d, b[1] - d * SL];
    return `<polygon points="${P(a, b, up(b, hh), up(a, hh))}" fill="#e9e6e1" stroke="#6b6560" stroke-width="2"/>
      <polygon points="${P(e, a, up(a, hh), up(e, hh))}" fill="#c9c4bd" stroke="#6b6560" stroke-width="2"/>
      <polygon points="${P(up(a, hh), up(b, hh), up(g, hh), up(e, hh))}" fill="#f7f5f2" stroke="#6b6560" stroke-width="2"/>
      <g transform="matrix(1,${-SR},0,1,${x},${y})">${[0, 1, 2, 3, 4].map((i) => `<line x1="${8 + i * (w - 16) / 4}" y1="${-hh + 7}" x2="${8 + i * (w - 16) / 4}" y2="-6" stroke="#8d8781" stroke-width="2"/>`).join('')}</g>`;
  };
  const r0 = [tF[0] - 20, tF[1] - 44];
  s += box(r0[0] - 40, r0[1] - 12, 46, 36, 24) + box(r0[0] + 40, r0[1] - 48, 46, 36, 24);
  /* shrubs along the left face and corner */
  const bush = (x, y, r, g = 'bush') => [[-r * 0.45, r * 0.15, r * 0.7], [r * 0.45, r * 0.2, r * 0.68], [0, -r * 0.25, r * 0.8]].map(([dx, dy, rr]) => `<circle cx="${x + dx}" cy="${y + dy}" r="${rr}" fill="url(#${g})" stroke="#2e5f17" stroke-width="2.2"/>`).join('');
  const shrubs = [[LB[0] - 14, LB[1] - 6, 22], [LB[0] + 14, LB[1] + 14, 26], [LB[0] + 52, LB[1] + 30, 24, 'bushY'], [LB[0] + 86, LB[1] + 44, 25], [LB[0] + 122, LB[1] + 60, 24], [LB[0] + 156, LB[1] + 74, 22, 'bushY']];
  for (const [x, y, r, g] of shrubs) s += bush(x, y, r, g);
  for (const [x, y] of [[LB[0] - 6, LB[1] - 14], [LB[0] + 24, LB[1] + 4], [LB[0] + 96, LB[1] + 38], [LB[0] + 130, LB[1] + 52], [LB[0] + 6, LB[1] + 20]]) s += `<g fill="#fff" stroke="#c9c2b8" stroke-width="1"><circle cx="${x}" cy="${y}" r="4"/><circle cx="${x + 7}" cy="${y + 3}" r="3.4"/><circle cx="${x + 2}" cy="${y + 8}" r="3.6"/></g><circle cx="${x + 3}" cy="${y + 3}" r="2" fill="#f4c430"/>`;
  /* door mat */
  const m = [F[0] + 60, F[1] - 60 * SR + 3], D = [24, 24 * SL];
  s += `<polygon points="${P(m, [m[0] + 44, m[1] - 44 * SR], [m[0] + 44 + D[0], m[1] - 44 * SR + D[1]], [m[0] + D[0], m[1] + D[1]])}" fill="${col}" stroke="${dark}" stroke-width="2"/>`;
  /* little bush near the front corner */
  s += bush(F[0] - 6, F[1] + 4, 16, 'bushY');
  return { svg: s + '</svg>', H };
}

const b = await chromium.launch(); const p = await b.newPage();
mkdirSync('assets', { recursive: true });
for (const [key, v] of Object.entries(VARIANTS)) {
  const { svg: code, H } = svg(v);
  await p.setViewportSize({ width: W * 2, height: H * 2 });
  await p.setContent(`<html><body style="margin:0;background:transparent">${code}</body></html>`);
  const png = await p.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: W * 2, height: H * 2 } });
  writeFileSync(`tools/.out_${key}.png`, png);
  console.log(key, W * 2 + '×' + H * 2);
}
await b.close();
