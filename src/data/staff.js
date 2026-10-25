/* ---------- Kinés who can become your assistants (or replace you during a trip) ---------- */
export const CANDIDATES = {
  gabriel: { name: 'Gabriel', hobby: 'fan de jeux vidéo', pitch: "« Salut ! Gabriel, kiné et gamer. J'ai inventé des exercices de rééducation en mode jeu vidéo : mes patients ne ratent plus une séance ! »", trait: 'Il gamifie la rééducation : ses patients sont plus assidus (+5 %).', bonus: 0.05 },
  mathis: { name: 'Mathis', hobby: 'passionné d’athlétisme', pitch: "« Bonjour ! Mathis, kiné et coureur de 400 m haies. Les sportifs, c'est ma spécialité : réathlétisation, retour au sport… »", trait: 'Il attire les sportifs du club d’athlétisme (+5 %).', bonus: 0.05 },
  paul: { name: 'Paul', hobby: 'gros gourmand', pitch: "« Hello ! Paul, kiné… et grand amateur de bonne cuisine. Je bosse encore mieux le ventre plein, je te préviens ! »", trait: 'Au top quand il y a de quoi grignoter : +10 % si tu as acheté de la nourriture.', food: 0.10 },
  mathieu: { name: 'Mathieu', hobby: 'fidèle au poste', pitch: "« Bonjour ! Votre cabinet s'agrandit : je cherche une place d'assistant. Voici mon projet de contrat. »", trait: 'Fidèle au poste.' }
};
export const HIRE_ORDER = ['gabriel', 'mathis', 'paul'];
/* how many assistants your cabinet can welcome */
export const staffSlots = (lvl) => (lvl >= 8 ? 3 : lvl >= 5 ? 2 : lvl >= 2 ? 1 : 0);
