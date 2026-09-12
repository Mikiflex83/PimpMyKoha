(function(){"use strict";
const KT=window.KohaTools;if(!KT||!KT.Config)return;
const MODULE_ID='catalogue-tree-button',CFG=KT.Config.getCanonical(MODULE_ID),Scope=KT.getService&&KT.getService("scope");
if(!CFG||!CFG.enabled||!["shadow","live"].includes(CFG.mode))return;
if(Scope&&!Scope.match(CFG.general&&CFG.general.scope).ok)return;
const runtime={
 id:MODULE_ID,
 description:'Ajoute le raccourci Arborescence dans la toolbar Catalogue.',
 sourceFiles:['085-arborescence-top-button.js'],
 parity:"exact-legacy",
 reloadRequiredOnConfigChange:true,
 init:function(){
   if(window["__KT_PARITY_"+MODULE_ID])return;
   window["__KT_PARITY_"+MODULE_ID]=true;
   
/* ===== EXACT LEGACY SOURCE: 085-arborescence-top-button.js ===== */
/*
 Nom du fichier: 085-arborescence-top-button.js
 Dépendances: KOHA_UTILS.waitFor (fallback included)
 Date de dernière modification: 2026-02-21
 Auteur: Michael Mundet
 Description: Ajoute un bouton "Arborescence" en haut des pages du catalogue.
*/

(function(){
  'use strict';
  try{
    (function(){})('085-arborescence-top-button: loaded');
    if (!window.location.pathname || !window.location.pathname.includes('/catalogue.pl')) return;

    const waitFor = (selector, timeout) => {
      if (window.KOHA_UTILS && typeof window.KOHA_UTILS.waitFor === 'function') return window.KOHA_UTILS.waitFor(selector, timeout);
      return new Promise((resolve, reject) => {
        const el = document.querySelector(selector);
        if (el) return resolve(el);
        const obs = new MutationObserver(() => { const found = document.querySelector(selector); if (found) { obs.disconnect(); resolve(found); } });
        obs.observe(document.documentElement, { childList: true, subtree: true });
        setTimeout(() => { obs.disconnect(); reject(new Error('timeout')); }, timeout || 3000);
      });
    };

    waitFor('.page-header .btn-toolbar, .content-header .btn-toolbar', 2000).then(toolbar => {
      try{
        const btnArbo = document.createElement('a'); btnArbo.className = 'btn btn-xs btn-default'; btnArbo.href = '#arbo'; btnArbo.innerHTML = '<i class="fa fa-sitemap"></i> Arborescence';
        if (toolbar && toolbar.prepend) toolbar.prepend(btnArbo);
      }catch(e){ (function(){})('085: toolbar insert failed', e); }
    }).catch(()=>{});

  }catch(e){ (function(){})('085-arborescence-top-button: failed', e); }
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