import { AudioSys } from '../audio/audio.js';
import { URLS } from '../core/assets.js';
import { G, persist } from '../core/save.js';
import { $, TEST, esc, eur, frSpace } from '../core/utils.js';
import { ECO } from '../data/economy.js';
import { BOARD_ORDER, OFFER_DEFS } from '../data/offers.js';
import { TOWN_CABS } from '../data/town-map.js';
import { Career } from './career.js';
import { Contracts } from './contracts.js';
import { cabShort } from './month.js';
import { Quests } from './quests.js';
import { Town } from '../scenes/town.js';
import { toast } from '../ui/helpers.js';
import { HUD } from '../ui/hud.js';
import { ICON } from '../ui/icons.js';
import { openModal } from '../ui/modals.js';

/* ================= The job board: remplacement offers ================= */
export const offerDef = (o) => OFFER_DEFS[o.def];
const keepPerMonth = (d) => Math.round(d.H * (1 - d.r) - d.km * 2 * (d.housing ? 4 : ECO.days) * ECO.kmRate);
export const Board = {
  focus: null,
  init() {
    if (G.board.length) return;
    for (let i = 0; i < 4; i++) this.add();
    persist();
  },
  add() {
    const used = new Set(G.board.filter((o) => o.state !== 'gone').map((o) => offerDef(o).cab));
    if (G.contract) used.add(G.contract.cab);
    for (let k = 0; k < BOARD_ORDER.length; k++) {
      const id = BOARD_ORDER[(G.boardNext + k) % BOARD_ORDER.length], d = OFFER_DEFS[id];
      if (used.has(d.cab)) continue;
      G.boardNext = (G.boardNext + k + 1) % BOARD_ORDER.length;
      G.board.push({ id: ++G.seq, def: id, state: 'open', ver: 1, bad: d.bad.slice(), seen: false });
      return true;
    }
    return false;
  },
  open_() { return G.board.filter((o) => o.state !== 'gone'); },
  refill() { G.board = G.board.filter((o) => o.state !== 'gone'); if (G.monthsRempl >= 12) { persist(); Town.updateDom(); HUD.render(); return; } let guard = 0; while (this.open_().length < 3 && guard++ < 6) if (!this.add()) break; persist(); Town.updateDom(); HUD.render(); },
  offerAt(cab) { if (G.phase !== 'rempl') return null; return G.board.find((o) => o.state !== 'gone' && offerDef(o).cab === cab) || null; },
  newCount() { return G.phase === 'rempl' ? G.board.filter((o) => o.state !== 'gone' && !o.seen).length : 0; },
  open(focusCab) {
    if (Career.assistDraft()) { Career.offerAssist(); return; }   // after the remplacement year: Mathieu's contract
    if (G.phase !== 'rempl') { toast("Le tableau d'offres sert pendant ton année de remplacement."); return; }
    this.focus = focusCab || null; this.render(); openModal('board');
    for (const o of this.open_()) o.seen = true; persist(); HUD.render();
    Quests.done('board');
  },
  render() {
    const cur = G.contract;
    const head = cur ? `<div class="bd-cur">${ICON.check}<span>${frSpace(`En cours : remplacement à ${esc(cabShort(cur.cab))}, mois ${Math.min(cur.done + 1, cur.months)} sur ${cur.months}.`)}</span></div>` : `<div class="bd-cur info">${frSpace(`Compare les offres, puis postule. Année de remplacement : <b>${G.monthsRempl} / 12 mois</b>.`)}</div>`;
    const cards = this.open_().map((o) => {
      const d = offerDef(o), C = TOWN_CABS[d.cab], img = 'av_' + C.who;
      const btn = o.state === 'open' ? `<button type="button" class="btn sm btn-green" data-bd="apply" data-id="${o.id}"${cur ? ' disabled' : ''}>Postuler</button>`
        : o.state === 'applied' ? '<span class="bd-wait">Candidature envoyée…</span>'
        : o.state === 'ordre' ? '<span class="bd-wait">Avis de l’Ordre en attente</span>'
        : `<button type="button" class="btn sm btn-yellow" data-bd="read" data-id="${o.id}"${cur ? ' disabled' : ''}>Lire le contrat${o.ver > 1 ? ' corrigé' : ''}</button>`;
      return `<div class="bd-card${this.focus === d.cab ? ' focus' : ''}"><div class="bd-top"><img class="bd-av" src="${URLS[img]}" alt=""><div><div class="bd-name">${esc(C.name)}</div><div class="bd-tit">${esc(C.tit)} · ${esc(frSpace(d.why))}</div></div></div>
        <div class="bd-rows">
          <div class="bd-row"><span>Durée</span><b>${d.months} mois</b></div>
          <div class="bd-row"><span>Rétrocession annoncée</span><b>${Math.round(d.r * 100)} %</b></div>
          <div class="bd-row"><span>Honoraires / mois</span><b>≈ ${eur(d.H)}</b></div>
          <div class="bd-row"><span>Distance</span><b>${d.km} km${d.housing ? ' · logé' : ''}</b></div>
          <div class="bd-row big"><span>Tu gardes / mois</span><b>≈ ${eur(keepPerMonth(d))}</b></div>
        </div>
        <p class="bd-note">${frSpace(d.housing ? 'Logement fourni : tu ne rentres que le week-end.' : d.km > 40 ? 'Plus de 40 km : déductible quand même pour un remplaçant.' : 'Trajets domicile-cabinet déductibles.')}</p>
        <div class="bd-btn">${btn}</div></div>`;
    }).join('');
    $('bdBody').innerHTML = head + `<div class="bd-cards">${cards || `<p class="cempty">${frSpace('Aucune offre pour le moment.')}</p>`}</div><p class="bd-foot">${frSpace('« Tu gardes » = honoraires − rétrocession − frais kilométriques, avant cotisations sociales et impôt.')}</p>`;
  },
  async apply(id) {
    const o = G.board.find((x) => x.id === id); if (!o || o.state !== 'open') return;
    o.state = 'applied'; persist(); this.render(); AudioSys.stamp();
    toast(`Candidature envoyée à <b>${esc(TOWN_CABS[offerDef(o).cab].tit)}</b>…`);
    await Quests.done('apply');
    setTimeout(() => {
      if (o.state !== 'applied') return;
      o.state = 'draft'; persist(); AudioSys.bell();
      toast(`<b>${esc(TOWN_CABS[offerDef(o).cab].tit)}</b> t'a répondu : voici son projet de contrat !`, 3600);
      if (!$('board').hidden) this.render();
      Town.updateDom(); HUD.render();
    }, TEST && TEST.fastWait ? 200 : 2600);
  }
};
$('board').addEventListener('click', (e) => {
  const b = e.target.closest('[data-bd]'); if (!b || b.disabled) return;
  AudioSys.tap(); const id = +b.dataset.id;
  if (b.dataset.bd === 'apply') Board.apply(id);
  else { const o = G.board.find((x) => x.id === id); $('board').hidden = true; Contracts.open('rempl', o); }
});
