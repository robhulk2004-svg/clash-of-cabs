/* Mini-jeu « Fraude à la sécu » : textes, réglages et chiffres.
   Thèmes : responsabilité « sécurité sociale », sanctions, dépenses somptuaires, repas d'affaires, pénalités. */
export const FRAUDE = {
  acte: 35,             // ce que rapporte une séance fictive (une glissière attrapée)
  tick: 5,              // bonus à chaque croche tenue jusqu'au bout de la glissière
  jailFine: 5000,       // amende pour sortir du cachot (augmente à chaque récidive)
  jailFineStep: 2500,
  controlFine: 3000,    // pénalité si un contrôle te rattrape le mois suivant
  rules: "Facture des séances… <b>qui n'ont jamais eu lieu</b> ! Quand une <b>glissière lumineuse</b> arrive sur sa flèche, appuie (<b>← ↓ ↑ →</b> ou touche le bouton) et <b>maintiens</b> jusqu'au bout. Chaque glissière attrapée = une séance fictive à <b>{acte} €</b>, et plus tu tiens, plus ça rapporte. Mais la <b>jauge de risque</b> se remplit avec la musique : à la dernière note, la Sécu débarque… Arrête-toi à temps !",
  freeNote: "<b>Mode libre</b> : rien ne compte pour ta partie (ni gains, ni amende).",
  freeEnd: "Mode libre : rien n'est ajouté à ta partie. En vrai, l'Assurance maladie pourrait te contrôler et te demander de tout rembourser.",
  course: "Rappel : ajouter des séances à des patients qui ne les ont pas faites, c'est une fraude. Ta responsabilité « sécurité sociale » est engagée : indemnitaire et/ou pénale.",
  honestToast: "Tu restes honnête : bravo ! Facturer des séances qui n'ont pas eu lieu, c'est une fraude (responsabilité indemnitaire et/ou pénale).",
  escapeNote: "Personne ne t'a vu… pour l'instant. L'Assurance maladie peut te contrôler et te demander de tout rembourser.",
  luckyToast: "Personne n'a remarqué tes séances fictives… cette fois. La fraude engage pourtant ta responsabilité indemnitaire et/ou pénale !",
  praise: ['MAGNIFIQUE', 'INCROYABLE', 'INSANE', 'FRAUDEUR'],   // images affichées tous les 10 combos (assets/qte_text.webp)
  atlas: {"qd_kine":{"cw":467,"ch":464,"ax":225,"ay":461,"n":6,"cols":6},"qd_menton":{"cw":411,"ch":445,"ax":205,"ay":442,"n":10,"cols":6},"qd_goblin":{"cw":424,"ch":357,"ax":211,"ay":354,"n":6,"cols":6},"qd_marvin":{"cw":418,"ch":413,"ax":200,"ay":410,"n":6,"cols":6},"qte_bills":{"cw":152,"ch":152,"ax":76,"ay":76,"n":12,"cols":6},"qte_cards":{"cw":152,"ch":152,"ax":76,"ay":76,"n":12,"cols":6},"qte_lanes":{"cw":265,"ch":511,"ax":133,"ay":510,"n":4,"cols":4},"qte_btns":{"cw":266,"ch":242,"ax":133,"ay":121,"n":4,"cols":4}},
  gauge: {"w":156,"h":620,"inner":[46,168,109,494]},
  text: {"w":1500,"h":832,"s":{"COMBO":[0,0,623,209],"TROPTOT":[627,0,554,172],"RATE":[0,213,313,166],"8":[317,213,125,164],"9":[446,213,113,162],"SUPER":[563,213,429,161],"5":[996,213,115,158],"1":[1115,213,83,157],"6":[1202,213,114,156],"X":[1320,213,134,156],"3":[0,383,115,155],"0":[119,383,128,153],"2":[251,383,115,153],"4":[370,383,118,153],"7":[492,383,118,153],"EURO":[614,383,124,151],"PARFAIT":[742,383,452,149],"FRAUDEUR":[0,542,508,144],"FRAUDE":[512,542,362,144],"MAGNIFIQUE":[878,542,481,142],"INSANE":[0,690,466,142],"INCROYABLE":[470,690,487,134],"PLUS":[961,690,91,95]}}
};
