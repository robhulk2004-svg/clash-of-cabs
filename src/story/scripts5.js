import { G, gx } from '../core/save.js';
import { fmt } from '../core/utils.js';
import { CAB_LEVELS } from '../data/economy.js';
import { caseLabel } from '../game/consult.js';
import { CANDIDATES } from '../data/staff.js';
import { sayLore } from './lore.js';
import { quiz, say } from './talk.js';

/* ================= Scripts of version 5: NGAP, CPAM, assistants, trips, Maransin, La Réunion, Michigan ================= */
const caseName = (id) => caseLabel(id) || 'une séance';
/* a few questions of the goblin, one per control */
const CPAM_Q = [
  { q: 'En 2026, en métropole, une lettre-clé (RAM, RIC, NMI…) vaut…', o: ['2,15 €', '2,21 €', '2,43 €'], a: 1, why: '2,21 € en métropole. 2,43 € dans les DOM. Le télésoin (TMK) vaut 2,15 €.' },
  { q: 'Une prothèse totale de genou se cote…', o: ['RIM 8,12', 'RIC 8,12', 'TER 9,81'], a: 1, why: 'Membre inférieur opéré : RIC. Une prothèse de genou : RIC 8,12.' },
  { q: 'Lombalgie commune : à partir de combien de séances faut-il une demande d’accord préalable ?', o: ['Au-delà de 15 séances', 'Au-delà de 50 séances', 'Jamais'], a: 0, why: 'Au-delà de 15 séances pour une lombalgie commune, la demande d’accord préalable est obligatoire.' },
  { q: 'Tu soignes un patient en soins palliatifs, à domicile. Tu ajoutes…', o: ['Rien du tout', 'L’indemnité forfaitaire de déplacement (IFD)', 'Une deuxième séance PLL'], a: 1, why: 'À domicile, on ajoute l’indemnité forfaitaire de déplacement : IFD, 2,50 €.' },
  { q: 'Tu cotes un acte plus cher que celui que tu as réalisé. C’est…', o: ['Une astuce de gestion', 'Une fraude : la CPAM récupère les indus et peut te sanctionner'], a: 1, why: 'Les sommes facturées à tort sont des indus : la CPAM les récupère. Si c’est volontaire, c’est une fraude.' }
];
/* what Chad Cook sells */
const CHAD = [
  { title: 'Cotation Turbo', price: 1990, pitch: "Coter TOUS tes patients en ARL 28 : la lettre-clé la plus chère ! Lombalgie, entorse, peu importe : +200 % de chiffre d'affaires, garanti, bro.", lesson: "Coter un acte qui ne correspond pas à la prescription ni au soin réalisé, c'est de la fraude : la CPAM récupère les indus… et peut ajouter des pénalités." },
  { title: 'Diplôme de kiné quantique', price: 2490, pitch: 'En 3 heures, apprends à soigner tes patients À DISTANCE, par la pensée. Et tu factures une séance normale, évidemment !', lesson: "Une séance qui n'a pas eu lieu ne se facture pas. Et une « formation » non reconnue n'est pas une formation continue : la vraie, c'est le DPC, avec des organismes enregistrés." },
  { title: 'Séances fantômes premium', price: 990, pitch: "Facture des séances à des patients qui ne viennent pas. Personne ne vérifie, c'est open bar !", lesson: "Facturer des séances fictives, c'est de la fraude à l'Assurance Maladie : remboursement, pénalités financières, poursuites pénales et disciplinaires." }
];
export const V5_SCRIPTS = {
  /* ----- La cotation NGAP ----- */
  async ngapIntro() {
    await say('mentor', 'happy', `Ta première séance est terminée, ${G.pseudo} ! Avant de l'encaisser, il faut la coter : c'est la NGAP, la nomenclature générale des actes professionnels.`);
    await say('mentor', 'think', "Une cotation, c'est une lettre-clé et un coefficient. La lettre-clé dépend de la région et de la chirurgie : RAM pour le rachis non opéré, RAO s'il est opéré, RIM ou RIC pour le membre inférieur, RSM ou RSC pour le membre supérieur…");
    await say('mentor', 'happy', "En 2026, une lettre-clé vaut 2,21 € en métropole. Une lombalgie commune se cote RAM 8,09 : 8,09 × 2,21 € = 17,88 €.");
    await say('mentor', 'scared', "Lis bien la prescription : opéré ou non, quelle région, quelle pathologie. Une erreur vers le bas, c'est de l'argent perdu. Vers le haut, c'est un indu que la CPAM te réclamera lors d'un contrôle !");
    await say('mentor', 'think', 'Un doute ? Le bouton « ? » de la feuille de soins te rappelle les lettres-clés.');
  },
  /* the goblin checks the séances you coded since his last visit; returns 1 if his question was answered right */
  async cpamControl({ n, errors, indu, under }) {
    await say('goblin', '', `Hé hé hé… Contrôle de l'Assurance Maladie ! J'ai épluché tes ${n} dernières cotations, une par une.`);
    if (!errors.length) {
      await say('goblin', '', 'Grrr… Aucune erreur. Tout est parfaitement coté. Je repars les mains vides !');
      await say('mentor', 'happy', 'Bravo ! Une cotation juste, c’est la meilleure protection en cas de contrôle.');
    } else {
      for (const e of errors.slice(0, 2)) await say('goblin', '', `Patient pour ${caseName(e.cs)} : tu as coté ${e.chosen} au lieu de ${e.good}. Hé hé.`);
      if (errors.length > 2) await say('goblin', '', `Et ${errors.length - 2} autre${errors.length > 3 ? 's' : ''} erreur${errors.length > 3 ? 's' : ''} du même genre…`);
      if (indu > 0) {
        await say('goblin', '', `Total des sommes facturées en trop : ${fmt(indu)} €. Ce sont des indus : tu me les rembourses, hé hé hé !`);
        await say('mentor', 'think', "Un indu, c'est une somme versée à tort par l'Assurance Maladie : elle la récupère. Dans ta compta, ce remboursement vient en déduction de tes recettes.");
      }
      if (under > 0) await say('goblin', '', `Et tu as sous-coté pour ${fmt(under)} €… Ça, c'est de l'argent perdu pour toi. Tant pis, hé hé !`);
    }
    const Q = CPAM_Q[(G.ngap.quizI = ((G.ngap.quizI ?? -1) + 1) % CPAM_Q.length)];
    const ok = await quiz('goblin', '', `Petite question avant de partir : ${Q.q.charAt(0).toLowerCase() + Q.q.slice(1)}`, Q.o, Q.a);
    await say('goblin', '', ok ? `Tss… Juste. ${Q.why}` : `Hé hé ! Faux. ${Q.why}`);
    return ok ? 1 : 0;
  },
  /* ----- Les assistants ----- */
  async staffHired(who, rate) {
    const C = CANDIDATES[who] || CANDIDATES.ambroise;
    const hi = {
      gabriel: "Merci ! J'installe mes exercices en mode jeu vidéo dès demain. Tes patients vont enchaîner les séances comme des niveaux ! Et ne t'inquiète pas pour mon pouce : la fracture est consolidée.",
      mathis: 'Top ! Je préviens tout le club d’athlétisme : les sportifs vont débarquer. Et je t’ai pris une licence, au cas où : avec ton profil tendineux…',
      paul: "Génial ! Dis… il y a un frigo dans la salle de pause ? Et une prise pour ma PlayStation ? Je travaille beaucoup mieux le ventre plein.",
      ambroise: `Merci ${gx('patron', 'patronne')} ! Enfin… ${gx('confrère', 'consœur')} : on est sur un pied d'égalité ! Je m'installe et je commence demain. Il me reste un coin de frigo pour mes œufs ?`,
      clement: "Yes ! Je ramène mon enceinte et ma bonne humeur : tes patients vont faire leurs exercices en rythme ! Et samedi, on fête ça au 11 Percent."
    };
    await say(who, 'happy', hi[who] || hi.ambroise);
    await say('mentor', 'happy', `${C.name} encaisse ses honoraires avec sa propre carte CPS et te reverse ${Math.round(rate * 100)} % : une redevance. Pour toi, ce sont des gains divers à déclarer.`);
    await say('mentor', 'think', "Il soigne sur les postes que tu n'occupes pas : il lui faut des postes libres ! Équipe ton cabinet et agrandis-le pour lui donner du travail.");
    await say('mentor', 'happy', "Ses redevances s'accumulent au fil du temps, comme l'or d'une mine : des pièces apparaissent au-dessus de ton cabinet. Plus tu attends, plus il y en a (jusqu'à un mois entier) : touche-les pour les récolter !");
  },
  async tripRempl(who) {
    const C = CANDIDATES[who];
    await say(who, 'happy', `Pas de souci, je te remplace ! Je soigne tes patients pendant ton voyage et je te reverse 25 % de rétrocession.`);
    await sayLore(who); /* v6.2 */
    await say('mentor', 'think', `Pendant un remplacement, tu cesses toute activité de soin. ${C.name} encaisse avec SA carte CPS et te reverse une rétrocession : pour toi, c'est une recette.`);
    await say('mentor', 'happy', "Le contrat de remplacement est écrit et transmis au conseil départemental de l'Ordre, comme toujours. Bon voyage !");
  },
  /* ----- Maransin ----- */
  async hiMaransin() {
    await say('julien', 'happy', `Bienvenue à Maransin, ${G.pseudo} ! Le clocher, le moulin, le supermarché… et notre maison de santé.`);
    await say('julien', 'think', "Ici, c'est un désert médical : un seul kiné pour tout le canton. L'Assurance Maladie aide d'ailleurs les kinés qui s'installent dans les zones qui en manquent.");
    await say('julien', 'happy', "Dans une maison de santé pluriprofessionnelle, on travaille avec les médecins, les infirmiers, l'orthophoniste… C'est pratique pour coordonner les soins !");
    await say('julien', 'think', "Et le supermarché vend tout ce qu'il faut à un cabinet : huile de massage, essuie-tout, gel hydroalcoolique, élastiques. Un titulaire doit penser à ses consommables !");
  },
  /* ----- La Réunion ----- */
  async hiReunion() {
    await say('mathieu', 'happy', `${G.pseudo} ! Bienvenue à La Réunion ! Mon cabinet est ici, à Saint-Gilles, entre la plage et les cirques.`);
    await say('mathieu', 'think', "Petit secret de pro : dans les DOM, la lettre-clé ne vaut pas 2,21 € mais 2,43 €. La vie est plus chère ici, alors les tarifs sont majorés.");
    await say('mathieu', 'happy', 'Et goûte nos spécialités ! Samoussas, rougail saucisse, letchis… La paillote et le supermarché sont juste là. Les gens d’ici te poseront sûrement des questions : réponds-leur !');
    await say('mathieu', 'think', "Éric Samoussa, l'ancien gérant de mon cabinet, est rentré en métropole : il trouvait que les samoussas de l'île avaient baissé en qualité. Moi, je les trouve parfaits. C'est moi qui gère le cabinet, maintenant !");
  },
  async reunionTalk() {
    const L = [
      ['happy', "La NGAP est la même partout : mêmes lettres-clés, mêmes coefficients. Dans les DOM, seule la valeur de la lettre-clé change : 2,43 €."],
      ['think', "Pour mes visites à domicile dans les cirques, j'ajoute des indemnités kilométriques : en montagne, elles sont plus élevées qu'en plaine."],
      ['happy', "Les patients d'ici me parlent créole pendant les séances. J'apprends : « Koman i lé ? », c'est « comment ça va ? », et on répond « Lé la ! »"],
      ['think', "La Réunion n'a pas de saison creuse : entre les surfeurs et les randonneurs, les entorses, ça ne manque pas !"]
    ];
    const k = (G.flags.reuLine = ((G.flags.reuLine ?? -1) + 1) % L.length);
    await sayLore('mathieu'); /* v6.2: Éric Samoussa, Damien… */
    await say('mathieu', L[k][0], L[k][1]);
  },
  async reunionFood() {
    await say('mathieu', 'happy', 'Un rougail saucisse ? Des samoussas ? Avec ça, tu vas soigner deux fois plus vite ! Et ne crois pas Éric Samoussa : ils sont toujours aussi bons.');
    await say('mentor', 'think', "Petit rappel de compta : tes courses sont des dépenses personnelles. Seul le surcoût d'un repas pris sur ton lieu de travail peut se déduire, dans une certaine limite.");
  },
  async reunionDom() {
    await say('mathieu', 'happy', 'Bienvenue dans mon cabinet ! Ici, je soigne exactement comme en métropole… mais je cote un peu différemment.');
    const ok = await quiz('mathieu', 'think', 'Une lombalgie commune, RAM 8,09, à La Réunion, ça vaut combien ?', ['17,88 €', '19,66 €', '20,57 €'], 1);
    await say('mathieu', ok ? 'happy' : 'think', ok ? 'Exact : 8,09 × 2,43 € = 19,66 € !' : 'Non : 8,09 × 2,43 € = 19,66 €. En métropole, ce serait 8,09 × 2,21 € = 17,88 €.');
    return ok;
  },
  /* ----- Le Michigan : Chad Cook ----- */
  async chadPitch(first, k) {
    const P = CHAD[k % CHAD.length];
    if (first) {
      await say('chad', 'joy', `Yo ${gx('bro', 'sis')} ! Chad Cook, le kiné le plus musclé des States ! Bienvenue au Michigan : le désert, la station-service… et MES formations.`);
      await say('chad', 'think', "Et méfie-toi de Marvin de l'Ouest, un des brigands les plus dangereux de tout le Michigan. Il vole aux riches… pour donner à son livret A !");
      await say('chad', 'happy', "Bref. Tu veux gagner plus en bossant moins ? J'ai exactement ce qu'il te faut.");
    } else { await sayLore('chad'); await say('chad', 'happy', `Re-yo ${gx('bro', 'sis')} ! J'ai une nouvelle formation pour toi, toute fraîche.`); }
    await say('chad', 'think', `Ma formation « ${P.title} » : ${P.pitch}`);
    return P;
  },
  async chadBought(p) {
    await say('chad', 'joy', "Deal ! Ton accès arrive par mail… un jour. Peut-être. No refund, bro !");
    await say('mentor', 'scared', `Aïe ! « ${p.title} » n'a rien d'une formation : c'est une arnaque. ${p.lesson}`);
    await say('mentor', 'think', "Et ce n'est pas une dépense professionnelle déductible : une formation non reconnue et sans lien avec ton exercice, c'est pour ta poche.");
  },
  async chadRefused(p) {
    await say('player', 'think', `Non merci, Chad. « ${p.title} », c'est de la fraude !`);
    await say('chad', 'think', 'Pfff… Whatever. Les kinés français sont trop sérieux.');
    await say('mentor', 'happy', `Bien vu ! ${p.lesson}`);
  },
  /* ----- Les niveaux 4 à 9 du cabinet ----- */
  async built4() {
    await say('mentor', 'happy', 'Niveau 4 : une salle de réathlétisation ! Un poste de soins en plus, et les sportifs vont adorer.');
    await say('mentor', 'think', `Chaque agrandissement est une immobilisation : il s'inscrit au registre et s'amortit, ici sur ${CAB_LEVELS[4].years} ans.`);
  },
  async built5() {
    await say('mentor', 'happy', 'Niveau 5 : une terrasse végétalisée et une salle de groupe ! Ton cabinet peut accueillir un 2e assistant.');
    await say('mentor', 'think', "Plus d'assistants, c'est plus de redevances… mais il leur faut des postes libres pour travailler.");
  },
  async built6() { await say('mentor', 'happy', 'Niveau 6 : un bassin de balnéothérapie ! Les patients en rééducation vont faire la queue pour y entrer.'); },
  async built7() { await say('mentor', 'happy', 'Niveau 7 : un jardin thérapeutique, avec son parcours de marche. Parfait pour la déambulation des sujets âgés !'); },
  async built8() {
    await say('mentor', 'happy', 'Niveau 8 : un espace sport-santé ! Et de la place pour un 3e assistant.');
    await say('mentor', 'think', "Pense à tes assurances : plus ton cabinet grandit, plus il faut protéger tes locaux et ton matériel. Ces primes sont déductibles.");
  },
  async built9() {
    await say('mentor', 'happy', `Niveau 9 : un centre de rééducation complet, avec une piscine sur le toit ! ${G.pseudo}, tu as construit le plus beau cabinet de la région.`);
    await say('mentor', 'think', "Et souviens-toi d'où tu viens : remplacement, assistanat, installation… Continue à bien coter, à bien déclarer… et à prendre des vacances !");
  }
};
