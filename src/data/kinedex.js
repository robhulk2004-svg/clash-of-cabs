/* ================= Kinédex (v6.3): the cards to collect, the kiné chest and the cartes Vitale =================
   The chest cinematic and the team of 8 cards (the « deck ») come from Beast Brawl!. Here every card is worth the same:
   no rarity, no level, you simply collect them all. Pure data: the logic is in game/kinedex.js. */

/* cartes Vitale: won with each right answer to a passer-by (the gems of Clash of Clans) */
export const CV_PER_RIGHT = 200;
export const CHEST_PRICE = 1000;

/* The 22 cards. name: as printed on the card · who: the portrait and voice in the dialogues · lore: key of data/lore.js
   role: who he or she is in the game · quote: a line of the character · meet: where you meet him or her */
export const KX = {
  thomas: { name: 'Thomas Cassmoildeau', who: 'thomas', lore: 'thomas', role: 'Titulaire à Mériniaque', quote: 'Sonora… Je ne peux rien te raconter. Mais la musique !', meet: 'Ton tout premier remplacement, au cabinet de Mériniaque.' },
  julien: { name: 'Julien Coulommiers', who: 'julien', lore: 'julien', role: 'Titulaire à Maransin', quote: 'Squat, soulevé de terre, tractions. Et le reste, c’est du gainage.', meet: 'Son cabinet est à Maransin : il y faut un vélo.' },
  etienne: { name: 'Étienne Poulet', who: 'etienne', lore: 'etienne', role: 'Confrère du Cabinet Basquaise', quote: 'Une bonne piperade, et tes patients reviennent. Garanti.', meet: 'Au Cabinet Basquaise, en ville.' },
  gabriel: { name: 'Gabriel', who: 'gabriel', lore: 'gabriel', role: 'Kiné gamer et streamer', quote: 'GG ! Encore un patient remis sur pied.', meet: 'Il peut devenir ton assistant ou ton remplaçant.' },
  mathis: { name: 'Mathis', who: 'mathis', lore: 'mathis', role: 'Kiné athlète', quote: 'Échauffement, sprint, haies… et après, les patients !', meet: 'Il peut devenir ton assistant ou ton remplaçant.' },
  paul: { name: 'Paul Have You Seen', who: 'paul', lore: 'paul', role: 'Kiné gourmand', quote: 'Have you seen ce fondant au chocolat ?', meet: 'Il peut devenir ton assistant ou ton remplaçant.' },
  clement: { name: 'Clément Drill UK', who: 'clement', lore: 'clement', role: 'Kiné rappeur', quote: 'Le flow est propre, la posture aussi.', meet: 'Il peut devenir ton assistant ou ton remplaçant.' },
  alex: { name: 'Alexandre Klopp', who: 'sage', lore: 'alex', role: 'Conseiller de la CARPIMKO', quote: 'Ta retraite, ça se prépare dès ta première année !', meet: 'À la CARPIMKO, la caisse de retraite des kinés.' },
  menton: { name: 'Mickaël Menton', who: 'menton', lore: null, role: 'Syndicaliste depuis trente ans', quote: 'Un contrat, ça se relit. Deux fois.', meet: 'Il vient te parler des syndicats après tes démarches.' },
  seb: { name: 'Sébastien Saccharose', who: 'seb', lore: 'seb', role: 'Pro de la pédagogie… et du sucre', quote: 'Un patient qui comprend, c’est un patient qui guérit. Tu veux un bonbon ?', meet: 'Il passe de temps en temps en ville, une sucette à la main.' },
  florent: { name: 'Florent Céplula', who: 'florent', lore: 'florent', role: 'Kiné fou de tennis', quote: 'Tamis 100 pouces, cordage multifilament. Et toi, ton tamis ?', meet: 'Il traverse la ville, raquette à la main.' },
  fee: { name: 'Ninassurance', who: 'fee', lore: null, role: 'Assurances et prévoyance', quote: 'Arrêt de travail, invalidité, RCP : on en parle ?', meet: 'Au bâtiment des assurances.' },
  goblin: { name: 'Le Gobelin de l’Assurance Maladie', who: 'goblin', lore: null, role: 'Contrôleur de la CPAM', quote: 'Hé hé hé… Contrôle de tes cotations !', meet: 'Il surgit quand la CPAM contrôle tes séances.' },
  marvin: { name: 'Marvin URSSAF', who: 'marvin', lore: null, role: 'Inspecteur de l’URSSAF', quote: 'Tes cotisations sociales, elles sont à jour ?', meet: 'Il passe vérifier tes cotisations pendant les remplacements.' },
  echog: { name: 'Doc Échografikos', who: 'echog', lore: 'echog', role: 'Accro à son échographe', quote: '…', meet: 'Il rôde en ville avec son échographe. Il ne répond jamais.' },
  yan: { name: 'Yan Ducachot', who: 'yan', lore: 'yan', role: 'Tortionnaire du cachot de l’Ordre', quote: 'Ma roulette n’attend que toi.', meet: 'Au cachot de l’Ordre, pour les fautes très graves.' },
  ambroise: { name: 'Ambroise', who: 'ambroise', lore: 'ambroise', role: 'Kiné culturiste', quote: 'Les protéines, c’est la base. La rééduc aussi.', meet: 'Il peut devenir ton assistant ou ton remplaçant.' },
  damien: { name: 'Damien', who: 'damien', lore: 'damien', role: 'Chevalier de l’Ordre', quote: 'Tant que tu factures ce que tu fais, tu ne me reverras jamais.', meet: 'Il garde le cachot de la tour de l’Ordre.' },
  mathieu: { name: 'Mathieu Motpourmot', who: 'mathieu', lore: 'mathieu', role: 'Titulaire à La Réunion', quote: 'Ici, entre deux patients, on regarde les baleines.', meet: 'Son cabinet est à La Réunion : il y faut un voilier.' },
  suzie: { name: 'Suzie Taillebois', who: 'suzie', lore: null, role: 'Kiné de la Lune', quote: 'Les aliens sont tous « shiftés ». Moi, je les « déshifte ».', meet: 'Sur la Lune. Il te faudra une fusée !' },
  chad: { name: 'Chad Cook', who: 'chad', lore: 'chad', role: 'The Michigan Guy', quote: 'Bro. Ma formation va changer ta vie. Seulement 4 999 dollars.', meet: 'Dans le Michigan. Il te faudra un jet privé.' },
  pascale: { name: 'Pascale Matué', who: 'mentor', lore: 'pascale', role: 'Présidente de l’Ordre', quote: 'Mon jeune confrère, ta déontologie avant tout.', meet: 'Dans la tour de l’Ordre, depuis le premier jour.' }
};
export const KX_IDS = Object.keys(KX);

/* ---------- the chests ----------
   cards: how many different cards a chest holds (at least one you do not have yet, as long as some are missing).
   xp: [min, max]. cv: [chance %, min, max] of a few cartes Vitale on top. */
export const CHESTS = {
  kine: { name: 'Coffre kiné', tier: 'Coffre de collection', cards: 3, xp: [20, 40], cv: [25, 100, 200], color: '#e8473a' }
};
/* a card you already have (a duplicate) turns into XP */
export const DUP_XP = 20;
/* the free chest of your first visit to the Kinédex */
export const WELCOME = { tier: 'kine', xp: 20, cv: 0, welcome: true, title: 'Coffre de bienvenue', sub: 'Cadeau de Pascale !',
  cards: [{ id: 'thomas' }, { id: 'julien' }, { id: 'gabriel' }, { id: 'seb' }] };
/* rewards when the Kinédex fills up (cards discovered) */
export const MILESTONES = [
  { n: 5, cv: 500, label: '500 cartes Vitale' },
  { n: 10, chest: true, label: 'un Coffre kiné offert' },
  { n: 15, chest: true, label: 'un Coffre kiné offert' },
  { n: 22, xp: 500, label: '500 XP et le titre de Maître du Kinédex' }
];
export const TEAM_SIZE = 8;

/* Rolls the content of a chest. rng() gives a number between 0 and 1; has(id) tells if you own a card already.
   The first card is always a new one (while some are missing), each other one has one chance in two to be new.
   Returns { xp, cv, cards: [{ id }] }: the cards you have already come first, the new ones last (the best for the end). */
export function rollChest(tier, has = () => false, rng = Math.random) {
  const C = CHESTS[tier] || CHESTS.kine, pool = KX_IDS.slice(), cards = [];
  for (let i = 0; i < Math.min(C.cards, pool.length); i++) {
    const fresh = pool.filter((id) => !has(id));
    const from = fresh.length && (i === 0 || rng() < 0.5) ? fresh : pool;
    const id = from[Math.floor(rng() * from.length)];
    pool.splice(pool.indexOf(id), 1); cards.push({ id });
  }
  cards.sort((a, b) => (has(a.id) === has(b.id) ? 0 : has(a.id) ? -1 : 1));
  const xp = C.xp[0] + Math.floor(rng() * (C.xp[1] - C.xp[0] + 1));
  const cv = rng() * 100 < C.cv[0] ? Math.round((C.cv[1] + rng() * (C.cv[2] - C.cv[1])) / 10) * 10 : 0;
  return { tier, xp, cv, cards };
}
