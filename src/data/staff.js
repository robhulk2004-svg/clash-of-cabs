/* ---------- Kinés who can become your assistants (or replace you during a trip) ---------- */
export const CANDIDATES = {
  ambroise: { name: 'Ambroise', hobby: 'toujours de bonne humeur', pitch: "« Salut ! Ambroise, kiné. Je cherche une place d'assistant dans un cabinet sympa : tes patients vont adorer mes séances, promis ! »", trait: 'Ses patients ne ratent jamais une séance (+5 %).', bonus: 0.05 },
  gabriel: { name: 'Gabriel', hobby: 'fan de jeux vidéo', pitch: "« Salut ! Gabriel, kiné et gamer. J'ai inventé des exercices de rééducation en mode jeu vidéo : mes patients ne ratent plus une séance ! »", trait: 'Il gamifie la rééducation : ses patients sont plus assidus (+5 %).', bonus: 0.05 },
  mathis: { name: 'Mathis', hobby: 'passionné d’athlétisme', pitch: "« Bonjour ! Mathis, kiné et coureur de 400 m haies. Les sportifs, c'est ma spécialité : réathlétisation, retour au sport… »", trait: 'Il attire les sportifs du club d’athlétisme (+5 %).', bonus: 0.05 },
  clement: { name: 'Clément Bingo', hobby: 'roi de la bonne ambiance', pitch: "« Yo ! Clément Bingo. Les patients me suivent partout : avec moi, une séance de renforcement devient une fête. Tu me prends dans ton équipe ? »", trait: 'Il met l’ambiance : ses patients reviennent (+5 %).', bonus: 0.05 },
  paul: { name: 'Paul', hobby: 'gros gourmand', pitch: "« Hello ! Paul, kiné… et grand amateur de bonne cuisine. Je bosse encore mieux le ventre plein, je te préviens ! »", trait: 'Au top quand il y a de quoi grignoter : +10 % si tu as acheté de la nourriture.', food: 0.10 }
};
export const HIRE_ORDER = ['ambroise', 'clement', 'gabriel', 'mathis', 'paul'];
/* how many assistants your cabinet can welcome */
export const staffSlots = (lvl) => (lvl >= 8 ? 3 : lvl >= 5 ? 2 : lvl >= 2 ? 1 : 0);
