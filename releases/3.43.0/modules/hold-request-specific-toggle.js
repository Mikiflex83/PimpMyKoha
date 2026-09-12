(function(){"use strict";
const KT=window.KohaTools;if(!KT||!KT.Config)return;
const MODULE_ID='hold-request-specific-toggle',CFG=KT.Config.getCanonical(MODULE_ID),Scope=KT.getService&&KT.getService("scope");
if(!CFG||!CFG.enabled||!["shadow","live"].includes(CFG.mode))return;
if(Scope&&!Scope.match(CFG.general&&CFG.general.scope).ok)return;
const runtime={
 id:MODULE_ID,
 description:'Contrôle l’affichage des options de réservation spécifique.',
 sourceFiles:['046-toggle-request-specific.js'],
 parity:"exact-legacy",
 reloadRequiredOnConfigChange:true,
 init:function(){
   if(window["__KT_PARITY_"+MODULE_ID])return;
   window["__KT_PARITY_"+MODULE_ID]=true;
   
/* ===== EXACT LEGACY SOURCE: 046-toggle-request-specific.js ===== */
/*
 Nom du fichier: 046-toggle-request-specific.js
 Dépendances: none
 Date de dernière modification: 2026-02-21
 Auteur: Michael Mundet
 Description: Ajoute un bouton pour masquer/afficher la section `requestspecific` sur les pages requestss.pl
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

  if (!window.location.href.match(/requestss\.pl/)) {
    (function(){})('046-toggle-request-specific: skipped (not requestss.pl)');
    return;
  }

  waitForSelector('#holdnotes, #requestspecific', 2000).then(() => {
    try {
      if (!document.getElementById('holdnotes')) return;
      var targetDiv = document.getElementById('requestspecific');
      if (!targetDiv) return;
      var targetButton = targetDiv.nextElementSibling;
      var targetFieldset = targetDiv.parentNode;

      targetDiv.style.display = 'none';
      if (targetButton) targetButton.style.display = 'none';

      function toggleVisibility(targetDiv, targetButton) {
        var isVisible = targetDiv.style.display === 'block';
        targetDiv.style.display = isVisible ? 'none' : 'block';
        if (targetButton) targetButton.style.display = isVisible ? 'none' : 'inline-block';
      }

      var toggleButton = document.createElement('button');
      toggleButton.textContent = 'Masquer/Afficher';
      targetFieldset.parentNode.insertBefore(toggleButton, targetFieldset.nextSibling);
      toggleButton.addEventListener('click', function() { toggleVisibility(targetDiv, targetButton); });
    } catch (err) {
      (function(){})('046-toggle-request-specific error:', err);
    }
  }).catch(() => {/* not present */});

  (function(){})('046-toggle-request-specific: loaded');
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