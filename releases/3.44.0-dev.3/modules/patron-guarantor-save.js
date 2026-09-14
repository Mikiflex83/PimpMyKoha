(function(){"use strict";
const KT=window.KohaTools;if(!KT||!KT.Config)return;
const MODULE_ID='patron-guarantor-save',CFG=KT.Config.getCanonical(MODULE_ID),Scope=KT.getService&&KT.getService("scope");
if(!CFG||!CFG.enabled||!["shadow","live"].includes(CFG.mode))return;
if(Scope&&!Scope.match(CFG.general&&CFG.general.scope).ok)return;
const runtime={
 id:MODULE_ID,
 description:'Sécurise la conservation des informations garant lors de l’édition lecteur.',
 sourceFiles:['077-save-guarantor-tp4.js'],
 parity:"exact-legacy",
 reloadRequiredOnConfigChange:true,
 init:function(){
   if(window["__KT_PARITY_"+MODULE_ID])return;
   window["__KT_PARITY_"+MODULE_ID]=true;
   
/* ===== EXACT LEGACY SOURCE: 077-save-guarantor-tp4.js ===== */
/*
 Nom du fichier: 077-save-guarantor-tp4.js
 Dépendances: KOHA_UTILS.waitFor (fallback included)
 Date de dernière modification: 2026-02-21
 Auteur: Michael Mundet
 Description: Ajoute un bouton d'impression du tableau et capture des garants avant impression.
*/

(function(){
  'use strict';
  try{
    (function(){})('077-save-guarantor-tp4: loaded');

    function imprimerTableau() {
      var printWindow = window.open('', '', 'height=800,width=800');
      if (!printWindow) { (function(){})('077: popup blocked'); return; }
      printWindow.document.write('<html><head><title>Impression du tableau</title>');
      printWindow.document.write('<style>table { width: 100%; border: 1px solid #000; border-collapse: collapse; } th, td { padding: 8px; text-align: left; border: 1px solid #ddd; }</style>');
      printWindow.document.write('</head><body>');
      printWindow.document.write('<h1>Tableau des résultats</h1>');
      var table = document.getElementById('report_results');
      if (table) printWindow.document.write(table.outerHTML); else printWindow.document.write('<p>Tableau non trouvé.</p>');
      printWindow.document.write('</body></html>');
      printWindow.document.close();
      printWindow.print();
    }

    var btnGroup = document.createElement('div');
    btnGroup.className = 'btn-group';
    var button = document.createElement('a');
    button.id = 'printReport';
    button.className = 'btn btn-default';
    button.href = '#';
    button.innerHTML = '<i class="fa fa-print"></i> Imprimer le tableau';
    button.addEventListener('click', function(event){ event.preventDefault(); imprimerTableau(); });
    btnGroup.appendChild(button);

    const waitFor = (selector, timeout) => {
      if (window.KOHA_UTILS && typeof window.KOHA_UTILS.waitFor === 'function') return window.KOHA_UTILS.waitFor(selector, timeout);
      return new Promise((resolve, reject) => {
        const el = document.querySelector(selector);
        if (el) return resolve(el);
        const obs = new MutationObserver(() => { const found = document.querySelector(selector); if (found) { obs.disconnect(); resolve(found); } });
        obs.observe(document.documentElement || document.body, { childList: true, subtree: true });
        setTimeout(() => { obs.disconnect(); reject(new Error('timeout')); }, timeout || 4000);
      });
    };

    waitFor('a.fetch_chart_data', 3000).then(function(targetLink){
      try{ targetLink.insertAdjacentElement('afterend', btnGroup); } catch (e) { (function(){})('077: failed to insert print button', e); }
    }).catch(()=>{});

  }catch(e){ (function(){})('077-save-guarantor-tp4: failed', e); }
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