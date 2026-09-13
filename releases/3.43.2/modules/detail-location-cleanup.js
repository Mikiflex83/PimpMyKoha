(function(){"use strict";
const KT=window.KohaTools;if(!KT||!KT.Config)return;
const MODULE_ID='detail-location-cleanup',CFG=KT.Config.getCanonical(MODULE_ID),Scope=KT.getService&&KT.getService("scope");
if(!CFG||!CFG.enabled||!["shadow","live"].includes(CFG.mode))return;
if(Scope&&!Scope.match(CFG.general&&CFG.general.scope).ok)return;
const runtime={
 id:MODULE_ID,
 description:'Nettoie l’affichage de la localisation permanente et masque le bloc Elastic technique.',
 sourceFiles:['032-hide-permanent-location.js'],
 parity:"exact-legacy",
 reloadRequiredOnConfigChange:true,
 init:function(){
   if(window["__KT_PARITY_"+MODULE_ID])return;
   window["__KT_PARITY_"+MODULE_ID]=true;
   
/* ===== EXACT LEGACY SOURCE: 032-hide-permanent-location.js ===== */
(function(){
  /*
   Nom du fichier: 032-hide-permanent-location.js
   Dépendances: KOHA_UTILS.waitForSelector (utilitaire local fallback inclus)
   Date de dernière modification: 2026-02-21
   Auteur: Michael Mundet
   Description: Masque/transforme le texte des localisations permanentes sur detail.pl
  */

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

  // Only operate on detail.pl pages
  if (window.location.pathname.indexOf('detail.pl') === -1) {
    (function(){})('032-hide-permanent-location: skipped (not detail.pl)');
    return;
  }

  // Transform shelving location text when elements appear
  waitForSelector('.shelvingloc', 2000).then(() => {
    try {
      const shelvingLocElements = document.querySelectorAll('.shelvingloc');
      shelvingLocElements.forEach(function(element) {
        const text = (element.textContent || '').trim();
        const match = text.match(/\(([^()\-]+)[)\-]/);
        if (match && match[1]) {
          element.textContent = match[1].trim();
        }
      });
    } catch (err) {
      (function(){})('032-hide-permanent-location error:', err);
    }
  }).catch(() => {/* not present or timed out */});

  // Also hide elastic record span if present
  waitForSelector('#catalogue_detail_elastic_record', 2000).then((el) => {
    try { if (el) el.style.display = 'none'; } catch (e) { /* noop */ }
  }).catch(() => {/* not present */});

  (function(){})('032-hide-permanent-location: loaded');
})();

 },
 destroy:function(){return false;},
 onConfigChange:function(){return {reloadRequired:true};}
};
KT.registerModule(runtime);
if(CFG.mode==="shadow"){
 KT.record({module:MODULE_ID,level:"info",kind:"shadow-exact-parity-sealed",sources:runtime.sourceFiles});
 return;
}
runtime.init();
})();