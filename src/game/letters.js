import { AudioSys } from '../audio/audio.js';
import { URLS } from '../core/assets.js';
import { ordreSeconds } from '../core/prefs.js';
import { G, gx, persist, state } from '../core/save.js';
import { $, esc, frSpace } from '../core/utils.js';
import { A_CLAUSES, M_CLAUSES, R_CLAUSES } from '../data/contracts.js';
import { TOWN_CABS } from '../data/town-map.js';
import { Fade } from '../fx/transitions.js';
import { offerDef } from './board.js';
import { Career } from './career.js';
import { Hire, staffName } from './staff.js';
import { Castle } from '../scenes/castle.js';
import { Intro } from '../scenes/intro.js';
import { Town } from '../scenes/town.js';
import { SCRIPTS } from '../story/scripts.js';
import { Talk } from '../story/talk.js';
import { refreshGuide } from '../ui/guide.js';
import { hideToast } from '../ui/helpers.js';
import { HUD, addXP } from '../ui/hud.js';
import { ICON } from '../ui/icons.js';
import { blocked } from '../ui/modals.js';

/* ================= The Ordre answers after a few seconds ================= */
export const Letters = {
  send(kind, ctx, badKeys) {
    G.letters.push({ id: ++G.seq, kind, ref: kind === 'rempl' ? ctx.id : kind, bad: badKeys, t: ordreSeconds() });
    persist(); this.renderChip();
  },
  ready() { return G.letters.filter((l) => l.t <= 0); },
  tick(dt) {
    if (!G.letters.length || Fade.active || Intro.active) return;
    for (const l of G.letters) if (l.t > 0) { l.t -= dt; if (l.t <= 0) { AudioSys.chime(); Town.updateDom(); } }
    this.renderChip();
    if (state.screen === 'ordre') Castle.renderUi();
    if (this.ready().length && !this.announcing && !blocked()) this.announce();
  },
  /* Pascale Matué, president of the conseil, announces that the avis is ready, then the letter opens. */
  async announce() {
    const l = this.ready()[0]; if (!l || this.announcing || blocked()) return;
    this.announcing = true; state.busy = true;
    const first = !G.flags.avisSeen; G.flags.avisSeen = true; persist();
    await Talk.open(); await SCRIPTS.ordreAvis(this.whoOf(l), l.bad.length > 0, first); await Talk.close();
    state.busy = false;
    await this.openReady();
    this.announcing = false;
  },
  whoOf(l) { if (l.kind === 'rempl') { const o = G.board.find((x) => x.id === l.ref); return o ? TOWN_CABS[offerDef(o).cab].tit : 'le titulaire'; } return l.kind === 'assist' ? 'Ambroise' : staffName((G.hireOffer && G.hireOffer.who) || 'mathieu'); },
  renderChip() {
    const el = $('ordreChip'); if (!el) return;
    const l = G.letters[0]; el.hidden = !l;
    if (!l) return;
    const ready = l.t <= 0;
    el.classList.toggle('ready', ready);
    el.innerHTML = `${ICON.envelope}<span>${ready ? 'Réponse de l’Ordre !' : `Avis de l’Ordre · ${Math.ceil(l.t)} s`}</span>`;
  },
  async openReady() {
    const l = this.ready()[0]; if (!l || blocked()) return;
    AudioSys.tap();
    await this.show(l);
    G.letters = G.letters.filter((x) => x !== l);
    if (l.kind === 'rempl') { const o = G.board.find((x) => x.id === l.ref); if (o) { o.state = 'draft'; o.bad = []; if (l.bad.length) o.ver = 2; } }
    else if (l.kind === 'assist') { G.assistOffer.state = 'draft'; G.assistOffer.bad = []; if (l.bad.length) G.assistOffer.ver = 2; }
    else G.hireOffer = { ver: l.bad.length ? 2 : 1, who: (G.hireOffer && G.hireOffer.who) || 'mathieu', bad: [], state: 'due', due: G.months };
    persist(); this.renderChip(); Town.renderDom(); HUD.render(); refreshGuide();
    if (l.bad.length) await addXP(10);
    if (l.kind === 'assist') Career.offerAssist();
    if (l.kind === 'hire') Hire.check();
  },
  show(l) {
    return new Promise((resolve) => {
      const C = l.kind === 'rempl' ? R_CLAUSES : l.kind === 'assist' ? A_CLAUSES : M_CLAUSES;
      const who = this.whoOf(l);
      const kindTxt = l.kind === 'rempl' ? 'contrat de remplacement' : "contrat d'assistant libéral";
      $('ltImg').src = URLS.card_ordre;
      $('ltSub').textContent = frSpace(`Avis sur le projet de ${kindTxt} avec ${who}`);
      const items = l.bad.map((k) => { const c = C[k]; return `<li><b>${esc(c.t)} · ${c.kind === 'unfair' ? 'défavorable' : 'non conforme'}</b> : ${esc(frSpace(c.why.replace(/\{who\}/g, who)))}</li>`; }).join('');
      $('ltBody').innerHTML = frSpace(`<p>${esc(G.pseudo || gx('Cher confrère', 'Chère consœur'))},</p><p>Vous nous avez soumis un projet de contrat. ${l.bad.length ? "Après examen, il ne peut pas être signé en l'état :" : 'Après examen, il est conforme au code de déontologie.'}</p>${l.bad.length ? `<ul>${items}</ul><p>${esc(who)} va vous proposer une version corrigée.</p>` : '<p>Vous pouvez le signer.</p>'}`) +
        `<span class="lt-stamp${l.bad.length ? ' bad' : ''}">${l.bad.length ? 'Non conforme' : 'Conforme'}</span>`;
      hideToast(); $('letter').hidden = false; AudioSys.stamp();
      $('ltOk').onclick = () => { AudioSys.tap(); $('letter').hidden = true; resolve(); };
    });
  }
};
$('ordreChip').addEventListener('click', () => { if (Letters.ready().length) Letters.openReady(); else AudioSys.tap(); });
