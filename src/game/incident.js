import { AudioSys, VOICES } from '../audio/audio.js';
import { G, persist, state } from '../core/save.js';
import { $, TEST, esc, frSpace, pick, randi, wait } from '../core/utils.js';
import { Fade } from '../fx/transitions.js';
import { registerPortraits } from '../render/portraits.js';
import { Castle } from '../scenes/castle.js';
import { showTown } from '../scenes/scenes.js';
import { Town } from '../scenes/town.js';
import { ACTOR_NAMES, Talk, quiz, say } from '../story/talk.js';
import { refreshGuide } from '../ui/guide.js';
import { hideToast, toast } from '../ui/helpers.js';
import { HUD, addXP } from '../ui/hud.js';
import { ICON } from '../ui/icons.js';
import { showReward } from '../ui/modals.js';
import { Syndic } from './syndicat.js';

/* ================= Very rare event (easter egg): a patient falls, files a complaint… and you are judged at the castle =================
   Every ~2 000 patients there is a small chance. In theory your equipment is in good condition: you call the emergency
   services if needed, write to your insurer, then Pascale Matué holds a (very theatrical) hearing. */
const PATIENTS = [   /* same order as the rows of the patient sprites */
  { name: 'M. Roger Lambert', look: { skin: '#f1c7a5', hair: '#e6e6e6', style: 'bald', top: '#2f7fd6', patient: true } },
  { name: 'Mme Gisèle Duval', f: true, look: { skin: '#f1cfb4', hair: '#c9c9c9', style: 'bun', glasses: true, top: '#8b4fd0', patient: true } },
  { name: 'M. Kévin Morel', look: { skin: '#e8b28c', hair: '#5a3418', style: 'curly', beard: true, top: '#f2f2f2', patient: true } },
  { name: 'Mme Julie Petit', f: true, look: { skin: '#f3d1b5', hair: '#7a3b22', style: 'pony', earrings: true, top: '#e8559b', patient: true } }
];
const FALLS = [
  { what: 'a raté une marche en descendant du step', where: 'step', hurt: 'au poignet' },
  { what: 'a glissé en se relevant du tapis', where: 'tapis', hurt: 'à la hanche' },
  { what: 'a fait un malaise pendant un exercice et s’est retrouvé au sol', where: 'exercice', hurt: 'à l’épaule' },
  { what: 'est tombé de la table de soins en se retournant', where: 'table', hurt: 'au coude' }
];
const FIRST = { q: 'Ton patient est au sol et se tient le bras. Que fais-tu en premier ?', o: ['Je sécurise, j’évalue et j’appelle les secours (15 ou 112) si besoin', 'Je le relève vite et on reprend la séance', 'Je lui fais signer une décharge avant tout'], a: 0, why: 'D’abord la personne : sécuriser, évaluer, alerter (15 ou 112) si l’état le justifie, rester auprès d’elle. Une « décharge » ne t’exonère de rien.' };
const LETTER = { q: 'Le lendemain, quel courrier envoies-tu ?', o: ['Une déclaration de sinistre à mon assureur RCP, par écrit et sans tarder', 'Rien : ça ferait monter ma prime', 'Un courrier à la CPAM pour qu’elle prenne en charge'], a: 0, why: 'On déclare le sinistre à son assurance RCP, par écrit, dans le délai prévu au contrat (souvent 5 jours ouvrés). On note aussi les faits, de façon objective, dans le dossier du patient.' };
const TRIAL_Q = [
  { q: 'Pour que ta responsabilité soit engagée, il faut…', o: ['Une plainte, c’est tout', 'Une faute, un préjudice et un lien de causalité', 'Un patient mécontent'], a: 1, hint: 'Trois conditions, toujours les mêmes…' },
  { q: 'Envers tes patients, tu as une obligation…', o: ['De résultat : aucun ne doit tomber', 'De moyens : des soins attentifs et conformes aux données de la science', 'Aucune obligation'], a: 1, hint: 'Pense à l’arrêt Mercier.' },
  { q: 'Que prouve ton carnet d’entretien du matériel ?', o: ['Rien du tout', 'Que ton matériel était vérifié et en bon état', 'Que le patient est fautif'], a: 1, hint: 'On parle de prévention et de traçabilité.' }
];
const st = () => G.inc || (G.inc = { seen: 0, next: randi(1600, 2600), state: null, n: 0 });
let looksDone = false;

export const Incident = {
  /* called at the end of every month with the number of patients seen */
  async monthCheck(ph, day, seen) {
    if (!['rempl', 'assist', 'titulaire'].includes(ph) || TEST && !TEST.incident) return;
    const s = st(); s.seen += seen || 0; persist();
    if (s.state === 'summons') { this.remind(); return; }
    if (s.state || s.seen < s.next) return;
    if (Math.random() < 0.3) await this.start();
    else { s.next = s.seen + randi(400, 700); persist(); }
  },
  remind() { if (st().state === 'summons') { toast('<b>Clique vite sur le château des kinés !</b> La présidente de l’Ordre t’attend pour l’audience.', 4200); Town.updateDom(); } },
  register(c) {
    if (!looksDone) { looksDone = true; VOICES.plaignant = { ...VOICES.patient }; VOICES.avocat = { ...VOICES.menton, base: 120 }; registerPortraits('avocat', { skin: '#e7b994', hair: '#3a3a3a', style: 'side', glasses: true, top: '#2b3248', patient: true }); }
    const P = PATIENTS[c.p]; registerPortraits('plaignant_' + c.p, P.look);
    ACTOR_NAMES['plaignant_' + c.p] = P.name; VOICES['plaignant_' + c.p] = VOICES.plaignant; ACTOR_NAMES.avocat = `Maître Lenoir · ${Syndic.short()}`;
  },
  /* ---------- 1. the fall, the first aid, the letter ---------- */
  async start() {
    const s = st(), c = { p: randi(0, PATIENTS.length - 1), f: randi(0, FALLS.length - 1), ok1: false, ok2: false };
    s.state = 'fall'; s.case = c; s.n++; persist(); this.register(c);
    state.busy = true; hideToast();
    const P = PATIENTS[c.p], F = FALLS[c.f];
    const el = $('incident'); el.hidden = false; AudioSys.wrong();
    $('icArt').innerHTML = this.art(F.where);
    c.ok1 = await this.ask(`Aïe ! ${P.name} ${F.what} pendant sa séance. ${P.f ? 'Elle' : 'Il'} a mal ${F.hurt}.`, FIRST);
    await this.info('Ton matériel', `<ul class="ic-check"><li>${ICON.check}Matériel vérifié chaque semaine</li><li>${ICON.check}Revêtements antidérapants en bon état</li><li>${ICON.check}Carnet d’entretien à jour</li></ul><span class="ic-stamp">Conforme</span>`, 'En théorie, ton matériel est en bon état : c’est noté dans ton carnet d’entretien. Garde-le précieusement !');
    c.ok2 = await this.ask('Tu as fait le nécessaire sur place. Reste l’écrit.', LETTER);
    await this.info('Trois semaines plus tard…', `<div class="ic-letter">${ICON.envelope}<b>Lettre recommandée</b><span>${esc(frSpace(`${P.name} a déposé une plainte contre toi auprès de l’Ordre.`))}</span></div>`, 'La présidente du conseil de l’Ordre te convoque immédiatement au château !', 'Vite, au château !');
    el.hidden = true;
    s.state = 'summons'; s.at = Date.now(); persist();
    state.busy = false;
    if (state.screen !== 'town') { state.busy = true; await Fade.transition(async () => { for (const id of ['cabScene', 'ordreScene', 'donjonScene']) $(id).hidden = true; showTown(); }); state.busy = false; }
    Town.renderDom(); AudioSys.chime();
    toast('<b>Clique vite sur le château des kinés !</b>', 5200);
    refreshGuide();
  },
  ask(txt, Q) {
    return new Promise((resolve) => {
      $('icTitle').textContent = 'Incident au cabinet !';
      $('icTxt').innerHTML = `${esc(frSpace(txt))}<br><b>${esc(frSpace(Q.q))}</b>`;
      const box = $('icOpts'), fb = $('icFb'), btns = $('icBtns');
      fb.hidden = true; btns.innerHTML = ''; box.hidden = false;
      box.innerHTML = Q.o.map((o, i) => `<button type="button" class="qopt" data-ic="${i}"><span class="key">${'ABC'[i]}</span><span>${esc(frSpace(o))}</span></button>`).join('');
      box.onclick = (e) => {
        const b = e.target.closest('[data-ic]'); if (!b || b.disabled) return;
        const k = +b.dataset.ic, ok = k === Q.a;
        box.querySelectorAll('.qopt').forEach((q, j) => { q.disabled = true; if (j === Q.a) q.classList.add('right'); else if (j === k) q.classList.add('wrong'); });
        ok ? AudioSys.right() : AudioSys.wrong();
        fb.hidden = false; fb.innerHTML = `<b>${ok ? 'Bon réflexe.' : 'Pas comme ça…'}</b> ${esc(frSpace(Q.why))}`;
        btns.innerHTML = '<button type="button" class="btn sm btn-green">Continuer</button>';
        btns.firstChild.onclick = () => { AudioSys.tap(); resolve(ok); };
      };
    });
  },
  info(title, html, txt, btn = 'Continuer') {
    return new Promise((resolve) => {
      $('icTitle').textContent = frSpace(title);
      $('icTxt').innerHTML = esc(frSpace(txt)); $('icOpts').hidden = false; $('icOpts').innerHTML = html; $('icOpts').onclick = null;
      $('icFb').hidden = true; $('icBtns').innerHTML = `<button type="button" class="btn sm btn-green">${esc(btn)}</button>`;
      AudioSys.stamp();
      $('icBtns').firstChild.onclick = () => { AudioSys.tap(); resolve(); };
    });
  },
  art(where) {
    const prop = where === 'step' ? '<rect x="250" y="190" width="120" height="34" rx="8" fill="#2a6fd6" stroke="#1a1f36" stroke-width="6"/>'
      : where === 'table' ? '<rect x="230" y="120" width="170" height="26" rx="8" fill="#1aa59a" stroke="#1a1f36" stroke-width="6"/><path d="M250,146 V222 M380,146 V222" stroke="#1a1f36" stroke-width="8"/>'
      : '<rect x="220" y="208" width="180" height="16" rx="6" fill="#1aa59a" stroke="#1a1f36" stroke-width="5"/>';
    return `<svg viewBox="0 0 420 260" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="222" width="420" height="38" fill="#d9a066"/><path d="M0,222 H420" stroke="#1a1f36" stroke-width="6"/>${prop}
      <g class="ic-fall"><circle cx="110" cy="196" r="22" fill="#f1cfb4" stroke="#1a1f36" stroke-width="6"/><path d="M132,204 L210,214 M160,206 L150,170 M190,212 L196,176 M210,214 L250,200 M210,214 L240,232" stroke="#1a1f36" stroke-width="12" stroke-linecap="round"/></g>
      <g fill="#ffd43a" stroke="#1a1f36" stroke-width="3" class="ic-stars"><path d="M90,150 l6,12 13,2 -10,9 3,13 -12,-7 -12,7 3,-13 -10,-9 13,-2z"/><path d="M140,132 l4,8 9,1 -7,6 2,9 -8,-5 -8,5 2,-9 -7,-6 9,-1z"/></g>
      <g transform="translate(330,40)"><rect x="0" y="0" width="64" height="104" rx="12" fill="#2b3248" stroke="#1a1f36" stroke-width="5"/><rect x="8" y="12" width="48" height="60" rx="4" fill="#9fe0ff"/><text x="32" y="54" text-anchor="middle" font-family="Arial Black,Arial" font-size="24" fill="#c0291b">15</text><circle cx="32" cy="88" r="7" fill="#9aa3b5"/></g></svg>`;
  },
  /* ---------- 2. the hearing, in the castle ---------- */
  pending() { return st().state === 'summons'; },
  async trial() {
    const s = st(), c = s.case; if (!c) { s.state = null; persist(); return; }
    this.register(c);
    const P = PATIENTS[c.p], pid = 'plaignant_' + c.p, quick = s.at && Date.now() - s.at < 25000;
    s.state = 'trial'; persist(); state.busy = true;
    const lawyer = Syndic.perk('lawyer'), hint = Syndic.perk('trialHint');
    Castle.setTrial({ patient: true, lawyer: !!lawyer, title: `Audience · ${P.name} c/ ${G.pseudo || 'toi'}` });
    await wait(900);
    await Talk.open();
    AudioSys.stamp(); await say('mentor', 'think', `Silence ! L’audience est ouverte. Affaire ${P.name} contre ${G.pseudo || 'notre confrère'}. Toc, toc, toc !`);
    await say(pid, 'scared', `Madame la présidente, je suis ${P.f ? 'tombée' : 'tombé'} pendant ma séance ! J’ai eu très mal ${FALLS[c.f].hurt}. Je veux que justice soit rendue !`);
    await say('mentor', 'think', 'Nous allons examiner les faits. Et tester un peu les connaissances de ce kiné…');
    let score = (c.ok1 ? 1 : 0) + (c.ok2 ? 1 : 0);
    await say('mentor', c.ok1 ? 'happy' : 'scared', c.ok1 ? 'Après la chute, vous avez sécurisé, évalué et appelé les secours. C’est exactement ce qu’on attend.' : 'Après la chute, vous avez… relevé le patient comme si de rien n’était ? Hmm.');
    await say('mentor', c.ok2 ? 'happy' : 'scared', c.ok2 ? 'Votre assureur a reçu votre déclaration de sinistre dans les temps. Bien.' : 'Et aucune déclaration à votre assurance RCP ? Voilà qui complique tout.');
    await say('mentor', 'happy', 'Votre carnet d’entretien montre un matériel vérifié et en bon état. C’est un point important pour vous.');
    if (lawyer) { await say('avocat', 'happy', `Maître Lenoir, avocat ${Syndic.deShort()}. Mon client a fait preuve de diligence : le matériel était conforme et les secours ont été prévenus.`); score++; }
    for (const Q of TRIAL_Q) {
      if (hint) await say('mentor', 'think', `(Le délégué ${Syndic.deShort()} te glisse à l’oreille : « ${Q.hint} »)`);
      if (await quiz('mentor', 'think', Q.q, Q.o, Q.a)) score++;
    }
    const verdict = score >= 4 ? 'relaxe' : score >= 2 ? 'avert' : 'blame';
    AudioSys.stamp(); await wait(300); AudioSys.stamp(); await wait(300); AudioSys.stamp();
    if (verdict === 'relaxe') await say('mentor', 'happy', 'Le conseil a délibéré. Pas de faute prouvée : la plainte est rejetée ! Une chute n’est pas forcément une faute quand on a fait ce qu’il fallait.');
    else if (verdict === 'avert') await say('mentor', 'think', 'Le conseil a délibéré : un avertissement. La plus légère des sanctions… mais retenez la leçon.');
    else await say('mentor', 'scared', 'Le conseil a délibéré : un blâme ! Révisez vos obligations, cher confrère.');
    await say(pid, verdict === 'relaxe' ? 'think' : 'happy', verdict === 'relaxe' ? 'Bon… Je reviendrai quand même faire ma rééducation chez vous, hein.' : 'Merci, madame la présidente !');
    await say('mentor', 'think', 'Pour de vrai : une plainte passe d’abord par une conciliation au conseil départemental. Si elle échoue, c’est la chambre disciplinaire de première instance, présidée par un magistrat administratif, qui juge.');
    await say('mentor', 'happy', 'Les sanctions possibles : avertissement, blâme, interdiction temporaire d’exercer, radiation. Ici, c’était une audience… un peu spéciale. Ne le répétez à personne !');
    await Talk.close();
    Castle.setTrial(null);
    s.state = null; s.case = null; s.next = s.seen + randi(4000, 6000); s.last = verdict; persist();
    if (verdict === 'relaxe') G.flags.gavel = true; persist();
    await showReward({ ribbon: verdict === 'relaxe' ? 'Plainte rejetée !' : verdict === 'avert' ? 'Avertissement' : 'Blâme', artHTML: this.gavelSVG(), title: 'Audience à l’Ordre', gains: [verdict === 'relaxe' ? 'Marteau doré dans ton cabinet' : 'Une expérience… marquante', `${score} bon${score > 1 ? 's' : ''} point${score > 1 ? 's' : ''} sur ${lawyer ? 6 : 5}`], xp: 0, bonusText: quick ? 'Bonus ponctualité : tu es venu vite au château !' : '' });
    await addXP((verdict === 'relaxe' ? 50 : verdict === 'avert' ? 20 : 10) + (quick ? 10 : 0));
    await Syndic.gain(verdict === 'relaxe' ? 20 : 10, 'ton passage devant l’Ordre');
    state.busy = false; HUD.render(); Town.updateDom(); refreshGuide();
  },
  gavelSVG() {
    return `<svg viewBox="0 0 200 200" width="220" height="220" xmlns="http://www.w3.org/2000/svg"><ellipse cx="100" cy="170" rx="70" ry="14" fill="#8a5a2b" stroke="#1a1f36" stroke-width="6"/><g transform="rotate(-35 100 100)"><rect x="40" y="60" width="90" height="44" rx="10" fill="#ffd43a" stroke="#1a1f36" stroke-width="7"/><rect x="80" y="100" width="14" height="80" rx="6" fill="#c98a4a" stroke="#1a1f36" stroke-width="6"/></g></svg>`;
  },
  /* Admin: trigger the whole thing now. */
  async force() { const s = st(); s.state = null; await this.start(); }
};
