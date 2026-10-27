import { AudioSys } from '../audio/audio.js';
import { G, persist } from '../core/save.js';
import { Consult } from './consult.js';
import { Visit, book } from './month.js';
import { Quests } from './quests.js';
import { SCRIPTS } from '../story/scripts.js';
import { Talk } from '../story/talk.js';
import { HUD, addXP } from '../ui/hud.js';

/* ================= The séances you coded (NGAP 2026), then the control of the CPAM ================= */
const r2 = (n) => Math.round(n * 100) / 100;
export { AVG_SEANCE, patientArt, valueOf } from './consult.js';
export const Cotation = {
  /* a patient (for the incidents) */
  draw() { return Consult.draw(); },
  /* keep the séances you coded: the CPAM may check them later. weight = how many real séances this one stands for */
  record(res, weight, by = 'p') {
    const L = G.ngap.log;
    L.push({ m: G.months, cs: res.cs, ok: res.ok, chosen: res.chosen, good: res.good, d: r2((res.value - res.right) * weight), by });
    if (L.length > 80) { const cut = L.length - 80; L.splice(0, cut); G.ngap.checked = Math.max(0, G.ngap.checked - cut); }
    if (res.ok && !G.q.ngap) setTimeout(() => Quests.done('ngap'), 300);
    persist();
  },
  /* first patient ever: Pascale explains the consultation (prise en charge, then cotation) */
  async intro() {
    if (G.flags.consultIntro) return;
    G.flags.consultIntro = true; persist();
    await Talk.open(); await SCRIPTS.consultIntro(); await Talk.close();
  }
};

/* ================= The goblin of the CPAM checks your cotations ================= */
export const Cpam = {
  unchecked() { return G.ngap.log.slice(G.ngap.checked); },
  due() {
    const L = this.unchecked();
    if (L.length < 6) return false;
    const since = G.months - (G.ngap.last || 0);
    return since >= 4 && (since >= 8 || Math.random() < 0.45);
  },
  async control(force) {
    const L = this.unchecked();
    if (!force && !L.length) return null;
    const errors = L.filter((r) => !r.ok), over = r2(errors.reduce((s, r) => s + Math.max(0, r.d || 0), 0)), under = r2(-errors.reduce((s, r) => s + Math.min(0, r.d || 0), 0));
    G.ngap.checked = G.ngap.log.length; G.ngap.last = G.months; persist();
    const indu = Math.round(over);
    AudioSys.setTheme('cnam');
    const v = await Visit.come('goblin', 'read');
    await Talk.open();
    const n = await SCRIPTS.cpamControl({ n: L.length, errors, indu, under: Math.round(under) });
    await Talk.close();
    Visit.leave(v);
    if (indu > 0) {
      book('Remboursement d’indus à la CPAM (cotations erronées)', -indu, 'depense', 'indu');
      G.money -= indu; persist(); HUD.tweenMoney();
    }
    if (!errors.length) await addXP(20);
    else if (n) await addXP(n * 5);
    await Quests.done('cpam');
    return { errors: errors.length, indu };
  }
};
