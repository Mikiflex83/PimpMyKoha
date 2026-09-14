(function(){"use strict";
const KT=window.KohaTools;if(!KT||!KT.Config)return;
const MODULE_ID='detail-concern-button',CFG=KT.Config.getCanonical(MODULE_ID),Scope=KT.getService&&KT.getService("scope");
if(!CFG||!CFG.enabled||!["shadow","live"].includes(CFG.mode))return;
if(Scope&&!Scope.match(CFG.general&&CFG.general.scope).ok)return;
const runtime={
 id:MODULE_ID,
 description:'Présente le signalement de problème comme un bouton près de Réserver.',
 sourceFiles:['023-deplacer-bouton-signaler-probleme.js'],
 parity:"exact-legacy",
 reloadRequiredOnConfigChange:true,
 init:function(){
   if(window["__KT_PARITY_"+MODULE_ID])return;
   window["__KT_PARITY_"+MODULE_ID]=true;
   
/* ===== EXACT LEGACY SOURCE: 023-deplacer-bouton-signaler-probleme.js ===== */
/*
 Nom du fichier: 023-deplacer-bouton-signaler-probleme.js
 Dépendances: aucune
 Date de dernière modification: 2026-02-21
 Auteur: Michael Mundet
 Description: Transforme le lien 'Signaler un problème' en bouton et le place après le bouton Réserver sur la page détail.
*/

(function(){
  document.addEventListener('DOMContentLoaded', function(){
    if (window.location.pathname.includes('detail.pl')) {
      const concernLink = document.querySelector('#newconcern');
      const reserveButton = document.querySelector('#placehold');

      if (concernLink && reserveButton) {
        // Modifier le texte du lien
        concernLink.textContent = "Signaler un problème dans cette notice";

        // Créer un nouveau bouton
        const newButton = document.createElement('button');
        newButton.className = "btn btn-default";

        // Créer l’icône et le texte
        const icon = document.createElement('i');
        icon.className = "fa fa-exclamation-triangle";
        icon.style.marginRight = "5px";
        newButton.appendChild(icon);
        newButton.appendChild(document.createTextNode(concernLink.textContent));

        // Attributs pour déclencher le modal
        newButton.setAttribute('data-toggle', 'modal');
        newButton.setAttribute('data-target', '#addConcernModal');

        // Ajouter après le bouton Réserver
        reserveButton.parentNode.insertBefore(newButton, reserveButton.nextSibling);

        // Déclencher le modal en cliquant sur le bouton
        newButton.addEventListener('click', () => {
          concernLink.click(); // Réutilise le comportement du lien original
        });
      }
    }
  });
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