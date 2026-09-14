(function(){"use strict";
const KT=window.KohaTools;if(!KT||!KT.Config)return;
const MODULE_ID='patron-age-display',CFG=KT.Config.getCanonical(MODULE_ID),Scope=KT.getService&&KT.getService("scope");
if(!CFG||!CFG.enabled||!["shadow","live"].includes(CFG.mode))return;
if(Scope&&!Scope.match(CFG.general&&CFG.general.scope).ok)return;
const runtime={
 id:MODULE_ID,
 description:'Calcule l’âge à partir de la date de naissance réellement affichée.',
 sourceFiles:['098-age-calculation-member-detail.js'],
 parity:"exact-legacy",
 reloadRequiredOnConfigChange:true,
 init:function(){
   if(window["__KT_PARITY_"+MODULE_ID])return;
   window["__KT_PARITY_"+MODULE_ID]=true;
   
/* ===== EXACT LEGACY SOURCE: 098-age-calculation-member-detail.js ===== */
/*
 Nom du fichier: 098-age-calculation-member-detail.js
 Dépendances: KOHA_UTILS.waitFor (fallback included)
 Date de dernière modification: 2026-02-21
 Auteur: Michael Mundet
 Description: Calcule et affiche l'âge sur les pages de détail / saisie d'adhérent.
*/

(function(){
  'use strict';
  try{
    (function(){})('098-age-calculation-member-detail: loaded');
    if (!window.location.pathname || (!window.location.pathname.includes('/memberentry.pl') && !window.location.pathname.includes('/memberdetails.pl'))) return;

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

    waitFor('.biblio_data dt', 3000).then(() => {
      try{
        const dobLabel = Array.from(document.querySelectorAll('.biblio_data dt')).find(dt => /date de naissance|birthdate/i.test(dt.textContent||''));
        if (!dobLabel) return;
        const dd = dobLabel.nextElementSibling; if (!dd) return;
        const txt = (dd.textContent||'').trim(); const m = txt.match(/(\d{4})-(\d{2})-(\d{2})/);
        if (!m) return; const y = parseInt(m[1],10), mo = parseInt(m[2],10)-1, d = parseInt(m[3],10);
        const birth = new Date(y,mo,d); const now = new Date(); let age = now.getFullYear() - birth.getFullYear(); const mth = now.getMonth() - birth.getMonth(); if (mth < 0 || (mth===0 && now.getDate() < birth.getDate())) age--;
        const span = document.createElement('span'); span.style.marginLeft='8px'; span.style.color='#555'; span.textContent = `(${age} ans)`; dd.appendChild(span);
      }catch(e){ (function(){})('098: age calc failed', e); }
    }).catch(()=>{});

  }catch(e){ (function(){})('098-age-calculation-member-detail: failed', e); }
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