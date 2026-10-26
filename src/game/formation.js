import { AudioSys } from '../audio/audio.js';
import { formationSeconds } from '../core/prefs.js';
import { G, persist, state } from '../core/save.js';
import { $, clamp, esc } from '../core/utils.js';
import { ITEMS } from '../data/shop-items.js';
import { Fade } from '../fx/transitions.js';
import { Intro } from '../scenes/intro.js';
import { Talk, say } from '../story/talk.js';
import { refreshGuide } from '../ui/guide.js';
import { toast } from '../ui/helpers.js';
import { HUD, addXP } from '../ui/hud.js';
import { SVGART } from '../ui/icons.js';
import { blocked } from '../ui/modals.js';

/* ================= Formations: 30 s of training, then the kiné tells what he learnt ================= */
const FORMATION_TALK = {
  f_lca: {
    lines: [
      ['player', 'happy', 'Formation genou & LCA terminée ! Premier réflexe pour le diagnostic : l’histoire, puis l’examen, puis l’IRM, dans cet ordre. Le meilleur test, c’est le Lachmann.'],
      ['player', 'think', 'On ne raisonne plus en délais mais en critères cliniques. Pour reprendre la course : au moins 3 mois, genou sec, 5/0/135, LSI quadriceps > 70 % et IKDC > 64. Et les sauts avant la course !'],
      ['player', 'think', 'Un patient trop actif ? Épanchement réactionnel, douleur > 4/10 pendant ou après les exercices, perte d’amplitude : on lève le pied.'],
      ['player', 'happy', 'Pour le retour au sport : LSI ≥ 90 % en force et en sauts, et un ACL-RSI ≥ 80 %. Mes sportifs n’ont qu’à bien se tenir !']
    ]
  },
  f_tm: {
    lines: [
      ['player', 'happy', 'Formation thérapie manuelle terminée ! Quatre grades de mobilisation et deux résistances. Un patient irritable reste sur les bas grades.'],
      ['player', 'think', 'Concept Mulligan : un glissement accessoire passif pendant que le patient fait activement le mouvement douloureux. Un SNAG doit soulager tout de suite : 2 ou 3 répétitions, sinon j’arrête.'],
      ['player', 'think', 'Céphalée cervicogénique : test de flexion-rotation positif s’il reproduit les symptômes ou si l’écart dépasse 10°.'],
      ['player', 'happy', 'Et pour les fléchisseurs profonds du cou, le renforcement donne rarement des résultats avant 6 semaines : patience !']
    ]
  }
};
export const Formation = {
  begin(id) {
    G.formations[id] = 'training';
    G.training = { id, t: formationSeconds(), dur: formationSeconds() };
    persist(); this.renderChip();
  },
  tick(dt) {
    const tr = G.training; if (!tr) return;
    if (!Fade.active && !Intro.active && tr.t > 0) tr.t -= dt;
    this.renderChip();
    if (tr.t <= 0 && !this.finishing && !blocked()) this.finish();
  },
  async finish() {
    const tr = G.training; if (!tr) return;
    this.finishing = true; state.busy = true;
    AudioSys.chime();
    const F = FORMATION_TALK[tr.id];
    await Talk.open();
    for (const [w, e, t] of F.lines) await say(w, e, t);
    await say('mentor', 'happy', 'Bravo ! Une formation, c’est une dépense déductible… et des patients mieux soignés. Ton rendement augmente de 10 %.');
    await Talk.close();
    G.formations[tr.id] = 'done'; G.training = null; persist();
    this.renderChip(); toast(`Formation validée : <b>${esc(ITEMS[tr.id].name)}</b> (+10 %).`, 4200);
    state.busy = false; this.finishing = false;
    await addXP(15); HUD.render(); refreshGuide();
  },
  renderChip() {
    const el = $('formChip'); if (!el) return;
    const tr = G.training; el.hidden = !tr || !['town', 'cabinet', 'ordre'].includes(state.screen);
    if (!tr) return;
    const k = clamp(1 - tr.t / (tr.dur || 1), 0, 1);
    el.innerHTML = `<span class="fc-fill" style="width:${(k * 100).toFixed(1)}%"></span>${SVGART.cap}<span>${esc(ITEMS[tr.id].name.replace('Formation ', ''))} · ${tr.t > 0 ? Math.ceil(tr.t) + ' s' : 'terminée !'}</span>`;
  }
};
