/* ================= Lore (v6.2): little stories the characters slip into their chats =================
   Each line is [expression, text]. They come in turn (see story/lore.js), one per chat,
   on top of the usual advice: nothing here changes the game.
   Expressions: Thomas, Julien, Damien, Pascale (mentor) have happy/think/scared; the others happy/joy/think. */
export const LORE = {
  /* Thomas Cassmoildeau: back from Sonora, very evasive. He loved the music. */
  thomas: [
    ['happy', "Sonora… Ah, Sonora. Je ne peux rien te raconter. Vraiment rien. Mais la musique… la musique !"],
    ['think', "Ce qui se passe à Sonora reste à Sonora. Par contre, je peux te fredonner le son de la troisième nuit… Non, laisse tomber, ça ne se fredonne pas."],
    ['happy', "Pourquoi j'ai eu besoin d'un remplaçant ? Sonora. Pourquoi j'ai mis trois jours à m'en remettre ? Sonora aussi. Le reste est classé secret défense."],
    ['think', "Des photos de Sonora ? Non. Il n'y a pas de photos. Il ne doit pas y avoir de photos."],
    ['happy', "À Sonora, les basses étaient si fortes que mes cervicales se sont remises en place toutes seules. Je n'en dirai pas plus."],
    ['scared', "Si quelqu'un te parle d'un kiné qui dansait sur une enceinte à Sonora, ce n'était pas moi. Mais quelle musique, franchement."]
  ],
  /* Étienne Poulet: chicken is his reason to live */
  etienne: [
    ['joy', "Tu connais mon poulet basquaise ? Poivrons, tomates, oignons, piment d'Espelette, et on laisse mijoter une heure. Le cabinet porte son nom : ce n'est pas un hasard !"],
    ['happy', "Ce soir, poulet rôti : du beurre sous la peau, un citron et du thym dedans, 1 h 30 au four à 180 °C. On l'arrose toutes les 20 minutes, comme on relance un patient !"],
    ['think', "Mon secret pour un poulet tendre : une saumure la veille. De l'eau, du sel, un peu de sucre. Le poulet, c'est comme un tendon : ça se prépare en douceur."],
    ['joy', "Poulet yassa : beaucoup d'oignons, du citron, de la moutarde, et du riz. J'en rêve la nuit. Littéralement."],
    ['happy', "Le poulet, c'est des protéines : parfait pour la reconstruction musculaire de mes patients. Et pour la mienne. Et pour mon bonheur."],
    ['think', "Ailes de poulet caramélisées au miel et à la sauce soja… Pardon, de quoi on parlait ? La kiné ? Ah oui. Bof. Le poulet, c'est plus important."],
    ['joy', "Le dimanche, suprême de volaille, sauce aux morilles. Je ne soigne personne le dimanche : je cuisine. Le poulet, c'est ma raison de vivre."],
    ['happy', "Poulet au curry : lait de coco, oignons, curry doux, et une poignée de coriandre. Si tu passes un soir, je t'en garde une part !"]
  ],
  /* Julien Coulommiers: muscles (and a secret line, see JULIEN_SECRET) */
  julien: [
    ['happy', "Tu as vu mes bras ? 45 cm de tour. Et encore, je suis en sèche."],
    ['think', "Un désert médical, c'est aussi un désert de salles de sport. Alors j'ai monté la mienne dans le garage de la maison de santé."],
    ['happy', "Le jour des jambes, je ne prends aucun rendez-vous à l'étage. Les escaliers, très peu pour moi ce jour-là."],
    ['think', "Mes patients font 30 km pour venir ? Moi, j'en fais 30 en courant pour aller m'entraîner. Avec un sac de 20 kg sur le dos."]
  ],
  /* Mathieu Motpourmot: the cabinet of Éric Samoussa, and Damien, now a knight of the Ordre */
  mathieu: [
    ['think', "Avant moi, ce cabinet, c'était celui d'Éric Samoussa. Il est rentré en métropole : d'après lui, les samoussas de l'île avaient baissé en qualité. Un homme de principes."],
    ['happy', "Tu connais Damien ? On était confrères, ici, à Saint-Gilles. Inséparables ! Et puis il est devenu chevalier de l'Ordre… Depuis, il garde le cachot de la tour et il ne répond plus à mes messages."],
    ['joy', "Éric Samoussa m'a laissé le cabinet, la patientèle… et la liste des 47 snacks où les samoussas « n'étaient plus ce qu'ils étaient ». Je les ai tous testés : ils sont très bons."],
    ['think', "Damien et moi, on faisait tout ensemble : les visites dans les cirques, le surf, le rougail du vendredi. Maintenant, il porte une armure. Ça ne doit pas être pratique pour masser."],
    ['happy', "Éric Samoussa m'envoie des cartes postales de métropole : « Ici, les samoussas sont surgelés, mais au moins ils sont réguliers. » Il n'a jamais été très logique."],
    ['think', "Si tu croises Damien dans la tour de l'Ordre, dis-lui que Mathieu pense à lui. Et que je lui garde une part de rougail."]
  ],
  /* Chad Cook: Marvin de l'Ouest, the most dangerous outlaw of Michigan */
  chad: [
    ['think', "Fais gaffe dans le désert : Marvin de l'Ouest rôde. Un des brigands les plus dangereux de tout le Michigan."],
    ['happy', "Marvin de l'Ouest volait aux riches… pour donner à son livret A. Un vrai Robin des bois, version épargne réglementée."],
    ['think', "Le shérif a mis la tête de Marvin de l'Ouest à prix. Marvin a proposé de payer la prime lui-même… avec son livret A."],
    ['joy', "Marvin de l'Ouest ? Aucun lien avec le Marvin de l'URSSAF. Enfin… je crois. Les deux s'intéressent beaucoup à ton argent, quand même."],
    ['think', "Le seul truc qui arrête Marvin de l'Ouest, c'est le plafond de son livret A. Quand il est plein, il fait une pause. Un brigand raisonnable."],
    ['happy', "Marvin de l'Ouest a braqué la diligence de la station-service. Il n'a pris que les pièces : « pour les intérêts », qu'il a dit."]
  ],
  /* Pascale Matué (the mentor): tall tales about her famous friends */
  pascale: [
    ['happy', "Tu savais que j'ai le numéro d'Emmanuel Macron ? On s'appelle souvent. Enfin… je l'appelle souvent."],
    ['think', "Emmanuel me demande conseil pour son dos. Je lui ai dit : « Emmanuel, du gainage tous les matins. » Depuis, il tient des discours de trois heures sans broncher."],
    ['happy', "J'ai été présidente, autrefois. De quoi ? Oh… c'était il y a longtemps. Ne parlons pas de ça, ça me rend nostalgique."],
    ['think', "Un jour, j'ai remis l'épaule d'un ministre en place pendant un dîner officiel, entre la poire et le fromage. Il m'a proposé un ministère. J'ai refusé : trop de paperasse."],
    ['happy', "J'ai appris le gainage à la moitié de l'Assemblée nationale. L'autre moitié refuse de travailler avec moi, pour des raisons politiques."],
    ['think', "On m'a proposé d'être sur un billet de banque. J'ai décliné : je ne voulais pas qu'on me plie en quatre."],
    ['happy', "Il y a une rue Pascale-Matué, tu sais. Enfin, une impasse. Enfin… c'est moi qui ai posé la plaque."],
    ['scared', "Mon téléphone vibre ! C'est sûrement l'Élysée… Ah non. C'est ma pharmacie."],
    ['happy', "Les sénateurs ont un surnom pour moi : « la Grande Pascale ». Ou « la Grande Bavarde ». Je ne sais plus lequel."],
    ['think', "Une fois, à un sommet international, je me suis trompée de salle. J'ai fini par animer un atelier « mal de dos » pour vingt chefs d'État. Ils ont adoré."],
    ['happy', "Emmanuel m'a envoyé un texto hier : « Pascale, la France a besoin de toi. » Bon, c'était peut-être un faux numéro. Mais quand même."],
    /* v6.3: she is afraid of Yan Ducachot, the torturer of the cachot */
    ['scared', "Le cachot ? Je n'y descends plus. Pas depuis que Yan Ducachot s'y est installé avec sa… roulette. Brrr."],
    ['scared', "Yan ? Ne prononce pas ce nom dans la tour. Ici, on dit « le monsieur du sous-sol »."]
  ],
  /* Alexandre Klopp (CARPIMKO): the oldest and fastest man of Gironde */
  alex: [
    ['happy', "Tu sais que je suis l'homme le plus vieux de Gironde ? Et le plus rapide : 100 mètres en 3,4 secondes. Du jamais vu !"],
    ['joy', "Au meeting de Bordeaux, le chronométreur a cru que sa montre était cassée. Elle ne l'était pas. 3,4 secondes, vent de face."],
    ['think', "Mon secret de longévité ? Être à jour de mes cotisations. Et ne jamais laisser la retraite me rattraper : elle court moins vite que moi."],
    ['happy', "Mon âge ? Disons qu'à mes débuts, les points de retraite s'écrivaient à la plume."],
    ['joy', "Les jeunes du club d'athlé m'appellent « papy fusée ». Je les attends à l'arrivée en lisant le journal."],
    ['think', "Un certain Mathis veut absolument que je m'inscrive dans son club. Je lui ai dit que je passerais… avant lui."]
  ],
  /* The assistants, when you talk to them in your cabinet (team panel) */
  mathis: [
    ['joy', "Tu as un super profil tendineux, tu sais ? Franchement, viens au club d'athlé. Juste une séance d'essai !"],
    ['think', "J'ai regardé ta foulée dans le couloir : attaque médio-pied, cheville réactive… Tu as un beau potentiel. C'est du gâchis !"],
    ['happy', "Le club s'entraîne mardi et jeudi à 18 h 30. Je t'ai déjà gardé une place dans le groupe sprint. Et un dossard."],
    ['joy', "Avec tes tendons d'Achille, tu ferais un malheur au 400 m haies. Non, sérieux : c'est un compliment."],
    ['think', "Mon coach veut te rencontrer. Je lui ai parlé de ton profil tendineux : il n'en dort plus."],
    ['happy', "Tu montes les escaliers deux à deux ? Explosivité, réactivité… Le triple saut t'appelle, je le sens."],
    ['think', "J'ai imprimé ta fiche d'inscription au club. Il ne manque que ta signature. Et ton certificat médical. Et ton accord."],
    ['joy', "Pas le temps pour l'athlé ? Pas grave : on peut s'entraîner à 6 h du matin, avant les patients !"],
    ['happy', "Alexandre Klopp, de la CARPIMKO, court le 100 m en 3,4 s. Je l'ai invité au club. Toi aussi, d'ailleurs. Tu as vraiment un super profil tendineux."]
  ],
  ambroise: [
    ['happy', "Mon menu du jour : flocons d'avoine, œufs, whey nature. Hier ? Flocons d'avoine, œufs, whey nature. Demain ? Je te laisse deviner."],
    ['think', "Je suis inscrit à Fitness Prank. Pourquoi pas Basic Frite ? Parce que… Fitness Prank, c'est mieux. Voilà. C'est tout."],
    ['think', "La différence entre Fitness Prank et Basic Frite ? Alors… les machines… non. Les horaires… non plus. Le prix… pas vraiment. C'est une question de feeling."],
    ['joy', "Une douzaine d'œufs par jour, et la whey toujours nature : les arômes, c'est pour les amateurs."],
    ['happy', "Des flocons d'avoine au petit-déj, au déjeuner et au dîner. Un patient m'a demandé si j'étais un cheval. Je l'ai pris comme un compliment."],
    ['joy', "Gabriel veut monter une team e-sport avec Clément et moi. Je suis prêt ! Enfin, après mes œufs."]
  ],
  clement: [
    ['joy', "Ce week-end, encore une nuit au 11 Percent ! Techno jusqu'à 7 h du matin. Je suis un sacré kiffeur, et je l'assume."],
    ['think', "Au 11 Percent, je goûte à tout… si tu vois ce que je veux dire. Mais jamais avant le boulot : pour soigner, il faut avoir les idées claires !"],
    ['happy', "Le DJ du 11 Percent me connaît par mon prénom. Le videur aussi. Ma mère, elle, ne me reconnaît plus le dimanche."],
    ['joy', "Je fais travailler mes patients sur de la techno à 140 BPM. Ils ne comprennent pas tout, mais ils transpirent."],
    ['happy', "Tu viens au 11 Percent samedi ? Promis, je te ramène avant lundi. Lequel, je ne sais pas."],
    ['think', "Notre team e-sport avec Gabriel et Ambroise ? On a raté les cinq derniers entraînements. Moi, j'étais au 11 Percent. Eux, je ne sais pas."]
  ],
  paul: [
    ['think', "9 876 heures de jeu sur FIFA. Et je perds encore contre mon petit cousin de 8 ans. C'est la manette, je te jure."],
    ['happy', "Je ne suis pas nul, c'est le jeu qui est truqué. 9 876 heures, ça ne ment pas !"],
    ['joy', "Ce soir, PlayStation et pizza. Objectif : ma première victoire en ligne de la saison."],
    ['think', "Mon pouce a plus d'heures de vol qu'un pilote de ligne. Bilan : 3 victoires, 2 nuls et 4 112 défaites."],
    ['happy', "Je m'entraîne aux penalties depuis des années. Je les rate toujours, mais avec beaucoup plus de style."],
    ['think', "9 877 heures, maintenant. Toujours pas meilleur. Mais je sens que la 9 878e sera la bonne."]
  ],
  gabriel: [
    ['joy', "Je suis dans le top 0,000000000000001 % des joueurs d'Ozu. Oui, ça fait beaucoup de zéros. Je les ai tous mérités."],
    ['happy', "Je clique tellement vite que je me suis fait une fracture comminutive du pouce. Trois fragments ! Mais ça valait le coup."],
    ['think', "Ce soir, Ligue of Champions avec Clément et Ambroise ! Enfin… si Clément n'est pas au 11 Percent. Et si Ambroise a fini ses œufs."],
    ['happy', "On monte une team e-sport avec Clément et Ambroise. On a le nom, le logo, les maillots… Il ne nous manque qu'une soirée où on est connectés tous les trois en même temps."],
    ['think', "Ma rééducation du pouce, je l'ai faite sur Ozu : 800 clics par minute. Mon chirurgien n'était pas d'accord. Mon classement, si."],
    ['joy', "Ma souris a plus de clics au compteur que le cabinet n'a de patients. Et elle ne se plaint jamais."]
  ],
  /* Damien, chevalier de l'Ordre (the cachot of the tower) */
  damien: [
    ['think', "Mathieu, à La Réunion ? On était inséparables… Mais un chevalier de l'Ordre n'a pas le temps pour le rougail. Enfin… dis-lui bonjour quand même."],
    ['scared', "Yan, au fond du cachot ? Moi, je garde la porte. Lui garde… sa roulette. On ne se parle pas beaucoup."]
  ],
  /* ---------- v6.3: the four new characters ----------
     A line can have a third part: what others answer after it ([who, expression, text]). */
  /* Doc Échografikos: strange and worrying, he never answers a question… but drops facts about his échographe */
  echog: [
    ['think', "Cet échographe m'a coûté 500 000 euros."],
    ['happy', "Je ne peux plus m'en passer. Je l'allume le matin, je l'éteins le soir. Et la nuit… je l'écoute ronronner. Je suis complètement accro."],
    ['think', "Je facture mes séances 1,50 € de plus qu'avant. Donc ça va.", [
      ['player', 'scared', "Euh… Docteur ? Un kiné conventionné applique les tarifs de l'Assurance Maladie pour tous ses actes de rééducation."],
      ['player', 'think', "Le seul dépassement possible, c'est le DE, le dépassement exceptionnel : quand le patient a une exigence particulière, une séance plus longue ou un horaire précis. Pas pour payer un échographe !"],
      ['echog', 'scared', "…"]
    ]],
    ['scared', "500 000 euros… divisés par 1,50 € par séance… Il me reste 333 334 séances à faire. Donc ça va."],
    ['think', "Il s'appelle Gérard. Mon échographe. Il a ses petites habitudes. Moi aussi."],
    ['happy', "Cette nuit, j'ai échographié ma plante verte. Elle va bien. Moi aussi. Donc ça va."],
    ['scared', "…"]
  ],
  /* Sébastien Saccharose: a master of pedagogy (UE20, raisonnement clinique en neurologie)… and of sugar */
  seb: [
    ['happy', "Le secret d'un patient qui progresse ? Il comprend ce qu'il fait. Explique-lui la consigne… et surtout POURQUOI il fait chaque exercice !"],
    ['think', "Ton patient a un trouble de l'attention ? Simplifie la consigne au maximum, et ne la répète que si c'est nécessaire. S'il fait imparfaitement mais en sécurité, laisse-le faire !"],
    ['think', "Un trouble de la compréhension, en revanche ? Là, tu explicites la consigne et tu la répètes. Ce n'est pas du tout la même chose !"],
    ['happy', "Parle à ton patient, pas au jury ni à ton tuteur ! On verbalise pour lui, avec des mots simples."],
    ['joy', "Relie chaque exercice à SON objectif à lui : « Ces escaliers, c'est pour que vous rentriez chez vous en sécurité. » Et là, il ne lâche plus rien !"],
    ['think', "Des objectifs SMART : un pour la séance d'aujourd'hui, un à trois semaines, un à trois mois. Le patient voit le chemin."],
    ['happy', "L'éducation thérapeutique, c'est aussi le domicile : les petits tapis et les chaussons ouverts, ça fait tomber. Un conseil simple, une chute en moins !"]
  ],
  /* Florent Céplula: a kind guy who only ever talks about tennis */
  florent: [
    ['happy', "Tu joues avec quel tamis ? Moi, 100 pouces carrés : le parfait équilibre entre puissance et contrôle."],
    ['joy', "J'ai changé mon cordage : du monofilament polyester, tendu à 23 kilos. Ça accroche la balle comme jamais !"],
    ['think', "Les balles pressurisées perdent leur pression en quelques semaines, une fois le tube ouvert. Les balles sans pression durent bien plus longtemps… mais elles sont plus dures."],
    ['happy', "Ma raquette pèse 300 grammes, cordée. Tu veux la soupeser ? Non ? Tant pis, je te la montre quand même."],
    ['joy', "Hier, j'ai sorti un revers à une main le long de la ligne. Le public… enfin, mon voisin… a applaudi."],
    ['think', "Terre battue, gazon ou dur ? Sur terre battue, la balle ralentit et rebondit plus haut. Moi, j'adore : on a le temps de construire le point."],
    ['happy', "Je t'ai gardé un tube de balles neuves. Ouvre-le et respire : il n'y a pas de meilleure odeur au monde. C'est cadeau !"],
    ['joy', "Un jour, je jouerai sur le Central de Roland-Garros. En attendant, je joue contre le mur de mon garage. Il me renvoie tout, ce mur."]
  ],
  /* Yan Ducachot: the torturer of the cachot of the Ordre, and his « roulette du plaisir » */
  yan: [
    ['joy', "Ma roulette du plaisir… Une roue de Wartenberg, pour être précis : un vrai outil d'examen neurologique, qui teste la sensibilité. Moi, je teste surtout la patience."],
    ['happy', "Le dernier fraudeur facturait des séances fantômes. Ma roulette et lui ont passé une très bonne soirée. Il a ri pendant trois heures."],
    ['think', "Un kiné avait payé pour apparaître en premier sur Google. La publicité, notre code de déontologie l'interdit. Ma roulette, elle, ne l'a pas oublié."],
    ['joy', "Je la passe dermatome par dermatome, du cou jusqu'aux orteils. Tu sens ? Et là ? Et là ?"],
    ['think', "Pascale ne descend jamais quand je suis au cachot. Je me demande bien pourquoi."],
    ['happy', "Chaque prisonnier a sa ligne dans mon registre. Le plus courageux a tenu quatre secondes. Le plus chatouilleux, une demi-seconde."],
    ['think', "Tu factures uniquement les séances que tu fais vraiment ? Alors on ne se reverra pas. C'est presque dommage."]
  ]
};
/* Julien's secret line: it only shows up now and then, after a few chats */
export const JULIEN_SECRET = [
  ['julien', 'think', "Je vais te confier un secret… Je rêve d'être encore plus musclé. Beaucoup plus. Je me demande si je ne vais pas doubler la dose de stéroïdes que je prends déjà."],
  ['player', 'scared', "Euh… Julien, les stéroïdes, c'est dangereux : le cœur, le foie, les tendons… Parles-en à un médecin !"],
  ['julien', 'scared', "Chut ! Personne ne doit savoir. Oublie ce que je viens de dire. Bon, tu as vu mes bras ?"]
];
