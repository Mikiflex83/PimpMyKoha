(function(){"use strict";
const KT=window.KohaTools;if(!KT||!KT.Config)return;
const MODULE_ID='homepage-list-labels',CFG=KT.Config.getCanonical(MODULE_ID),Scope=KT.getService&&KT.getService("scope");
if(!CFG||!CFG.enabled||!["shadow","live"].includes(CFG.mode))return;
if(Scope&&!Scope.match(CFG.general&&CFG.general.scope).ok)return;
const runtime={
 id:MODULE_ID,
 description:"Renomme les deux raccourcis de listes sur l'accueil professionnel.",
 sourceFiles:['040-modif-bouton-accueil-listes.js'],
 parity:"exact-legacy",
 reloadRequiredOnConfigChange:true,
 init:function(){
   if(window["__KT_PARITY_"+MODULE_ID])return;
   window["__KT_PARITY_"+MODULE_ID]=true;
   
/* ===== EXACT LEGACY SOURCE: 040-modif-bouton-accueil-listes.js ===== */
/*
 Nom du fichier: 040-modif-bouton-accueil-listes.js
 Dépendances: none
 Date de dernière modification: 2026-02-21
 Auteur: Michael Mundet
 Description: Modification du bouton d'accueil pour afficher des libellés adaptés aux listes.
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

  if (document.location.href.indexOf('mainpage.pl') === -1) {
    (function(){})('040-modif-bouton-accueil-listes: skipped (not mainpage.pl)');
    return;
  }

  function replaceLinkContent(selector, iconClass, newText) {
    var elementA = document.querySelector(selector);
    if (elementA) {
      elementA.innerHTML = '<i class="fa fa-fw ' + iconClass + '"></i> ' + newText;
    }
  }

  waitForSelector('a.icon_course_reserves, a.icon_general.icon_lists', 1500).then(() => {
    try {
      replaceLinkContent('a.icon_course_reserves', 'fa-book', 'Listes d\'exemplaires');
      replaceLinkContent('a.icon_general.icon_lists', 'fa-book', 'Listes de notices');
    } catch (err) {
      (function(){})('040-modif-bouton-accueil-listes error:', err);
    }
  }).catch(() => {/* not present */});

  (function(){})('040-modif-bouton-accueil-listes: loaded');
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