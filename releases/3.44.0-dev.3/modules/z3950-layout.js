(function(){"use strict";
const KT=window.KohaTools;if(!KT||!KT.Config)return;const MODULE_ID='z3950-layout',CFG=KT.Config.getCanonical(MODULE_ID),Scope=KT.getService&&KT.getService("scope");
if(!CFG||!CFG.enabled||!["shadow","live"].includes(CFG.mode))return;if(Scope&&!Scope.match(CFG.general&&CFG.general.scope).ok)return;
const runtime={id:MODULE_ID,sourceFiles:['035-resize-z3950.js'],parity:"exact-legacy",init:function(){if(window["__KT_PARITY_"+MODULE_ID])return;window["__KT_PARITY_"+MODULE_ID]=true;

/* ===== EXACT LEGACY SOURCE: 035-resize-z3950.js ===== */
/*
 Nom du fichier: 035-resize-z3950.js
 Dépendances: none (will use jQuery if present; otherwise applies safe fallbacks)
 Date de dernière modification: 2026-02-21
 Auteur: Michael Mundet
 Description: Ajuste la fenêtre et les hauteurs pour `z3950_search.pl`, et normalise les champs texte.
*/

(function(){
  function localWaitForSelector(selector, timeout = 3000) {
    return new Promise((resolve, reject) => {
      const el = document.querySelector(selector);
      if (el) return resolve(el);
      const obs = new MutationObserver(() => {
        const found = document.querySelector(selector);
        if (found) { obs.disconnect(); resolve(found); }
      });
      obs.observe(document.documentElement, { childList: true, subtree: true });
      setTimeout(() => { obs.disconnect(); reject(new Error('timeout')); }, timeout);
    });
  }

  const waitForSelector = (window.KOHA_UTILS && typeof window.KOHA_UTILS.waitForSelector === 'function')
    ? window.KOHA_UTILS.waitForSelector
    : localWaitForSelector;

  if (document.location.href.indexOf('z3950_search.pl') === -1) {
    (function(){})('035-resize-z3950: skipped (not z3950_search.pl)');
    return;
  }

  try {
    window.resizeTo(screen.width * 0.8, screen.height * 0.8);
    window.moveTo(0, 0);
  } catch (e) { /* certains navigateurs bloquent resize/move */ }

  // Wait for the main container to exist
  waitForSelector('#cat_z3950_search', 2000).then((root) => {
    try {
      const applySizing = function() {
        try {
          const h = window.innerHeight * 0.75;
          const rowsEls = root.querySelectorAll('.col-xs-6 .rows, #z3950_search_targets');
          rowsEls.forEach(el => { el.style.height = h + 'px'; el.style.overflowY = 'auto'; });
        } catch (e) { /* noop */ }
      };

      // use jQuery if available for load/resize events, otherwise native
      if (window.jQuery) {
        jQuery(window).on('load resize', applySizing);
      } else {
        window.addEventListener('resize', applySizing);
        window.addEventListener('load', applySizing);
      }

      // remove accents from input values
      const removeAccents = (str) => str ? str.normalize('NFD').replace(/[\u0300-\u036f]/g, '') : str;
      const inputs = root.querySelectorAll('input[type="text"]');
      inputs.forEach(function(inp) {
        try { inp.value = removeAccents(inp.value || ''); } catch (e) { /* noop */ }
      });
    } catch (err) {
      (function(){})('035-resize-z3950 error:', err);
    }
  }).catch(() => { /* root not present */ });

  (function(){})('035-resize-z3950: loaded');
})();

},destroy:function(){return false;},onConfigChange:function(){return {reloadRequired:true};}};
KT.registerModule(runtime);if(CFG.mode==="shadow"){KT.record({module:MODULE_ID,level:"info",kind:"shadow-exact-parity-sealed",sources:runtime.sourceFiles});return;}runtime.init();
})();