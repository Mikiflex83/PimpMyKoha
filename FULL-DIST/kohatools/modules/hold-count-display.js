(function(){"use strict";
const KT=window.KohaTools;if(!KT||!KT.Config)return;
const MODULE_ID='hold-count-display',CFG=KT.Config.getCanonical(MODULE_ID),Scope=KT.getService&&KT.getService("scope");
if(!CFG||!CFG.enabled||!["shadow","live"].includes(CFG.mode))return;
if(Scope&&!Scope.match(CFG.general&&CFG.general.scope).ok)return;
const runtime={
 id:MODULE_ID,
 description:'Contrôle l’affichage du compteur de réservations à placer.',
 sourceFiles:['045-hide-holds-to-place-count.js'],
 parity:"exact-legacy",
 reloadRequiredOnConfigChange:true,
 init:function(){
   if(window["__KT_PARITY_"+MODULE_ID])return;
   window["__KT_PARITY_"+MODULE_ID]=true;
   
/* ===== EXACT LEGACY SOURCE: 045-hide-holds-to-place-count.js ===== */
/*
 Nom du fichier: 045-hide-holds-to-place-count.js
 Dépendances: none
 Date de dernière modification: 2026-02-21
 Auteur: Michael Mundet
 Description: Masque le compteur "Nombre de reservations à placer" sur `request.pl`.
*/

(function(){
  function localWaitForSelector(selector, timeout = 2000) {
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

  if (window.location.pathname !== '/cgi-bin/koha/reserve/request.pl') {
    (function(){})('045-hide-holds-to-place-count: skipped (not request.pl)');
    return;
  }

  waitForSelector("li label[for='holds_to_place_count']", 1500).then((label) => {
    try {
      const liElement = label && label.closest && label.closest('li');
      if (liElement) liElement.style.display = 'none';
    } catch (err) { /* noop */ }
  }).catch(() => {/* not found */});

  (function(){})('045-hide-holds-to-place-count: loaded');
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