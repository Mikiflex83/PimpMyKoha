(function(){"use strict";
const KT=window.KohaTools;if(!KT||!KT.Config)return;
const MODULE_ID='detail-genre-icons',CFG=KT.Config.getCanonical(MODULE_ID),Scope=KT.getService&&KT.getService("scope");
if(!CFG||!CFG.enabled||!["shadow","live"].includes(CFG.mode))return;
if(Scope&&!Scope.match(CFG.general&&CFG.general.scope).ok)return;
const runtime={
 id:MODULE_ID,
 description:'Affiche une icône de genre près du titre lorsque l’indexation de la notice correspond à une règle.',
 sourceFiles:['027-genre-icons-detail.js'],
 parity:"exact-legacy",
 reloadRequiredOnConfigChange:true,
 init:function(){
   if(window["__KT_PARITY_"+MODULE_ID])return;
   window["__KT_PARITY_"+MODULE_ID]=true;
   
/* ===== EXACT LEGACY SOURCE: 027-genre-icons-detail.js ===== */
/*
 Nom du fichier: 027-genre-icons-detail.js
 Dépendances: KOHA_UTILS.waitForSelector (fallback included)
 Date de dernière modification: 2026-02-21
 Auteur: Michael Mundet
 Description: Ajoute des icônes de genre sur la page `detail.pl` en préfixant le titre.
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

  // Icônes pour genres (detail.pl)
  if (!window.location.pathname.includes('detail.pl')) {
    (function(){})('027-genre-icons-detail: skipped (not detail.pl)');
    return;
  }

  const genreIconMapping = Object.fromEntries((Array.isArray(CFG?.rules)?CFG.rules:[]).filter(r=>r?.match).map(r=>{
        const label=String(r.label||r.match); const src=String(r.src||""); const alt=String(r.alt||label);
        return [String(r.match),{icon:src?`<img src="${src.replace(/"/g,'&quot;')}" alt="${alt.replace(/"/g,'&quot;')}" style="width:30px;height:30px;" />`:'<span aria-hidden="true" style="font-size:24px">🎬</span>',label}];
      }));
  // Wait for the title element and then inspect page text to decide which icon to add
  waitForSelector('strong.titlebib', 2000).then((titleBibElement) => {
    try {
      if (!titleBibElement) return;
      const bodyText = document.body.innerText || '';
      for (const [genre, data] of Object.entries(genreIconMapping)) {
        if (bodyText.includes(`Sujet - Indexation: ${genre}`)) {
          const container = document.createElement('div');
          container.style.display = 'inline-block';
          container.style.textAlign = 'center';
          container.style.marginRight = '10px';

          const iconElement = document.createElement('span');
          iconElement.innerHTML = data.icon;
          iconElement.style.display = 'block';
          iconElement.style.cursor = 'pointer';
          iconElement.title = data.label;

          const captionElement = document.createElement('span');
          captionElement.innerText = data.label;
          captionElement.style.fontSize = '0.4em';
          captionElement.style.display = 'block';

          container.appendChild(iconElement);
          container.appendChild(captionElement);

          titleBibElement.prepend(container);
          break;
        }
      }
    } catch (err) {
      (function(){})('027-genre-icons-detail error:', err);
    }
  }).catch(() => { /* title not present or timed out */ });

  (function(){})('027-genre-icons-detail: loaded');
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