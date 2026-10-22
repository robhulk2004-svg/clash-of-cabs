/* ---------- Quests, one list per stage of the career ---------- */
export const QUESTS = {
  rempl: [
    { id: 'board', title: 'Consulter les offres de remplacement', xp: 10 },
    { id: 'apply', title: 'Postuler à une offre', xp: 10 },
    { id: 'study', title: 'Étudier un contrat avant de signer', xp: 15 },
    { id: 'sign', title: 'Signer ton premier remplacement', xp: 20 },
    { id: 'session1', title: 'Faire ta première séance', xp: 15 },
    { id: 'street', title: 'Répondre à un patient dans la rue', xp: 10 },
    { id: 'd2035', title: 'Faire ta première déclaration 2035', xp: 40 },
    { id: 'year', title: 'Boucler 12 mois de remplacement', xp: 60 }
  ],
  rempl_bonus: [
    { id: 'aga', title: 'Adhérer à une AGA', xp: 15 },
    { id: 'two', title: 'Remplacer dans deux cabinets différents', xp: 20 },
    { id: 'ordreAsk', title: "Demander l'avis de l'Ordre", xp: 15 }
  ],
  assist: [
    { id: 'asign', title: "Signer ton contrat d'assistant avec Ambroise", xp: 25 },
    { id: 'menton', title: 'Écouter M. Menton parler des syndicats', xp: 15 },
    { id: 'urssaf', title: 'Passer le contrôle URSSAF de Marvin', xp: 25 },
    { id: 'six', title: "Faire 6 mois d'assistanat", xp: 30 },
    { id: 'apport', title: 'Réunir 20 000 € d’apport personnel', xp: 30 }
  ],
  titulaire: [
    { id: 'loan', title: 'Obtenir ton prêt bancaire', xp: 20 },
    { id: 'build', title: 'Construire ton cabinet', xp: 40 },
    { id: 'materiel', title: 'Acheter ton premier matériel', xp: 15 },
    { id: 'lvl2', title: 'Agrandir ton cabinet (niveau 2)', xp: 40 },
    { id: 'mathieu', title: 'Recruter ton assistant', xp: 30 },
    { id: 'lvl3', title: 'Passer au niveau 3', xp: 60 }
  ]
};
