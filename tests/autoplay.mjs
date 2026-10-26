// Test automatique : lance le jeu dans un navigateur sans écran, joue tout seul
// (dialogues, quêtes, contrats, séances…) et échoue si une erreur JavaScript apparaît.
// Utilisation : node tests/autoplay.mjs [nombre_d_actions]   (serveur lancé sur http://localhost:8000)
import { chromium } from 'playwright';

const URL = process.env.GAME_URL || 'http://localhost:8000/';
const STEPS = +(process.argv[2] || 300);
const GENDER = process.env.GENDER === 'f' ? 1 : 0;   // GENDER=f node tests/autoplay.mjs : jouer une kiné
// Mode test du jeu (attentes raccourcies) + hasard reproductible : deux lancements donnent la même partie.
const INIT = `window.__COC_TEST = { fastWait: true, session: 1, build: 1, ordre: 1, formation: 1, day: 8 };
(function(){ let a = 42; Math.random = function(){ a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; })();`;
const STEP = (gender) => {
  const vis = (el) => el && !el.hidden && el.offsetParent !== null && !el.closest('[hidden]');
  const q = (s) => [...document.querySelectorAll(s)].filter(vis);
  const $ = (id) => document.getElementById(id);
  const c = window.__coc; const G = c ? c.G() : null;
  const modals = [...document.querySelectorAll('#ui > .modal')].filter((m) => !m.hidden).map((m) => m.id);
  const sig = { scr: c && c.state.screen, ph: G && G.phase, $: G && Math.round(G.money), xp: G && G.xp, lv: G && G.level, q: G && Object.keys(G.q).sort().join(','), m: modals.join(','), talk: !$('talk').hidden, intro: !$('intro').hidden };
  let act = null, pt = null;
  const clickEl = (el, why) => { act = why; el.click(); };
  if (!$('loader').hidden && $('loader').classList.contains('ready') && !(c && c.state.started)) { act = 'loader'; $('loader').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); }
  else if (c && c.state.screen === 'title' && !c.state.busy) clickEl($('playBtn'), 'play');
  else if (!$('intro').hidden) clickEl($('inSkip'), 'skipintro');
  else if (modals.includes('form')) { $('pseudoInput').value = 'Robin'; act = 'form'; $('pseudoForm').requestSubmit(); }
  else if (modals.includes('gender')) clickEl(q('#gender .gd-card')[gender], 'gender');
  else if (!$('talk').hidden) {
    const ch = q('#choices button'); if (ch.length) clickEl(ch[0], 'choice'); else { act = 'talk'; $('talkBox').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); $('talkBox').click(); }
  } else if (modals.length) {
    const m = $(modals[modals.length - 1]);
    const el = q('#' + m.id + ' .qopt:not(:disabled)')[0] || q('#' + m.id + ' .vbtn:not(:disabled)')[0] || q('#' + m.id + ' .clause:not(.flagged)')[0] && null || q('#' + m.id + ' .card.st-ready')[0] || q('#' + m.id + ' .btn-green:not([disabled])')[0] || q('#' + m.id + ' [data-reg]:not([disabled])')[0] || q('#' + m.id + ' .ph-call.ok')[0] || q('#' + m.id + ' [data-ph=end]')[0] || q('#' + m.id + ' .btn:not([disabled])')[0] || q('#' + m.id + ' .xbtn')[0];
    if (el) clickEl(el, 'modal:' + m.id + ':' + (el.id || el.className).slice(0, 30));
  } else if (!$('guide').hidden) {
    const r = document.querySelector('#guide .spot').getBoundingClientRect(); pt = [r.left + r.width / 2, r.top + r.height / 2]; act = 'guide';
  } else {
    const el = q('#btnCollect')[0] || q('#dayCoins .dcoin:not(.coding)')[0] || q('#btnCare:not(.off)')[0] || q('#btnCare')[0] || q('#townDom .work .bubble')[0] || q('#btnBoard.nudge')[0] || q('#btnShop.nudge')[0] || q('#townDom .bubble')[0] || q('#btnSession')[0] || q('#btnTalkTit')[0];
    if (el) clickEl(el, 'fallback:' + (el.id || el.className).slice(0, 30));
  }
  return { sig, act, pt };
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.addInitScript(INIT);
await page.goto(URL);
await page.waitForSelector('#loader.ready', { timeout: 60000 });
let last = '';
for (let i = 0; i < STEPS; i++) {
  const r = await page.evaluate(STEP, GENDER);
  if (r.pt) await page.mouse.click(r.pt[0], r.pt[1]);
  const s = `${r.sig.ph} · ${r.sig.$} € · niveau ${r.sig.lv} · quêtes: ${r.sig.q}`;
  if (s !== last) { console.log(String(i).padStart(4), s); last = s; }
  await page.waitForTimeout(300);
}
await browser.close();
if (errors.length) { console.error('\nERREURS :\n' + errors.join('\n')); process.exit(1); }
console.log('\nOK : aucune erreur en ' + STEPS + ' actions.');
