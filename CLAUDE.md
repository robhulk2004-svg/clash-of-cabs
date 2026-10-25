# Clash of Cab's: guide for Claude

Educational mobile game (French UI) about running a physiotherapy (kiné) practice. The users are physiotherapy students, not developers: explain changes in plain French and keep the project simple.

## Architecture
- **No build step, no dependencies at runtime.** Native ES modules (`<script type="module" src="src/main.js">`), served as static files (GitHub Pages from `main`, root). Do not introduce a bundler or framework unless the team asks.
- `index.html` holds all the DOM of every screen and modal. `styles/*.css` are linked **in order**: later files override earlier ones (`tweaks.css`, `features.css`, `castle-day.css` contain overrides). Keep that order.
- Fixed 1920×1080 stage scaled to the screen (`src/core/layout.js`). The art layer uses 1672×941 coordinates (`AW/AH`, convert with `KX/KY`). All positions in CSS/JS are in these coordinates. The four maps (`main`, `maransin`, `reunion`, `michigan`, see `src/data/worlds.js`) are 1672×1115 (`MAP_W/MAP_H`) and scroll/zoom with `Cam` (`src/scenes/camera.js`); `G.map` is the map on screen.
- `src/data/` = pure content (texts, numbers). Game logic is split into namespace objects (`Town`, `Room`, `Session`, `Month`, `Day`, `Career`, `Shop`, `Decl`, `Talk`, …), one per module.
- Save state: `G` in `src/core/save.js` (localStorage `coc-save-v4`). Imported bindings are read-only in ES modules, so **reassigning shared `let` state goes through a setter** (`replaceSave`, `setFreezeLayout`, `resetQuestTab`, `takeMusicData`/`markDecoded`). Mutate `G.x` freely, but never write `G = …` outside save.js.
- Module cycles exist (e.g. town ↔ room ↔ session). That's fine because modules only use each other inside functions. **Top-level code may only touch other modules' `const`/`let` if those are leaf modules** (`core/utils`, `core/save`, `data/*`). Anything else eager belongs in `main.js` (e.g. `Object.assign(SCRIPTS, CONFRERE_SCRIPTS, CASTLE_SCRIPTS)`).
- Dialogue scripts: `SCRIPTS` (story/scripts.js) is extended in main.js with `CONFRERE_SCRIPTS`, `CASTLE_SCRIPTS`, `DONJON_SCRIPTS` and `V5_SCRIPTS` (story/scripts5.js).
- Assets are referenced by relative paths `assets/…`. `ASSETS` (src/core/assets.js) are fetched before the title screen; `LATER` assets load in the background after the start, and a scene that needs one waits with `await need([...keys])` (e.g. `Room.sheetsFor(cab)`, `charSheets(who)`, `Travel.sheetsFor(map)`). Images drawn on a canvas must be in `IMG` (`need` does it for keys matching `isCanvasImg`). Keep paths relative: the site is served under `/clash-of-cabs/`.
- The player can be a boy or a girl (`G.gender`, chosen before the intro): texts addressed to the player use `gx('masculin', 'féminin')` from core/save.js, and `drawChar('player', …)`/portraits switch to the `playerf` sprites automatically.
- Version 5 mechanics: NGAP cotation of each séance and CPAM controls (`game/cotation.js`, data in `data/ngap.js`), incidents and the chambre disciplinaire (`scenes/tribunal.js`, `data/incidents.js`), institutions (`scenes/interior.js`, `story/buildings.js`), supermarkets (`game/market.js`), trips between maps (`scenes/travel.js`), assistants (`game/staff.js`, `data/staff.js`). A working « day » of the remplaçant/assistant is a half-day: one of the 40 half-days of the month (`ECO.halfDays`).
- `sw.js`: offline cache (network-first for code, cache-first for assets). Bump `VERSION` when replacing an asset in place. The service worker is disabled on localhost.

## Admin mode
- `src/ui/admin.js`: testing shortcuts (money, levels, phase jumps that reload straight into the town, destinations, assistants, CPAM control, incident, tribunal, gender). Secret sequence: 5 taps on the HUD logo (top left), then 3 taps on the settings gear, at most 1 s apart. `?admin` in the URL also shows the « Mode admin » button in the settings (stored in `prefs.admin`).

## Testing
- Serve: `python3 -m http.server 8000` (or `npm start`).
- `node tests/autoplay.mjs 300`: seeded, deterministic headless playthrough using the in-game test mode (`window.__COC_TEST`, which exposes `window.__coc`). It must end with "OK". Run it after any logic change (`GENDER=f` plays a girl). Check visual changes with screenshots.
- Test-mode knobs: `fastWait`, `session`, `build`, `ordre`, `formation`, `day` (see `core/prefs.js`, `core/utils.js`).

## Conventions
- In-game text is French, with typographic apostrophes/spaces handled by `frSpace()`. Money is formatted with `fmt`/`eur`.
- Pedagogical content must stay accurate to French physiotherapy regulations (Ordre des MK, URSSAF, CARPIMKO, CPAM, NGAP, 2035, micro-BNC). The NGAP values in `data/ngap.js` are those of 2026 (lettre-clé 2,21 € in metropolitan France, 2,43 € in the DOM). When unsure, flag it rather than invent.
- Work on a branch and open a PR for anything beyond a typo fix.
