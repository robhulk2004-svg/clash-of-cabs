/* ================= What the characters of the institutions say (course « Législation – gestion de cabinet », UE14) ================= */
export const BUILDINGS = {
  urssaf: {
    title: 'URSSAF', host: 'marvin', hostName: 'Marvin',
    hello: ['happy', "Bienvenue à l'URSSAF ! Marvin, pour vous servir… et pour vous contrôler, hé hé. Déclarer, cotiser, simplifier : c'est notre devise."],
    talk: [
      ['think', "Ton inscription à l'URSSAF te donne ton SIRET et ton SIREN. Et tu cotises pour ta couverture maladie : tes arrêts de 3 à 90 jours."],
      ['happy', "Une règle simple pour ne pas avoir de mauvaise surprise : sur ce que tu gagnes, compte environ 30 % d'impôts, 20 % d'URSSAF et 10 % de CARPIMKO."],
      ['think', "Les cotisations URSSAF et CARPIMKO sont des charges sociales : elles sont déductibles de ton bénéfice."],
      ['think', "La CSG fait partie des charges de l'URSSAF. Attention : une partie est déductible, l'autre non !"],
      ['happy', "La première année, l'ACRE t'exonère : totalement sous 30 852 € de revenus, partiellement jusqu'à 41 136 €, et plus du tout au-delà."],
      ['think', "Nos contrôles se font sur pièces ou in situ. Garde tes justificatifs au moins 6 ans, hé hé."]
    ],
    quiz: [
      { q: 'Tu es en arrêt maladie pendant 2 mois. Qui te verse des indemnités ?', o: ["L'URSSAF : elle couvre les arrêts de 3 à 90 jours", 'La CARPIMKO', 'Ton assurance RCP'], a: 0, why: "L'URSSAF couvre tes arrêts de 3 à 90 jours. Au-delà de 90 jours, c'est la CARPIMKO (régime d'invalidité)." },
      { q: 'Tes cotisations URSSAF et CARPIMKO, pour ton bénéfice, elles sont…', o: ['Déductibles : ce sont des charges sociales', 'Non déductibles', 'Déductibles seulement la première année'], a: 0, why: 'Ce sont des charges sociales obligatoires : déductibles.' },
      { q: 'La CSG, elle est…', o: ['Entièrement déductible', 'Déductible en partie seulement', 'Jamais déductible'], a: 1, why: 'Une fraction de la CSG est déductible, le reste ne l’est pas.' },
      { q: 'Pour 1 000 € gagnés, combien prévoir pour l’URSSAF, en gros ?', o: ['Environ 50 €', 'Environ 200 €', 'Environ 500 €'], a: 1, why: 'La règle du cours : environ 20 % pour l’URSSAF, 10 % pour la CARPIMKO et 30 % d’impôts.' },
      { q: "Tu gagnes 35 000 € ta première année. Et l'ACRE ?", o: ['Exonération totale', 'Exonération partielle', 'Aucune exonération'], a: 1, why: 'Entre 30 852 € et 41 136 € de revenus : exonération partielle. Totale en dessous, aucune au-dessus.' }
    ]
  },
  carpimko: {
    title: 'CARPIMKO', host: 'sage', hostName: 'le sage',
    hello: ['happy', "Bienvenue, jeune pousse. Je suis le sage de la retraite. Ici, à la CARPIMKO, on pense à ton avenir… même lointain."],
    talk: [
      ['happy', "La CARPIMKO, c'est ta caisse de retraite. Elle gère aussi l'assurance décès et l'invalidité : tes arrêts de plus de 90 jours."],
      ['think', "La retraite de base des libéraux est gérée par la CNAVPL. La CARPIMKO en est une section professionnelle : c'est ta retraite complémentaire obligatoire."],
      ['think', "Le système fonctionne par points : tes cotisations te donnent des points, convertis en argent à la fin de ta carrière."],
      ['scared', "C'est un système de répartition : les actifs paient les retraites des partants. Ta retraite ne correspondra pas à ce que tu as cotisé !"],
      ['happy', "En moyenne, une retraite de kiné tourne autour de 1 500 € par mois. Et attention : la première année de retraite, l'impôt porte sur les revenus de l'année d'avant, quand tu travaillais encore !"],
      ['think', "Constitue-toi une épargne personnelle par capitalisation, par exemple un contrat Madelin : ses cotisations sont déductibles, dans certaines limites. Et ne mets pas tous tes œufs dans le même panier."],
      ['happy', "Ma règle d'or : sois toujours à jour de tes cotisations."]
    ],
    quiz: [
      { q: 'Notre système de retraite fonctionne…', o: ['Par capitalisation : chacun épargne pour soi', 'Par répartition : les actifs paient les retraites des partants', 'Grâce aux impôts sur le revenu'], a: 1, why: "C'est la répartition : à un instant T, les actifs paient les retraites. D'où l'intérêt d'une épargne en plus." },
      { q: 'Tu es en arrêt maladie depuis 4 mois. Qui prend le relais ?', o: ["L'URSSAF", 'La CARPIMKO, avec son régime d’invalidité', 'Personne'], a: 1, why: "L'URSSAF couvre de 3 à 90 jours. Au-delà, c'est la CARPIMKO." },
      { q: 'En moyenne, la retraite d’un kiné, c’est environ…', o: ['800 € par mois', '1 500 € par mois', '4 000 € par mois'], a: 1, why: 'Environ 1 500 € par mois : pense à épargner à côté.' },
      { q: "Une prime d'assurance décès, c'est déductible ?", o: ['Oui, comme la RCP', 'Non'], a: 1, why: "L'assurance décès n'est pas déductible. La RCP et les contrats Madelin, si (dans leurs limites)." },
      { q: 'Les cotisations d’un contrat retraite Madelin sont…', o: ['Déductibles, dans certaines limites', 'Jamais déductibles', 'Déductibles sans aucune limite'], a: 0, why: 'Elles sont déductibles dans la limite d’un plafond (10 % du bénéfice imposable, plafonné). Les rentes, elles, seront imposées.' }
    ]
  },
  syndicats: {
    title: 'Syndicats', host: 'menton', hostName: 'M. Menton',
    hello: ['happy', "Bienvenue à la maison des syndicats ! Pierre Menton, kiné et syndiqué depuis trente ans. Ici, on défend la profession."],
    talk: [
      ['happy', "Les syndicats représentatifs négocient la convention nationale avec l'Assurance Maladie : c'est comme ça que sont nés les avenants, et la nouvelle cotation des actes."],
      ['think', "La CPAM ne s'occupe que de l'administratif : ce ne sont ni des amis, ni des conseillers. Pour des conseils, viens nous voir… même si on répond parfois en priorité à nos adhérents."],
      ['think', "L'Ordre et les syndicats, ce n'est pas pareil : l'Ordre est consulté par les ministres et ses missions peuvent même être contraires aux nôtres."],
      ['happy', "Ta cotisation syndicale est déductible. Et ton syndicat peut relire tes contrats avant que tu signes !"],
      ['scared', "Attention : un syndicat fait partie de ceux qui peuvent porter plainte contre un kiné devant l'Ordre. On défend la profession… et ses règles."]
    ],
    quiz: [
      { q: "Qui négocie la convention nationale avec l'Assurance Maladie ?", o: ["L'Ordre", 'Les syndicats représentatifs', "L'URSSAF"], a: 1, why: 'Ce sont les syndicats représentatifs qui négocient la convention et ses avenants.' },
      { q: 'Ta cotisation syndicale, elle est…', o: ['Déductible', 'Non déductible', 'Remboursée par la CPAM'], a: 0, why: 'Les cotisations syndicales et professionnelles sont déductibles.' },
      { q: 'Qui peut porter plainte contre un kiné devant l’Ordre ?', o: ['Seulement un patient', 'Un patient, un syndicat, un confrère, l’ARS…', 'Personne, l’Ordre décide seul'], a: 1, why: "Patients, associations de patients, syndicats, ARS, le conseil départemental, un confrère ayant intérêt à agir… peuvent porter plainte." },
      { q: 'Pour un conseil juridique, tu appelles…', o: ['La CPAM', 'Ton syndicat', 'Le gobelin'], a: 1, why: 'La CPAM ne s’occupe que de l’administratif. Les syndicats, eux, conseillent les kinés.' }
    ]
  },
  assurances: {
    title: 'Assurances', host: 'fee', hostName: 'la fée',
    hello: ['happy', "Bienvenue, bienvenue ! Je suis la fée des assurances. D'un coup de baguette, je protège les kinés… à condition qu'ils lisent leurs contrats !"],
    talk: [
      ['happy', "L'assurance responsabilité civile professionnelle est obligatoire en libéral depuis la loi Kouchner du 4 mars 2002. Elle couvre le civil… pas le pénal !"],
      ['think', "Choisis un assureur spécialisé dans la santé. Et prévois une complémentaire pour tes indemnités journalières en cas d'arrêt : en libéral, pas de congés payés ni d'arrêt maladie automatique."],
      ['happy', "Une protection juridique peut prendre en charge les frais d'avocat. Pratique, si un jour tu passes devant la chambre disciplinaire…"],
      ['scared', "En cas d'incident avec un patient : déclare-le à ton assurance RCP, et prends régulièrement de ses nouvelles."],
      ['think', "Déductibles : la RCP, l'assurance de tes locaux (vol, incendie, dégâts des eaux), de ton matériel, les contrats Madelin. Pas l'assurance décès !"],
      ['happy', "Renégocie tes contrats d'assurance tous les 3 à 5 ans : ça évolue !"]
    ],
    quiz: [
      { q: 'Un patient chute au cabinet et se fait mal. Tu…', o: ['Je n’en parle à personne', 'Je le prends en charge, je note tout, je déclare l’incident à ma RCP et je prends de ses nouvelles', 'Je lui fais signer une décharge'], a: 1, why: "Déclare tout incident à ton assureur RCP et suis ton patient. Une décharge ne t'exonère de rien." },
      { q: 'Lesquelles de ces primes sont déductibles ?', o: ['La RCP et l’assurance des locaux professionnels', 'L’assurance décès', 'L’assurance de ta voiture perso'], a: 0, why: 'Les primes qui couvrent les risques de ton exercice sont déductibles. L’assurance décès, non.' },
      { q: 'À quoi sert une protection juridique ?', o: ['À payer tes amendes', 'À prendre en charge les frais d’avocat', 'À remplacer ta RCP'], a: 1, why: 'Elle prend en charge les frais d’un avocat. Elle ne remplace pas la RCP, et rien ne paie une amende à ta place.' },
      { q: 'Tous les combien renégocier ses assurances ?', o: ['Jamais', 'Tous les 3 à 5 ans', 'Tous les mois'], a: 1, why: 'Le conseil du cours : tous les 3 à 5 ans, car les offres évoluent.' },
      { q: 'Ta RCP paie une amende de stationnement prise en visite à domicile ?', o: ['Oui', 'Non : c’est du pénal'], a: 1, why: 'La RCP couvre le civil, jamais le pénal.' }
    ]
  }
};
/* Optional contracts sold at the fée's and at the sage's (annual, booked as deductible expenses) */
export const POLICIES = {
  pj: { name: 'Protection juridique', price: 120, where: 'assurances', sub: 'assur', tag: 'Prend en charge tes frais d’avocat', why: 'Prime d’assurance liée à ton activité : déductible.' },
  prev: { name: 'Prévoyance Madelin (indemnités journalières)', price: 540, where: 'assurances', sub: 'madelin', tag: 'Un revenu si tu es en arrêt', why: 'Cotisation Madelin : déductible dans certaines limites (complémentaire et prévoyance : 7 % du PASS + 3,75 % du bénéfice).' },
  retraite: { name: 'Retraite Madelin', price: 1200, where: 'carpimko', sub: 'madelin', tag: 'Épargne retraite par capitalisation', why: 'Cotisation Madelin retraite : déductible dans la limite de 10 % du bénéfice imposable (plafonné).' }
};
