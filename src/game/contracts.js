import { AudioSys } from '../audio/audio.js';
import { URLS } from '../core/assets.js';
import { ordreSeconds } from '../core/prefs.js';
import { G, curDate, gx, persist, state } from '../core/save.js';
import { $, deMois, esc, frSpace } from '../core/utils.js';
import { A_CLAUSES, A_ORDER, M_CLAUSES, M_ORDER, R_CLAUSES, R_ORDER } from '../data/contracts.js';
import { ECO } from '../data/economy.js';
import { CANDIDATES } from '../data/staff.js';
import { TOWN_CABS } from '../data/town-map.js';
import { Board, offerDef } from './board.js';
import { Career } from './career.js';
import { Letters } from './letters.js';
import { Quests } from './quests.js';
import { Hire, staffName } from './staff.js';
import { Town } from '../scenes/town.js';
import { SCRIPTS } from '../story/scripts.js';
import { Talk } from '../story/talk.js';
import { Guide, refreshGuide } from '../ui/guide.js';
import { hideToast, toast } from '../ui/helpers.js';
import { HUD, addXP } from '../ui/hud.js';
import { ICON } from '../ui/icons.js';

/* ================= Reading a contract: flag, ask the Ordre, sign or refuse ================= */
function fillClause(s, ctx) {
  return s.replace(/\{tit\}/g, ctx.tit).replace(/\{r\}/g, Math.round(ctx.r * 100)).replace(/\{rb\}/g, Math.round((ctx.rb || 0.4) * 100))
    .replace(/\{n\}/g, ctx.months).replace(/\{from\}/g, `${deMois(curDate().m)} ${curDate().y}`).replace(/\{e\}/g, gx('', 'e'));
}
/* the candidate of a hiring contract */
const hireWho = (ctx) => (ctx && ctx.who) || 'mathieu';
export const fillWho = (s, who) => s.replace(/\{who\}/g, staffName(who));
export const Contracts = {
  kind: null, ctx: null, list: [], flags: new Set(), revealed: false, hinted: null, pending: null,
  build(kind, ctx) {
    if (kind === 'rempl') {
      const d = offerDef(ctx), keys = R_ORDER.concat(d.extra || [], d.housing ? ['logement'] : []);
      const fx = { tit: TOWN_CABS[d.cab].tit, r: d.r, rb: d.rb, months: d.months };
      return keys.map((k) => { const c = R_CLAUSES[k], bad = ctx.bad.includes(k); return { k, t: c.t, kind: c.kind, bad, why: c.why, text: fillClause(bad ? c.bad : c.ok, fx) }; });
    }
    if (kind === 'assist') return A_ORDER.map((k) => { const c = A_CLAUSES[k], bad = ctx.bad.includes(k); return { k, t: c.t, kind: c.kind, bad, why: c.why, text: fillClause(bad ? c.bad : c.ok, { tit: 'Ambroise', r: ECO.assistRate, months: 0 }) }; });
    const w = hireWho(ctx);
    return M_ORDER.map((k) => { const c = M_CLAUSES[k], bad = ctx.bad.includes(k); return { k, t: c.t, kind: c.kind, bad, why: fillWho(c.why, w), text: fillWho(bad ? c.bad : c.ok, w) }; });
  },
  meta(kind, ctx) {
    if (kind === 'rempl') { const d = offerDef(ctx), C = TOWN_CABS[d.cab]; return { av: 'av_' + C.who, kind: 'Contrat de remplacement', name: `${C.tit} · ${C.name}`, pitch: ctx.ver > 1 ? '« Voici le contrat corrigé. Tout devrait être en règle ! »' : d.pitch }; }
    if (kind === 'assist') return { av: 'av_ambroise', kind: "Contrat d'assistant libéral", name: 'Ambroise · Cabinet Ambroise', pitch: ctx.ver > 1 ? '« Voilà la version corrigée. On démarre quand tu veux ! »' : `« Tu as été ${gx('un super remplaçant', 'une super remplaçante')}. Deviens ${gx('mon assistant', 'mon assistante')} : tu soignes ma patientèle, dans mes locaux, et tu me reverses une redevance. »` };
    const w = hireWho(ctx), C = CANDIDATES[w] || CANDIDATES.mathieu;
    return { av: 'av_' + w, kind: "Contrat d'assistant libéral", name: `${C.name} · ${C.hobby}`, pitch: ctx.ver > 1 ? '« Voici mon contrat corrigé. Tout devrait être en règle cette fois ! »' : C.pitch };
  },
  async open(kind, ctx) {
    if (state.busy) return;
    this.kind = kind; this.ctx = ctx; this.flags = new Set(); this.revealed = false; this.hinted = null; this.pending = null;
    this.list = this.build(kind, ctx);
    if (!G.events['ctIntro_' + kind]) {
      G.events['ctIntro_' + kind] = true; persist();
      state.busy = true; await Talk.open(); await SCRIPTS.contractIntro(kind); await Talk.close(); state.busy = false;
    }
    if (kind === 'rempl' && ctx.ver === 1 && !ctx.pitched) {
      ctx.pitched = true; persist();
      state.busy = true; await Talk.open(); await SCRIPTS.titPitch(offerDef(ctx).cab, ctx); await Talk.close(); state.busy = false;
    }
    const m = this.meta(kind, ctx);
    $('ctAv').src = URLS[m.av]; $('ctKind').textContent = frSpace(m.kind + (ctx.ver > 1 ? ' · version corrigée' : ''));
    $('ctName').textContent = frSpace(m.name); $('ctPitch').textContent = frSpace(m.pitch);
    this.renderBody(); this.renderFoot();
    hideToast(); Guide.hide(); $('contract').hidden = false; AudioSys.page();
  },
  renderBody() {
    $('ctBody').innerHTML = `<p class="ct-help">${frSpace(this.revealed ? 'Analyse de ton contrat :' : 'Lis chaque clause. Touche celles qui te semblent louches pour les signaler, puis décide.')}</p>` +
      this.list.map((c, i) => {
        let cls = 'clause', extra = '';
        const flagged = this.flags.has(i);
        if (this.revealed) {
          cls += c.bad ? ' bad-reveal' : ' ok-reveal'; if (flagged) cls += ' flagged';
          const tag = c.bad ? (c.kind === 'unfair' ? 'Défavorable' : 'Illégal') : c.kind === 'engage' ? 'Légal, mais ça t’engage' : c.kind === 'perk' ? 'Avantage' : 'Conforme';
          const col = c.bad ? '#a51d10' : c.kind === 'engage' ? '#8a5200' : '#1d6a0b';
          const note = c.bad ? ' — ' + esc(frSpace(c.why)) : (c.kind === 'engage' || c.kind === 'perk') ? ' — ' + esc(frSpace(c.why)) : '';
          extra = `<span class="cl-res" style="color:${col}"><b>${frSpace(tag)}${c.bad ? (flagged ? ' · bien repéré !' : ' · non repéré') : flagged && c.kind !== 'engage' ? ' · signalé à tort' : ''}</b>${note}</span>`;
        } else if (flagged) cls += ' flag';
        if (this.hinted === i && !this.revealed) cls += ' hint';
        return `<button type="button" class="${cls}" data-cl="${i}"${this.revealed ? ' disabled' : ''}><span class="cl-n">${i + 1}</span><span><b>${esc(c.t)} · </b>${esc(frSpace(c.text))}${extra}</span><span class="cl-flag">${ICON.flag}</span></button>`;
      }).join('');
  },
  renderFoot(result) {
    const f = $('ctFoot');
    if (this.revealed) { f.innerHTML = `<span class="ct-tip">${result || ''}</span><button type="button" class="btn btn-green" data-ct="done">Continuer</button>`; return; }
    const syn = G.owned.syndicat && this.hinted == null ? '<button type="button" class="btn btn-gray" data-ct="syndic">Syndicat</button>' : '';
    f.innerHTML = `<span class="ct-tip">${frSpace(`${this.flags.size} clause${this.flags.size > 1 ? 's' : ''} signalée${this.flags.size > 1 ? 's' : ''}`)}</span>
      ${syn}<button type="button" class="btn btn-blue" data-ct="ordre">Avis de l'Ordre</button><button type="button" class="btn btn-red" data-ct="refuse">Refuser</button><button type="button" class="btn btn-green" data-ct="sign">Signer</button>`;
  },
  toggle(i) { if (this.revealed) return; this.flags.has(i) ? this.flags.delete(i) : this.flags.add(i); AudioSys.tap(); this.renderBody(); this.renderFoot(); },
  /* Members of a syndicat get their contract proofread. */
  syndicHint() {
    const i = this.list.findIndex((c) => c.bad);
    this.hinted = i >= 0 ? i : -1; AudioSys.chime();
    toast(i >= 0 ? `Ton syndicat te conseille de relire la clause <b>${i + 1}</b>.` : 'Ton syndicat a relu : rien d’anormal dans ce contrat.');
    this.renderBody(); this.renderFoot();
  },
  async decide(action) {
    const ctx = this.ctx, bad = this.list.filter((c) => c.bad), illegal = bad.some((c) => c.kind === 'illegal');
    if (action === 'syndic') { this.syndicHint(); return; }
    await Quests.done('study');
    if (action === 'ordre') {
      Letters.send(this.kind, ctx, bad.map((c) => c.k));
      if (this.kind === 'rempl') ctx.state = 'ordre';
      if (this.kind === 'assist') G.assistOffer.state = 'ordre';
      if (this.kind === 'hire') { G.hireOffer.state = 'ordre'; Town.releaseOffer(); }
      persist();
      $('contract').hidden = true; AudioSys.stamp();
      toast(`Projet envoyé au <b>conseil départemental de l'Ordre</b>. Avis gratuit, réponse dans <b>${Math.round(ordreSeconds())} s</b>.`, 4200);
      await Quests.done('ordreAsk'); refreshGuide(); Town.updateDom(); HUD.render();
      return;
    }
    this.revealed = true; this.renderBody();
    let right = 0; this.list.forEach((c, i) => { if (c.bad && this.flags.has(i)) right++; });
    const good = (action === 'refuse') === (bad.length > 0);
    const who = this.kind === 'rempl' ? TOWN_CABS[offerDef(ctx).cab].tit : this.kind === 'assist' ? 'Ambroise' : staffName(hireWho(ctx));
    let msg;
    if (action === 'sign' && !bad.length) msg = this.kind === 'hire' ? `Contrat signé et transmis à l’Ordre. Bienvenue à ${who} !` : 'Contrat signé ! Il part au conseil départemental de l’Ordre.';
    else if (action === 'sign') msg = illegal ? "Aïe ! Le conseil départemental de l'Ordre refusera ce contrat : il n'est pas conforme. Rien de valable n'est signé." : 'Signé… mais à ces conditions, tu y perds beaucoup.';
    else if (bad.length) msg = `Bonne décision ! ${who} va te proposer une version corrigée.`;
    else msg = `Ce contrat était conforme… ${this.kind === 'rempl' ? `${who} trouvera quelqu'un d'autre.` : `${who} reviendra plus tard.`}`;
    this.renderFoot(frSpace(msg));
    good ? AudioSys.right() : AudioSys.wrong();
    this.pending = { action, bad: bad.length > 0, illegal, onlyUnfair: bad.length > 0 && !illegal, right, good };
  },
  async done() {
    const p = this.pending, ctx = this.ctx, kind = this.kind;
    $('contract').hidden = true; state.busy = true;
    const xp = p.right * 5 + (p.good ? 10 : 0);
    if (xp) await addXP(xp);
    const signedOk = p.action === 'sign' && (!p.bad || p.onlyUnfair);
    if (kind === 'rempl') {
      const d = offerDef(ctx);
      if (signedOk) { ctx.state = 'gone'; await Career.startRempl(ctx, p.onlyUnfair && d.rb ? d.rb : d.r); }
      else if (p.bad) { ctx.ver = 2; ctx.bad = []; ctx.state = 'draft'; if (p.action === 'sign' && p.illegal) { await Talk.open(); await SCRIPTS.signedBad(); await Talk.close(); } }
      else ctx.state = 'gone';
      Board.refill();
    } else if (kind === 'assist') {
      if (signedOk) await Career.startAssist(p.onlyUnfair ? 0.45 : ECO.assistRate);
      else { G.assistOffer.ver = 2; G.assistOffer.bad = []; G.assistOffer.state = 'draft'; if (!p.bad) { await Talk.open(); await SCRIPTS.ambroiseInsists(); await Talk.close(); } setTimeout(() => Career.offerAssist(), 600); }
    } else {
      Town.releaseOffer();
      if (signedOk) await Hire.hired(p.onlyUnfair ? 0.08 : ECO.mathieuRate);
      else { G.hireOffer = { ver: 2, who: hireWho(ctx), bad: [], state: 'wait', due: G.months + 1 }; if (p.action === 'sign' && p.illegal) { await Talk.open(); await SCRIPTS.signedBad(); await Talk.close(); } }
    }
    persist(); state.busy = false; HUD.render(); Town.renderDom(); refreshGuide();
  }
};
$('contract').addEventListener('click', (e) => {
  const c = e.target.closest('.clause'); if (c && !c.disabled) { Contracts.toggle(+c.dataset.cl); return; }
  const b = e.target.closest('[data-ct]'); if (!b || b.disabled) return;
  AudioSys.tap();
  if (b.dataset.ct === 'done') Contracts.done();
  else if (b.dataset.ct === 'syndic') Contracts.decide('syndic');
  else { $('ctFoot').querySelectorAll('button').forEach((x) => { x.disabled = true; }); Contracts.decide(b.dataset.ct); }
});
