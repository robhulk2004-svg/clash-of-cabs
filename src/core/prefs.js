import { TEST } from './utils.js';

/* ================= Preferences (this browser only) ================= */
export const prefs = { music: true, sfx: true, voice: true, volume: 0.6, fast: false };
try { Object.assign(prefs, JSON.parse(localStorage.getItem('coc-prefs') || '{}')); } catch (e) {}
export const savePrefs = () => { try { localStorage.setItem('coc-prefs', JSON.stringify(prefs)); } catch (e) {} };
/* Timers of the game, in seconds of play (demo mode divides them by three). */
const fastK = () => (prefs.fast ? 1 / 3 : 1);
export const sessionSeconds = () => (TEST && TEST.session) || 15 * fastK();
export const buildSeconds = (lvl) => (TEST && TEST.build) || [30, 60, 120, 150, 180, 210, 240, 270, 300][lvl - 1] * fastK();
export const ordreSeconds = () => (TEST && TEST.ordre) || 5;
export const formationSeconds = () => (TEST && TEST.formation) || 30 * fastK();
