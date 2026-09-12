(function(){"use strict";
const KT=window.KohaTools;if(!KT||!KT.Config)return;
const MODULE_ID='batchmod-accent-validation',CFG=KT.Config.getCanonical(MODULE_ID),Scope=KT.getService&&KT.getService("scope");
if(!CFG||!CFG.enabled||!["shadow","live"].includes(CFG.mode))return;
if(Scope&&!Scope.match(CFG.general&&CFG.general.scope).ok)return;
const runtime={
 id:MODULE_ID,
 description:'Empêche ou signale certains caractères/accentuations dans des champs batchMod configurables.',
 sourceFiles:['048-forbid-accents-batchmod.js'],
 parity:"exact-legacy",
 reloadRequiredOnConfigChange:true,
 init:function(){
   if(window["__KT_PARITY_"+MODULE_ID])return;
   window["__KT_PARITY_"+MODULE_ID]=true;
   
/* ===== EXACT LEGACY SOURCE: 048-forbid-accents-batchmod.js ===== */
/*
 Nom du fichier: 048-forbid-accents-batchmod.js
 Dépendances: none
 Date de dernière modification: 2026-02-21
 Auteur: Michael Mundet
 Description: Empêche la saisie de caractères accentués sur `batchMod.pl`.
*/

(function(){
  if (!window.location.href.match(/batchMod\.pl/)) {
    (function(){})('048-forbid-accents-batchmod: skipped (not batchMod.pl)');
    return;
  }

  try {
    function isAccentedCharacter(character) {
      var accentedCharacters = ['é','è','ê','à','â','ù','û','ô','î','ç','ï'];
      return accentedCharacters.includes(character);
    }

    document.addEventListener('keydown', function(event) {
      try { if (isAccentedCharacter(event.key)) event.preventDefault(); } catch (e) { /* noop */ }
    });
  } catch (err) {
    (function(){})('048-forbid-accents-batchmod error:', err);
  }

  (function(){})('048-forbid-accents-batchmod: loaded');
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