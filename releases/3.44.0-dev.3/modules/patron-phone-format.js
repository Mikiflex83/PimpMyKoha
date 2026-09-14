(function(){"use strict";
const KT=window.KohaTools;if(!KT||!KT.Config)return;
const MODULE_ID='patron-phone-format',CFG=KT.Config.getCanonical(MODULE_ID),Scope=KT.getService&&KT.getService("scope");
if(!CFG||!CFG.enabled||!["shadow","live"].includes(CFG.mode))return;
if(Scope&&!Scope.match(CFG.general&&CFG.general.scope).ok)return;
const runtime={
 id:MODULE_ID,
 description:'Normalise l’affichage/saisie des numéros de téléphone selon des règles configurables.',
 sourceFiles:['043-format-phone-numbers.js'],
 parity:"exact-legacy",
 reloadRequiredOnConfigChange:true,
 init:function(){
   if(window["__KT_PARITY_"+MODULE_ID])return;
   window["__KT_PARITY_"+MODULE_ID]=true;
   
/* ===== EXACT LEGACY SOURCE: 043-format-phone-numbers.js ===== */
/*
 Nom du fichier: 043-format-phone-numbers.js
 Dépendances: none
 Date de dernière modification: 2026-02-21
 Auteur: Michael Mundet
 Description: Réécrit/espace les numéros de téléphone affichés sur member/circulation pages.
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

  if (!window.location.href.match(/moremember\.pl|circulation\.pl/)) {
    (function(){})('043-format-phone-numbers: skipped (not member/circulation page)');
    return;
  }

  const issuesTable = document.getElementById('issues-table');

  function addSpacesEveryTwoCharacters(selector) {
    const elements = document.querySelectorAll(selector);
    elements.forEach(element => {
      if (issuesTable && issuesTable.contains(element)) return;
      let text = (element.textContent || '').trim();
      text = text.length % 2 === 0 ? text : text + ' ';
      const spacedText = text.replace(/(.{2})/g, '$1 ');
      element.textContent = spacedText.trim();
    });
  }

  waitForSelector('li.patronphone, a[href]', 1500).then(() => {
    try {
      addSpacesEveryTwoCharacters('li.patronphone');
      const links = document.querySelectorAll("a[href]:not([href=''])");
      const linkPattern = /^\d{10}$/;
      function addSpacesToNumericLinks(links, pattern) {
        links.forEach(link => {
          if (issuesTable && issuesTable.contains(link)) return;
          var linkText = (link.textContent || '').trim();
          if (pattern.test(linkText)) {
            var paddedText = linkText.length % 2 === 0 ? linkText : linkText + ' ';
            var spacedText = paddedText.replace(/(.{2})/g, '$1 ');
            link.textContent = spacedText.trim();
          }
        });
      }
      addSpacesToNumericLinks(links, linkPattern);
    } catch (err) {
      (function(){})('043-format-phone-numbers error:', err);
    }
  }).catch(() => {/* nothing to format */});

  (function(){})('043-format-phone-numbers: loaded');
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