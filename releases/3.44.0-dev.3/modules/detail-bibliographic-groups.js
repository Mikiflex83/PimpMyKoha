(function(){"use strict";
const KT=window.KohaTools;if(!KT||!KT.Config)return;
const MODULE_ID='detail-bibliographic-groups',CFG=KT.Config.getCanonical(MODULE_ID),Scope=KT.getService&&KT.getService("scope");
if(!CFG||!CFG.enabled||!["shadow","live"].includes(CFG.mode))return;
if(Scope&&!Scope.match(CFG.general&&CFG.general.scope).ok)return;
const runtime={
 id:MODULE_ID,
 description:'Regroupe les lignes bibliographiques du détail en ensembles configurables.',
 sourceFiles:['063-mis-en-page-catalogue.js'],
 parity:"exact-legacy",
 reloadRequiredOnConfigChange:true,
 init:function(){
   if(window["__KT_PARITY_"+MODULE_ID])return;
   window["__KT_PARITY_"+MODULE_ID]=true;
   
/* ===== EXACT LEGACY SOURCE: 063-mis-en-page-catalogue.js ===== */
//-----------------------------------------------------------------------------------------------------------------------------
// 063-mis-en-page-catalogue: regroupement d'info sur detail.pl (defensive)
//-----------------------------------------------------------------------------------------------------------------------------
(function(){
  (function(){})('063-mis-en-page-catalogue: loaded');
  try {
    if (window.location.pathname.indexOf('detail.pl') === -1) return;

    var catalogueDetail = document.getElementById('catalogue_detail_biblio');
    if (!catalogueDetail) return;

    var infoContainer = document.querySelector('.catalogue-info');
    if (!infoContainer) {
      infoContainer = document.createElement('div');
      infoContainer.classList.add('catalogue-info');
      catalogueDetail.appendChild(infoContainer);
    }

    var infoItems = catalogueDetail.querySelectorAll('li');
    var infoGroups = { "Détails": [], "Identification": [], "Contenu": [], "Classification": [], "Ressources": [] };

    infoItems.forEach(function(item){
      try {
        if (!item.closest('.technique')) {
          var text = item.textContent || '';
          if (/ISBN|EAN|Création|Modification|Type de document|Pays de production|Langue|Edition|Récompense\(s\)|Description/i.test(text)) infoGroups["Détails"].push(item);
          else if (/Collection|Série|Relié avec|Auteur principal|Co-auteur|Public|Auteur secondaire/i.test(text)) infoGroups["Identification"].push(item);
          else if (/Résumé|Note de contenu|Note générale/i.test(text)) infoGroups["Contenu"].push(item);
          else if (/Classement|Sujet - Nom commun|Sujet - Indexation|Historique SUDOC du périodique|Sujet - Genre littéraire|Personnage\(s\)|Sujet - Nom de personne|Catégorie de sujet|Sujet - Nom géographique/i.test(text)) infoGroups["Classification"].push(item);
          else if (/Ressources/i.test(text)) infoGroups["Ressources"].push(item);
        }
      } catch (e) { /* noop for malformed nodes */ }
    });

    var marcPreviewSpan = catalogueDetail.querySelector('#catalogue_detail_marc_preview');
    if (marcPreviewSpan) try { marcPreviewSpan.style.display = 'none'; } catch(e){}

    function addInfoGroup(items) { if (items && items.length > 0) { var groupDiv = document.createElement('div'); items.forEach(function(it){ try{ groupDiv.appendChild(it); } catch(e){} }); infoContainer.appendChild(groupDiv); } }

    addInfoGroup(infoGroups["Identification"]);
    addInfoGroup(infoGroups["Détails"]);
    addInfoGroup(infoGroups["Contenu"]);
    addInfoGroup(infoGroups["Classification"]);
    addInfoGroup(infoGroups["Ressources"]);

  } catch (err) {
    (function(){})('063-mis-en-page-catalogue error:', err);
  }
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