(function(){"use strict";
const KT=window.KohaTools;if(!KT||!KT.Config)return;
const MODULE_ID='detail-technical-toggle',CFG=KT.Config.getCanonical(MODULE_ID),Scope=KT.getService&&KT.getService("scope");
if(!CFG||!CFG.enabled||!["shadow","live"].includes(CFG.mode))return;
if(Scope&&!Scope.match(CFG.general&&CFG.general.scope).ok)return;
const runtime={
 id:MODULE_ID,
 description:'Permet de replier ou déplier la section technique de la notice.',
 sourceFiles:['069-toggle-tech-section.js'],
 parity:"exact-legacy",
 reloadRequiredOnConfigChange:true,
 init:function(){
   if(window["__KT_PARITY_"+MODULE_ID])return;
   window["__KT_PARITY_"+MODULE_ID]=true;
   
/* ===== EXACT LEGACY SOURCE: 069-toggle-tech-section.js ===== */
/*
 Nom du fichier: 069-toggle-tech-section.js
 Dépendances: KOHA_UTILS.waitFor (fallback included)
 Date de dernière modification: 2026-02-21
 Auteur: Michael Mundet
 Description: Ajoute un toggle pour afficher/masquer la section technique sur `detail.pl`.
*/

(function(){
  'use strict';
  try{
    (function(){})('069-toggle-tech-section: loaded');

    if (!window.location.pathname || !window.location.pathname.endsWith('detail.pl')) return;

    const waitFor = (selector, timeout) => {
      if (window.KOHA_UTILS && typeof window.KOHA_UTILS.waitFor === 'function') return window.KOHA_UTILS.waitFor(selector, timeout);
      return new Promise((resolve, reject) => {
        const el = document.querySelector(selector);
        if (el) return resolve(el);
        const obs = new MutationObserver(() => {
          const found = document.querySelector(selector);
          if (found) { obs.disconnect(); resolve(found); }
        });
        obs.observe(document.documentElement, { childList: true, subtree: true });
        setTimeout(() => { obs.disconnect(); reject(new Error('timeout')); }, timeout || 3000);
      });
    };

    waitFor('.technique', 3000).then(function(divTechnique){
      try{
        if (!divTechnique) return;
        
        // Créer le bouton toggle (seulement la flèche)
        var toggleButton = document.createElement('button');
        toggleButton.textContent = '▼';
        toggleButton.style.cssText = 'cursor:pointer;border:none;background:none;font-size:14px;padding:4px;color:#666;float:right;';
        toggleButton.setAttribute('aria-label', 'Afficher/masquer la section technique');
        toggleButton.title = 'Afficher/masquer la section technique';

        var contentDiv = document.createElement('div');
        contentDiv.classList.add('content');
        contentDiv.style.display = 'block';

        while (divTechnique.firstChild) contentDiv.appendChild(divTechnique.firstChild);

        // Ajouter le bouton directement (sans conteneur)
        divTechnique.appendChild(toggleButton);
        divTechnique.appendChild(contentDiv);

        toggleButton.addEventListener('click', function (e) {
          e.stopPropagation();
          var isVisible = contentDiv.style.display === 'block';
          contentDiv.style.display = isVisible ? 'none' : 'block';
          toggleButton.textContent = isVisible ? '▶' : '▼';
        });
      }catch(e){ (function(){})('069: init error', e); }
    }).catch(function(){ /* element not found */ });

  }catch(err){ (function(){})('069-toggle-tech-section: failed', err); }
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