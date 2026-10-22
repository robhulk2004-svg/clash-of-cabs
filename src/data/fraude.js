/* Mini-jeu « Fraude à la sécu » : textes, réglages et chiffres.
   Thèmes : responsabilité « sécurité sociale », sanctions, dépenses somptuaires, repas d'affaires, pénalités. */
export const FRAUDE = {
  acte: 35,             // ce que rapporte une séance fictive (une note réussie)
  missRisk: 0.004,      // chaque note ratée fait monter la jauge de risque
  ghostRisk: 0.001,     // chaque appui dans le vide aussi (un peu)
  riskCap: 0.97,        // la jauge ne se remplit à 100 % qu'à la fin de la chanson : la Sécu arrive au dernier accord
  jailFine: 5000,       // amende pour sortir du cachot (augmente à chaque récidive)
  jailFineStep: 2500,
  controlFine: 3000,    // pénalité si un contrôle te rattrape le mois suivant
  rules: "Facture des séances… <b>qui n'ont jamais eu lieu</b> ! Appuie sur les flèches <b>← ↓ ↑ →</b> (ou touche les boutons) quand la lumière arrive dessus. Chaque note réussie = une séance fictive à <b>{acte} €</b>. Mais la <b>jauge de risque</b> monte avec la musique et chaque raté la fait grimper : à la fin de la chanson, la Sécu débarque… Arrête-toi à temps !",
  freeNote: "<b>Mode libre</b> : rien ne compte pour ta partie (ni gains, ni amende).",
  freeEnd: "Mode libre : rien n'est ajouté à ta partie. En vrai, l'Assurance maladie pourrait te contrôler et te demander de tout rembourser.",
  course: "Rappel : ajouter des séances à des patients qui ne les ont pas faites, c'est une fraude. Ta responsabilité « sécurité sociale » est engagée : indemnitaire et/ou pénale.",
  honestToast: "Tu restes honnête : bravo ! Facturer des séances qui n'ont pas eu lieu, c'est une fraude (responsabilité indemnitaire et/ou pénale).",
  escapeNote: "Personne ne t'a vu… pour l'instant. L'Assurance maladie peut te contrôler et te demander de tout rembourser.",
  luckyToast: "Personne n'a remarqué tes séances fictives… cette fois. La fraude engage pourtant ta responsabilité indemnitaire et/ou pénale !",
  combos: ['Facturation express !', 'Fraude en série !', 'Le fisc ne voit rien !', 'Roi de la nomenclature !', 'Carte Vitale en feu !', 'Le comptable démissionne !', 'Légende de la fraude !'],
  atlas: {"qd_kine":{"cw":467,"ch":464,"ax":225,"ay":461,"n":6,"cols":6},"qd_menton":{"cw":411,"ch":445,"ax":205,"ay":442,"n":10,"cols":6},"qd_goblin":{"cw":424,"ch":357,"ax":211,"ay":354,"n":6,"cols":6},"qd_marvin":{"cw":418,"ch":413,"ax":200,"ay":410,"n":6,"cols":6},"qte_bills":{"cw":152,"ch":152,"ax":76,"ay":76,"n":12,"cols":6},"qte_cards":{"cw":152,"ch":152,"ax":76,"ay":76,"n":12,"cols":6},"qte_lanes":{"cw":265,"ch":511,"ax":133,"ay":510,"n":4,"cols":4},"qte_btns":{"cw":266,"ch":242,"ax":133,"ay":121,"n":4,"cols":4}},
  gauge: {"w":156,"h":620,"inner":[46,168,109,494]},
  play: {"cw":986,"ch":628,"ax":461,"ay":597,"bw":784.0,"bh":336.0}
};
