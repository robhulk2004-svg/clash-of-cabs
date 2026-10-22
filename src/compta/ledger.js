import { AudioSys } from '../audio/audio.js';
import { G, PRE_DATE, START_DATE } from '../core/save.js';
import { $, MONTHS_S, clamp, esc, eur2, frSpace, pct } from '../core/utils.js';
import { DEP_CATS } from '../data/compta.js';
import { ECO } from '../data/economy.js';

/* ================= Accounting: ledger, fixed-asset register, tax, the 2035 ================= */
const r2 = (n) => Math.round(n * 100) / 100;
/* Linear depreciation with prorata temporis in months held during the purchase year. */
export function dotation(im, year) {
  const annual = im.price / im.years; let remaining = im.price;
  for (let y = im.y; y <= year; y++) {
    const d = Math.min(remaining, y === im.y ? annual * (13 - im.m) / 12 : annual);
    if (y === year) return r2(d);
    remaining -= d;
  }
  return 0;
}
function vnc(im, year) { let v = im.price; for (let y = im.y; y <= year; y++) v -= dotation(im, y); return r2(Math.max(0, v)); }
/* Income tax on the BNC with the 2025 brackets of the course (one tax share). */
export function impot(b) {
  b = Math.max(0, b);
  const t2 = Math.max(0, Math.min(b, 28797) - 11295) * 0.11;
  const t3 = Math.max(0, Math.min(b, 82341) - 28798) * 0.30;
  const t4 = Math.max(0, Math.min(b, 177106) - 82342) * 0.41;
  const t5 = Math.max(0, b - 177107) * 0.45;
  return r2(t2 + t3 + t4 + t5);
}
export const tmi = (b) => (b <= 11294 ? 0 : b <= 28797 ? 0.11 : b <= 82341 ? 0.30 : b <= 177106 ? 0.41 : 0.45);
export const agaFor = (y) => { const o = G.owned.aga; if (!o) return false; if (o.y < y) return true; if (o.y > y) return false; return y === START_DATE.y ? o.m <= START_DATE.m + 4 : o.m <= 5; };
export const comptableFor = (y) => { const o = G.owned.comptable; return !!o && o.y <= y; };
export function yearBooks(y) {
  const E = G.journal.filter((e) => e.y === y);
  const sum = (f) => r2(E.filter(f).reduce((s, e) => s + e.amount, 0));
  const rec = sum((e) => e.cat === 'recette'), gains = sum((e) => e.cat === 'gains');
  /* rétrocessions versées by a remplaçant: deducted from the receipts (2035, and excluded in micro-BNC) */
  const retro = r2(-sum((e) => e.cat === 'depense' && e.sub === 'retroV'));
  const dep = {}; for (const e of E) if (e.cat === 'depense' && e.sub !== 'retroV') dep[e.sub] = r2((dep[e.sub] || 0) - e.amount);
  const depTotal = r2(Object.values(dep).reduce((s, v) => s + v, 0));
  const immos = G.immos.filter((im) => im.y <= y).map((im) => ({ ...im, dot: dotation(im, y) })).filter((im) => im.dot > 0);
  const dot = r2(immos.reduce((s, im) => s + im.dot, 0));
  const total = r2(rec - retro + gains), charges = r2(depTotal + dot);
  const bncReel = r2(total - charges);
  const microOk = total <= ECO.microMax;
  const abat = r2(Math.min(total, Math.max(total * ECO.microRate, ECO.microMin)));
  const bncMicro = r2(Math.max(0, total - abat));
  const hors = E.filter((e) => e.cat === 'hors' || e.cat === 'immo');
  return { y, E, rec, retro, gains, dep, depTotal, immos, dot, total, charges, bncReel, microOk, abat, bncMicro, ratio: total ? charges / total : 0, hors };
}
const CAT_CHIP = {
  recette: ['recette', 'Recette'], gains: ['recette', 'Gains divers'], depense: ['depense', 'Dépense déductible'],
  immo: ['immo', 'Immobilisation'], hors: ['hors', 'Hors 2035']
};

/* ---------- The "Ma comptabilité" panel ---------- */
export const Compta = {
  tab: 'journal', year: null,
  years() { const s = new Set(G.journal.map((e) => e.y)); if (G.date) s.add(G.date.y); return [...s].sort(); },
  render() {
    const ys = this.years(); if (!this.year || !ys.includes(this.year)) this.year = (G.date || PRE_DATE).y;
    const tabs = [['journal', 'Livre-journal'], ['immos', 'Immobilisations'], ['resume', "Résumé de l'année"]];
    const i = ys.indexOf(this.year);
    $('cTabs').innerHTML = tabs.map(([id, l]) => `<button type="button" class="ctab${id === this.tab ? ' active' : ''}" data-ctab="${id}">${l}</button>`).join('') +
      `<div class="cyear"><button type="button" data-cy="-1" aria-label="Année précédente"${i <= 0 ? ' disabled' : ''}>‹</button><span>${this.year}</span><button type="button" data-cy="1" aria-label="Année suivante"${i >= ys.length - 1 ? ' disabled' : ''}>›</button></div>`;
    const box = $('cScroll');
    if (this.tab === 'journal') box.innerHTML = this.journal();
    else if (this.tab === 'immos') box.innerHTML = this.immos();
    else box.innerHTML = this.resume();
    box.scrollTop = this.tab === 'journal' ? box.scrollHeight : 0;
  },
  journal() {
    const E = G.journal.filter((e) => e.y === this.year);
    if (!E.length) return `<div class="cempty">${frSpace('Aucune opération cette année.')}</div>`;
    const rows = E.map((e) => {
      const [cls, lab] = CAT_CHIP[e.cat] || ['hors', e.cat];
      const sub = e.cat === 'depense' && DEP_CATS[e.sub] ? ` · ${DEP_CATS[e.sub]}` : e.cat === 'immo' ? ` · ${e.years || ''} ans` : '';
      if (e.sub === 'retroV') return `<tr><td>${MONTHS_S[e.m - 1]} ${e.y}</td><td>${esc(frSpace(e.label))}</td><td><span class="chip-cat depense">${frSpace('À déduire des recettes')}</span></td><td class="num neg">${eur2(e.amount)}</td></tr>`;
      return `<tr><td>${MONTHS_S[e.m - 1]} ${e.y}</td><td>${esc(frSpace(e.label))}</td><td><span class="chip-cat ${cls}">${esc(frSpace(lab + sub))}</span></td><td class="num ${e.amount >= 0 ? 'pos' : 'neg'}">${e.amount >= 0 ? '+' : ''}${eur2(e.amount)}</td></tr>`;
    }).join('');
    const total = E.reduce((s, e) => s + e.amount, 0);
    return `<table class="ledger"><thead><tr><th>Date</th><th>Libellé</th><th>Catégorie</th><th class="num">Montant</th></tr></thead><tbody>${rows}<tr class="total"><td></td><td>Mouvements sur le compte pro</td><td></td><td class="num">${total >= 0 ? '+' : ''}${eur2(total)}</td></tr></tbody></table>`;
  },
  immos() {
    const list = G.immos.filter((im) => im.y <= this.year);
    if (!list.length) return `<div class="cempty">${frSpace("Aucune immobilisation pour l'instant. Tout achat de plus de 598 € TTC s'inscrit ici et s'amortit.")}</div>`;
    const rows = list.map((im) => `<tr><td>${esc(frSpace(im.label))}<br><small>${esc(im.cat)}</small></td><td>${MONTHS_S[im.m - 1]} ${im.y}</td><td class="num">${eur2(im.price)}</td><td class="num">${im.years} ans (${pct(1 / im.years, im.years === 3 ? 2 : 0)})</td><td class="num">${eur2(dotation(im, this.year))}</td><td class="num">${eur2(vnc(im, this.year))}</td></tr>`).join('');
    const tot = list.reduce((s, im) => s + dotation(im, this.year), 0);
    return `<table class="ledger"><thead><tr><th>Bien</th><th>Acquis</th><th class="num">Prix TTC</th><th class="num">Durée (taux)</th><th class="num">Dotation ${this.year}</th><th class="num">Valeur nette</th></tr></thead><tbody>${rows}<tr class="total"><td>Dotations aux amortissements</td><td></td><td></td><td></td><td class="num">${eur2(tot)}</td><td></td></tr></tbody></table>
      <p class="qnote" style="padding:0 20px 16px">${frSpace("Prorata temporis : l'année d'achat, on n'amortit que les mois de détention. Exemple : une table de 2 000 € sur 10 ans achetée en juillet → 100 € la première année.")}</p>`;
  },
  resume() {
    const b = yearBooks(this.year);
    const depLines = Object.keys(b.dep).map((k) => `<div class="line"><span>${esc(frSpace(DEP_CATS[k] || k))}</span><b>${eur2(b.dep[k])}</b></div>`).join('');
    const decl = G.decl[this.year];
    return `<div class="csum">
      <div class="box"><h3>Recettes</h3>
        <div class="line"><span>Recettes encaissées</span><b>${eur2(b.rec)}</b></div>
        ${b.retro ? `<div class="line"><span>${frSpace('Honoraires rétrocédés (à déduire)')}</span><b>−${eur2(b.retro)}</b></div>` : ''}
        <div class="line"><span>Gains divers</span><b>${eur2(b.gains)}</b></div>
        <div class="line big"><span>Total</span><b>${eur2(b.total)}</b></div></div>
      <div class="box"><h3>Charges</h3>${depLines}
        <div class="line"><span>Dotations aux amortissements</span><b>${eur2(b.dot)}</b></div>
        <div class="line big"><span>Total</span><b>${eur2(b.charges)}</b></div></div>
      <div class="box"><h3>Bénéfice estimé</h3>
        <div class="line"><span>Déclaration contrôlée</span><b>${eur2(b.bncReel)}</b></div>
        <div class="line"><span>Micro-BNC</span><b>${b.microOk ? eur2(b.bncMicro) : 'impossible'}</b></div>
        <div class="line big"><span>Charges / recettes</span><b>${b.total ? pct(b.ratio, 1) : '—'}</b></div></div>
      <div class="box"><h3>Déclaration ${this.year}</h3>${decl ? `<div class="line"><span>Régime choisi</span><b>${decl.regime === 'micro' ? 'Micro-BNC' : 'Réel (2035)'}</b></div><div class="line"><span>Bénéfice déclaré</span><b>${eur2(decl.bnc)}</b></div><div class="line big"><span>Impôt</span><b>${eur2(decl.impot)}</b></div>` : `<div class="line"><span>${frSpace('À faire en janvier ' + (this.year + 1))}</span><b>…</b></div>`}</div>
      <div class="note">${frSpace(`Règle : si tes charges réelles dépassent 34 % de tes recettes, la déclaration contrôlée est plus avantageuse ; en dessous, le micro-BNC (abattement de 34 %, 305 € minimum, recettes ≤ 77 700 € HT).`)}</div>
    </div>`;
  }
};
$('compta').addEventListener('click', (e) => {
  const t = e.target.closest('[data-ctab]'); if (t) { Compta.tab = t.dataset.ctab; AudioSys.tap(); Compta.render(); return; }
  const y = e.target.closest('[data-cy]'); if (y && !y.disabled) { const ys = Compta.years(); Compta.year = ys[clamp(ys.indexOf(Compta.year) + +y.dataset.cy, 0, ys.length - 1)]; AudioSys.tap(); Compta.render(); }
});
