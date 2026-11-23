import { AudioSys } from '../audio/audio.js';
import { need } from '../core/assets.js';
import { prefs } from '../core/prefs.js';
import { G, state, working } from '../core/save.js';
import { TEST, pick, rand } from '../core/utils.js';
import { charSheets } from '../render/sprites.js';
import { Cam } from '../scenes/camera.js';
import { Town } from '../scenes/town.js';
import { loreLine } from '../story/lore.js';
import { SCRIPTS } from '../story/scripts.js';
import { Talk } from '../story/talk.js';
import { refreshGuide } from '../ui/guide.js';
import { addXP } from '../ui/hud.js';
import { blocked } from '../ui/modals.js';

/* ================= Surprise guests (v6.3) =================
   Now and then, one of the new characters walks into town: Doc Échografikos (who never answers, but sometimes drops a
   fact about his échographe), Sébastien Saccharose (a tip of pedagogy… don't mention sugar) or Florent Céplula (tennis).
   He strolls around with a bubble for a while; touch him to talk, then he goes away. Not on the Moon. */
const MAPS_OK = ['main', 'maransin', 'reunion', 'michigan'];
const STAY = 55;                 // seconds he waits for you before going away
export const Guests = {
  t: 45, cur: null, last: null,
  /* who comes next: never the same one twice in a row; Échografikos comes to drop a fact one time in three */
  next() {
    const who = pick(['echog', 'seb', 'florent'].filter((w) => w !== this.last));
    return { who, kind: who === 'echog' && Math.random() < 0.38 ? 'fact' : 'talk' };
  },
  tick(dt) {
    const g = this.cur;
    if (g) {
      if (!Town.npcs.includes(g.n)) { this.cur = null; return; }      // another map: he stayed behind
      if (!g.n.busy && !g.gone && g.arrived && !blocked()) { g.left -= dt; if (g.left <= 0) this.leave(g); }
      return;
    }
    if (!state.started || state.screen !== 'town' || !Town.nodes || !working() || !MAPS_OK.includes(G.map) || blocked()) return;
    this.t -= dt; if (this.t > 0) return;
    this.t = (TEST ? rand(40, 70) : rand(75, 140)) * (prefs.fast ? 0.5 : 1);
    const { who, kind } = this.next();
    this.spawn(who, kind);
  },
  async spawn(who, kind = 'talk') {
    if (this.cur || !Town.nodes) return null;
    this.last = who;
    const g = this.cur = { who, kind, left: STAY, n: null, arrived: false, gone: false };
    await need([...charSheets(who), `${who}_happy`, `${who}_think`, who === 'echog' ? 'echog_scared' : `${who}_joy`]);
    if (this.cur !== g || !Town.nodes) return null;
    /* he walks in from the edge of the map to a crossing you can see */
    const seen = Town.plainNodes().filter((k) => { const [x, y] = Town.nodes[k]; return Cam.visible(x, y - 120, 220); });
    const target = pick(seen.length ? seen : Town.plainNodes()), start = Town.entryNode(target), [x, y] = Town.nodes[start];
    const n = g.n = Town.npc(who, { x, y, speed: who === 'seb' ? 95 : who === 'echog' ? 48 : 80, alpha: 0, roam: false, guest: true, cls: 'guest-' + who,
      bubble: this.bubble(g), say: kind === 'fact', onClick: (m) => this.talk(g, m) });
    Town.walkNpc(n, target, () => { g.arrived = true; n.roam = kind !== 'fact'; n.pause = rand(1.5, 3); n.pose = who === 'echog' ? 'idle' : 'talk'; if (kind === 'fact') this.dropFact(g); });
    setTimeout(() => { if (this.cur === g && !g.arrived) { g.arrived = true; n.roam = true; } }, 16000);
    return g;
  },
  bubble(g) { return g.kind === 'fact' ? '…' : { echog: '…', seb: 'Un conseil ?', florent: 'Un tennis ?' }[g.who]; },
  /* Échografikos stops and says his fact out loud (a speech bubble), waits a moment, and goes on his way.
     When somebody has to answer his fact (his « +1,50 € »), he comes to tell it to you in person. */
  async dropFact(g) {
    const n = g.n, L = g.line = loreLine('echog');
    n.pose = 'point'; n.roam = false;
    for (let i = 0; i < 3; i++) AudioSys.voice('echog', 'aoe'[i], { delay: i * 0.16, mul: 0.92 - i * 0.03 });
    if (!L) { this.leave(g); return; }
    n.bubble = L[1]; Town.renderDom();
    g.left = L[2] ? 3 : 9;
    if (L[2]) setTimeout(() => { if (!g.gone && !blocked()) this.talk(g, n); else g.left = 20; }, TEST ? 200 : 2600);
  },
  async talk(g, n) {
    if (blocked() || g.gone) return;
    Town.holdNpc(n); n.busy = true; state.busy = true;
    let res = null;
    try {
      await Talk.open();
      if (g.who === 'echog') { if (g.kind === 'fact') await SCRIPTS.echogFact(g.line); else await SCRIPTS.echogMute(); }
      else if (g.who === 'seb') res = await SCRIPTS.seb({ rush: () => this.rush(g) });
      else res = await SCRIPTS.florent();
      await Talk.close();
    } finally { state.busy = false; n.busy = false; }
    if (res && res.xp) await addXP(res.xp);
    this.leave(g, res && res.rush);
    refreshGuide();
  },
  /* Sébastien on sugar: he runs around like mad, then away */
  rush(g) {
    const n = g.n; g.rushing = true; n.speed = 340; n.pose = 'cheer';
    const loop = () => { if (!g.rushing || g.gone || !Town.nodes) return; const k = pick(Town.plainNodes().filter((q) => Math.hypot(Town.nodes[q][0] - n.x, Town.nodes[q][1] - n.y) < 260)); if (k) Town.walkNpc(n, k, loop); };
    loop();
    for (let i = 0; i < 8; i++) AudioSys.voice('seb', 'aeiou'[i % 5], { delay: i * 0.09, mul: 1.4 + i * 0.05 });
  },
  leave(g, fast) {
    if (g.gone) return;
    g.gone = true; g.rushing = false;
    const n = g.n; n.bubble = null; n.roam = false; n.onClick = null; if (fast) n.speed = 380;
    if (Town.nodes) Town.walkNpc(n, Town.entryNode(Town.nearestNode(n.x, n.y)), () => { n.fade = -1; });
    setTimeout(() => { n.fade = -1; }, fast ? 5000 : 14000);
    Town.renderDom();
    if (this.cur === g) this.cur = null;
  }
};
