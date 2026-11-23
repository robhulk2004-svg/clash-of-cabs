/* ================= Kinédex (v6.3): the screen of your collection =================
   The collection page of Beast Brawl!: your team (the « deck », 8 cards) on top, all the cards below. Every card is worth
   the same: no rarity, no level, the goal is to find them all. A card opens its sheet (join or leave the team, swap, its
   story), a held card can be dragged (kxdrag.js). Also here: the cartes Vitale flying to the HUD, buying and opening the chests. */
import { AudioSys } from '../audio/audio.js';
import { loadKxSfx, play, sfx } from '../audio/sfx.js';
import { URLS, need } from '../core/assets.js';
import { G, persist, state } from '../core/save.js';
import { $, TEST, esc, fmt, frSpace, rand, reduceMotion } from '../core/utils.js';
import { CHESTS, CHEST_PRICE, KX, KX_IDS, MILESTONES, TEAM_SIZE, WELCOME } from '../data/kinedex.js';
import { LORE } from '../data/lore.js';
import { Kdx } from '../game/kinedex.js';
import { sayLore } from '../story/lore.js';
import { Talk } from '../story/talk.js';
import { chestSheets, openChestAnim } from './chest.js';
import { refreshGuide } from './guide.js';
import { shake, stageRect, toast } from './helpers.js';
import { HUD, addXP } from './hud.js';
import { blocked, closeModal, openModal, showReward } from './modals.js';
import { bindTeamDrag, dragBusy, resetScroll } from './kxdrag.js';
import { Shop } from './shop.js';

/* a small element maker (as in Beast Brawl!) */
function h(tag, props, ...kids) {
  const e = document.createElement(tag);
  if (props) for (const k in props) {
    const v = props[k];
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'style' && typeof v === 'object') { for (const p in v) { if (p.startsWith('--')) e.style.setProperty(p, v[p]); else e.style[p] = v[p]; } }
    else if (k === 'html') e.innerHTML = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k === 'dataset') Object.assign(e.dataset, v);
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat()) if (c !== null && c !== undefined && c !== false) e.append(c.nodeType ? c : document.createTextNode(String(c)));
  return e;
}
const src = (k) => URLS[k] || `assets/${k}.webp`;
export const cvIcon = (cls = 'cvi') => `<img class="${cls}" src="${src('cv')}" alt="cartes Vitale">`;
const dexNo = (id) => String(KX_IDS.indexOf(id) + 1).padStart(2, '0');
const plural = (n, w) => `${fmt(n)} ${w}${n > 1 ? 's' : ''}`;

export const KxUI = {
  open() {
    if (state.busy || blocked()) return;
    loadKxSfx(); need(chestSheets());
    const ti = $('kxTitleImg'); if (!ti.getAttribute('src')) ti.src = src('kinedex_title');
    resetScroll(); this.render(); openModal('kinedex');
  },
  /* closing: the new cards have been seen */
  close() { closeModal('kinedex'); Kdx.seenAll(); HUD.render(); },
  isOpen() { return !$('kinedex').hidden; },

  /* ---------- the page ---------- */
  render() {
    const n = Kdx.count(), all = KX_IDS.length, team = Kdx.team(), rest = KX_IDS.filter((id) => !team.includes(id));
    $('kxCount').innerHTML = `<b>${n}</b> / ${all}`;
    /* top: how full the Kinédex is and the next reward, your cartes Vitale, the chests */
    const next = Kdx.nextMilestone(), top = $('kxTop'); top.innerHTML = '';
    const pctDone = n / all, cvOk = G.cv >= CHEST_PRICE, chests = Math.floor(G.cv / CHEST_PRICE);
    top.append(
      h('div', { class: 'kx-fill' },
        h('div', { class: 'kx-fill-t', html: frSpace(n >= all ? 'Kinédex <b>complet</b> !' : `Kinédex rempli à <b>${Math.round(pctDone * 100)} %</b>`) }),
        h('div', { class: 'cc-bar big' + (n >= all ? ' full' : '') }, h('b', { style: { width: Math.max(3, pctDone * 100) + '%' } }), h('span', { class: 't' }, `${n} / ${all} cartes découvertes`)),
        h('div', { class: 'kx-next', html: frSpace(next ? `Prochain palier : <b>${next.n} cartes</b> → ${esc(next.label)}` : 'Tu es <b>Maître du Kinédex</b> ! Toutes les cartes sont à toi.') })),
      h('button', { type: 'button', class: 'kx-cv' + (cvOk ? ' ok' : ''), onclick: () => this.toShop() },
        h('img', { src: src('cv'), alt: '' }),
        h('span', null, h('b', null, fmt(G.cv)), h('small', { html: frSpace(cvOk ? `Assez pour <b>${plural(chests, 'coffre')}</b> !` : `Encore <b>${fmt(CHEST_PRICE - G.cv)}</b> pour un coffre`) })),
        h('div', { class: 'kx-cvbar' }, h('i', { style: { width: Math.min(100, G.cv / CHEST_PRICE * 100) + '%' } }))),
      G.kdx.welcome
        ? h('button', { type: 'button', class: 'kx-buy' + (cvOk ? ' ok' : ''), onclick: () => this.toShop() },
          h('img', { src: src('kxchest_icon'), alt: '' }), h('span', null, h('b', null, 'Coffre kiné'), h('small', { html: `${fmt(CHEST_PRICE)} ${cvIcon()} · Boutique` })))
        : h('button', { type: 'button', class: 'kx-buy ok gift', onclick: () => this.welcome() },
          h('img', { src: src('kxchest_icon'), alt: '' }), h('span', null, h('b', null, 'Coffre de bienvenue'), h('small', null, 'Gratuit ! Ouvre-le'))));
    /* the team and the collection: a new list each time (as in Beast Brawl!), its drag listeners never pile up */
    const list = h('div', { class: 'co-list', id: 'kxList' }); $('kxList').replaceWith(list);
    list.append(
      h('div', { class: 'co-head' }, h('div', { class: 't sm' }, `Mon équipe (${team.length}/${TEAM_SIZE})`), h('div', { class: 't xs cream', html: frSpace('Maintiens une carte pour la glisser') })),
      h('div', { class: 'co-grid deck' }, team.map((id) => this.cell(id)), Array.from({ length: TEAM_SIZE - team.length }, () => h('div', { class: 'cc empty' }, h('div', { class: 'cc-card' }, h('span', { class: 't' }, '+'))))),
      h('div', { class: 'co-head' }, h('div', { class: 't sm' }, `Collection (${n}/${all})`), h('div', { class: 't xs cream', html: frSpace(`Les cartes se trouvent dans les <b>Coffres kiné</b> de la boutique : ${fmt(CHEST_PRICE)} cartes Vitale.`) })),
      h('div', { class: 'co-grid' }, rest.map((id) => this.cell(id))));
    bindTeamDrag(list, (plan) => { Kdx.setTeam(plan); this.render(); HUD.render(); });
  },
  /* one card of the grid: its picture and its number (a silhouette while you have not found it) */
  cell(id) {
    const a = KX[id], has = Kdx.owned(id);
    const open = () => { if (dragBusy()) return; sfx.click(); this.sheet(id); };       // (no sheet when you drop a card you just dragged)
    if (!has) return h('button', { type: 'button', class: 'cc locked', 'aria-label': `Carte n° ${dexNo(id)} : pas encore trouvée`, dataset: { id }, onclick: open },
      h('div', { class: 'cc-card' }, h('img', { src: src('kxs_' + id), alt: '', draggable: 'false' }), h('i', { class: 'cc-q' }, '?'), h('div', { class: 'cc-cost t' }, dexNo(id))));
    const fresh = (G.kdx.fresh || []).includes(id);
    return h('button', { type: 'button', class: 'cc' + (fresh ? ' fresh' : ''), 'aria-label': a.name, dataset: { id }, onclick: open },
      h('div', { class: 'cc-card' }, h('img', { src: src('kxs_' + id), alt: '', draggable: 'false' }), h('div', { class: 'cc-cost t' }, dexNo(id)), fresh ? h('i', { class: 'cc-new t' }, 'Nouveau') : null));
  },

  /* ---------- the sheet of a card ---------- */
  sheet(id) {
    const a = KX[id], has = Kdx.owned(id), inTeam = G.kdx.team.includes(id);
    Kdx.seen(id);
    const old = document.querySelector('.kx-sheet'); if (old) old.remove();
    const close = () => { el.classList.add('out'); setTimeout(() => el.remove(), 200); this.render(); HUD.render(); };
    const btn = (label, cls, fn) => h('button', { type: 'button', class: 'btn sm ' + cls, onclick: fn }, label);
    const body = [];
    if (!has) {
      body.push(
        h('div', { class: 'kxs-name' }, '???'),
        h('div', { class: 'cd-tags' }, h('span', { class: 'cd-tag t' }, 'N° ' + dexNo(id))),
        h('p', { class: 'kxs-txt', html: frSpace(`Cette carte se cache dans les <b>Coffres kiné</b> de la boutique. Chaque coffre contient <b>${CHESTS.kine.cards} cartes</b>, dont au moins <b>une que tu n’as pas encore</b> !`) }),
        h('p', { class: 'kxs-hint', html: frSpace(`<b>Indice :</b> ${esc(a.meet)}`) }),
        h('div', { class: 'kxs-btns' }, G.kdx.welcome
          ? btn('Trouver des cartes', 'btn-yellow', () => { el.remove(); this.toShop(); })
          : btn('Ouvrir le coffre de bienvenue', 'btn-green', () => { el.remove(); this.welcome(); })));
    } else {
      const lore = a.lore && LORE[a.lore] && LORE[a.lore].length ? LORE[a.lore][0][1] : null;
      body.push(
        h('div', { class: 'kxs-name' }, a.name),
        h('div', { class: 'cd-tags' }, h('span', { class: 'cd-tag t' }, 'N° ' + dexNo(id)), inTeam ? h('span', { class: 'cd-tag team t' }, 'Dans ton équipe') : null),
        h('div', { class: 'kxs-role' }, a.role),
        h('p', { class: 'kxs-quote', html: frSpace('« ' + esc(a.quote) + ' »') }),
        h('p', { class: 'kxs-hint', html: frSpace(`<b>Où le rencontrer :</b> ${esc(a.meet)}`) }),
        lore ? h('p', { class: 'kxs-lore', html: frSpace(`<b>Son histoire :</b> ${esc(lore)}`) }) : null);
      const row = h('div', { class: 'kxs-btns' });
      if (inTeam && G.kdx.team.length > 1) row.append(btn('Retirer de l’équipe', 'btn-red', () => { Kdx.setTeam(G.kdx.team.filter((x) => x !== id)); sfx.back(); toast(`${esc(a.name)} quitte ton équipe`); close(); }));
      else if (!inTeam && G.kdx.team.length < TEAM_SIZE) row.append(btn('Dans l’équipe', 'btn-blue', () => { Kdx.setTeam([...G.kdx.team, id]); sfx.place(); toast(`${esc(a.name)} rejoint ton équipe !`); close(); }));
      else if (!inTeam) row.append(btn('Échanger', 'btn-blue', () => this.swapPicker(el, id, close)));
      if (a.lore && LORE[a.lore] && LORE[a.lore].length) row.append(btn('Son histoire', 'btn-yellow', async () => {
        await need([a.who + '_happy', a.who + '_think']);
        await Talk.open(); await sayLore(a.lore, a.who); await Talk.close();
      }));
      body.push(row);
    }
    const el = h('div', { class: 'kx-sheet' + (has ? '' : ' locked') },
      h('div', { class: 'kxs-dim', onclick: () => { sfx.back(); close(); } }),
      h('div', { class: 'kxs-panel' },
        h('div', { class: 'kxs-card' }, h('div', { class: 'kxs-rays' }), h('img', { src: src('kx_' + id), alt: has ? a.name : 'Carte pas encore trouvée' }), has ? h('div', { class: 'kxs-shine' }) : h('i', { class: 'cc-q big' }, '?')),
        h('div', { class: 'kxs-info' }, body),
        h('button', { type: 'button', class: 'xbtn', 'aria-label': 'Fermer', onclick: () => { sfx.back(); close(); } }, '✕')));
    $('kinedex').append(el);
    need(['kx_' + id]);
    if (has) ['a', 'o', 'e'].forEach((v, i) => AudioSys.voice(a.who, v, { delay: 0.1 + i * 0.12 }));
  },
  /* the team is full: you choose the card that leaves its place */
  swapPicker(el, id, close) {
    const old = el.querySelector('.cd-swap'); if (old) { old.remove(); return; }
    const row = h('div', { class: 'cd-swap' }, h('div', { class: 't xs gold' }, 'Touche la carte à remplacer'),
      h('div', { class: 'cd-swaprow' }, G.kdx.team.map((d) => h('button', { type: 'button', class: 'cd-mini', onclick: () => {
        Kdx.setTeam(G.kdx.team.map((x) => (x === d ? id : x))); sfx.place(); toast(`${esc(KX[id].name)} remplace ${esc(KX[d].name)}`); close();
      } }, h('img', { src: src('kxs_' + d), alt: KX[d].name })))));
    el.querySelector('.kxs-info').append(row);
  },

  /* ---------- chests ---------- */
  toShop() { sfx.click(); this.close(); Shop.open('coffres'); },
  /* the free chest of your first visit */
  async welcome() {
    if (G.kdx.welcome || state.busy) return;
    G.kdx.welcome = true;
    const loot = Kdx.apply({ ...WELCOME, cards: WELCOME.cards.map((x) => ({ ...x })) });
    await this.openLoot(loot);
  },
  /* the kiné chest of the shop, paid with cartes Vitale (el: the card of the shop, shaken when you cannot pay) */
  async buy(el) {
    if (state.busy) return;
    if (G.cv < CHEST_PRICE) { sfx.error(); if (el) shake(el); toast(`Il te manque <b>${fmt(CHEST_PRICE - G.cv)}</b> cartes Vitale : réponds aux questions des passants !`); return; }
    G.cv -= CHEST_PRICE; persist(); HUD.cvShown = G.cv; HUD.render(); play('buy');
    const loot = Kdx.apply(Kdx.roll());
    await this.openLoot(loot);
  },
  async openLoot(loot) {
    state.busy = true;
    try { await openChestAnim(loot); } finally { state.busy = false; }
    if (this.isOpen()) this.render();
    if (state.shopOpen) Shop.render();
    HUD.render();
    if (loot.cv) { G.cv += loot.cv; persist(); await this.flyCv(loot.cv, 960, 540); }
    const xp = (loot.xp || 0) + (loot.dupXp || 0);
    if (xp) await addXP(xp);
    await this.milestones();
    refreshGuide();
  },
  /* rewards when the Kinédex fills up */
  async milestones() {
    for (const m of Kdx.milestonesDue()) {
      G.kdx.mile = MILESTONES.indexOf(m) + 1; persist();
      await showReward({ ribbon: 'Palier du Kinédex !', artHTML: `<img src="${src('btn_kinedex')}" alt="" style="width:240px">`, title: `${m.n} cartes découvertes`, gains: [m.label], xp: m.xp || 0 });
      if (m.cv) { G.cv += m.cv; persist(); await this.flyCv(m.cv, 960, 420); }
      if (m.xp) await addXP(m.xp);
      if (m.chest) await this.openLoot(Kdx.apply({ ...Kdx.roll(), title: 'Coffre kiné offert', sub: `Palier des ${m.n} cartes !` }));
    }
  },
  /* cartes Vitale flying from a point of the stage to their counter in the HUD */
  async flyCv(n, fx, fy) {
    const ico = $('hudCvImg'), to = ico && !$('hudLayer').hidden ? stageRect(ico) : { x: 900, y: 40, w: 120, h: 70 };
    const tx = to.x + to.w / 2, ty = to.y + to.h / 2;
    const from = HUD.cvShown, k = Math.min(9, 3 + Math.round(n / 80));
    if (!reduceMotion && !(TEST && TEST.fastWait)) {
      const jobs = [];
      for (let i = 0; i < k; i++) {
        const c = document.createElement('img'); c.className = 'fly-cv'; c.src = src('cv'); c.alt = ''; $('flyLayer').appendChild(c);
        const mx = (fx + tx) / 2 + rand(-160, 160), my = Math.min(fy, ty) - rand(40, 170);
        const an = c.animate([
          { transform: `translate(${fx - 45}px, ${fy - 25}px) scale(.4) rotate(${rand(-30, 30)}deg)`, opacity: 0 },
          { transform: `translate(${mx - 45}px, ${my - 25}px) scale(1.15) rotate(${rand(-20, 20)}deg)`, opacity: 1, offset: 0.45 },
          { transform: `translate(${tx - 45}px, ${ty - 25}px) scale(.55) rotate(0deg)`, opacity: 1 }
        ], { duration: 720 + i * 60, easing: 'cubic-bezier(.45,0,.6,1)', fill: 'forwards' });
        jobs.push(an.finished.then(() => { c.remove(); play('gems', { v: 0.35, rate: 1.2 + i * 0.03 }) || AudioSys.tick(); }, () => c.remove()));
      }
      await Promise.all(jobs);
    }
    HUD.tweenCv(from);
  }
};
document.querySelector('#kinedex .xbtn').addEventListener('click', () => KxUI.close());
document.querySelector('#kinedex .dim').addEventListener('click', () => KxUI.close());
