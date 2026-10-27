/* ---------- Quests, one list per stage of the career ---------- */
export const QUESTS = {
  rempl: [
    { id: 'menton', title: 'Écouter Mickael Menton parler des syndicats', xp: 15 },
    { id: 'board', title: 'Consulter les offres de remplacement', xp: 10 },
    { id: 'apply', title: 'Postuler à une offre', xp: 10 },
    { id: 'study', title: 'Étudier un contrat avant de signer', xp: 15 },
    { id: 'sign', title: 'Signer ton premier remplacement', xp: 20 },
    { id: 'session1', title: 'Faire ta première demi-journée', xp: 15 },
    { id: 'ngap', title: 'Réussir ta première cotation (NGAP 2026)', xp: 15 },
    { id: 'street', title: 'Répondre à un patient dans la rue', xp: 10 },
    { id: 'd2035', title: 'Faire ta première déclaration 2035', xp: 40 },
    { id: 'year', title: 'Boucler 12 mois de remplacement', xp: 60 }
  ],
  rempl_bonus: [
    { id: 'aga', title: 'Adhérer à une AGA', xp: 15 },
    { id: 'two', title: 'Remplacer Thomas et Julien', xp: 20 },
    { id: 'ordreAsk', title: "Demander l'avis de l'Ordre", xp: 15 }
  ],
  assist: [
    { id: 'asign', title: "Signer ton contrat d'assistant avec Mathieu", xp: 25 },
    { id: 'reunion', title: 'Partir travailler à La Réunion', xp: 20 },
    { id: 'urssaf', title: 'Passer le contrôle URSSAF de Marvin', xp: 25 },
    { id: 'six', title: "Faire 6 mois d'assistanat", xp: 30 },
    { id: 'apport', title: 'Réunir 20 000 € d’apport personnel', xp: 30 }
  ],
  titulaire: [
    { id: 'loan', title: 'Obtenir ton prêt bancaire', xp: 20 },
    { id: 'build', title: 'Construire ton cabinet', xp: 40 },
    { id: 'materiel', title: 'Acheter ton premier matériel', xp: 15 },
    { id: 'lvl2', title: 'Agrandir ton cabinet (niveau 2)', xp: 40 },
    { id: 'hire1', title: 'Recruter ton premier assistant', xp: 30 },
    { id: 'lvl3', title: 'Passer au niveau 3', xp: 60 },
    { id: 'missionM', title: 'Faire une mission chez Chad Cook (Michigan)', xp: 40 },
    { id: 'lvl5', title: 'Passer au niveau 5', xp: 80 },
    { id: 'moon', title: 'Aller sur la Lune en fusée', xp: 60 },
    { id: 'missionL', title: 'Faire la dernière mission, chez Suzie (Lune)', xp: 100 },
    { id: 'lvl9', title: 'Construire un centre de rééducation (niveau 9)', xp: 150 }
  ],
  /* explore the world (any stage of the career) */
  bonus: [
    { id: 'maransin', title: 'Visiter Maransin', xp: 15 },
    { id: 'courses', title: 'Faire des courses au supermarché', xp: 10 },
    { id: 'inst_urssaf', title: 'Réussir toutes les questions de Marvin (URSSAF)', xp: 30 },
    { id: 'inst_carpimko', title: 'Réussir toutes les questions d’Alex Cloppe (CARPIMKO)', xp: 30 },
    { id: 'inst_syndicats', title: 'Réussir toutes les questions de Mickael Menton (syndicats)', xp: 30 },
    { id: 'inst_assurances', title: 'Réussir toutes les questions de Ninassurance (assurances)', xp: 30 },
    { id: 'assure', title: 'Souscrire un contrat d’assurance facultatif', xp: 15 },
    { id: 'cpam', title: 'Passer un contrôle de la CPAM', xp: 25 },
    { id: 'incident', title: 'Bien réagir à un incident avec un patient', xp: 25 },
    { id: 'michigan', title: 'Rencontrer Chad Cook au Michigan', xp: 20 },
    { id: 'rempla', title: 'Te faire remplacer pendant un voyage', xp: 20 }
  ]
};
