(function(){"use strict";
const KT=window.KohaTools;if(!KT||!KT.Config)return;
const MODULE_ID='detail-technical-dates',CFG=KT.Config.getCanonical(MODULE_ID),Scope=KT.getService&&KT.getService("scope");
if(!CFG||!CFG.enabled||!["shadow","live"].includes(CFG.mode))return;
if(Scope&&!Scope.match(CFG.general&&CFG.general.scope).ok)return;
const runtime={
 id:MODULE_ID,
 description:'Reformate les dates de création et modification de la section technique.',
 sourceFiles:['034-modif-dates-technique-detail.js'],
 parity:"exact-legacy",
 reloadRequiredOnConfigChange:true,
 init:function(){
   if(window["__KT_PARITY_"+MODULE_ID])return;
   window["__KT_PARITY_"+MODULE_ID]=true;
   
/* ===== EXACT LEGACY SOURCE: 034-modif-dates-technique-detail.js ===== */
/*
 Nom du fichier: 034-modif-dates-technique-detail.js
 Dépendances: KOHA_UTILS.waitForSelector (fallback included)
 Date de dernière modification: 2026-02-21
 Auteur: Michael Mundet
 Description: Formatage des dates dans la partie technique sur `detail.pl`.
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

  if (window.location.pathname.indexOf('detail.pl') === -1) {
    (function(){})('034-modif-dates-technique-detail: skipped (not detail.pl)');
    return;
  }

  function formatDate(dateString) {
    try {
      var parts = (dateString || '').split(':');
      if (parts.length < 2) return dateString;
      var dateParts = parts[1].trim().split('-');
      var year = dateParts[0] || '';
      var month = dateParts[1] || '';
      var day = dateParts[2] || '';
      return ("0" + day).slice(-2) + "/" + ("0" + month).slice(-2) + "/" + year;
    } catch (e) {
      return dateString;
    }
  }

  function processDateElements(className) {
    var dateElements = document.querySelectorAll("li." + className);
    dateElements.forEach(function(element) {
      try {
        var elementText = (element.textContent || '').trim();
        var formattedDate = formatDate(elementText);
        var strongEl = element.querySelector('strong');
        var label = strongEl ? strongEl.textContent : '';
        element.innerHTML = '';
        var strongElement = document.createElement('strong');
        strongElement.textContent = label;
        element.appendChild(strongElement);
        element.appendChild(document.createTextNode(' ' + formattedDate));
      } catch (e) {
        /* ignore individual element errors */
      }
    });
  }

  // Wait for either of the target elements
  waitForSelector('li.date-creation-tech, li.date-modif-tech', 2000).then(() => {
    processDateElements('date-creation-tech');
    processDateElements('date-modif-tech');
  }).catch(() => {/* nothing to process */});

  (function(){})('034-modif-dates-technique-detail: loaded');

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