# Pack de prompts — DA « Cosy village »

Branche : `da-alternative`. Moodboard : village isométrique cosy, chaumières en pierre, toits en tuile, potagers clôturés, chemins pavés, lanternes, eau turquoise, heure dorée.

## Comment s'en servir

1. Colle le **bloc de style commun** au début de chaque prompt, puis le prompt de l'image.
2. Génère au **format indiqué** (paysage 16:9, portrait 3:4 ou carré). Pour les images marquées **fond transparent**, demande un PNG transparent ; sinon un fond uni très clair (blanc ou vert vif) que je détourerai.
3. Garde le **nom du fichier** du jeu (colonne « Fichier ») quand tu me l'envoies, par exemple `town3.png`.
4. Envoie-moi les images : je les recadre aux dimensions exactes, je les convertis en `.webp`, je fabrique automatiquement les petites versions (`ic_…` depuis `eq_…`, avatars `av_…` depuis les portraits) et je les intègre sur la branche.

Les positions des éléments cliquables (terrains, château, entrepôt…) sont calées sur les images actuelles. Pour la carte du village et l'intérieur du cabinet, **garde la même composition** (mêmes emplacements) : c'est précisé dans les prompts.

## Bloc de style commun (à coller en premier)

```
Cozy isometric village game art, soft hand-painted 3D look, rounded friendly shapes, warm golden-hour sunlight, gentle soft shadows. Palette: meadow green #809C56, sage #A8BA7D, fir green #4C5A33, pond turquoise #7CC4C6, cream stone #E6D9B9, terracotta roof tiles #BB7653, oak wood #6E5236, lantern amber #F2B35E. Materials: cream stone walls, terracotta tiles, warm oak wood, wooden picket fences, cobblestone paths, flower beds, small vegetable gardens, glowing lanterns. Calm, wholesome, storybook village mood. No text unless specified, no logos, no watermark.
```

Pour les personnages, ajoute aussi :

```
Same character design as the reference (same face, hair, outfit colors), redrawn in the cozy village style: soft painted shading, warm light, slightly rounder friendly proportions. Full body, neutral 3/4 front view, transparent background.
```

Astuce : pour les personnages, donne au générateur l'image actuelle du personnage en référence (dossier `assets/`), pour qu'il reste reconnaissable.

---

## Priorité 1 — Décors principaux (ce qu'on voit le plus)

| Fichier | Format | Fond | Prompt |
|---|---|---|---|
| `town3` | 16:9 (1672×941) | plein | Isometric top-down view of a cozy village by the sea. Upper-left: a small stone castle with terracotta and slate turrets, blue banners, wooden gate and a hanging wooden sign (blank), the regional council of physiotherapists. Cobblestone road winding from the castle to the right. Four empty fenced grass plots with a light dashed outline, ready to build on: upper-right, far right, lower-middle-right and lower-middle. Small wooden shed with crates on the left near the road. Rocky cliffs and turquoise sea along the lower-left edge, a sandy cove bottom-right. Fir trees, flower bushes, little vegetable gardens and lanterns along the paths. Keep the same layout as the reference image. |
| `cab_in` | 16:9 (1672×941) | plein | Isometric cutaway of an empty cozy physiotherapy room inside a stone cottage, walls cut at the front. Warm oak plank floor, cream plaster walls, wooden window frames with green garden views, wall lanterns, a framed running-figure poster and a framed spine poster. Wooden reception desk with a plant at the back-left, a padded treatment table with turquoise cushion on a rug at the right. Wooden front door bottom-left opening onto a cobblestone path, flower boxes and fir trees around the building. Keep the same layout as the reference image. |
| `title2` | 16:9 (1672×941) | plein | Title screen illustration: three friendly physiotherapists standing in front of a cozy village physio practice made of cream stone and terracotta roofs, golden-hour light, lanterns, flowers and rehab equipment (dumbbells, exercise balls, mats) around. Left: young man with curly hair and mustache in a white-and-turquoise physio tunic holding a dumbbell and a resistance band. Middle: smiling woman with dark curly hair in a dark blazer. Right: grey-bearded man in a polo shirt, arms crossed. Leave empty space at the top center for the game logo and at the bottom center for a big play button. |
| `ordre_in` | 16:9 (1672×941) | plein | Isometric interior of the castle's council hall: stone walls, oak beams, long wooden council table, banners, warm candle and lantern light, a central carpet runner, stone floor. Cozy and slightly solemn. |
| `donjon` | 16:9 (1672×941) | plein | Isometric castle dungeon in cozy storybook style: stone vaults, straw on the floor, a wooden bench, iron bars, warm torch light, a few barrels. Gloomy but cute, not scary. |
| `qte_night` | 16:9 (1920×1080) | plein | Night festival stage in the village square: string lights, lanterns, colorful spotlights, wooden stage, festive crowd silhouettes. Music game background. |

## Priorité 2 — Bâtiments de la ville (fond transparent)

Tous en isométrique, même angle que la carte, posés sur un petit socle d'herbe avec buissons et fleurs, **fond transparent**. Un panneau en bois accroché à la façade avec la silhouette d'un coureur (pictogramme kiné) et le mot écrit indiqué.

| Fichier | Format | Prompt |
|---|---|---|
| `bld_l1` | ≈ 5:4 (494×398) | Small one-storey stone cottage physiotherapy practice, terracotta tile roof, big wooden-framed windows, flower boxes, wooden sign reading "SOINS". |
| `bld_l2` | ≈ 1:1 (494×486) | Two-storey version of the same practice, a small balcony with plants, lanterns by the door, sign "SOINS". |
| `bld_l3` | ≈ 6:7 (494×574) | Three-storey version, little turret or dormer windows, climbing ivy, lanterns, sign "SOINS". |
| `bld_amb` | ≈ 1:1 (494×486) | Two-storey stone practice with an amber/orange accent (shutters, awning), sign "SOINS". |
| `bld_pins` | ≈ 5:4 (494×398) | One-storey timber-and-stone practice with green shutters and a vegetable garden at the side, sign "SOINS". |
| `bld_port` | ≈ 5:4 (494×398) | One-storey practice near the harbor: whitewashed stone, terracotta roof, red-brown shutters, a small boat rope detail, sign "SOINS". |
| `card_ordre` | ≈ 5:4 (480×386) | Small square illustration of the same council castle, cozy style, plain background. |

## Priorité 3 — Personnages (fond transparent)

Portrait en pied, format 3:4 (815×1086), **fond transparent**. Trois expressions par personnage : `_happy` (sourire), `_think` (pensif, main au menton), `_scared` (inquiet, surpris). Donne l'image actuelle en référence.

| Fichiers | Personnage (d'après l'image actuelle) |
|---|---|
| `player_*` | Jeune kiné, cheveux bruns bouclés, moustache, tunique blanche à liserés (passer les liserés en turquoise étang). |
| `mentor_*` | Femme aux cheveux bruns bouclés, blazer sombre et chemise blanche, badge. |
| `ambroise_*` | Jeune homme aux cheveux blonds mi-longs, style surfeur, tunique de kiné. |
| `damien_*` | Jeune homme aux cheveux bouclés foncés et petite moustache. |
| `etienne_*` | Jeune homme brun aux cheveux courts, visage rond et souriant. |
| `julien_*` | Homme aux cheveux longs attachés, grande barbe, lunettes. |
| `marvin_*` | Jeune homme aux cheveux bouclés, lunettes, cordon de badge. |
| `mathieu_*` | Jeune homme blond aux cheveux courts. |
| `menton_*` | Homme aux cheveux gris et barbe grise, costume. |
| `thomas_*` | Jeune homme brun aux cheveux courts, sourire franc. |
| `goblin` | Gobelin vert malicieux avec casquette bleue, sacoche et porte-documents (agent de l'Assurance Maladie, version cosy). |
| `card_cpam` | Buste du même gobelin, carré (430×400), fond transparent. |
| `char_l`, `char_r`, `char_w` | Les trois personnages de l'écran titre, chacun seul, fond transparent (gauche : kiné aux haltères ; droite : homme barbu bras croisés ; centre : femme en blazer). |

Les avatars ronds `av_…` (180×180) : je les découpe automatiquement dans les nouveaux portraits.

## Priorité 4 — Matériel du cabinet (fond transparent)

Objets isolés, isométriques, **fond transparent**, bois de chêne clair et tissus turquoise / vert sauge. Les icônes `ic_…` seront fabriquées automatiquement à partir de ces images.

| Fichier | Prompt |
|---|---|
| `eq_chairs` | Two cozy waiting-room chairs side by side, oak frame, sage green cushions. |
| `eq_computer` | Simple desktop computer monitor and keyboard on nothing, warm wood stand. |
| `eq_electro` | Electrotherapy device on a small rolling stand, cream and oak details, cables. |
| `eq_espalier` | Wooden wall bars (stall bars), light oak. |
| `eq_freeman` | Round wooden balance board (Freeman board). |
| `eq_gun` | Percussion massage gun, oak and cream colors. |
| `eq_mat_blue` | Rolled-out exercise mat, pond turquoise, isometric. |
| `eq_mat_teal` | Rolled-out exercise mat, sage green, isometric. |
| `eq_sculpture` | Decorative abstract bronze sculpture on a cream stone pedestal. |
| `eq_step` | Aerobic step platform, oak top and turquoise risers. |
| `table_premium` | Premium padded treatment table, oak legs, turquoise cushion, small stool. |

## Priorité 5 — Interface et logos

| Fichier | Format | Fond | Prompt |
|---|---|---|---|
| `logo_clean` | ≈ 2:1 (1100×577) | transparent | Game logo reading "CLASH of CAB'S" in chunky carved stone letters with oak wood and ivy, warm golden light, cozy village style. |
| `logo` | ≈ 2:1 (606×312) | transparent | Same logo, smaller. |
| `btnquests` | ≈ 1:1 (121×124) | transparent | Square wooden button with a parchment checklist icon and a small red badge, label "Quêtes". |
| `btnshop` | ≈ 6:5 (175×146) | transparent | Wooden button with a little market stall with a striped awning, label "Boutique". |
| `pill` | ≈ 4:1 (471×123) | transparent | Big rounded play button, meadow green with a white play triangle and the word "PLAY". |
| `qte_logo` | ≈ 3:1 (720×231) | transparent | Festive title "FRAUDE À LA SÉCU" in bold rounded golden letters. |
| `hud` | 1332×112 | transparent | ⚠ Barre du haut avec emplacements fixes : je préfère la refaire en code plutôt qu'en image. Ne pas générer. |

## À garder pour l'instant (étalonnées automatiquement)

Ces fichiers sont des **planches d'animation** (grilles d'images d'un même personnage dans plusieurs poses, alignées au pixel près). Un générateur d'images ne sait pas les refaire de façon fiable. Elles restent en version étalonnée ; on pourra les traiter plus tard, une par une.

- Patients qui marchent ou font des exercices : `p_walk_front`, `p_walk_back`, `p_walk_side`, `p_march`, `p_squat`, `p_squat_march`, `p_plank`, `p_pushup`
- Personnages animés en ville et au cabinet : `c12` à `c31`, `c24s`
- Mini-jeu Fraude : `qd_kine`, `qd_marvin`, `qd_menton`, `qd_goblin`, `qte_bills`, `qte_cards`, `qte_btns`, `qte_lanes`, `qte_gauge`
- Voitures : `cars` ; bouton animé : `play_anim`
- Images de l'intro : `intro1` à `intro6` (scènes de vie étudiante, peu liées au village : à régénérer seulement si tu veux)
