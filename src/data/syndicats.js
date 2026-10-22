/* ---------- Les 3 syndicats du jeu (factions FICTIVES) ----------
   Chacun s'inspire d'une sensibilité qui existe dans la profession, sans en reprendre ni le nom ni les textes :
   - le Réseau : le syndicat historique, implanté partout, qui négocie la convention et mise sur la qualité et la formation ;
   - le Bouclier : la défense économique et juridique de ses adhérents (avocats, assurances négociées) ;
   - l'Agora : le plus jeune, participatif, ouvert à tous les statuts et tourné vers les jeunes diplômés et le numérique.
   Les bonus s'appliquent selon le niveau de syndicat (XP gagnée en travaillant, en répondant juste, en vivant les événements). */
export const SYN_LEVELS = [0, 40, 100, 180, 280];          // XP de syndicat pour atteindre les niveaux 1 à 5
export const SYNDICATS = {
  reseau: {
    name: 'Le Réseau des Rééducateurs', short: 'Le Réseau', col: '#2a6fd6', col2: '#ffd43a', emblem: 'tree',
    motto: 'Partout, pour tous, depuis toujours.',
    pitch: 'Le syndicat historique de la profession : des délégués dans chaque département, une présence forte dans les négociations avec l’Assurance maladie, et la qualité des soins comme boussole.',
    values: ['Implantation locale', 'Négociations conventionnelles', 'Qualité et formation continue'],
    perks: [
      { lvl: 1, t: 'Relecture de tes contrats par le délégué départemental' },
      { lvl: 2, t: 'Formations à −25 %', k: 'formDiscount', v: 0.25 },
      { lvl: 3, t: '+3 % de rendement (revalorisations négociées)', k: 'rend', v: 0.03 },
      { lvl: 4, t: 'Ton délégué te souffle une réponse au procès', k: 'trialHint', v: 1 },
      { lvl: 5, t: '+5 % de rendement en tout', k: 'rend', v: 0.05 }
    ]
  },
  bouclier: {
    name: 'Le Bouclier Libéral', short: 'Le Bouclier', col: '#c0291b', col2: '#d9dde6', emblem: 'shield',
    motto: 'Ton cabinet, ton métier, ta défense.',
    pitch: 'Le syndicat de la défense économique et juridique : permanence d’avocats, tarifs négociés sur les assurances, et une vigilance de tous les instants sur les intérêts des libéraux.',
    values: ['Défense juridique', 'Protection économique', 'Avantages pour les adhérents'],
    perks: [
      { lvl: 1, t: 'Relecture de tes contrats par un juriste' },
      { lvl: 2, t: 'Assurance RCP à −30 % (contrat de groupe)', k: 'rcp', v: 0.3 },
      { lvl: 3, t: 'Un avocat t’accompagne au procès', k: 'lawyer', v: 1 },
      { lvl: 4, t: 'Relecture complète : le juriste te montre toutes les clauses piégées', k: 'fullReview', v: 1 },
      { lvl: 5, t: '+3 % de rendement (tarifs défendus)', k: 'rend', v: 0.03 }
    ]
  },
  agora: {
    name: 'L’Agora des Kinés', short: 'L’Agora', col: '#1aa59a', col2: '#ff8a3d', emblem: 'hands',
    motto: 'Chaque voix compte, chaque statut aussi.',
    pitch: 'Le plus jeune des trois : décisions votées par les adhérents, pas de cumul des mandats, et une attention particulière aux étudiants, aux jeunes diplômés et aux salariés.',
    values: ['Démocratie participative', 'Tous les statuts', 'Jeunes diplômés et numérique'],
    perks: [
      { lvl: 1, t: 'Relecture de tes contrats par la communauté' },
      { lvl: 2, t: '+10 % d’XP', k: 'xp', v: 0.1 },
      { lvl: 3, t: '+1 patient à chaque bonne réponse dans la rue', k: 'street', v: 1 },
      { lvl: 4, t: 'Cotisation à moitié prix', k: 'fee', v: 0.5 },
      { lvl: 5, t: '+20 % d’XP en tout', k: 'xp', v: 0.2 }
    ]
  }
};
/* Cosmetic rewards, the same levels for everybody but in the colours of your syndicat. */
export const SYN_COSMETICS = [
  { lvl: 1, t: 'Badge du syndicat à côté de ton nom' },
  { lvl: 2, t: 'Fanion sur le toit de ton cabinet' },
  { lvl: 3, t: 'Affiche du syndicat dans ta salle de soins' },
  { lvl: 4, t: 'Paillasson et bandeau aux couleurs du syndicat' },
  { lvl: 5, t: 'Trophée doré dans ta salle de soins' }
];
