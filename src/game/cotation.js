import { AudioSys } from '../audio/audio.js';
import { URLS } from '../core/assets.js';
import { G, persist } from '../core/save.js';
import { $, TEST, esc, eur2, frSpace, pick, randi, shuffle } from '../core/utils.js';
import { CASES, KEYS, NGAP, PATIENTS, cotStr } from '../data/ngap.js';
import { Visit, book } from './month.js';
import { Quests } from './quests.js';
import { SCRIPTS } from '../story/scripts.js';
import { Talk } from '../story/talk.js';
import { Guide } from '../ui/guide.js';
import { hideToast } from '../ui/helpers.js';
import { HUD, addXP } from '../ui/hud.js';
import { ICON } from '../ui/icons.js';

/* ================= Coter chaque séance (NGAP 2026), puis le contrôle de la CPAM ================= */
const r2 = (n) => Math.round(n * 100) / 100;
const WEIGHT = { lomb: 4, cerv: 3, coup: 1, arthro: 1, pth: 3, ptg: 3, lca: 3, menisc: 2, entorse: 3, entorseOp: 1, coiffe: 3, coiffeOp: 1, carpien: 1, ter: 1, hemi: 1, vestib: 1, bpco: 0.4, perinee: 1, deamb: 2, lymph: 1, sein: 0.6, palli: 0.4, bdk: 2 };
export const valueOf = (c, dom) => r2(c * (dom ? NGAP.valueDom : NGAP.value));
/* average value of a séance (to size the agenda of a cabinet from its monthly honoraires) */
export const AVG_SEANCE = (() => { let s = 0, w = 0; for (const k of CASES) { const p = WEIGHT[k.id] || 1; s += p * valueOf(k.c); w += p; } return s / w; })();
/* which passer-by sprite looks like this patient (rows of the p_* sheets: old man, old woman, young man, young woman) */
export const walkerType = (pt) => (pt.age >= 60 ? (pt.sex === 'f' ? 1 : 0) : pt.sex === 'f' ? 3 : 2);
/* portrait of a patient: patients.webp = 10 patients × 3 expressions (calm, happy, scared) */
export function patientArt(p, expr = 'calm', h = 230) {
  const k = h / 298, row = { calm: 0, happy: 1, scared: 2 }[expr] || 0;
  return `<span class="pat-art" style="width:${(160 * k).toFixed(0)}px;height:${h}px;background-image:url('${URLS.patients}');background-size:${(1600 * k).toFixed(0)}px ${(894 * k).toFixed(0)}px;background-position:${(-p.img * 160 * k).toFixed(0)}px ${(-row * 298 * k).toFixed(0)}px"></span>`;
}
export const Cotation = {
  resolve: null, cur: null,
  /* a patient of the day: a prescription, a face, a first name and an age that fit */
  draw() {
    const tot = CASES.reduce((s, k) => s + (WEIGHT[k.id] || 1), 0);
    let r = Math.random() * tot, cs = CASES[0];
    for (const k of CASES) { r -= WEIGHT[k.id] || 1; if (r <= 0) { cs = k; break; } }
    const fits = PATIENTS.map((p, i) => ({ ...p, img: i })).filter((p) => (!cs.sex || p.sex === cs.sex) && p.age[1] >= cs.age[0] && p.age[0] <= cs.age[1]);
    const P = pick(fits.length ? fits : PATIENTS.map((p, i) => ({ ...p, img: i })));
    const lo = Math.max(P.age[0], cs.age[0]), hi = Math.min(P.age[1], cs.age[1]);
    return { cs: cs.id, img: P.img, sex: P.sex, name: pick(P.names), age: randi(Math.min(lo, hi), Math.max(lo, hi)) };
  },
  caseOf(pt) { return CASES.find((k) => k.id === pt.cs) || CASES[0]; },
  rightValue(pt) { return valueOf(this.caseOf(pt).c); },
  /* The player codes the séance. Resolves with { ok, value, right }. */
  ask(pt, opt = {}) {
    return new Promise((resolve) => {
      const cs = this.caseOf(pt);
      const opts = shuffle([{ key: cs.key, c: cs.c, ok: true }, ...cs.alts.map(([key, c]) => ({ key, c, ok: false }))]);
      this.cur = { pt, cs, opts, opt }; this.resolve = resolve;
      $('cotKick').textContent = frSpace(opt.kick || 'Feuille de soins · NGAP 2026');
      $('cotPat').innerHTML = patientArt(pt, 'calm', 290);
      $('cotWho').innerHTML = frSpace(`<b>${esc(pt.name)}</b>${pt.age} ans`);
      $('cotRx').innerHTML = frSpace(`<small>Prescription</small>« ${esc(cs.rx)} »`);
      $('cotQ').innerHTML = frSpace(`Quelle cotation ? <small>Lettre-clé à ${eur2(NGAP.value)}</small>`);
      $('cotOpts').innerHTML = opts.map((o, i) => `<button type="button" class="qopt" data-cot="${i}"><span class="key">${'ABC'[i]}</span><span class="cot-k">${cotStr(o.key, o.c)}</span><span class="cot-v">${eur2(valueOf(o.c))}</span></button>`).join('');
      $('cotFb').hidden = true; $('cotBtns').innerHTML = ''; $('cotMemo').hidden = true;
      $('cotMemoBtn').hidden = false;
      hideToast(); Guide.hide(); $('cotation').hidden = false; AudioSys.page();
    });
  },
  answer(i) {
    const C = this.cur; if (!C || C.done) return;
    C.done = true;
    const o = C.opts[i], ok = o.ok, right = C.opts.find((x) => x.ok), value = valueOf(o.c), rv = valueOf(right.c);
    $('cotOpts').querySelectorAll('.qopt').forEach((b, j) => { b.disabled = true; if (C.opts[j].ok) b.classList.add('right'); else if (j === i) b.classList.add('wrong'); });
    ok ? AudioSys.right() : AudioSys.wrong();
    G.ngap.n++; if (ok) G.ngap.ok++;
    const res = { ok, value, right: rv, chosen: cotStr(o.key, o.c), good: cotStr(right.key, right.c), cs: C.cs.id };
    const fb = $('cotFb'); fb.hidden = false;
    const diff = r2(value - rv);
    fb.innerHTML = frSpace(ok
      ? `<b>Bien coté !</b> ${esc(cotStr(right.key, right.c))} × ${eur2(NGAP.value)} = <b>${eur2(rv)}</b>. ${esc(C.cs.why)}`
      : `<b>Erreur de cotation.</b> Il fallait <b>${esc(cotStr(right.key, right.c))}</b>. ${esc(C.cs.why)} ${diff > 0 ? `Tu factures ${eur2(diff)} de trop : un <b>indu</b> que la CPAM te réclamera en cas de contrôle.` : diff < 0 ? `Tu factures ${eur2(-diff)} de moins : de l'argent perdu pour toi.` : 'Même montant… mais un acte mal coté peut être rejeté lors d’un contrôle.'}`);
    $('cotBtns').innerHTML = `<button type="button" class="btn sm btn-green" data-cot="ok">${ICON.card}<span>Encaisser ${eur2(value)}</span></button>`;
    this.res = res;
    persist();
    /* a good answer closes on its own: the day goes on */
    if (ok && !C.opt.keep) setTimeout(() => { if (this.cur === C) this.close(); }, TEST && TEST.fastWait ? 50 : 1100);
  },
  close() {
    const C = this.cur; if (!C) return;
    this.cur = null; $('cotation').hidden = true; AudioSys.tap();
    const r = this.resolve; this.resolve = null; if (r) r(this.res);
    if (this.res && this.res.ok && !G.q.ngap) setTimeout(() => Quests.done('ngap'), 300);
  },
  /* keep the séances you coded: the CPAM may check them later. weight = how many real séances this one stands for */
  record(res, weight, by = 'p') {
    const L = G.ngap.log;
    L.push({ m: G.months, cs: res.cs, ok: res.ok, chosen: res.chosen, good: res.good, d: r2((res.value - res.right) * weight), by });
    if (L.length > 80) { const cut = L.length - 80; L.splice(0, cut); G.ngap.checked = Math.max(0, G.ngap.checked - cut); }
    persist();
  },
  /* titulaire: at the end of the month, your software asks you to check a few séances */
  async batch(n, weight) {
    const out = [];
    for (let i = 0; i < n; i++) { const r = await this.ask(this.draw(), { kick: `Fin du mois · cotation ${i + 1} / ${n}` }); this.record(r, weight); out.push(r); }
    return { list: out, ok: out.filter((r) => r.ok).length, diff: r2(out.reduce((s, r) => s + r.value - r.right, 0)) };
  },
  /* first séance ever: Pascale explains the NGAP */
  async intro() {
    if (G.flags.ngapIntro) return;
    G.flags.ngapIntro = true; persist();
    await Talk.open(); await SCRIPTS.ngapIntro(); await Talk.close();
  }
};
$('cotation').addEventListener('click', (e) => {
  const b = e.target.closest('[data-cot]'); if (b && !b.disabled) { if (b.dataset.cot === 'ok') Cotation.close(); else Cotation.answer(+b.dataset.cot); return; }
  if (e.target.closest('#cotMemoBtn')) { AudioSys.tap(); const m = $('cotMemo'); m.hidden = !m.hidden; if (!m.hidden) m.innerHTML = Object.entries(KEYS).map(([k, v]) => `<span><b>${k}</b> ${esc(frSpace(v))}</span>`).join(''); }
});

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
