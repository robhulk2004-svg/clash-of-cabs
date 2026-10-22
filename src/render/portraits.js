import { IMG, URLS } from '../core/assets.js';

/* ================= Cartoon portraits drawn in SVG (new assistants, patients of the incident) =================
   One look = { skin, hair, style, eyes, top, trim, glasses, beard, freckles, earrings }.
   portrait(look, expr) gives a 600×800 bust for the dialogues, avatar(look) a square headshot. */
const OUT = '#1a1f36';
const shade = (hex, k) => {
  const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const f = (v) => Math.max(0, Math.min(255, Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k)));
  return '#' + [f(r), f(g), f(b)].map((v) => v.toString(16).padStart(2, '0')).join('');
};

function hairBack(L) {
  const h = L.hair, d = shade(h, -0.25);
  switch (L.style) {
    case 'long': return `<path d="M168,300 C150,170 230,96 300,96 C372,96 452,170 434,300 L446,560 C400,600 350,560 330,520 L270,520 C250,560 200,600 156,560 Z" fill="${h}" stroke="${OUT}" stroke-width="8"/>`;
    case 'bun': return `<circle cx="300" cy="96" r="58" fill="${h}" stroke="${OUT}" stroke-width="8"/><path d="M300,74 q20,22 0,44" stroke="${d}" stroke-width="6" fill="none"/>`;
    case 'pony': return `<path d="M410,190 C470,230 486,330 452,420 C440,450 420,446 424,420 C440,340 430,270 396,220 Z" fill="${h}" stroke="${OUT}" stroke-width="8"/>`;
    case 'afro': return `<g fill="${h}" stroke="${OUT}" stroke-width="8">${[[300, 150, 120], [205, 210, 82], [395, 210, 82], [190, 300, 64], [410, 300, 64], [250, 120, 70], [350, 120, 70]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join('')}</g>`;
    case 'curly': return `<g fill="${h}" stroke="${OUT}" stroke-width="8">${[[300, 140, 92], [215, 190, 64], [385, 190, 64], [196, 270, 50], [404, 270, 50], [196, 340, 44], [404, 340, 44]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join('')}</g>`;
    default: return '';
  }
}
function hairFront(L) {
  const h = L.hair, d = shade(h, -0.3), l = shade(h, 0.25);
  switch (L.style) {
    case 'short': return `<path d="M188,262 C176,150 250,104 306,106 C378,108 430,160 414,262 C400,214 370,186 340,180 C300,200 250,196 216,186 C200,206 192,232 188,262 Z" fill="${h}" stroke="${OUT}" stroke-width="8" stroke-linejoin="round"/><path d="M250,150 C280,130 330,128 360,146" stroke="${l}" stroke-width="8" fill="none" stroke-linecap="round"/>`;
    case 'spiky': return `<path d="M186,262 L184,180 L214,196 L222,120 L262,160 L290,96 L318,152 L354,104 L366,166 L404,132 L404,200 L418,262 C394,216 360,196 300,196 C246,196 210,214 186,262 Z" fill="${h}" stroke="${OUT}" stroke-width="8" stroke-linejoin="round"/>`;
    case 'long': case 'pony': case 'bun': return `<path d="M184,280 C170,160 240,110 300,110 C370,110 436,160 418,280 C400,220 352,180 312,176 C296,212 240,232 196,236 C190,250 186,264 184,280 Z" fill="${h}" stroke="${OUT}" stroke-width="8" stroke-linejoin="round"/><path d="M236,160 C270,138 320,134 356,150" stroke="${l}" stroke-width="8" fill="none" stroke-linecap="round"/>`;
    case 'curly': return `<g fill="${h}" stroke="${OUT}" stroke-width="7">${[[230, 190, 40], [280, 168, 42], [332, 168, 42], [378, 192, 38]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join('')}</g>`;
    case 'afro': return `<path d="M200,240 C220,190 380,190 400,240" stroke="${d}" stroke-width="10" fill="none"/>`;
    case 'bald': return `<path d="M196,250 C200,236 206,226 214,220 M404,250 C400,236 394,226 386,220" stroke="${h}" stroke-width="22" stroke-linecap="round"/>`;
    case 'side': return `<path d="M186,266 C172,150 250,100 310,104 C380,108 432,166 416,266 C412,236 400,210 380,196 C330,206 250,190 214,160 C196,190 190,226 186,266 Z" fill="${h}" stroke="${OUT}" stroke-width="8" stroke-linejoin="round"/><path d="M226,150 C270,186 330,192 384,180" stroke="${d}" stroke-width="6" fill="none"/>`;
    default: return '';
  }
}
function face(L, expr) {
  const s = L.skin, sd = shade(s, -0.18), iris = L.eyes || '#5a3a22';
  const brow = expr === 'think' ? [`M218,238 L268,226`, `M334,222 L384,236`] : expr === 'scared' ? [`M220,224 L268,236`, `M334,236 L382,224`] : [`M218,232 Q244,216 270,228`, `M332,228 Q358,216 384,232`];
  const eyeY = 272, er = expr === 'scared' ? 24 : 21;
  const eye = (x) => `<ellipse cx="${x}" cy="${eyeY}" rx="${er}" ry="${er + 4}" fill="#fff" stroke="${OUT}" stroke-width="6"/><circle cx="${x + (expr === 'think' ? 6 : 2)}" cy="${eyeY + (expr === 'think' ? -6 : 3)}" r="${expr === 'scared' ? 9 : 12}" fill="${iris}"/><circle cx="${x + (expr === 'think' ? 6 : 2)}" cy="${eyeY + (expr === 'think' ? -6 : 3)}" r="5" fill="${OUT}"/><circle cx="${x + 8}" cy="${eyeY - 6}" r="5" fill="#fff"/>`;
  const mouth = expr === 'think' ? `<path d="M276,368 Q300,360 326,372" stroke="${OUT}" stroke-width="7" fill="none" stroke-linecap="round"/>`
    : expr === 'scared' ? `<ellipse cx="300" cy="374" rx="22" ry="28" fill="#7a2020" stroke="${OUT}" stroke-width="6"/><path d="M286,360 h28" stroke="#fff" stroke-width="7"/>`
    : `<path d="M258,350 Q300,404 342,350 Z" fill="#7a2020" stroke="${OUT}" stroke-width="6" stroke-linejoin="round"/><path d="M270,354 Q300,366 330,354" stroke="#fff" stroke-width="8" fill="none"/><path d="M280,384 Q300,394 320,384" stroke="#e96a6a" stroke-width="8" fill="none"/>`;
  let out = `<circle cx="182" cy="288" r="28" fill="${s}" stroke="${OUT}" stroke-width="7"/><circle cx="418" cy="288" r="28" fill="${s}" stroke="${OUT}" stroke-width="7"/>`;
  if (L.earrings) out += `<circle cx="180" cy="322" r="9" fill="#ffd43a" stroke="${OUT}" stroke-width="4"/><circle cx="420" cy="322" r="9" fill="#ffd43a" stroke="${OUT}" stroke-width="4"/>`;
  out += `<path d="M190,250 C190,140 410,140 410,250 L404,320 C396,392 350,436 300,436 C250,436 204,392 196,320 Z" fill="${s}" stroke="${OUT}" stroke-width="8"/>`;
  out += `<ellipse cx="226" cy="334" rx="24" ry="14" fill="#ff8f8f" opacity=".35"/><ellipse cx="374" cy="334" rx="24" ry="14" fill="#ff8f8f" opacity=".35"/>`;
  if (L.freckles) out += [[220, 318], [236, 326], [212, 330], [380, 318], [364, 326], [388, 330]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.5" fill="${sd}"/>`).join('');
  if (L.beard) out += `<path d="M204,318 C212,410 268,442 300,442 C334,442 390,410 396,318 C380,360 350,346 300,348 C250,346 222,360 204,318 Z" fill="${L.hair}" stroke="${OUT}" stroke-width="7" stroke-linejoin="round" opacity=".95"/>`;
  out += eye(252) + eye(348);
  out += `<path d="${brow[0]}" stroke="${shade(L.hair, -0.2)}" stroke-width="11" fill="none" stroke-linecap="round"/><path d="${brow[1]}" stroke="${shade(L.hair, -0.2)}" stroke-width="11" fill="none" stroke-linecap="round"/>`;
  out += `<path d="M300,292 Q290,322 300,330 Q312,334 318,326" stroke="${sd}" stroke-width="7" fill="none" stroke-linecap="round"/>`;
  out += mouth;
  if (L.glasses) out += `<g fill="rgba(200,230,255,.25)" stroke="${OUT}" stroke-width="7"><circle cx="252" cy="274" r="36"/><circle cx="348" cy="274" r="36"/></g><path d="M288,272 h24 M216,268 L192,262 M384,268 L408,262" stroke="${OUT}" stroke-width="7"/>`;
  if (expr === 'scared') out += `<path d="M420,214 q10,22 0,34 q-10,-12 0,-34" fill="#7cc6ff" stroke="${OUT}" stroke-width="4"/>`;
  return out;
}
function body(L) {
  const t = L.top || '#ffffff', tr = L.trim || '#2a6fd6', s = L.skin;
  if (L.patient) return `<path d="M70,800 C76,600 160,520 300,512 C440,520 524,600 530,800 Z" fill="${t}" stroke="${OUT}" stroke-width="8"/><path d="M250,512 L300,570 L350,512" fill="${s}" stroke="${OUT}" stroke-width="7" stroke-linejoin="round"/>`;
  return `<path d="M70,800 C76,600 160,520 300,512 C440,520 524,600 530,800 Z" fill="${t}" stroke="${OUT}" stroke-width="8"/>
    <path d="M240,514 L300,600 L360,514" fill="${s}" stroke="${OUT}" stroke-width="7" stroke-linejoin="round"/>
    <path d="M234,516 L300,612 L366,516" fill="none" stroke="${tr}" stroke-width="12" stroke-linejoin="round"/>
    <path d="M118,640 C130,700 128,760 120,800 M482,640 C470,700 472,760 480,800" stroke="${tr}" stroke-width="12" fill="none"/>
    <rect x="370" y="640" width="86" height="18" rx="6" fill="${tr}"/><rect x="376" y="618" width="10" height="34" rx="4" fill="#3a3f55"/>`;
}
export function portraitSVG(L, expr = 'happy', box = '0 0 600 800') {
  const neck = `<path d="M262,420 L262,520 Q300,548 338,520 L338,420 Z" fill="${shade(L.skin, -0.12)}" stroke="${OUT}" stroke-width="7"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box}" width="600" height="${box.endsWith('800') ? 800 : 600}">${hairBack(L)}${body(L)}${neck}${face(L, expr)}${hairFront(L)}</svg>`;
}
const toURL = (svg) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
/* Make the portraits usable everywhere the game expects pictures: URLS[id_happy|think|scared], URLS.av_id, IMG.av_id. */
export function registerPortraits(id, look) {
  if (URLS['av_' + id]) return;
  for (const e of ['happy', 'think', 'scared']) URLS[`${id}_${e}`] = toURL(portraitSVG(look, e));
  URLS['av_' + id] = toURL(portraitSVG(look, 'happy', '130 90 340 340').replace('height="800"', 'height="600"'));
  const i = new Image(); i.onload = () => { IMG['av_' + id] = i; }; i.src = URLS['av_' + id];
}
