import { AudioSys } from '../audio/audio.js';
import { agaFor, comptableFor, impot, tmi, yearBooks } from './ledger.js';
import { G, persist } from '../core/save.js';
import { $, MONTHS_S, esc, eur, eur2, fmt2, frSpace, pct } from '../core/utils.js';
import { DEP_CATS, VENT, VENT_PRIORITY } from '../data/compta.js';
import { book } from '../game/month.js';
import { Quests } from '../game/quests.js';
import { SCRIPTS } from '../story/scripts.js';
import { Talk } from '../story/talk.js';
import { hideToast } from '../ui/helpers.js';
import { HUD, addXP } from '../ui/hud.js';
import { SVGART } from '../ui/icons.js';
import { showReward } from '../ui/modals.js';

/* ---------- The yearly declaration: ventilation → 2035 → régime → impôt ---------- */
const VENT_BTNS = [['recette', 'Recette', 'imposable'], ['depense', 'Dépense', 'déductible'], ['immo', 'Immobilisation', 'amortie'], ['hors', "Ni l'un ni l'autre", 'non imposable, non déductible']];
export const Decl = {
  y: 0, b: null, step: 0, items: [], i: 0, right: 0, pick: null, resolve: null,
  run(y) {
    return new Promise(async (resolve) => {
      this.resolve = resolve; this.y = y; this.b = yearBooks(y); this.step = 0; this.i = 0; this.right = 0; this.pick = null;
      this.items = this.pickItems();
      await Talk.open(); await SCRIPTS.declIntro(y); await Talk.close();
      $('fTitle').innerHTML = frSpace(`Déclaration de tes revenus ${y}<small>Bénéfices non commerciaux · ${esc(G.pseudo || 'kiné')}</small>`);
      hideToast(); $('d2035').hidden = false; AudioSys.pop();
      this.render();
    });
  },
  pickItems() {
    const seen = {};
    for (const e of this.b.E) { const k = e.cat === 'immo' ? 'immo' : e.sub; if (VENT[k] && !seen[k]) seen[k] = e; }
    return VENT_PRIORITY.filter((k) => seen[k]).slice(0, 7).map((k) => ({ key: k, e: seen[k] }));
  },
  steps() {
    const names = ['Ventilation', 'Formulaire 2035', 'Régime', 'Impôt'];
    $('fSteps').innerHTML = names.map((n, k) => `<div class="f-step${k === this.step ? ' on' : k < this.step ? ' done' : ''}"><b>${k + 1}</b>${n}</div>`).join('');
  },
  render() {
    this.steps();
    if (this.step === 0) this.renderVent();
    else if (this.step === 1) this.renderForm();
    else this.renderRegime();
  },
  renderVent() {
    const it = this.items[this.i];
    if (!it) { this.step = 1; this.render(); return; }
    const e = it.e;
    $('fBody').innerHTML = `<p class="f-intro">${frSpace("Avant de remplir la 2035, range chaque opération de ton livre-journal. Toute somme qui arrive sur ton compte pro est une recette… jusqu'à preuve du contraire !")}</p>
      <div class="vent"><div class="vent-count">Opération ${this.i + 1} / ${this.items.length}</div>
        <div class="vent-line"><span class="vd">${MONTHS_S[e.m - 1]} ${e.y}</span><span>${esc(frSpace(e.label))}</span><span class="va ${e.amount >= 0 ? 'pos' : 'neg'}">${e.amount >= 0 ? '+' : ''}${eur2(e.amount)}</span></div>
        <div class="vent-btns">${VENT_BTNS.map(([k, l, s]) => `<button type="button" class="vbtn ${k}" data-v="${k}">${l}<small>${frSpace(s)}</small></button>`).join('')}</div>
        <div class="vent-fb" id="ventFb" hidden></div></div>`;
    $('fFoot').innerHTML = '';
  },
  answerVent(k) {
    const it = this.items[this.i], ok = k === VENT[it.key].ans;
    document.querySelectorAll('.vbtn').forEach((b) => { b.disabled = true; if (b.dataset.v === VENT[it.key].ans) b.classList.add('right'); else if (b.dataset.v === k) b.classList.add('wrong'); });
    ok ? AudioSys.right() : AudioSys.wrong(); if (ok) this.right++;
    const fb = $('ventFb'); fb.hidden = false; fb.innerHTML = `<b>${ok ? 'Exact !' : 'Pas tout à fait…'}</b> ${esc(frSpace(VENT[it.key].why))}`;
    $('fFoot').innerHTML = `<button type="button" class="btn sm btn-green" data-next="vent">${this.i + 1 < this.items.length ? 'Suivant' : 'Remplir la 2035'}</button>`;
  },
  renderForm() {
    const b = this.b;
    const depRows = Object.keys(DEP_CATS).filter((k) => b.dep[k]).map((k, n) => `<div class="frow"><span class="fl">D${n + 1}</span><span>${esc(frSpace(DEP_CATS[k]))}</span><span class="fv">${eur2(b.dep[k])}</span></div>`).join('');
    const dotDetail = b.immos.map((im) => `${im.label.replace(/ \(niveau \d\)/, '')} ${fmt2(im.dot)} €`).join(' · ') + (b.immos.some((im) => im.y === this.y) ? ' (prorata temporis)' : '');
    const hs = {}; for (const e of b.hors.filter((x) => x.cat === 'hors')) { const k = e.sub === 'perso' ? 'Vie perso' : e.sub === 'capital' ? 'Capital remboursé' : e.label; hs[k] = (hs[k] || 0) + Math.abs(e.amount); }
    const horsList = Object.keys(hs).map((k) => `${k} (${fmt2(hs[k])} €)`).join(', ');
    $('fBody').innerHTML = `<div class="form-grid">
      <div class="fsec"><h3>Recettes</h3><div class="rows">
        <div class="frow"><span class="fl">R1</span><span>Recettes encaissées<small>${frSpace('honoraires, avantages en nature')}</small></span><span class="fv">${eur2(b.rec)}</span></div>
        ${b.retro ? `<div class="frow"><span class="fl">R2</span><span>Honoraires rétrocédés<small>${frSpace('à déduire : ta rétrocession au titulaire')}</small></span><span class="fv">−${eur2(b.retro)}</span></div>` : ''}
        <div class="frow"><span class="fl">R3</span><span>Gains divers<small>${frSpace("redevances de ton assistant")}</small></span><span class="fv">${eur2(b.gains)}</span></div>
        <div class="frow tot"><span class="fl">R</span><span>Total des recettes</span><span class="fv">${eur2(b.total)}</span></div>
        ${horsList ? `<div class="frow"><span class="fl">—</span><span>Non déclaré<small>${esc(frSpace(horsList))}</small></span><span class="fv">0 €</span></div>` : ''}
      </div></div>
      <div class="fsec"><h3>Dépenses</h3><div class="rows${Object.keys(DEP_CATS).filter((k) => b.dep[k]).length > 7 ? ' dense' : ''}">${depRows}
        <div class="frow"><span class="fl">A</span><span>Dotations aux amortissements<small>${esc(frSpace(dotDetail || 'aucune'))}</small></span><span class="fv">${eur2(b.dot)}</span></div>
        <div class="frow tot"><span class="fl">D</span><span>Total dépenses + amortissements</span><span class="fv">${eur2(b.charges)}</span></div>
      </div></div>
      <div class="f-res"><span>Bénéfice : ${eur2(b.bncReel)}</span><span class="formula">${frSpace('= Recettes − Dépenses − Amortissements')}</span></div>
    </div>`;
    $('fFoot').innerHTML = `<button type="button" class="btn sm btn-green" data-next="form">Choisir mon régime</button>`;
  },
  renderRegime() {
    const b = this.b, reveal = this.step === 3, aga = agaFor(this.y), cpt = comptableFor(this.y);
    const taxM = b.microOk ? impot(b.bncMicro) : null, taxR = impot(b.bncReel);
    const best = taxM != null && taxM <= taxR ? 'micro' : 'reel';
    const calc = (bnc, tax) => `<div class="rcalc"><div class="line"><span>Bénéfice imposable</span><b>${eur2(bnc)}</b></div><div class="line"><span>Impôt (barème)</span><b>${eur2(tax)}</b></div><div class="line"><span>Taux moyen · TMI</span><b>${bnc > 0 ? pct(tax / bnc, 1) : '0 %'} · ${pct(tmi(bnc))}</b></div><div class="line big"><span>À payer</span><b>${eur2(tax)}</b></div></div>`;
    const hint = aga || cpt
      ? `<div class="f-hint aga">${frSpace(`${aga ? 'Ton AGA' : 'Ton comptable'} a fait le calcul : tes charges réelles représentent <b>${pct(b.ratio, 1)}</b> de tes recettes (seuil de référence : 34 %).`)}</div>`
      : `<div class="f-hint">${frSpace(`Sans AGA ni comptable, c'est à toi de comparer : charges réelles de ${eur2(b.charges)} pour ${eur2(b.total)} de recettes. Le seuil à retenir : 34 %.`)}</div>`;
    const cls = (id) => `reg${this.pick === id ? ' sel' : ''}${reveal && best === id ? ' win' : ''}`;
    $('fBody').innerHTML = `${hint}<div class="reg-cards${reveal ? ' reveal' : ''}">
      <button type="button" class="${cls('micro')}" data-reg="micro"${!b.microOk ? ' disabled' : ''}><span class="rk">Régime déclaratif spécial</span><h3>Micro-BNC</h3>
        <ul><li>${frSpace('Abattement forfaitaire de 34 % (305 € minimum)' + (b.retro ? ', sur tes recettes nettes des rétrocessions' : ''))}</li><li>${frSpace('Pas de 2035 : tes recettes vont sur la 2042 C-PRO')}</li><li>${frSpace(b.microOk ? 'Possible : recettes ≤ 77 700 € HT' : 'Impossible : recettes > 77 700 € HT')}</li></ul>
        ${b.microOk ? calc(b.bncMicro, taxM) : ''}</button>
      <button type="button" class="${cls('reel')}" data-reg="reel"><span class="rk">Déclaration contrôlée</span><h3>Régime réel</h3>
        <ul><li>${frSpace('Tu déduis tes vraies dépenses et tes amortissements')}</li><li>${frSpace('2035 obligatoire, télétransmise' + (aga ? ' par ton AGA' : cpt ? ' par ton comptable' : ''))}</li><li>${frSpace('Intéressant si tes charges dépassent 34 %')}</li></ul>
        ${calc(b.bncReel, taxR)}</button></div>`;
    if (!reveal) { $('fFoot').innerHTML = `<span class="ct-tip">${frSpace('Touche le régime que tu choisis pour ' + this.y + '.')}</span>`; return; }
    const ok = this.pick === best, diff = Math.abs((taxM ?? taxR) - taxR);
    $('fBody').insertAdjacentHTML('beforeend', `<div class="f-hint${ok ? '' : ' aga'}">${frSpace(ok
      ? `Bon choix ! Avec ${pct(b.ratio, 1)} de charges, ${best === 'micro' ? "l'abattement de 34 % est plus généreux que tes vraies dépenses" : 'tes vraies dépenses dépassent le forfait de 34 %'}.`
      : `Dommage : l'autre régime t'aurait fait économiser ${eur2(diff)}. Charges = ${pct(b.ratio, 1)} de tes recettes, à comparer aux 34 % du micro-BNC.`)}</div>`);
    const tax = this.pick === 'micro' ? taxM : taxR;
    const low = tax === 0 ? ` Ton bénéfice reste sous 11 294 € : cette première tranche n'est pas imposée.` : '';
    $('fFoot').innerHTML = `<span class="ct-tip">${frSpace(`Ton impôt ${this.y} se paie cette année, en ${this.y + 1}.${low}`)}</span><button type="button" class="btn sm btn-green" data-next="pay">${tax > 0 ? `Payer ${eur2(tax)} d'impôt` : 'Valider : 0 € d’impôt'}</button>`;
  },
  choose(reg) {
    if (this.step !== 2) return;
    this.pick = reg; this.step = 3; AudioSys.stamp(); this.render();
  },
  async finish() {
    const b = this.b, reg = this.pick, bnc = reg === 'micro' ? b.bncMicro : b.bncReel, tax = impot(bnc);
    const taxM = b.microOk ? impot(b.bncMicro) : Infinity, best = taxM <= impot(b.bncReel) ? 'micro' : 'reel';
    G.decl[this.y] = { regime: reg, bnc, impot: tax, recettes: b.total, charges: b.charges, ratio: b.ratio, best };
    G.pendingDecl = null;
    if (tax > 0) { book(`Impôt sur le revenu ${this.y}`, -tax, 'hors', 'impot'); G.money -= tax; }
    persist(); HUD.tweenMoney();
    $('d2035').hidden = true;
    const xp = this.right * 5 + (reg === best ? 15 : 0);
    await showReward({ ribbon: 'Déclaration envoyée !', artHTML: SVGART.calc, title: `Revenus ${this.y} · ${reg === 'micro' ? 'micro-BNC' : 'déclaration contrôlée'}`, gains: [`Bénéfice déclaré : ${eur(bnc)}`, `Impôt payé : ${eur(tax)}`, `Ventilation : ${this.right}/${this.items.length}`], xp, bonusText: reg === best ? 'Dont +15 XP : le régime le plus avantageux !' : '' });
    await addXP(xp);
    await Quests.done('d2035');
    await Talk.open(); await SCRIPTS.declAfter(reg, best); await Talk.close();
    const r = this.resolve; this.resolve = null; if (r) r();
  }
};
$('d2035').addEventListener('click', (e) => {
  const v = e.target.closest('.vbtn'); if (v && !v.disabled) { Decl.answerVent(v.dataset.v); return; }
  const n = e.target.closest('[data-next]');
  if (n) {
    AudioSys.tap();
    if (n.dataset.next === 'vent') { Decl.i++; Decl.render(); }
    else if (n.dataset.next === 'form') { Decl.step = 2; Decl.render(); }
    else if (n.dataset.next === 'pay') { n.disabled = true; Decl.finish(); }
    return;
  }
  const r = e.target.closest('[data-reg]'); if (r && !r.disabled) Decl.choose(r.dataset.reg);
});
