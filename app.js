/* =====================================================================
   app.js — bootstrap and global error surface
   ===================================================================== */
(function (WF) {
  'use strict';

  window.__WF_ERRORS = [];
  window.addEventListener('error', function (e) {
    window.__WF_ERRORS.push(String(e.message));
    var host = document.getElementById('bootError');
    if (host) {
      host.style.display = 'block';
      host.textContent = 'SYSTEM FAULT: ' + e.message;
    }
  });
  window.addEventListener('unhandledrejection', function (e) {
    window.__WF_ERRORS.push(String(e.reason));
  });

  function boot() {
    try {
      var state = WF.store.init();
      WF.ui.init(state);
      window.WF_APP = { state: state, ui: WF.ui, engine: WF.engine, store: WF.store };
      document.documentElement.setAttribute('data-ready', 'true');

      // keyboard: R reroll (when not typing)
      document.addEventListener('keydown', function (e) {
        var tag = (e.target.tagName || '').toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
        if (e.key === 'r' || e.key === 'R') {
          WF.ui.handlers.reroll();
        }
      });

      // persist on unload as a safety net
      window.addEventListener('beforeunload', function () { WF.store.saveNow(state); });
    } catch (err) {
      window.__WF_ERRORS.push(String(err && err.stack || err));
      var host = document.getElementById('bootError');
      if (host) {
        host.style.display = 'block';
        host.textContent = 'BOOT FAILURE: ' + (err && err.message ? err.message : err);
      }
      if (window.console) console.error(err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(window.WF = window.WF || {});
