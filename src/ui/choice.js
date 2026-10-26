import { AudioSys } from '../audio/audio.js';
import { $, esc, frSpace } from '../core/utils.js';
import { Guide } from './guide.js';
import { hideToast } from './helpers.js';

/* ================= A card with a question and a few buttons (choices of the player) =================
   ask({ kick, title, html, art, opts: [{ label, sub, value, cls }], cancel }) → resolves with the chosen value
   (or null when « cancel » is touched). */
export const Choice = {
  resolve: null,
  ask({ kick = '', title = '', html = '', art = '', opts = [], cancel = null, wide = false }) {
    return new Promise((resolve) => {
      this.resolve = resolve;
      const box = $('choice');
      box.querySelector('.qcard').classList.toggle('wide', wide);
      $('chKick').textContent = frSpace(kick); $('chKick').hidden = !kick;
      $('chTitle').innerHTML = frSpace(esc(title)); $('chTitle').hidden = !title;
      $('chArt').innerHTML = art; $('chArt').hidden = !art;
      $('chTxt').innerHTML = frSpace(html); $('chTxt').hidden = !html;
      $('chOpts').innerHTML = opts.map((o, i) => `<button type="button" class="qopt ${o.cls || ''}" data-ch="${i}"${o.disabled ? ' disabled' : ''}>${o.icon ? `<span class="qo-ico">${o.icon}</span>` : `<span class="key">${'ABCDEF'[i]}</span>`}<span>${esc(frSpace(o.label))}${o.sub ? `<small>${frSpace(o.sub)}</small>` : ''}</span></button>`).join('');
      $('chBtns').innerHTML = cancel ? `<button type="button" class="btn sm btn-gray" data-ch="x">${esc(frSpace(cancel))}</button>` : '';
      $('chOpts').onclick = (e) => { const b = e.target.closest('[data-ch]'); if (!b || b.disabled) return; AudioSys.tap(); this.close(opts[+b.dataset.ch].value ?? +b.dataset.ch); };
      $('chBtns').onclick = (e) => { if (e.target.closest('[data-ch="x"]')) { AudioSys.tap(); this.close(null); } };
      hideToast(); Guide.hide(); box.hidden = false; AudioSys.pop();
    });
  },
  close(v) { $('choice').hidden = true; const r = this.resolve; this.resolve = null; if (r) r(v); }
};
/* A simple information card with one button. */
export function infoCard({ kick = '', title = '', html = '', art = '', ok = 'Compris' }) {
  return Choice.ask({ kick, title, html, art, opts: [{ label: ok, value: true, cls: 'ok-only' }] });
}
