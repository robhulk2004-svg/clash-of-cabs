# Clash of Cab's

Jeu pédagogique de gestion de cabinet de kinésithérapie : du diplôme au cabinet à soi, en passant par le remplacement, l'assistanat, les contrats, l'Ordre, la cotation NGAP, la compta et la 2035. Projet K5, UE14 (législation et gestion de cabinet).

**Version 6 (dernière mise à jour) :** les patients exposent leur problème (41 cas cliniques tirés de nos cours : UE16 à UE23) ; on choisit la bonne prise en charge parmi trois, puis la cotation (la bonne est mise en évidence). Le tutoriel des démarches est fait par les personnages : Ninassurance (assurances), Pascale Matué (Ordre), Marvin (URSSAF), Alex Cloppe (CARPIMKO), le gobelin de la CPAM (dans sa cabane) et Mickael Menton (syndicats). Les assistants rapportent des revenus passifs à récolter au-dessus du cabinet, comme une mine d'or. Nouvel assistant : Clément Bingo. Cartes agrandies, bordées de nuages (la caméra ne montre plus les bords), flèches de voyage, nouvelles voitures, cinématiques de voyage plus dynamiques. Missions chez Chad Cook (Michigan) puis Suzie Taillebois sur la Lune, la fin du jeu : la fusée part de la base spatiale de Mériniaque. Cowboys au Michigan, passants créoles à La Réunion, aliens sur la Lune.

**Version 6.1 :** écran « Michigan » au lancement (le logo brille avec son jingle, puis un jingle sur l'écran de chargement), le jeu commence toujours par le choix du personnage (avec « Continuer » pour reprendre sa partie), les passants ne marchent plus que sur les routes et les chemins, on touche son cabinet pour l'améliorer (« Améliorer au niveau X ») ou finir le chantier tout de suite en payant, mini-jeu Fraude mieux calé sur la musique et plus rythmé, nouveau logo en haut à gauche, emblème de l'Ordre (la tour) dans le tutoriel, la pièce des assistants au-dessus de la bulle « Accueillir », nouveaux cabinets intérieurs pour Julien, Mathieu, Chad et Suzie, nouveaux personnages pour Thomas, Julien, Mathieu et Étienne, et quatre nouveaux patients âgés (plus un passant sportif).

**Le parcours :** démarches → remplacements chez Thomas Cassmoildeau (Mériniaque) et Julien Coulommiers (Maransin, à vélo) → assistanat chez Mathieu Mopourmot (La Réunion, en bateau) → ton propre cabinet à Mériniaque → missions chez Chad Cook (Michigan, en jet) et Suzie Taillebois (la Lune, en fusée).

**Jouer :** https://robhulk2004-svg.github.io/clash-of-cabs/

Sur téléphone, ouvrez le lien puis « Ajouter à l'écran d'accueil » (menu Partager sur iPhone, menu ⋮ sur Android). Le jeu s'installe comme une appli, en plein écran, et fonctionne ensuite sans connexion.

---

## Où modifier quoi

Le jeu n'a **aucune étape de compilation** : les fichiers du dépôt sont exactement ceux que le navigateur charge. Une modification enregistrée sur `main` est en ligne une minute plus tard.

| Je veux changer… | Fichier |
|---|---|
| Les astuces de l'écran de chargement | `src/data/tips.js` |
| Les démarches post-diplôme (RCP, Ordre, URSSAF…) | `src/data/demarches.js` |
| Les chiffres de l'économie (honoraires, rétrocession, prêts…) | `src/data/economy.js` |
| Le matériel, les services et les véhicules de la boutique (prix de la fusée…) | `src/data/shop-items.js` |
| Les offres de remplacement et les missions (Chad Cook, Suzie Taillebois) | `src/data/offers.js` |
| Les cas cliniques des patients (prescription, ce qu'ils racontent, les trois prises en charge, la bonne cotation) | `src/data/cases.js` |
| Les lettres-clés NGAP 2026 et leur valeur | `src/data/ngap.js` |
| Les prénoms et visages des patients, la fenêtre de consultation | `src/game/consult.js` |
| Les incidents avec les patients, les questions et les sanctions de la chambre disciplinaire | `src/data/incidents.js` |
| Les supermarchés (fournitures, nourriture) | `src/data/market.js` |
| Les assistants possibles (Ambroise, Gabriel, Mathis, Clément, Paul) | `src/data/staff.js` |
| Les revenus passifs des assistants (vitesse de remplissage) | `src/game/mine.js` |
| Ce que disent Marvin (URSSAF), Alex Cloppe (CARPIMKO), Mickael Menton (syndicats) et Ninassurance (assurances) | `src/story/buildings.js` |
| Les cartes : bâtiments cliquables, chemins des passants, flèches vers les autres destinations, zoom (fichier généré) | `src/data/worlds.js` |
| Les cabinets des confrères (nom, titulaire, matériel) | `src/data/town-map.js` |
| Les clauses des contrats (remplacement, assistanat…) | `src/data/contracts.js` |
| Les quêtes | `src/data/quests.js` |
| Les catégories de la 2035 | `src/data/compta.js` |
| Les questions des passants dans la rue | `src/data/street-questions.js` |
| Les appels de tes assistants (questions cliniques) | `src/data/calls.js` |
| L'intérieur des cabinets (portes, file d'attente, postes de chaque cabinet) | `src/data/room.js` |
| Les dialogues de l'histoire | `src/story/scripts.js`, `src/story/scripts5.js` (version 5 : CPAM, voyages, Chad Cook…) et `src/story/scripts6.js` (version 6 : consultation, cabane de la CPAM, base spatiale, Lune, missions, fin du jeu) ; confrères : `src/story/confreres.js`, Ordre : `src/scenes/castle.js` |
| La cinématique d'intro | `src/scenes/intro.js` |
| Le mini-jeu « Fraude à la Sécu » (montant par séance, amendes, risque, textes) | `src/data/fraude.js` |
| Les paroles synchronisées et les glissières du mini-jeu (fichier généré à partir de l'analyse de la chanson) | `src/data/fraude-song.js` |
| Le cachot de l'Ordre (sermon, quiz, Damien) | `src/scenes/donjon.js` |
| Une image ou un son | `assets/` (garder le même nom de fichier, voir plus bas) |
| L'apparence (couleurs, tailles, positions) | `styles/` |

Les fichiers de `src/data/` ne contiennent que du contenu : on peut corriger un texte ou un chiffre sans rien connaître au code. Il faut juste respecter les guillemets et les virgules autour.

### Organisation du code

```
index.html        la page : structure de tous les écrans et fenêtres
styles/           l'apparence, un fichier par partie du jeu
src/main.js       démarrage, boucle principale, boutons
src/core/         outils communs : sauvegarde, réglages, chargement des images, mise à l'échelle
src/data/         le contenu pédagogique (textes, chiffres, questions)
src/scenes/       les lieux : ville et destinations, cabinet, tour de l'Ordre, bâtiments, tribunal, voyages, intro
src/game/         la mécanique : séances, mois, journée de travail, carrière, contrats, boutique…
src/compta/       livre de recettes/dépenses, immobilisations, impôt, déclaration 2035
src/story/        moteur de dialogue et scénarios
src/ui/           HUD, fenêtres, boutique, guide du tutoriel, icônes
src/fx/, src/render/, src/audio/   effets visuels, dessin des personnages, musique et sons
assets/           images (.webp) et sons (.mp3)
tests/            test automatique qui joue une partie tout seul
```

---

## Travailler à plusieurs

**Petite correction de texte :** directement sur github.com. Ouvrez le fichier, cliquez sur le crayon ✏️, modifiez, puis « Commit changes ». C'est en ligne une minute après.

**Modification plus importante :** chacun travaille sur sa propre **branche**, pour ne pas casser le jeu des autres :
1. Créez une branche (par exemple `quetes-titulaire`).
2. Faites vos changements dessus.
3. Ouvrez une **Pull Request** vers `main`. Un autre membre du groupe y jette un œil, puis « Merge ».

Si deux personnes ont modifié la même ligne, GitHub le signale au moment du merge au lieu d'écraser le travail de l'autre.

**Avec Claude :** demandez-lui de travailler sur le dépôt `robhulk2004-svg/clash-of-cabs`. Il lit le fichier `CLAUDE.md`, qui lui explique comment le projet est construit.

**Pour tester sur votre ordinateur avant d'envoyer :** il faut [Node.js](https://nodejs.org). Dans le dossier du projet, lancez `npm start`, puis ouvrez http://localhost:8000. Un double-clic sur `index.html` ne suffit pas : le navigateur bloque les modules JavaScript ouverts en `file://`.

### Remplacer une image ou un son

Gardez le même nom de fichier dans `assets/`, puis ouvrez `sw.js` et augmentez la version (`'v1'` → `'v2'`). Sans ça, les téléphones qui ont installé le jeu garderaient l'ancienne image en mémoire.

### Mode admin

Pour tester sans tout refaire, menu secret : touchez **5 fois le logo Clash of Cab's** (en haut à gauche), puis **3 fois la roue des réglages**, avec au plus une seconde entre deux touches. Le menu s'ouvre (et un bouton **Mode admin** apparaît ensuite dans les Réglages). Ouvrir le jeu avec `?admin` à la fin du lien fait apparaître ce bouton aussi. On y trouve : argent, niveaux, quêtes, saut direct à une phase (démarches, remplaçant, assistant chez Mathieu, titulaire avec un cabinet du niveau 1 à 9), destinations (fusée comprise), fournitures, recrutement des assistants, remplissage de la mine des assistants, une consultation de test, contrôle de la CPAM, incident, convocation devant la chambre disciplinaire, changement garçon / fille. « Recommencer la partie » remet une vraie partie à zéro.

### Test automatique

`npm install`, puis `npm test` (avec `npm start` lancé dans un autre terminal). Le test joue environ 300 actions tout seul et échoue si une erreur apparaît. Lancez-le avant de fusionner une grosse modification. `GENDER=f npm test` joue la même partie avec une kiné. `npm run test:long` joue une partie entière (3 000 actions, un quart d'heure environ) : démarches, remplacements, assistanat, prêt, chantier, puis des mois de titulaire. Le robot ne touche que ce qu'un joueur toucherait (dialogues, fenêtres, flèche du guide, boutons qui clignotent, bulles) : une nouvelle étape que rien ne signale le bloquerait.

---

## Mise en ligne (à faire une seule fois)

Sur GitHub : **Settings → Pages → Build and deployment → Source : « Deploy from a branch »**, branche `main`, dossier `/ (root)` → Save. Le lien de jeu indiqué en haut fonctionne ensuite automatiquement.

## Plus tard : App Store / Google Play

Le projet peut être emballé tel quel avec [Capacitor](https://capacitorjs.com) (le dossier du site devient le `webDir`). Avant toute publication sur un store, vérifiez les droits sur la musique et les images, et obtenez l'accord des personnes réelles représentées dans le jeu.
