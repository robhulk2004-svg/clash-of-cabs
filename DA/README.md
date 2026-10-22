# DA « Cosy village » (branche `da-alternative`)

Test d'une nouvelle direction artistique, d'après le moodboard « Clash of Cabs Moodboard ». La branche `main` n'est pas touchée.

## Ce qui change

- **Images** : toutes les images de `assets/` et les icônes de l'appli sont étalonnées aux couleurs du moodboard (verts prairie et sauge, eau turquoise, lumière chaude). Script : `tools/etalonnage.py`.
- **Interface** : `styles/da-cosy.css`, chargé en dernier dans `index.html`. Palette du moodboard, polices Fredoka (titres) et Nunito (textes), panneaux pierre et chêne, boutons prairie, lanterne, tuile et étang.
- **Icônes dessinées en code** (`src/ui/icons.js`, dégradés dans `index.html`) : contours chêne et couleurs de la palette.
- **Jour → crépuscule** : `src/fx/ambiance.js`. La lumière se réchauffe à partir de la moitié de la journée de travail, puis le soir tombe jusqu'à l'encaissement. Réglages visuels en bas de `styles/da-cosy.css`.
- **Étiquettes des cabinets** : couleurs alignées sur la palette (`src/data/town-map.js`).

## Étape suivante

Régénérer les illustrations dans le nouveau style : voir `DA/prompts-illustrations.md`.

## Revenir à l'ancienne interface

Retirer la ligne `<link rel="stylesheet" href="styles/da-cosy.css">` dans `index.html` (les images resteront étalonnées). Pour tout annuler, il suffit de rester sur `main`.
