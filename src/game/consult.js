import { AudioSys } from '../audio/audio.js';
import { URLS } from '../core/assets.js';
import { G, persist } from '../core/save.js';
import { $, TEST, esc, eur2, frSpace, pick, randi, shuffle } from '../core/utils.js';
import { CLIN } from '../data/cases.js';
import { NGAP, cotStr } from '../data/ngap.js';
import { Guide } from '../ui/guide.js';
import { hideToast } from '../ui/helpers.js';

/* ================= V6: the patient explains his problem, you choose the prise en charge, then the cotation =================
   The cases come from the courses of the school (data/cases.js). Three prises en charge, only one is right.
   Then three cotations: the right one is highlighted (learning the NGAP by heart is not the point).
   Abroad (Michigan, the Moon) there is no NGAP: the host pays you for each patient. */
const r2 = (n) => Math.round(n * 100) / 100;
export const valueOf = (c, dom) => r2(c * (dom ? NGAP.valueDom : NGAP.value));
/* average value of a séance (réorientations bring nothing): sizes the agenda of a half-day */
export const AVG_SEANCE = CLIN.reduce((s, k) => s + (k.cot ? valueOf(k.cot[1]) : 0), 0) / CLIN.length;
/* the faces: v6 young adults (portraits 10 to 13, sprites q0 to q3) and the v5 patients for the older ones */
const FACES = {
  yf: [{ kind: 'q0', img: 10 }, { kind: 'q3', img: 13 }],
  ym: [{ kind: 'q1', img: 11 }, { kind: 'q2', img: 12 }],
  /* v6.2: every patient now has the new style (Frank Takashi, the man in a kimono, always has the same name) */
  am: [{ kind: 'q4', img: 14, name: 'Frank Takashi' }, { kind: 'q5', img: 15 }],
  sf: [{ kind: 'q6', img: 16 }],
  sm: [{ kind: 'q4', img: 14, name: 'Frank Takashi' }, { kind: 'q5', img: 15 }, { kind: 'q7', img: 17 }]
};
const NAMES = {
  yf: ['Léa', 'Manon', 'Chloé', 'Emma', 'Inès', 'Camille', 'Jade', 'Zoé', 'Lina', 'Clara', 'Louise', 'Sarah'],
  ym: ['Lucas', 'Hugo', 'Nathan', 'Théo', 'Léo', 'Enzo', 'Louis', 'Arthur', 'Maxime', 'Baptiste', 'Jules', 'Raphaël'],
  am: ['Nicolas', 'Sébastien', 'Christophe', 'Stéphane', 'Laurent', 'Olivier', 'Frédéric', 'David', 'Vincent', 'Jérôme', 'Guillaume'],
  sf: ['Monique', 'Françoise', 'Jacqueline', 'Martine', 'Christiane', 'Josette', 'Simone', 'Colette', 'Odette', 'Denise', 'Yvette'],
  sm: ['Jean', 'Michel', 'Bernard', 'Gérard', 'Alain', 'Jacques', 'Daniel', 'Patrick', 'Pierre', 'Claude', 'René']
};
export const caseOf = (pt) => CLIN.find((k) => k.id === pt.cs) || CLIN[0];
/* a portrait: the picture of the patient with an expression (calm, happy, scared) */
export const portraitSrc = (pt, e = 'calm') => URLS[`pat${pt.img}_${e}`] || `assets/pat${pt.img}_${e}.webp`;
export function patientArt(pt, e = 'calm', h = 230) { return `<img class="pat-art" src="${portraitSrc(pt, e)}" alt="" style="height:${h}px;width:auto">`; }
export const Consult = {
  resolve: null, cur: null,
  /* a patient of the day: a clinical case, a face, a first name and an age that fit */
  draw() {
    const recent = (G.consult && G.consult.recent) || [];
    let pool = CLIN.filter((k) => !recent.includes(k.id)); if (!pool.length) pool = CLIN;
    const cs = pick(pool);
    if (G.consult) { recent.push(cs.id); while (recent.length > Math.min(24, CLIN.length - 6)) recent.shift(); G.consult.recent = recent; }
    const grp = cs.who === 'y' ? pick(['yf', 'ym']) : cs.who, F = pick(FACES[grp]);
    return { cs: cs.id, kind: F.kind, img: F.img, sex: grp.endsWith('f') ? 'f' : 'm', name: F.name || pick(NAMES[grp]), age: randi(cs.age[0], cs.age[1]) };
  },
  /* what the séance is worth: the right cotation (in the DOM, the lettre-clé is 2,43 €), or the pay of a mission */
  rightValue(pt, ctx = {}) { const k = caseOf(pt); if (!k.cot) return 0; return ctx.pay ? ctx.pay : valueOf(k.cot[1], ctx.dom); },
  /* The consultation. ctx: { dom, pay (abroad: € per patient), n, of }. Resolves with
     { pecOk, reorient, value, right, cot: { ok, chosen, good, cs, value, right } | null } */
  ask(pt, ctx = {}) {
    return new Promise((resolve) => {
      const cs = caseOf(pt), opts = shuffle(cs.pec.map((t, i) => ({ t, ok: i === 0 })));
      this.cur = { pt, cs, ctx, opts, step: 'pec' }; this.resolve = resolve;
      $('csKick').textContent = frSpace(ctx.pay ? `Consultation · ${ctx.where || 'mission'}` : 'Consultation');
      $('csCount').textContent = ctx.of ? `Patient ${ctx.n} / ${ctx.of}` : '';
      $('csPortrait').src = portraitSrc(pt, 'calm');
      $('csWho').innerHTML = frSpace(`<b>${esc(pt.name)}</b>${pt.age} ans`);
      $('csRx').innerHTML = frSpace(`<small>Prescription</small>« ${esc(cs.rx)} »`);
      $('csSay').innerHTML = frSpace(`« ${esc(cs.say)} »`);
      $('csExam').hidden = !cs.exam; if (cs.exam) $('csExam').innerHTML = frSpace(`<b>Ton bilan :</b> ${esc(cs.exam)}`);
      $('csQ').hidden = false;
      $('csOpts').innerHTML = opts.map((o, i) => `<button type="button" class="qopt" data-cs="${i}"><span class="key">${'ABC'[i]}</span><span>${esc(frSpace(o.t))}</span></button>`).join('');
      $('csFb').hidden = true; $('csCot').hidden = true; $('csBtns').innerHTML = '';
      $('consult').classList.remove('done');
      hideToast(); Guide.hide(); $('consult').hidden = false; AudioSys.page();
      const pitch = /^(p[02]|q[457])/.test(pt.kind) ? 0.8 : pt.sex === 'f' ? 1.2 : 0.95;
      for (let i = 0; i < 4; i++) AudioSys.voice('patient', 'aeiou'[randi(0, 4)], { delay: i * 0.09, mul: pitch });
    });
  },
  pick(i) {
    const C = this.cur; if (!C || C.step !== 'pec') return;
    C.step = 'cot';
    const o = C.opts[i], ok = o.ok, cs = C.cs;
    $('csOpts').querySelectorAll('.qopt').forEach((b, j) => { b.disabled = true; if (C.opts[j].ok) b.classList.add('right'); else if (j === i) b.classList.add('wrong'); });
    ok ? AudioSys.right() : AudioSys.wrong();
    $('csPortrait').src = portraitSrc(C.pt, ok ? 'happy' : 'scared');
    G.consult.n++; if (ok) G.consult.ok++; persist();
    C.pecOk = ok;
    const fb = $('csFb'); fb.hidden = false; fb.classList.toggle('bad', !ok);
    const head = ok ? pick(['Bonne prise en charge !', 'Exactement !', 'Bien vu !', 'Parfait !']) : 'Pas la bonne prise en charge…';
    fb.innerHTML = frSpace(`<b>${head}</b> ${esc(cs.why)} <span class="cs-ue">${esc(cs.ue)}</span>`);
    $('csQ').hidden = true;
    if (!cs.cot) {
      /* a red flag: no séance, nothing to bill */
      $('csBtns').innerHTML = `<button type="button" class="btn sm btn-green" data-cs="go">${frSpace('Réorienter le patient')}</button>`;
      C.res = { pecOk: ok, reorient: true, value: 0, right: 0, cot: null };
      return;
    }
    if (C.ctx.pay) {
      $('csBtns').innerHTML = `<button type="button" class="btn sm btn-green" data-cs="go">${frSpace(`Commencer la séance · ${eur2(C.ctx.pay)}`)}</button>`;
      C.res = { pecOk: ok, reorient: false, value: C.ctx.pay, right: C.ctx.pay, cot: null };
      return;
    }
    /* the cotation: the right one is highlighted */
    const dom = !!C.ctx.dom, right = { key: cs.cot[0], c: cs.cot[1], ok: true };
    const cots = shuffle([right, ...cs.alts.map(([key, c]) => ({ key, c, ok: false }))]);
    C.cots = cots;
    $('csCotQ').innerHTML = frSpace(`Cotation <small>lettre-clé à ${eur2(dom ? NGAP.valueDom : NGAP.value)}${dom ? ' (DOM)' : ''} · la bonne est en surbrillance</small>`);
    $('csCots').innerHTML = cots.map((x, i) => `<button type="button" class="qopt${x.ok ? ' hint' : ''}" data-cot="${i}"><span class="key">${'ABC'[i]}</span><span class="cot-k">${cotStr(x.key, x.c)}</span>${x.ok ? '<span class="cot-tag">conseillé</span>' : ''}<span class="cot-v">${eur2(valueOf(x.c, dom))}</span></button>`).join('');
    $('csCot').hidden = false; $('consult').classList.add('done');
  },
  cot(i) {
    const C = this.cur; if (!C || C.step !== 'cot' || !C.cots) return;
    C.step = 'end';
    const dom = !!C.ctx.dom, o = C.cots[i], right = C.cots.find((x) => x.ok), ok = o.ok;
    $('csCots').querySelectorAll('.qopt').forEach((b, j) => { b.disabled = true; if (C.cots[j].ok) b.classList.add('right'); else if (j === i) b.classList.add('wrong'); });
    const value = valueOf(o.c, dom), rv = valueOf(right.c, dom);
    G.ngap.n++; if (ok) G.ngap.ok++; persist();
    C.res = { pecOk: C.pecOk, reorient: false, value, right: rv, cot: { ok, value, right: rv, chosen: cotStr(o.key, o.c), good: cotStr(right.key, right.c), cs: C.cs.id } };
    if (ok) { AudioSys.tick(); setTimeout(() => this.close(), TEST && TEST.fastWait ? 30 : 380); return; }
    AudioSys.wrong();
    const diff = r2(value - rv), fb = $('csFb'); fb.classList.add('bad');
    fb.innerHTML = frSpace(`<b>Cotation erronée :</b> il fallait <b>${esc(cotStr(right.key, right.c))}</b>. ${diff > 0 ? `Tu factures ${eur2(diff)} de trop : un <b>indu</b> que la CPAM te réclamera en cas de contrôle.` : diff < 0 ? `Tu factures ${eur2(-diff)} de moins : de l’argent perdu.` : 'Même montant… mais un acte mal coté peut être rejeté.'}`);
    $('csBtns').innerHTML = `<button type="button" class="btn sm btn-green" data-cs="go">${frSpace('Commencer la séance')}</button>`;
  },
  close() {
    const C = this.cur; if (!C) return;
    this.cur = null; $('consult').hidden = true; AudioSys.tap();
    const r = this.resolve; this.resolve = null; if (r) r(C.res || { pecOk: false, reorient: false, value: 0, right: 0, cot: null });
  }
};
$('consult').addEventListener('click', (e) => {
  const b = e.target.closest('[data-cs],[data-cot]'); if (!b || b.disabled) return;
  if (b.dataset.cot != null) { Consult.cot(+b.dataset.cot); return; }
  if (b.dataset.cs === 'go') { Consult.close(); return; }
  Consult.pick(+b.dataset.cs);
});
/* name of a case, for the goblin (« un patient pour … ») */
export const caseLabel = (id) => { const k = CLIN.find((x) => x.id === id); return k ? k.rx.charAt(0).toLowerCase() + k.rx.slice(1) : null; };
