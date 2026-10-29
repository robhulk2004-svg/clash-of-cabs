import { G, gx } from '../core/save.js';
import { fmt } from '../core/utils.js';
import { ITEMS } from '../data/shop-items.js';
import { quiz, say } from './talk.js';

/* ================= Scripts of version 6: the consultation, the hut of the CPAM, the space base, the Moon, the missions, the end ================= */
/* what Suzie Taillebois sells: four years to « déshifter » the « shiftés » aliens */
const SUZIE = [
  { title: 'Déshiftage alien, cursus complet', price: 48000, pitch: "Quatre ans, douze modules, un diplôme en forme d'étoile… Après, tu déshiftes un alien en trente secondes chrono ! Les résultats ? Miraculeux. Enfin… c'est moi qui le dis !" },
  { title: 'Déshiftage alien, module « antennes »', price: 9900, pitch: "Le module préféré de mes élèves : on recentre les antennes des aliens d'un geste du petit doigt. Ils repartent comme neufs ! Aucune étude ne le prouve… mais ils sourient, non ?" }
];
const HUT = [
  "Le bilan de prévention ? Hors séance, 30 €, coté RDI, une fois par tranche d'âge. Pas de séance en même temps, hé hé !",
  "Lombalgie commune : au-delà de 15 séances, demande d'accord préalable. Sinon… je la vois passer, hé hé.",
  "Un indu, c'est une somme versée à tort par l'Assurance Maladie. Je la récupère TOUJOURS.",
  "La lettre-clé vaut 2,21 € en métropole et 2,43 € dans les DOM. Le télésoin, 2,15 €. Je connais tous les tarifs par cœur.",
  "Des conseils ? Je ne fais que de l'administratif, moi ! Pour les conseils, va voir les syndicats."
];
export const V6_SCRIPTS = {
  /* ----- the first patient: Pascale explains the consultation ----- */
  async consultIntro() {
    await say('mentor', 'happy', `Ton premier patient, ${G.pseudo} ! Écoute-le bien : il va t'expliquer ce qui ne va pas. Ce sont des cas cliniques de tes cours.`);
    await say('mentor', 'think', "Tu choisis la prise en charge : une seule des trois est pertinente. Attention aux drapeaux rouges : parfois, la bonne réponse, c'est de réorienter le patient vers son médecin. Dans ce cas, pas de séance… et rien à facturer.");
    await say('mentor', 'happy', "Ensuite, la cotation NGAP : une lettre-clé et un coefficient. Pas de panique, la bonne est en surbrillance ! Retiens juste la logique : la région, opéré ou non, la pathologie.");
    await say('mentor', 'think', "Une erreur de cotation vers le bas, c'est de l'argent perdu. Vers le haut, c'est un indu que la CPAM te réclamera lors d'un contrôle !");
  },
  /* ----- the hut of the CPAM, where the goblin lives ----- */
  async cpamHut() {
    await say('goblin', '', `Hé hé hé… Tu as trouvé ma cabane, ${G.pseudo} ! D'ici, je surveille les cotations de toute la ville.`);
    const k = (G.flags.hutLine = ((G.flags.hutLine ?? -1) + 1) % HUT.length);
    await say('goblin', '', HUT[k]);
    if (!G.flags.hutQuiz) {
      const ok = await quiz('goblin', '', 'Petit test, hé hé : avec quelle carte factures-tu tes actes ?', ['La carte CPS du titulaire, c’est plus simple', 'Ma propre carte CPS, toujours'], 1);
      G.flags.hutQuiz = true;
      await say('goblin', '', ok ? 'Tss… Correct. Va-t’en avant que je trouve autre chose.' : 'Hé hé ! Faux : chacun facture avec SA carte CPS. Utiliser celle d’un autre, c’est interdit !');
      return ok;
    }
    return false;
  },
  /* ----- the space base: the rocket for the Moon ----- */
  async baseInfo() {
    await say('mentor', 'happy', "La base spatiale de Mériniaque ! D'ici décolle la fusée pour la Lune, où travaille Suzie Taillebois, la seule kiné à 384 400 km à la ronde.");
    await say('mentor', 'think', `Une fusée, ça coûte une fortune : ${fmt(ITEMS.fusee.price)} €. C'est la dernière étape du jeu ! Elle est dans la Boutique, onglet Véhicules.`);
  },
  async rocketHint() {
    await say('mentor', 'happy', `Ton cabinet grandit bien, ${G.pseudo} ! Tu as entendu parler de Suzie Taillebois, la kiné de la Lune ?`);
    await say('mentor', 'think', "Pour la rejoindre, il te faudra une fusée, à la base spatiale. C'est cher… mais c'est la dernière aventure de ta carrière !");
  },
  /* ----- the Moon: Suzie Taillebois ----- */
  async hiMoon() {
    await say('suzie', 'joy', `Bienvenue sur la Lune ! Suzie Taillebois, la seule kiné à 384 400 km à la ronde ! Tu as vu mes aliens, ${G.pseudo} ? Ils sont trop mignons, non ?`);
    await say('suzie', 'think', "Ici, tous les aliens sont « shiftés » : à force de se pencher dans la mine de cristaux, leurs antennes se décalent. Moi, je les « déshifte ». C'est miraculeux !");
    await say('player', 'think', 'Euh… « déshifter » ? Ça se trouve dans quel cours, ça ?');
    await say('suzie', 'happy', "Dans le mien ! Promenez-vous, les aliens adorent poser des questions sur la kiné. Et si tu veux un supermarché, il y a même des produits importés de la Terre !");
  },
  /* a chat with Suzie; every other time, she pitches her training (returns it) */
  async suzieTalk() {
    const L = [
      ['happy', "Tu sais que la gravité de la Lune est six fois plus faible que sur Terre ? Mes patients font des squats de champion !"],
      ['think', "Mon secret, c'est l'amour des aliens. Et un peu de poussière d'étoile. Surtout l'amour."],
      ['joy', "Hier, j'ai déshifté trois aliens d'un coup ! Bon, ils étaient peut-être déjà guéris… mais quand même !"]
    ];
    const k = (G.flags.suzieLine = ((G.flags.suzieLine ?? -1) + 1) % 4);
    if (k < 3) { await say('suzie', L[k][0], L[k][1]); return null; }
    const P = SUZIE[(G.flags.suziePitch = ((G.flags.suziePitch ?? -1) + 1) % SUZIE.length)];
    await say('suzie', 'joy', `Et si tu devenais ${gx('déshifteur', 'déshifteuse')} toi aussi ? J'ai une formation pour toi : « ${P.title} » !`);
    return P;
  },
  async suzieBought(p) {
    await say('suzie', 'joy', 'Youpi ! Rendez-vous lundi, à la mine de cristaux. Apporte une lampe frontale… et beaucoup de patience !');
    await say('mentor', 'scared', `Aïe… « ${p.title} » n'a rien d'une formation reconnue. Une technique « miraculeuse », sans aucune preuve d'efficacité : méfiance !`);
    await say('mentor', 'think', "La vraie formation continue, c'est le DPC, avec des organismes enregistrés, et des pratiques qui s'appuient sur des preuves. Et ce n'est pas une dépense déductible : c'est pour ta poche.");
  },
  async suzieRefused(p) {
    await say('player', 'think', `C'est gentil, Suzie… mais « ${p.title} », sans aucune preuve que ça marche, je vais passer mon tour.`);
    await say('suzie', 'happy', "Tant pis ! Les aliens t'adorent quand même. Reviens me voir quand tu veux !");
    await say('mentor', 'happy', "Bien vu. Avant de payer une formation : est-elle reconnue (DPC) ? S'appuie-t-elle sur des preuves ? Une méthode « miraculeuse », ça doit toujours éveiller ta méfiance.");
  },
  /* ----- the missions abroad ----- */
  async mission_M() {
    await say('chad', 'joy', `Yo ${gx('bro', 'sis')} ! C'est la saison des rodéos : entre les chutes de cheval et les matchs de football, tout le monde a mal quelque part ! Tu viens bosser avec moi pendant ton voyage ?`);
    await say('chad', 'happy', "Ici, les patients paient cash, sans Sécurité sociale : je te file 25 € par patient soigné. Deal ?");
    await say('mentor', 'think', "Une mission à l'étranger : pas de carte CPS ni de NGAP au Michigan. En vrai, pour soigner aux États-Unis, il faut une licence locale… mais dans le jeu, on va dire que Chad s'est débrouillé !");
  },
  async missionEnd_M(H) {
    await say('chad', 'joy', `${gx('Bro', 'Sis')}, t'as géré ! Mes patients remarchent droit, même les fans de rodéo. Voilà ta paie !`);
    await say('chad', 'think', "Range bien ton argent : Marvin de l'Ouest adore les poches pleines. Pas pour lui, hein : pour son livret A.");
    await say('mentor', 'happy', `Ta mission chez Chad te rapporte ${fmt(H)} € sur le mois : ils seront comptés à ton retour en France, avec la rétrocession de ton remplaçant.`);
  },
  async mission_L() {
    await say('suzie', 'joy', `${G.pseudo} ! Tous les astronautes de la base lunaire veulent se faire soigner… euh, déshifter ! Aide-moi pendant un mois : 30 € par patient !`);
    await say('suzie', 'happy', "Mais attention : ici aussi, je veux de VRAIES prises en charge. Je suis un peu folle, pas inconsciente !");
    await say('mentor', 'happy', "C'est la dernière mission du jeu ! Montre à Suzie tout ce que tu as appris.");
  },
  async missionEnd_L(H) {
    await say('suzie', 'joy', "Waouh ! Tous mes astronautes sont réparés, et même pas besoin de déshiftage ! Tu es la meilleure chose qui soit arrivée à la Lune !");
    await say('mentor', 'happy', `Ta mission lunaire te rapporte ${fmt(H)} € : ils seront comptés à ton retour sur Terre.`);
  },
  /* ----- the end of the game ----- */
  async ending() {
    await say('mentor', 'happy', `Quel parcours, ${G.pseudo} ! Ton diplôme, tes démarches, tes remplacements chez Thomas et Julien, ton assistanat chez Mathieu, ton propre cabinet… et même la Lune !`);
    await say('suzie', 'joy', "Reviens quand tu veux ! Les aliens t'ont même fabriqué un diplôme en cristal.");
    await say('mentor', 'think', "Tu connais maintenant la gestion d'un cabinet de A à Z : contrats, cotations, compta, assurances, retraite… et surtout, de bonnes prises en charge.");
    await say('mentor', 'happy', "Le jeu continue : agrandis ton cabinet, recrute, voyage… et n'oublie pas ta 2035 !");
  }
};
