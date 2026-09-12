(function(){"use strict";
const KT=window.KohaTools;if(!KT||!KT.Config)return;const MODULE_ID='serials-number-sort',CFG=KT.Config.getCanonical(MODULE_ID),Scope=KT.getService&&KT.getService("scope");
if(!CFG||!CFG.enabled||!["shadow","live"].includes(CFG.mode))return;if(Scope&&!Scope.match(CFG.general&&CFG.general.scope).ok)return;
const runtime={id:MODULE_ID,sourceFiles:['094-serials-number-sort-fix.js'],parity:"exact-legacy",init:function(){if(window["__KT_PARITY_"+MODULE_ID])return;window["__KT_PARITY_"+MODULE_ID]=true;
/*
 Nom du fichier: 094-serials-number-sort-fix.js
 Dépendances: KOHA_UTILS.waitFor (fallback included)
 Date de dernière modification: 2026-02-21
 Auteur: Michael Mundet
 Description: Force le tri des numéros sur la page `serials.pl` si nécessaire.
*/

(function(){
  'use strict';
  try{
    (function(){})('094-serials-number-sort-fix: loaded');
    if (!window.location.pathname || !window.location.pathname.includes('/serials.pl')) return;

    const waitFor = (selector, timeout) => {
      if (window.KOHA_UTILS && typeof window.KOHA_UTILS.waitFor === 'function') return window.KOHA_UTILS.waitFor(selector, timeout);
      return new Promise((resolve, reject) => {
        const el = document.querySelector(selector);
        if (el) return resolve(el);
        const obs = new MutationObserver(() => { const found = document.querySelector(selector); if (found) { obs.disconnect(); resolve(found); } });
        obs.observe(document.documentElement, { childList: true, subtree: true });
        setTimeout(() => { obs.disconnect(); reject(new Error('timeout')); }, timeout || 3000);
      });
    };

    waitFor('table thead th', 3000).then(() => {
      try{
        const th = Array.from(document.querySelectorAll('table thead th')).find(h => /numéro/i.test(h.textContent||''));
        if (th && !th.classList.contains('sorted')) try{ th.click(); }catch(e){ (function(){})('094: click failed', e); }
      }catch(e){ (function(){})('094: processing failed', e); }
    }).catch(()=>{});

  }catch(e){ (function(){})('094-serials-number-sort-fix: failed', e); }
})();

},destroy:function(){return false;},onConfigChange:function(){return {reloadRequired:true};}};
KT.registerModule(runtime);if(CFG.mode==="shadow"){KT.record({module:MODULE_ID,level:"info",kind:"shadow-exact-parity-sealed",sources:runtime.sourceFiles});return;}runtime.init();
})();