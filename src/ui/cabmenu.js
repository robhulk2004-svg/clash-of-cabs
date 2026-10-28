import { AudioSys } from '../audio/audio.js';
import { G, curDate, persist, state, workplace } from '../core/save.js';
import { $, esc, fmt, frSpace } from '../core/utils.js';
import { CAB_LEVELS, MAX_CAB } from '../data/economy.js';
import { Build } from '../game/build.js';
import { book } from '../game/month.js';
import { Cam } from '../scenes/camera.js';
import { Scenes } from '../scenes/scenes.js';
import { shake, toast } from './helpers.js';
import { HUD, pay } from './hud.js';
import { ICON } from './icons.js';
import { blocked } from './modals.js';
import { Shop } from './shop.js';

/* ================= v6.1: touch your cabinet, like a building of Clash of Clans =================
   A bar of buttons shows at the bottom of the screen: go in, « Améliorer au niveau X »,
   and during the works « Terminer maintenant », paid in euros (the faster the works, the dearer). */
const RUSH = 0.08;   // finishing a whole construction at once costs 8 % of its price
/* what finishing the works now costs: the part of the works that is left, rounded to 10 € */
export const rushPrice = () => {
  const b = G.cab.build; if (!b) return 0;
  const left = Math.max(0, 1 - b.t / b.dur);
  return Math.max(50, Math.ceil((CAB_LEVELS[b.to].cost * RUSH * left) / 10) * 10);
};
const el = $('cabMenu');
export const CabMenu = {
  open: false, timer: null,
  show() {
    if (blocked() || state.busy) return;
    this.open = true; this.render(); el.hidden = false; AudioSys.tap();
    el.classList.remove('in'); void el.offsetWidth; el.classList.add('in');
    clearInterval(this.timer); this.timer = setInterval(() => { if (!this.open) return; if (state.screen !== 'town' || G.map !== 'main' || blocked()) this.hide(); else this.render(); }, 400);
  },
  hide() { if (!this.open) return; this.open = false; el.hidden = true; clearInterval(this.timer); },
  render() {
    const b = G.cab.build, lvl = G.cab.level, next = lvl + 1, own = workplace() === 'C';
    $('cmTitle').innerHTML = frSpace(lvl >= 1 ? `Mon cabinet <b>· niveau ${lvl}</b>` : 'Mon cabinet <b>· en construction</b>');
    const btns = [];
    if (lvl >= 1) btns.push(`<button type="button" class="cm-btn enter" data-cm="enter"><span class="cm-ico">${ICON.door}</span><span class="cm-lab">Entrer</span></button>`);
    if (b) {
      const p = rushPrice(), s = Math.ceil(Math.max(0, b.dur - b.t));
      btns.push(`<button type="button" class="cm-btn rush${G.money < p ? ' poor' : ''}" data-cm="rush"><span class="cm-ico">${ICON.hammer}</span><span class="cm-lab">${frSpace(`Terminer maintenant`)}</span><span class="cm-sub">${frSpace(`encore ${s} s`)}</span><span class="cm-price">${ICON.coin}${fmt(p)} €</span></button>`);
    } else if (lvl >= 1 && next <= MAX_CAB) {
      const L = CAB_LEVELS[next], poor = G.money < L.cost;
      btns.push(`<button type="button" class="cm-btn up${poor ? ' poor' : ''}" data-cm="up"><span class="cm-ico">${ICON.hammer}</span><span class="cm-lab">${frSpace(`Améliorer au niveau ${next}`)}</span><span class="cm-sub">${esc(frSpace(L.unlocks.slice(0, 2).join(', ')))}</span><span class="cm-price">${ICON.coin}${fmt(L.cost)} €</span></button>`);
    } else if (lvl >= MAX_CAB) btns.push(`<div class="cm-max">${frSpace('Niveau maximum !')}</div>`);
    const html = btns.join('');
    if (el._html !== html) { $('cmBtns').innerHTML = html; el._html = html; }
    el.classList.toggle('mine', own);
  },
  async act(k, btn) {
    if (blocked() || state.busy) return;
    if (k === 'enter') { this.hide(); Scenes.enterCabinet('C'); return; }
    if (k === 'up') {
      const next = G.cab.level + 1, c = Shop.cabCards()[next - 1];
      if (!c || c.state === 'locked') { AudioSys.wrong(); shake(btn); toast(c ? esc(c.lockText) : 'Niveau maximum !'); return; }
      if (G.money < CAB_LEVELS[next].cost) { AudioSys.wrong(); shake(btn); toast(`Il te manque <b>${fmt(CAB_LEVELS[next].cost - G.money)} €</b> pour le niveau ${next}.`); return; }
      this.hide(); Build.upgrade(next, null); return;
    }
    if (k === 'rush') {
      const b = G.cab.build; if (!b) return;
      const p = rushPrice();
      if (G.money < p) { AudioSys.wrong(); shake(btn); toast(`Il te manque <b>${fmt(p - G.money)} €</b> pour finir le chantier tout de suite.`); return; }
      state.busy = true;
      await pay(p, btn.querySelector('.cm-price'));
      /* paying the builders to go faster is part of the cost of the works: it is amortised with them */
      const L = CAB_LEVELS[b.to], d = curDate(), label = `Supplément pour travaux accélérés (niveau ${b.to})`;
      book(label, -p, 'immo', 'immo', { years: L.years });
      G.immos.push({ id: 'rush' + b.to + '_' + Date.now(), label, price: p, y: d.y, m: d.m, years: L.years, cat: L.cat });
      b.t = b.dur; persist(); HUD.render();
      this.hide(); state.busy = false;
      toast('Chantier terminé ! Ce supplément s’ajoute au coût de tes travaux : il s’amortit avec eux.', 4200);
      Build.finish();
    }
  }
};
el.addEventListener('click', (e) => { const b = e.target.closest('[data-cm]'); if (b) CabMenu.act(b.dataset.cm, b); });
/* touching anything else in the town closes it (not when the camera is dragged) */
$('townScene').addEventListener('click', (e) => { if (!CabMenu.open || e.target.closest('#cabMenu') || e.target.closest('[data-cab="C"]') || Cam.justDragged) return; CabMenu.hide(); });
