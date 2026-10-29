/* ---------- Kinés who can become your assistants (or replace you during a trip) ---------- */
export const CANDIDATES = {
  ambroise: { name: 'Ambroise', hobby: 'flocons d’avoine, œufs et whey nature', pitch: "« Salut ! Ambroise, kiné. Je cherche une place d'assistant dans un cabinet sympa : tes patients vont adorer mes séances, promis ! Il me faut juste un coin de frigo pour mes œufs. »", trait: 'Ses patients ne ratent jamais une séance (+5 %).', bonus: 0.05 },
  gabriel: { name: 'Gabriel', hobby: 'top 0,000000000000001 % sur Ozu', pitch: "« Salut ! Gabriel, kiné et gamer : top 0,000000000000001 % des joueurs d'Ozu. J'ai inventé des exercices de rééducation en mode jeu vidéo : mes patients ne ratent plus une séance ! »", trait: 'Il gamifie la rééducation : ses patients sont plus assidus (+5 %).', bonus: 0.05 },
  mathis: { name: 'Mathis', hobby: 'recruteur de son club d’athlé', pitch: "« Bonjour ! Mathis, kiné et coureur de 400 m haies. Les sportifs, c'est ma spécialité : réathlétisation, retour au sport… Et toi, tu as un super profil tendineux, tu le sais ? »", trait: 'Il attire les sportifs du club d’athlétisme (+5 %).', bonus: 0.05 },
  clement: { name: 'Clément Bingo', hobby: 'roi de la fête techno', pitch: "« Yo ! Clément Bingo, un sacré kiffeur. Les patients me suivent partout : avec moi, une séance de renforcement devient une fête, comme au 11 Percent. Tu me prends dans ton équipe ? »", trait: 'Il met l’ambiance : ses patients reviennent (+5 %).', bonus: 0.05 },
  paul: { name: 'Paul', hobby: 'PlayStation et bonne bouffe', pitch: "« Hello ! Paul, kiné, gourmand et joueur de FIFA (9 876 heures de jeu, mais ne me demande pas mon classement). Je bosse encore mieux le ventre plein, je te préviens ! »", trait: 'Au top quand il y a de quoi grignoter : +10 % si tu as acheté de la nourriture.', food: 0.10 }
};
export const HIRE_ORDER = ['ambroise', 'clement', 'gabriel', 'mathis', 'paul'];
/* how many assistants your cabinet can welcome */
export const staffSlots = (lvl) => (lvl >= 8 ? 3 : lvl >= 5 ? 2 : lvl >= 2 ? 1 : 0);
