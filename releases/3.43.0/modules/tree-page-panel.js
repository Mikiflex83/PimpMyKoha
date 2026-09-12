(function(){"use strict";
const KT=window.KohaTools;if(!KT||!KT.Config)return;const MODULE_ID='tree-page-panel',CFG=KT.Config.getCanonical(MODULE_ID),Scope=KT.getService&&KT.getService("scope");
if(!CFG||!CFG.enabled||!["shadow","live"].includes(CFG.mode))return;if(Scope&&!Scope.match(CFG.general&&CFG.general.scope).ok)return;
const runtime={id:MODULE_ID,sourceFiles:['097-extract-tree-content-page-114.js'],parity:"exact-legacy",init:function(){if(window["__KT_PARITY_"+MODULE_ID])return;window["__KT_PARITY_"+MODULE_ID]=true;

/* ===== EXACT LEGACY SOURCE: 097-extract-tree-content-page-114.js ===== */
/*
 Nom du fichier: 097-extract-tree-content-page-114.js
 Dépendances: KOHA_UTILS.waitFor (fallback included)
 Date de dernière modification: 2026-02-21
 Auteur: Michael Mundet
 Description: Transforme l'arborescence sur la page `page_id=114` en panneau collapsable.
*/

(function(){
  'use strict';
  try{
    (function(){})('097-extract-tree-content-page-114: loaded');
    const pageId = new URLSearchParams(location.search).get('page_id'); if (pageId !== '114') return;

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

    waitFor('#arborescence', 3000).then(tree => {
      try{
        if (!tree) return;
        tree.querySelectorAll('li').forEach(li => { const a = li.querySelector('a'); if (a && a.nextElementSibling && a.nextElementSibling.tagName === 'UL'){ a.style.cursor='pointer'; a.addEventListener('click', function(e){ e.preventDefault(); this.nextElementSibling.classList.toggle('collapsed'); }); a.nextElementSibling.classList.add('collapsed'); } });

        const header = document.createElement('div'); header.className='panel panel-default'; header.innerHTML = '<div class="panel-heading"><strong>Arborescence extraite</strong></div>';
        if (tree.parentNode) tree.parentNode.insertBefore(header, tree);
        header.appendChild(tree);
      }catch(e){ (function(){})('097: tree processing failed', e); }
    }).catch(()=>{});

  }catch(e){ (function(){})('097-extract-tree-content-page-114: failed', e); }
})();


},destroy:function(){return false;},onConfigChange:function(){return {reloadRequired:true};}};
KT.registerModule(runtime);if(CFG.mode==="shadow"){KT.record({module:MODULE_ID,level:"info",kind:"shadow-exact-parity-sealed",sources:runtime.sourceFiles});return;}runtime.init();
})();