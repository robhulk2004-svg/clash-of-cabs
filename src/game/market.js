import { AudioSys } from '../audio/audio.js';
import { G, gx, persist, state } from '../core/save.js';
import { $, esc, eur, fmt, frSpace } from '../core/utils.js';
import { FOOD, MARKET_NAME, MK_ICON, STOCK } from '../data/market.js';
import { book } from './month.js';
import { Quests } from './quests.js';
import { shake, toast } from '../ui/helpers.js';
import { HUD, pay } from '../ui/hud.js';
import { blocked, openModal } from '../ui/modals.js';
import { refreshGuide } from '../ui/guide.js';

/* ================= The supermarket: consumables for your cabinet, food that boosts your next month ================= */
const ownCab = () => G.phase === 'titulaire' && G.cab.level >= 1;
const STOCK_AT = { maransin: ['huile', 'sopalin', 'gel', 'elastiques'], reunion: ['huile', 'sopalin', 'gel', 'elastiques'], michigan: ['sopalin', 'gel'], moon: ['huile', 'sopalin', 'gel', 'elastiques'] };
export const Market = {
  where: 'maransin',
  open(where) {
    if (blocked()) return;
    this.where = where || G.map; this.render(); openModal('market');
  },
  render() {
    const w = this.where;
    $('mkTitle').textContent = frSpace(MARKET_NAME[w] || 'Supermarché');
    const stock = (STOCK_AT[w] || []).map((id) => {
      const S = STOCK[id], left = G.stock[id] || 0;
      return `<div class="mk-item"><span class="mk-ico">${MK_ICON[id]}</span><span class="mk-txt"><b>${esc(frSpace(S.name))}</b><small>${frSpace(`${S.months} mois d’usage · stock : <b class="${left ? '' : 'neg'}">${left} mois</b>`)}</small></span><button type="button" class="btn sm btn-green" data-mk="s:${id}">${fmt(S.price)} €</button></div>`;
    }).join('');
    const food = (FOOD[w] || []).map((f) => `<div class="mk-item"><span class="mk-ico">${MK_ICON[f.id] || ''}</span><span class="mk-txt"><b>${esc(frSpace(f.name))}</b><small>${frSpace(`+${Math.round(f.k * 100)} % de rendement le mois prochain`)}</small></span><button type="button" class="btn sm btn-yellow" data-mk="f:${f.id}">${fmt(f.price)} €</button></div>`).join('');
    const boost = G.boost ? `<p class="mk-note">${frSpace(`En réserve : <b>${esc(G.boost.name)}</b> (+${Math.round(G.boost.k * 100)} % le mois prochain).`)}</p>` : '';
    $('mkBody').innerHTML = `<div class="mk-col"><h3>${frSpace('Fournitures du cabinet')}</h3>${stock || `<p class="mk-note">${frSpace('Rien pour ton cabinet ici.')}</p>`}
        <p class="mk-note">${frSpace(ownCab() ? 'Chaque mois, ton cabinet consomme 1 mois de chaque fourniture. Sans elles, ton rendement baisse… et des élastiques usés peuvent lâcher !' : `${gx('Remplaçant ou assistant', 'Remplaçante ou assistante')} : c’est le titulaire qui fournit les consommables. Tu en auras besoin dans ton propre cabinet !`)}</p>
        <p class="mk-acc">${frSpace('Compta : des fournitures pour ton activité sont une <b>dépense déductible</b> (achats).')}</p></div>
      <div class="mk-col"><h3>${frSpace('Nourriture')}</h3>${food}${boost}
        <p class="mk-acc">${frSpace('Compta : tes courses sont une <b>dépense personnelle</b>, non déductible. Seul le surcoût d’un repas pris sur ton lieu de travail peut l’être, dans la limite d’un plafond.')}</p></div>`;
  },
  async buy(code, el) {
    if (state.busy) return;
    const [kind, id] = code.split(':');
    if (kind === 's') {
      const S = STOCK[id];
      if (G.money < S.price) { AudioSys.wrong(); shake(el); toast(`Il te manque <b>${eur(S.price - G.money)}</b>.`); return; }
      state.busy = true; await pay(S.price, el);
      G.stock[id] = (G.stock[id] || 0) + S.months; book(S.name, -S.price, 'depense', 'fourn'); persist();
      toast(`<b>${esc(S.name)}</b> : +${S.months} mois de stock.`, 2400);
      await Quests.done('courses');
    } else {
      const F = (FOOD[this.where] || []).find((f) => f.id === id); if (!F) return;
      if (G.money < F.price) { AudioSys.wrong(); shake(el); toast(`Il te manque <b>${eur(F.price - G.money)}</b>.`); return; }
      state.busy = true; await pay(F.price, el);
      G.boost = { id: F.id, name: F.name, k: Math.max(F.k, G.boost ? G.boost.k : 0), months: 1 }; book(`Courses : ${F.name}`, -F.price, 'hors', 'perso'); persist();
      toast(`Miam ! <b>+${Math.round(G.boost.k * 100)} %</b> de rendement pour ton prochain mois de travail.`, 2600);
    }
    AudioSys.cash(); HUD.render(); this.render(); state.busy = false; refreshGuide();
  }
};
$('market').addEventListener('click', (e) => { const b = e.target.closest('[data-mk]'); if (b) { AudioSys.tap(); Market.buy(b.dataset.mk, b); } });
