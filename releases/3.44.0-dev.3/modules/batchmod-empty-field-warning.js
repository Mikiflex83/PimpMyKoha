(function(){"use strict";
const KT=window.KohaTools;if(!KT||!KT.Config)return;
const MODULE_ID='batchmod-empty-field-warning',CFG=KT.Config.getCanonical(MODULE_ID),Scope=KT.getService&&KT.getService("scope");
if(!CFG||!CFG.enabled||!["shadow","live"].includes(CFG.mode))return;
if(Scope&&!Scope.match(CFG.general&&CFG.general.scope).ok)return;
const runtime={
 id:MODULE_ID,
 description:'Avertit avant traitement par lot lorsqu’un champ configuré est vide.',
 sourceFiles:['031-alert-vide-champ-modif-lot.js'],
 parity:"exact-legacy",
 reloadRequiredOnConfigChange:true,
 init:function(){
   if(window["__KT_PARITY_"+MODULE_ID])return;
   window["__KT_PARITY_"+MODULE_ID]=true;
   
/* ===== EXACT LEGACY SOURCE: 031-alert-vide-champ-modif-lot.js ===== */
/*
 Nom du fichier: 031-alert-vide-champ-modif-lot.js
 Dépendances: KOHA_UTILS.waitForSelector (fallback included)
 Date de dernière modification: 2026-02-21
 Auteur: Michael Mundet
 Description: Alerte avant de vider un champ via la checkbox `disable_input` dans `batchMod.pl`.
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

  if (window.location.pathname.indexOf('batchMod.pl') === -1) {
    (function(){})('031-alert-vide-champ-modif-lot: skipped (not batchMod.pl)');
    return;
  }

  // Wait for at least one matching checkbox then attach handlers
  waitForSelector('input[name="disable_input"]', 2000).then(() => {
    try {
      const checkboxes = document.querySelectorAll('input[name="disable_input"]');
      checkboxes.forEach(function(checkbox) {
        checkbox.addEventListener('change', function() {
          if (this.checked) {
            const confirmation = confirm("ATTENTION !\n\n Si vous validez, le champ sera vide après la modification par lot et ce champ est important.\n\n Êtes-vous certain de vouloir vider ce champ ?");
            if (!confirmation) this.checked = false;
          }
        });
      });
    } catch (err) {
      (function(){})('031-alert-vide-champ-modif-lot error:', err);
    }
  }).catch(() => {/* none found */});

  (function(){})('031-alert-vide-champ-modif-lot: loaded');
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