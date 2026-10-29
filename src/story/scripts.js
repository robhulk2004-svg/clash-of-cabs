import { agaFor, comptableFor } from '../compta/ledger.js';
import { G, START_DATE, gx } from '../core/save.js';
import { MENTOR, MONTHS, fmt } from '../core/utils.js';
import { CAB_LEVELS, ECO } from '../data/economy.js';
import { CANDIDATES } from '../data/staff.js';
import { quiz, say } from './talk.js';

/* ================= Scripts ================= */
export const SCRIPTS = {
  /* ----- Les démarches post-diplôme ----- */
  async welcome() {
    await say('mentor', 'happy', `Félicitations, ${G.pseudo} ! Je suis ${MENTOR}, présidente du conseil départemental de l'Ordre. Je vais t'accompagner pendant tes premières années de kiné ${gx('libéral', 'libérale')}.`);
    await say('player', 'happy', "Merci ! J'ouvre mon cabinet demain, c'est ça ?");
    await say('mentor', 'think', `Pas si vite ! Un cabinet, c'est environ ${fmt(CAB_LEVELS[1].cost)} €. Avec tes ${fmt(G.money)} € d'économies d'étudiant, il va falloir patienter un peu…`);
    await say('player', 'scared', 'Ah. Oui. Quand même.');
    await say('mentor', 'happy', `On va faire comme beaucoup de jeunes diplômés : d'abord ${gx('remplaçant, puis assistant libéral', 'remplaçante, puis assistante libérale')}, et enfin titulaire de ton propre cabinet !`);
    await say('mentor', 'think', "Mais avant de soigner qui que ce soit, il y a 5 démarches obligatoires, dans cet ordre. Tout se passe à la Boutique !");
    await say('mentor', 'happy', "Pour chacune, c'est la personne concernée qui viendra t'expliquer : Ninassurance pour l'assurance, moi pour l'Ordre, Marvin pour l'URSSAF, Alex Cloppe pour la CARPIMKO… et le gobelin de la CPAM. Courage !");
  },
  async shopIntro() { await say('mentor', 'happy', "Voici la Boutique ! Chaque carte est une démarche. Fais-les dans l'ordre, en commençant par ton assurance RCP : Ninassurance t'attend."); },
  async rcp() {
    await say('fee', 'happy', `Bonjour ${G.pseudo} ! Moi, c'est Ninassurance : je m'occupe des assurances des kinés. Et la première de toutes, c'est la RCP !`);
    await say('fee', 'think', "L'assurance responsabilité civile professionnelle est obligatoire depuis la loi Kouchner du 4 mars 2002, même pour un remplaçant. Elle couvre les dommages causés à tes patients… sur le plan civil.");
    await say('fee', 'happy', "Souscris-la environ une semaine avant ton inscription à l'Ordre : l'attestation fait partie de ton dossier.");
    const ok = await quiz('fee', 'think', 'Petite question : tu prends une amende en allant chez un patient à domicile. Ta RCP la paie ?', ["Oui, c'était pour le travail", "Non, c'est du pénal : je paie"], 1);
    if (ok) { await say('player', 'happy', "Non ! Une amende, c'est du pénal : c'est pour ma pomme."); await say('fee', 'joy', 'Exactement ! Tu as tout compris.'); }
    else { await say('player', 'scared', 'Oups…'); await say('fee', 'think', "Non : la RCP ne couvre que le civil. Une amende relève du pénal, c'est toi qui paies."); }
    await say('fee', 'happy', "Pour les autres contrats (protection juridique, prévoyance…), passe me voir à la maison des assurances, en ville !");
    return ok;
  },
  async ordre() {
    await say('mentor', 'happy', "Direction le Conseil de l'Ordre ! Tu t'inscris au Tableau auprès du CDOMK, ton conseil départemental.");
    await say('mentor', 'think', "L'Ordre a 3 mois pour t'inscrire : prépare ton dossier en avance. Et tu exerceras sous ton vrai nom : le pseudonyme est interdit !");
    await say('mentor', 'happy', `Te voilà ${gx('inscrit', 'inscrite')}, ${G.pseudo} ! Ton numéro RPPS t'identifie. La cotisation (280 € par an en libéral) est gratuite la première année après le diplôme.`);
    const ok = await quiz('mentor', 'think', "Quelles sont les deux missions de l'Ordre ?", ['Juridique et fiscale', 'Administrative et disciplinaire', 'Syndicale et commerciale'], 1);
    if (ok) { await say('player', 'happy', 'Administrative et disciplinaire !'); await say('mentor', 'happy', "Parfait ! L'Ordre tient la liste des kinés et fait respecter le code de déontologie. Il vérifiera aussi tous tes contrats."); }
    else { await say('player', 'think', 'Euh…'); await say('mentor', 'think', 'Non : administrative (tenir la liste des kinés) et disciplinaire (faire respecter le code de déontologie).'); }
    return ok;
  },
  async urssaf() {
    await say('mentor', 'happy', "Pour l'URSSAF, je te laisse avec Marvin…");
    await say('marvin', 'happy', `Bonjour bonjour ! Marvin, de l'URSSAF. Déclarer, cotiser, simplifier : c'est notre devise, hé hé. Remplaçant ou titulaire, tu exerces en libéral : tu t'inscris à ton propre nom.`);
    await say('marvin', 'think', "Chez nous, tu cotises entre autres pour ta couverture maladie : elle prend en charge tes arrêts de 3 à 90 jours.");
    const ok = await quiz('marvin', 'think', "Que t'apporte ton inscription à l'URSSAF ?", ['Un numéro RPPS', 'Une carte CPS', 'Un SIRET et un SIREN'], 2);
    if (ok) { await say('player', 'happy', 'Mon SIRET et mon SIREN !'); await say('marvin', 'happy', `Bravo ! Tu es ${gx('bien renseigné', 'bien renseignée')}… Ça me plaît. Et ça me fait un peu peur, hé hé.`); }
    else { await say('player', 'scared', 'Raté…'); await say('marvin', 'think', "Non non non : le RPPS vient de l'Ordre et la carte CPS de la CPAM. Chez nous, c'est ton SIRET et ton SIREN."); }
    return ok;
  },
  async carpimko() {
    await say('sage', 'happy', `Salut ${G.pseudo} ! Alex Cloppe, de la CARPIMKO. Oui, je sais, j'ai l'air jeune… mais je suis l'homme le plus vieux de Gironde. Et le plus rapide : 100 mètres en 3,4 secondes ! La retraite, ça conserve.`);
    await say('sage', 'think', "La CARPIMKO, c'est ta caisse de retraite. Elle couvre aussi l'assurance décès et l'invalidité.");
    await say('sage', 'happy', "Ma règle d'or : sois toujours à jour de tes cotisations ! En moyenne, la retraite d'un kiné tourne autour de 1 500 € par mois.");
    const ok = await quiz('sage', 'think', 'Tu es en arrêt maladie pendant 4 mois. Qui prend le relais après 90 jours ?', ["L'URSSAF", 'La CARPIMKO', 'Ta RCP'], 1);
    if (ok) { await say('player', 'happy', "La CARPIMKO ! L'URSSAF couvre de 3 à 90 jours."); await say('sage', 'joy', 'Impeccable ! Tu iras loin… et longtemps.'); }
    else { await say('player', 'scared', 'Hmm…'); await say('sage', 'think', "Non : l'URSSAF couvre de 3 à 90 jours. Au-delà, c'est la CARPIMKO, avec le régime d'invalidité."); }
    return ok;
  },
  async cpam() {
    await say('mentor', 'scared', 'Pour la CPAM… le gobelin sort de sa cabane, là-haut. Bon courage !');
    await say('goblin', '', `Hé hé hé… ${gx('Un petit nouveau', 'Une petite nouvelle')} ! Bienvenue à la CPAM.`);
    await say('player', 'scared', 'B… bonjour ?');
    await say('goblin', '', `Voici ta carte CPS de ${gx('remplaçant', 'remplaçante')}, ton numéro ADELI et tes feuilles de soins. Avec ta carte, je trace TOUTE ton activité, hé hé.`);
    await say('goblin', '', "Et ne compte pas sur moi pour te conseiller : je ne m'occupe QUE de l'administratif !");
    const ok = await quiz('goblin', '', 'Petit test, hé hé : quelqu’un te propose un numéro ADELI « express » pour 99 €. Tu fais quoi ?', ["J'achète, c'est plus rapide !", 'Je refuse : un n° ADELI ne se vend pas'], 1);
    if (ok) { await say('goblin', '', gx('Tss… Il a bien révisé, celui-là.', 'Tss… Elle a bien révisé, celle-là.')); await say('player', 'happy', 'Hé hé !'); }
    else { await say('goblin', '', 'Hé hé hé ! Perdu : un numéro ADELI ne se vend pas. Ne tombe jamais dans ce piège !'); await say('player', 'scared', 'Mince…'); }
    await say('mentor', 'happy', 'Tu as survécu ! Retiens bien : pour des conseils, tourne-toi vers les syndicats, pas vers la CPAM.');
    return ok;
  },

  /* ----- Étape 1 : le remplacement ----- */
  async remplIntro() {
    await say('mentor', 'happy', `Tes 5 démarches sont faites, ${G.pseudo} : tu peux exercer ! Première étape de ta carrière : le remplacement.`);
    await say('mentor', 'think', "Le remplaçant soigne la patientèle d'un titulaire absent. Patientèle fournie, aucune charge fixe : idéal pour découvrir le libéral et d'autres cabinets.");
    await say('mentor', 'think', 'En échange, tu encaisses les honoraires et tu reverses une rétrocession au titulaire : 20 à 30 % en général. Et les revenus sont instables…');
    await say('player', 'happy', 'Et où je trouve des remplacements ?');
    await say('mentor', 'happy', "Sur le tableau des offres (le bouton « Offres ») : Thomas, au Cabinet IRSBC, et Julien, à la maison de santé de Maransin, cherchent des remplaçants. Compare bien : durée, rétrocession, distance, logement…");
    await say('mentor', 'happy', "Objectif : une année de remplacement, 12 mois de travail. Tiens, voilà justement Thomas qui sort de son cabinet !");
  },
  async thomasHello() {
    await say('thomas', 'happy', `Salut ! Thomas Cassmoildeau, du Cabinet IRSBC. Tu es ${gx('le jeune diplômé', 'la jeune diplômée')}, ${G.pseudo} ?`);
    await say('player', 'happy', `C'est moi ! Enfin… ${gx('le jeune diplômé', 'la jeune diplômée')} qui cherche du travail.`);
    await say('thomas', 'think', "Je dois lever le pied quelque temps : j'ai mis une offre de remplacement sur le tableau. Si ça te tente, postule !");
    await say('thomas', 'happy', "Et compare avec l'offre de Julien, à Maransin, à 45 km : là-bas, c'est un vrai désert médical. Étienne, à la Basquaise, n'a besoin de personne pour l'instant… mais passe le voir, il est de bon conseil !");
  },
  async contractIntro(kind) {
    if (kind === 'rempl') {
      await say('mentor', 'happy', "Ton premier projet de contrat ! Tout contrat est écrit et transmis au conseil départemental de l'Ordre.");
      await say('mentor', 'think', "Lis chaque clause et touche celles qui te semblent louches. Au moindre doute, demande l'avis de l'Ordre : c'est gratuit, et ici je te réponds en quelques secondes !");
      await say('mentor', 'scared', "Méfie-toi : l'annonce et le contrat ne disent pas toujours la même chose…");
    } else if (kind === 'assist') {
      await say('mentor', 'happy', "Un contrat d'assistant libéral ! Tu soigneras la patientèle de Mathieu, dans ses locaux de Saint-Gilles, avec son matériel.");
      await say('mentor', 'think', "Différence avec le remplacement : Mathieu continue de travailler à côté de toi. Et tu ne lui verses plus une rétrocession, mais une redevance.");
    } else {
      const w = (G.hireOffer && G.hireOffer.who) || 'ambroise', n = (CANDIDATES[w] || CANDIDATES.ambroise).name;
      await say('mentor', 'happy', `Cette fois, c'est toi ${gx('le', 'la')} titulaire ! ${n} veut devenir TON assistant. Vérifie son contrat comme Mathieu a vérifié le tien.`);
      await say('mentor', 'think', "C'est un contrat d'assistant libéral : il soignera ta patientèle, dans tes locaux, et te reversera une redevance.");
    }
  },
  async signedBad() {
    await say('mentor', 'scared', 'Aïe ! Tu as signé un contrat avec des clauses illégales. Le conseil départemental de l’Ordre le refusera.');
    await say('mentor', 'think', "Une version corrigée va t'être proposée. La prochaine fois, demande l'avis de l'Ordre !");
  },
  async remplStart(c, first) {
    if (first) {
      await say('mentor', 'happy', `Contrat signé ! Pendant ${c.months} mois, tu remplaces ${c.tit}. Entre dans le cabinet et commence ta journée.`);
      await say('mentor', 'think', "Les patients arrivent : touche « Soigner ». Chaque patient t'explique son problème : choisis la bonne prise en charge, puis la cotation. Quand la séance est finie, touche la carte au-dessus du patient pour encaisser avec TA carte CPS.");
      await say('mentor', 'happy', "Quatre bonnes prises en charge d'affilée, c'est un combo : un patient de plus dans ton agenda ! Une demi-journée de jeu représente chacune des 40 demi-journées de ton mois. Tu peux aussi la lancer depuis la ville avec « Accueillir » : elle tournera toute seule… mais sans combo.");
    } else await say('mentor', 'happy', `Nouveau remplacement : ${c.months} mois chez ${c.tit}. Au travail !`);
  },
  async firstReceipts() {
    await say('mentor', 'happy', 'Ton premier mois ! Tu as encaissé tous les honoraires… mais une partie ne t’appartient pas : tu l’as vu partir dans le coffre du titulaire.');
    await say('mentor', 'think', "La rétrocession versée au titulaire est une charge déductible : sur ta 2035, elle viendra en déduction de tes recettes.");
    await say('mentor', 'think', "Ensuite viennent tes cotisations URSSAF et CARPIMKO, tes kilomètres… et ta vie perso : ce que tu prélèves pour vivre n'est pas une dépense professionnelle !");
    await say('mentor', 'happy', 'Ce qui reste, ce sont tes économies. Elles financeront un jour ton cabinet. Tout est noté dans ton livre-journal (bouton Compta).');
  },
  async marvinIntro() {
    await say('marvin', 'happy', "Bonjour bonjour ! Marvin, de l'URSSAF. Je passe voir les nouveaux libéraux… pour faire connaissance, hé.");
    await say('marvin', 'think', 'Tes cotisations sociales : environ 20 % pour l’URSSAF et 10 % pour la CARPIMKO. Bonne nouvelle : ce sont des charges déductibles !');
    await say('marvin', 'think', "La première année, il y a l'ACRE : exonération totale sous 30 852 € de revenus, partielle jusqu'à 41 136 €, aucune au-delà.");
    const ok = await quiz('marvin', 'think', "Si tu gagnes 48 000 € la première année, tu as droit à l'exonération de l'ACRE ?", ['Oui, exonération totale', 'Non : au-delà de 41 136 €, aucune exonération', 'Oui, à moitié'], 1);
    if (ok) await say('marvin', 'happy', `Exact ! Tu es bien ${gx('renseigné', 'renseignée')}. Ça me plaît… et ça me fait un peu peur.`);
    else await say('marvin', 'scared', 'Non non non : au-delà de 41 136 €, pas d’exonération. Révise tes fiches !');
    await say('marvin', 'happy', "Je repasserai ! Sur pièces… ou in situ. Hé hé.");
    return ok;
  },
  async goblinCheck(tit) {
    await say('goblin', '', `Hé hé hé… Contrôle de l'Assurance Maladie ! Alors, c'est toi qui remplaces ${tit} ?`);
    const ok1 = await quiz('goblin', '', 'Avec quelle carte CPS factures-tu les actes de ses patients ?', ['La carte du titulaire, avec son code', `Ma propre carte CPS de ${gx('remplaçant', 'remplaçante')}`], 1);
    if (ok1) await say('goblin', '', 'Tss… Correct. Utiliser la carte du titulaire, c’est illégal.');
    else await say('goblin', '', 'Hé hé ! Faux : le remplaçant utilise SA carte CPS. Celle du titulaire, c’est interdit !');
    const ok2 = await quiz('goblin', '', "Un patient de 46 ans veut un bilan de prévention pendant sa séance de genou. Tu fais quoi ?", ['Je le fais pendant la séance, en plus', 'En dehors de toute séance : 30 €, coté RDI, sans autre acte'], 1);
    if (ok2) await say('goblin', '', 'Grrr… Encore juste. Une fois par tranche d’âge, sans autre acte ni majoration.');
    else await say('goblin', '', 'Hé hé hé ! Non : le bilan de prévention se fait hors séance, 30 €, coté RDI, sans autre acte.');
    await say('mentor', 'happy', "Il est reparti ! Rappelle-toi : la CPAM s'occupe de l'administratif. Tes conseils, cherche-les ailleurs.");
    return ok1 && ok2;
  },
  async amende() {
    await say('player', 'scared', 'Oh non… Une amende de stationnement de 35 €, pendant une visite à domicile !');
    await say('mentor', 'think', "C'est du pénal : ta RCP ne la paie pas. Et une amende n'est jamais une charge déductible.");
  },
  async agaReminder() {
    await say('mentor', 'think', `Petit rappel : adhère à une AGA avant la fin de ton 5e mois d'activité, donc avant fin ${MONTHS[START_DATE.m + 3]} !`);
    await say('mentor', 'happy', "Elle coûte environ 200 € par an, c'est déductible, et elle télétransmet ta 2035. Onglet Services de la Boutique.");
  },
  async remplEnd(c) {
    await say('mentor', 'happy', `Fin du remplacement chez ${c.tit} ! Tu lui transmets les informations utiles à la continuité des soins.`);
    if (c.extra && c.extra.includes('concurrence')) await say('mentor', 'think', "Souviens-toi de ta clause de non-concurrence : elle t'engage, même après ton départ.");
    if (G.monthsRempl < 12) await say('mentor', 'happy', `Déjà ${G.monthsRempl} mois de remplacement sur 12. Retourne au tableau des offres pour trouver la suite !`);
  },
  async chocolats() {
    await say('player', 'happy', 'Les patients m’ont offert des chocolats pour Noël !');
    await say('mentor', 'think', "C'est gentil… mais c'est un avantage en nature : une recette à déclarer. Oui oui, même un cadeau !");
  },
  async google() {
    await say('player', 'happy', 'Apparaître en premier sur internet ? Génial, ça va m’amener plein de patients !');
    await say('mentor', 'scared', 'Stop ! Le code de déontologie interdit d’obtenir, contre paiement, un référencement qui te fait apparaître en priorité dans les recherches.');
    await say('mentor', 'think', 'Tu peux communiquer, avoir un site internet loyal et honnête… mais pas payer pour passer devant tes confrères.');
  },

  /* ----- Étape 2 : l'assistanat ----- */
  async assistOffer() {
    await say('mathieu', 'happy', `${G.pseudo} ! Mathieu Mopourmot, kiné à Saint-Gilles, à La Réunion. Thomas et Julien ne parlent que de toi !`);
    await say('mathieu', 'think', `J'ai repris le cabinet d'Éric Samoussa, rentré en métropole parce que les samoussas de l'île avaient « baissé en qualité ». Depuis, entre les surfeurs et les randonneurs du Maïdo, je ne m'en sors plus. Que dirais-tu de devenir mon ${gx('assistant libéral', 'assistante libérale')} ? Tu soignerais ma patientèle, toute l'année.`);
    await say('player', 'happy', 'Un vrai poste fixe… sous les cocotiers ? Avec plaisir !');
    await say('mentor', 'think', 'Bonne idée : plus de stabilité, accès à la structure (locaux, matériel, secrétariat) et moins de risques financiers. Mais tu ne pourras pas emporter la patientèle en partant.');
    await say('mentor', 'happy', "Et c'est le moment d'économiser pour ton apport. Lis bien son contrat !");
  },
  async mathieuInsists() { await say('mathieu', 'think', "Mon contrat était pourtant conforme… Bon, je te le laisse. Relis-le à tête reposée !"); },
  async assistStart(rate) {
    await say('mentor', 'happy', `Te voilà ${gx('assistant libéral', 'assistante libérale')} chez Mathieu, à La Réunion ! Tu travailles à ses côtés, dans son cabinet de Saint-Gilles.`);
    await say('mentor', 'think', `Chaque mois, tu lui verses une redevance de ${Math.round(rate * 100)} %. Attention : ce n'est pas une rétrocession. Elle est assimilée à un loyer : une dépense déductible… mais seulement au réel !`);
    await say('mathieu', 'happy', "Et ici, on est dans un DOM : la lettre-clé vaut 2,43 € au lieu de 2,21 €. La vie est plus chère, alors les tarifs sont majorés !");
    await say('mentor', 'happy', `Objectif : au moins ${ECO.assistMin} mois d'assistanat et ${fmt(ECO.apportMin)} € d'apport. Ensuite, tu pourras créer ton cabinet, chez toi, à Mériniaque. Touche la flèche « La Réunion » : Mathieu t'attend !`);
  },
  async menton() {
    await say('menton', 'happy', `Bonjour, ${gx('jeune homme', 'jeune femme')} ! Mickael Menton, kiné et syndiqué depuis trente ans. Vos démarches sont faites ? Alors il me reste à vous parler des syndicats, ${G.pseudo} !`);
    await say('menton', 'think', "Un conseil d'ancien : la seule ressource informative vraiment capable de vous aider, ce sont les syndicats. Même s'ils ne répondent parfois qu'à leurs adhérents…");
    await say('menton', 'happy', "Nous défendons la profession, nous négocions la convention avec l'Assurance Maladie, et nous relisons vos contrats. Et la cotisation syndicale est déductible !");
    const ok = await quiz('menton', 'think', "Petite colle : l'Ordre et les syndicats, c'est la même chose ?", ["Oui, ce sont les mêmes missions", "Non : l'Ordre a des missions administratives et disciplinaires, il est consulté par les ministres ; ses missions peuvent être contraires à celles des syndicats"], 1);
    if (ok) await say('menton', 'happy', 'Excellent ! Ne confondez jamais les deux.');
    else await say('menton', 'scared', "Malheureux ! L'Ordre est consulté par les ministres, il est administratif et disciplinaire. Les syndicats défendent les kinés : leurs missions peuvent même être contraires !");
    await say('menton', 'happy', "Si vous voulez adhérer, c'est dans la Boutique, onglet Services. Au plaisir !");
    return ok;
  },
  async urssafControl() {
    await say('marvin', 'happy', "Re-bonjour ! Marvin, URSSAF. Aujourd'hui, c'est un contrôle… in situ, hé hé. Ça peut aussi se faire sur pièces.");
    let n = 0;
    if (await quiz('marvin', 'think', 'Combien de temps conserves-tu tes justificatifs professionnels ?', ['1 an', 'Au moins 6 ans', 'Jusqu’à la retraite, seulement les gros montants'], 1)) n++;
    if (await quiz('marvin', 'think', 'Pour être acceptée, une dépense professionnelle doit…', ['Être justifiée par une facture et rattachée à une adresse professionnelle', 'Être payée en liquide', 'Dépasser 598 €'], 0)) n++;
    if (await quiz('marvin', 'think', 'Et tes cotisations URSSAF et CARPIMKO, pour tes impôts, elles sont…', ['Interdites de déduction', 'Déductibles : ce sont des charges sociales', 'Déductibles seulement en micro-BNC'], 1)) n++;
    if (n >= 2) await say('marvin', 'happy', `${n}/3 ! Tout est en ordre. Bon, je range mon tampon… pour cette fois.`);
    else await say('marvin', 'scared', `${n}/3… Je note quelques irrégularités. Une majoration de 150 €, hé hé. Et révisez !`);
    return n;
  },
  async canCreate() {
    await say('mentor', 'happy', `${G.pseudo}, regarde ton compte : tu as réuni ton apport, et tu as l'expérience de l'assistanat. Tu peux créer ton cabinet !`);
    await say('mentor', 'think', `Boutique, onglet Bâtiments. Un cabinet coûte ${fmt(CAB_LEVELS[1].cost)} € : ton apport, plus un prêt bancaire pour le reste.`);
    await say('mentor', 'happy', `Rien ne presse : tu peux aussi rester ${gx('assistant', 'assistante')} quelques mois de plus pour économiser davantage.`);
  },
  async leaveMathieu() {
    await say('mathieu', 'think', 'Tu t’installes ? Sur le terrain près de la tour de l’Ordre, à Mériniaque ? Et ta clause de non-concurrence, alors ?');
    await say('player', 'think', 'Pas à moins de 2 km de ton cabinet pendant 2 ans… Mériniaque, c’est à plus de 9 000 km de Saint-Gilles !');
    await say('mathieu', 'happy', "Exact, je te taquinais ! Une clause de non-concurrence se limite dans l'espace et dans le temps : celle-là ne te bloque pas. Bonne installation !");
    await say('mentor', 'happy', "Voilà pourquoi on lit ses contrats : une clause signée t'engage. Allez, la banque a validé ton prêt : place au chantier !");
  },

  /* ----- Étape 3 : titulaire ----- */
  async built1() {
    await say('mentor', 'happy', `Ton propre cabinet, ${G.pseudo} ! Tu es titulaire : tu gardes tous tes honoraires… et toutes les charges.`);
    await say('mentor', 'think', "Chaque mois : la mensualité du prêt (les intérêts sont déductibles, pas le capital), les charges du local, tes cotisations. Et ta patientèle est à construire !");
    await say('mentor', 'happy', "Pour l'instant, tu n'as que ta table : un seul poste. Achète un tapis et un step dans la Boutique pour soigner 3 patients par séance.");
    await say('mentor', 'think', "J'ai rangé un kit de démarrage dans ta réserve : huile de massage, essuie-tout, gel hydroalcoolique et élastiques, pour 2 mois. Ensuite, c'est à toi de te réapprovisionner au supermarché de Maransin !");
  },
  async built2() {
    await say('mentor', 'happy', 'Niveau 2 ! Ton cabinet gagne un étage : espalier, tapis de renforcement, électrothérapie et fauteuils sont débloqués.');
    await say('mentor', 'think', "Ton cabinet peut maintenant accueillir un assistant. Mais il lui faut des postes libres : tu en occupes 3 toi-même. Surveille la route devant ton cabinet !");
    await say('mentor', 'happy', "Un assistant travaille tout seul : ses redevances s'accumulent au-dessus de ton cabinet, comme une mine d'or. Pense à venir les récolter !");
  },
  async built3() {
    await say('mentor', 'happy', 'Niveau 3 : un vrai plateau technique ! Les drapeaux flottent sur ton cabinet.');
    await say('mentor', 'think', `${gx('Remplaçant, assistant', 'Remplaçante, assistante')}, titulaire : tu as vécu les trois statuts. Continue de bien gérer… et pense à partir en vacances de temps en temps ! Et à partir du niveau 4, chaque agrandissement ajoute une salle et un poste de soins.`);
  },
  async titFirst() {
    await say('mentor', 'think', 'Premier mois de titulaire ! Regarde bien ton résumé : intérêts, capital, charges du local… Un cabinet qui démarre, ça coûte.');
    await say('mentor', 'happy', `Chaque poste de soins rapporte environ ${fmt(ECO.slot)} € par mois. Équipe vite ton cabinet !`);
    await say('mentor', 'think', "Chaque demi-journée de jeu représente ton mois, comme avant : à toi de bien soigner et de bien coter. Et n'oublie pas tes consommables : sans huile, sans gel ou sans élastiques, ton cabinet tourne moins bien !");
  },

  /* ----- La 2035 ----- */
  async declIntro(y) {
    await say('mentor', 'happy', `Bonne année ! C'est le moment de déclarer tes revenus ${y}.`);
    await say('mentor', 'think', "D'abord, on range ton livre-journal. Ensuite on remplit la 2035, et tu choisis ton régime : micro-BNC ou déclaration contrôlée.");
    if (!agaFor(y) && !comptableFor(y)) await say('mentor', 'scared', "Tu n'as ni AGA ni comptable cette année : tu fais tout toi-même. Concentre-toi !");
  },
  async declAfter(reg, best) {
    if (reg === 'micro') await say('mentor', 'happy', 'En micro-BNC, pas de 2035 à envoyer : tu reportes simplement tes recettes sur la 2042 C-PRO.');
    else await say('mentor', 'happy', 'Ta 2035 est partie ! En déclaration contrôlée, garde bien tes justificatifs : au moins 6 ans.');
    if (reg !== best) await say('mentor', 'think', 'Ce choix se refait chaque année : surveille tes charges pour choisir le bon régime l’an prochain.');
    if (G.phase === 'rempl') await say('mentor', 'think', 'Remarque : un remplaçant a peu de charges (sa rétrocession est déjà déduite des recettes). Un assistant, lui, déduit sa redevance… seulement au réel !');
  }
};
