import { G, gx, persist } from '../core/save.js';
import { pick, shuffle } from '../core/utils.js';
import { sayLore } from './lore.js';
import { choose, quiz, say } from './talk.js';

/* ================= Dialogues of version 6.3 (merged into SCRIPTS in main.js) =================
   Doc Échografikos, Sébastien Saccharose and Florent Céplula come by now and then (game/guests.js);
   Yan Ducachot lives in the cachot of the Ordre (scenes/donjon.js). */

/* questions you ask Doc Échografikos (he never answers them) */
const ECHO_Q = [
  'Bonjour Docteur ! Vous cherchez quelqu’un ?',
  'Vous l’utilisez pour quoi, cet échographe ?',
  'Vous voulez un café ?',
  'Il vous a coûté combien, votre échographe ?',
  'Vous êtes conventionné, Docteur ?',
  'Vous voulez un coup de main pour le pousser ?',
  'Vous êtes nouveau en ville ?',
  'Il est branché, là ? Il fait un drôle de bruit.'
];
/* the questions of Sébastien Saccharose (UE20, TD raisonnement clinique en neurologie) */
const SEB_Q = [
  { q: 'Ton patient a un trouble de l’attention. Ta consigne, tu…', o: ['La simplifies au maximum, et ne la répètes que si c’est nécessaire', 'La détailles longuement et la répètes trois fois'], a: 0, why: 'Trouble attentionnel : on simplifie la consigne et on ne la répète que si besoin. Plusieurs consignes à la fois, et il décroche !' },
  { q: 'Et s’il a un trouble de la compréhension ?', o: ['Tu montres une seule fois, sans rien dire', 'Tu explicites la consigne et tu la répètes'], a: 1, why: 'Trouble de la compréhension : on explicite la consigne et on répète. L’inverse du trouble attentionnel !' },
  { q: 'Pendant un examen pratique, tu t’adresses à qui ?', o: ['Au patient : je lui explique les consignes et pourquoi on fait chaque exercice', 'Au jury : c’est lui qui me note'], a: 0, why: 'On fait ce qu’on ferait avec un vrai patient : on verbalise pour lui, pas pour le jury.' },
  { q: 'Une patiente a peur de tomber chez elle. Un conseil d’éducation thérapeutique ?', o: ['Rester assise le plus possible, par prudence', 'Retirer les petits tapis et éviter les chaussons ouverts'], a: 1, why: 'Les tapis et les chaussons ouverts font tomber. Et rester inactive n’aide pas : on la rassure sur son objectif, garder son autonomie.' }
];

export const V7_SCRIPTS = {
  /* ---------- Doc Échografikos ---------- */
  async echogMute() {
    const qs = shuffle(ECHO_Q).slice(0, 2);
    if (!G.flags.echogMet) { G.flags.echogMet = true; persist(); await say('player', 'happy', 'Bonjour ! Vous êtes… un confrère ? Je ne vous ai jamais vu en ville.'); await say('echog', 'think', '…'); }
    await say('player', 'happy', qs[0]);
    await say('echog', 'think', '…');
    await say('player', 'think', qs[1]);
    await say('echog', 'scared', '……');
    await say('player', 'scared', pick(['Bon… Bonne journée, Docteur.', 'D’accord. Je… vais vous laisser, alors.', 'Il est vraiment… spécial, lui.', 'Bien. Très bien. Au revoir !']));
  },
  /* he came by to drop a fact about his échographe (line: the fact he just said, from data/lore.js) */
  async echogFact(line) {
    if (!line) { await sayLore('echog'); return; }
    await say('echog', line[0], line[1]);
    for (const [w, e, t] of line[2] || []) await say(w, e, t);
  },

  /* ---------- Sébastien Saccharose: a tip of pedagogy… and never talk to him about sugar ---------- */
  async seb(fx) {
    const f = G.flags, first = !f.sebMet; f.sebMet = (f.sebMet || 0) + 1; persist();
    if (first) await say('seb', 'happy', 'Salut, collègue ! Sébastien Saccharose, kiné… et pédagogue. Surtout pédagogue. Un patient qui comprend, c’est un patient qui progresse !');
    else await say('seb', 'happy', pick(['Re-salut ! J’ai un nouveau conseil de pédagogie pour toi. Tout frais !', 'Te revoilà ! Écoute bien, c’est important.', 'Coucou ! Une minute de pédagogie, ça te dit ?']));
    await sayLore('seb');
    const Q = SEB_Q[(f.sebQ = ((f.sebQ ?? -1) + 1) % SEB_Q.length)]; persist();
    const ok = await quiz('seb', 'think', Q.q, Q.o, Q.a);
    await say('seb', ok ? 'joy' : 'think', (ok ? 'Exactement ! ' : 'Pas tout à fait… ') + Q.why);
    const c = await choose('player', 'happy', 'Merci, Sébastien ! Au fait…', ['Bonne journée, et merci pour le conseil !', 'Dis donc… tu ne manges pas un peu trop de sucre, toi ?']);
    if (c === 1) {
      await say('player', 'think', 'Je veux dire : les sucettes, les bonbons, les sodas… Tu ne crois pas que c’est un peu tr—');
      if (fx && fx.rush) fx.rush();
      await say('seb', 'joy', 'SUCRE ?! TU AS DIT SUCRE ?! J’ADORE LE SUCRE !!!');
      await say('seb', 'joy', 'GLUCOSE ! FRUCTOSE ! SACCHAROSE ! C’EST MÊME MON NOM DE FAMILLE !!! SAC-CHA-ROSE !!!');
      await say('seb', 'joy', 'IL FAUT QUE J’AILLE EXPLIQUER LA GLYCOLYSE À QUELQU’UN ! N’IMPORTE QUI ! TOUT DE SUITE !!!');
      await say('player', 'scared', '…Il est parti en courant. Avec trois sucettes dans chaque main.');
      return { xp: ok ? 10 : 0, rush: true };
    }
    await say('seb', 'happy', 'Avec plaisir ! Tiens, une sucette pour la route. Non ? Tant pis, je la garde.');
    return { xp: ok ? 10 : 0 };
  },

  /* ---------- Florent Céplula: tennis, only tennis, and a big heart ---------- */
  async florent() {
    const f = G.flags, first = !f.florentMet; f.florentMet = (f.florentMet || 0) + 1; persist();
    if (first) await say('florent', 'happy', 'Salut ! Florent Céplula. Tu joues au tennis ? Non ? Pas ENCORE, tu veux dire !');
    else await say('florent', 'joy', pick(['Hé ! Tu tombes bien, je reviens du club !', 'Salut ! Tu as vu le match d’hier ? Quel tie-break !', 'Hé, toi ! Tu as cinq minutes ? C’est l’heure du tennis !']));
    await sayLore('florent');
    const c = await choose('florent', 'think', 'Et toi, tu prendrais quelle raquette ?', ['Une légère, pour la maniabilité', 'Une lourde, pour la puissance', 'Je… ne joue pas au tennis']);
    await say('florent', 'joy', [
      'Bon choix ! Une raquette légère se manie vite : parfait pour les volées au filet !',
      'Ah, la puissance ! Une raquette lourde est plus stable à l’impact. Il faudra juste bien préparer ton geste.',
      'Pas encore ! Je te prête la mienne quand tu veux. Elle s’appelle Roger. Prends-en soin.'][c]);
    await say('florent', 'happy', pick(['Tiens, un tube de balles neuves. C’est cadeau ! Allez, à la prochaine… au filet !', 'Je t’ai gardé un bandeau du club, il te va très bien ! Allez, je file à l’entraînement.', 'Si un jour tu veux taper la balle, je réserve un court. Je t’attends au filet !']));
    return { xp: 10 };
  },

  /* ---------- Yan Ducachot, in the cachot of the Ordre ---------- */
  async yanHello() {
    await say('yan', 'joy', 'Tiens, tiens… Une visite ! Yan Ducachot, tortionnaire officiel du cachot de l’Ordre. Enchanté de te connaître.');
    await say('yan', 'happy', 'Tu vois cette petite roue ? C’est ma roulette du plaisir. Les fraudeurs l’adorent. Enfin… ils finissent tous par l’adorer.');
    await say('player', 'scared', 'Euh… elle sert à quoi, exactement ?');
    await sayLore('yan');
  },
  async yanTalk() {
    if (G.fraud && G.fraud.convictions) await say('yan', 'joy', `Ah, ${gx('mon vieil ami', 'ma vieille amie')} ! Tu es déjà ${gx('passé', 'passée')} entre les mains de ma roulette. Elle se souvient de toi.`);
    await sayLore('yan');
  },
  /* caught for fraud (a very serious fault): Yan and his roulette, after Pascale's sermon. fx: { flee(), roll(on) } */
  async jailYan(fx) {
    const again = G.fraud && G.fraud.convictions;
    await say('yan', 'joy', again ? 'Encore toi ?! Ma roulette avait hâte de te revoir… Pascale, tu restes pour la démonstration ?' : 'Un fraudeur ! Ça faisait longtemps… Pascale, tu restes pour la démonstration ?');
    await say('mentor', 'scared', 'Yan ?! Non, non, non… J’ai une réunion. Urgente. En haut. Tout en haut !');
    if (fx && fx.flee) fx.flee();
    await say('yan', 'happy', 'Elle part toujours avant le meilleur moment. Bon. Approche, prisonnier : voici ma roulette du plaisir !');
    await say('player', 'scared', 'Votre… QUOI ?!');
    await say('yan', 'joy', 'Une roue de Wartenberg ! Un vrai outil d’examen neurologique : elle teste la sensibilité, dermatome par dermatome. Du cou… jusqu’aux orteils.');
    if (fx && fx.roll) fx.roll(true);
    await say('player', 'scared', 'Hihi… aïe… HIHIHI ! Arrêtez, ça chatouille !');
    await say('yan', 'happy', 'Tu sens bien partout : tes nerfs vont très bien. Ta déontologie, beaucoup moins.');
    if (fx && fx.roll) fx.roll(false);
    await say('yan', 'think', 'Facturer des séances qui n’ont jamais eu lieu, c’est une fraude. Retiens-le bien… sinon, on se reverra. Ma roulette et moi, on a de la mémoire.');
  }
};
