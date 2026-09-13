(function(){"use strict";
const KT=window.KohaTools;if(!KT||!KT.Config)return;
const MODULE_ID='return-lost-document-alert',CFG=KT.Config.getCanonical(MODULE_ID),Scope=KT.getService&&KT.getService("scope");
if(!CFG||!CFG.enabled||!["shadow","live"].includes(CFG.mode))return;
if(Scope&&!Scope.match(CFG.general&&CFG.general.scope).ok)return;
const runtime={
 id:MODULE_ID,
 description:'Alerte au retour d’un document signalé perdu selon les informations réellement affichées par Koha.',
 sourceFiles:['051-alert-doc-retour-perdu.js'],
 parity:"exact-legacy",
 reloadRequiredOnConfigChange:true,
 init:function(){
   if(window["__KT_PARITY_"+MODULE_ID])return;
   window["__KT_PARITY_"+MODULE_ID]=true;
   
/* ===== EXACT LEGACY SOURCE: 051-alert-doc-retour-perdu.js ===== */
/*
 Nom du fichier: 051-alert-doc-retour-perdu.js
 Dépendances: none
 Date de dernière modification: 2026-02-21
 Auteur: Michael Mundet
 Description: Alerte si un document retrouvé reste marqué comme "exclu du prêt" après `returns.pl`.
*/

(function(){
  if (!window.location.pathname.includes('returns.pl')) {
    (function(){})('051-alert-doc-retour-perdu: skipped (not returns.pl)');
    return;
  }

  try {
    const alertDivs = document.querySelectorAll('.alert.alert-warning.audio-alert-warning');
    alertDivs.forEach(alertDiv => {
      try {
        const ret = alertDiv.querySelector('.ret_checkedin');
        const messageFound = ret && ret.textContent && ret.textContent.includes("L'exemplaire était perdu : retrouvé, statut modifié.");
        if (messageFound) {
          const link = alertDiv.querySelector('a');
          if (link) {
            const urlToOpen = link.href;
            const confirmation = window.confirm(
              'Le Motif d\'exclusion a été supprimé mais le document reste en exclu du prêt !\nMerci de corriger le statut manuellement.\n\nCliquez sur OK pour ouvrir la notice.'
            );
            if (confirmation) window.open(urlToOpen, '_blank');
          }
        }
      } catch (e) { /* ignore per-alert errors */ }
    });
  } catch (err) {
    (function(){})('051-alert-doc-retour-perdu error:', err);
  }

  (function(){})('051-alert-doc-retour-perdu: loaded');
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