(function(){"use strict";
const KT=window.KohaTools;if(!KT||!KT.Config)return;
const MODULE_ID='hold-branch-info',CFG=KT.Config.getCanonical(MODULE_ID),Scope=KT.getService&&KT.getService("scope");
if(!CFG||!CFG.enabled||!["shadow","live"].includes(CFG.mode))return;
if(Scope&&!Scope.match(CFG.general&&CFG.general.scope).ok)return;
const runtime={
 id:MODULE_ID,
 description:'Affiche des informations contextuelles de réservation selon les sites concernés.',
 sourceFiles:['087-reservations-mdb-arcs-info.js'],
 parity:"exact-legacy",
 reloadRequiredOnConfigChange:true,
 init:function(){
   if(window["__KT_PARITY_"+MODULE_ID])return;
   window["__KT_PARITY_"+MODULE_ID]=true;
   
/* ===== EXACT LEGACY SOURCE: 087-reservations-mdb-arcs-info.js ===== */
/*
 Nom du fichier: 087-reservations-mdb-arcs-info.js
 Dépendances: KOHA_UTILS.waitFor (fallback included)
 Date de dernière modification: 2026-02-21
 Auteur: Michael Mundet
 Description: Ajoute un badge MDB/ARCS aux lignes de réservation lorsque détecté.
*/

(function(){
  'use strict';
  try{
    (function(){})('087-reservations-mdb-arcs-info: loaded');
    if (!window.location.pathname || !window.location.pathname.includes('/request.pl')) return;

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

    waitFor('.request_row', 3000).then(() => {
      try{
        document.querySelectorAll('.request_row').forEach(row => {
          const mode = row.querySelector('.request_mode');
          if (!mode) return;
          const text = (mode.textContent||'').trim().toLowerCase();
          const rules = Array.isArray(CFG?.installation?.rules) ? CFG.installation.rules : [];
          const matched = rules.find(rule => rule && String(rule.contains || '').trim() && text.includes(String(rule.contains).trim().toLowerCase()));
          if (matched) {
            const badge = document.createElement('span'); badge.className = 'label label-info'; badge.style.marginLeft = '8px'; badge.textContent = String(matched.label || matched.contains || '').trim();
            if (badge.textContent) mode.appendChild(badge);
          }
        });
      }catch(e){ (function(){})('087: processing rows failed', e); }
    }).catch(()=>{});

  }catch(e){ (function(){})('087-reservations-mdb-arcs-info: failed', e); }
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