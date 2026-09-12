(function(){"use strict";
const KT=window.KohaTools;if(!KT||!KT.Config)return;const MODULE_ID='technical-grid-placement',CFG=KT.Config.getCanonical(MODULE_ID),Scope=KT.getService&&KT.getService("scope");
if(!CFG||!CFG.enabled||!["shadow","live"].includes(CFG.mode))return;if(Scope&&!Scope.match(CFG.general&&CFG.general.scope).ok)return;
const runtime={id:MODULE_ID,sourceFiles:['025-deplacer-grille-technique.js'],parity:"exact-legacy",init:function(){if(window["__KT_PARITY_"+MODULE_ID])return;window["__KT_PARITY_"+MODULE_ID]=true;

/* ===== EXACT LEGACY SOURCE: 025-deplacer-grille-technique.js ===== */
/*
 Nom du fichier: 025-deplacer-grille-technique.js
 Dépendances: aucune
 Date de dernière modification: 2026-02-21
 Auteur: Michael Mundet
 Description: Déplace l'information 'Grille utilisée' dans la section technique et masque certains spans inutiles.
*/
(function(){
  function localWaitForSelector(selector, timeout = 5000) {
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

  // Attempt to operate when relevant nodes appear; be defensive and non-throwing.
  waitForSelector('#catalogue_detail_framework', 4000).then((spanElement) => {
    try {
      if (!spanElement) return;
      // avoid duplicate injection
      if (spanElement.dataset.kohaMoved === '1') return;

      const spanContent = spanElement.innerHTML || '';
      const updatedContent = spanContent.replace(/Grille de catalogage MARC/i, '<strong>Grille utilisée</strong>');
      const liElement = document.createElement('li');
      liElement.innerHTML = updatedContent;
      liElement.dataset.kohaInjected = '025-grille';

      // prefer inserting after an element with class/selector 'strong.infotech', fallback to technical section list
      const strongElement = document.querySelector('strong.infotech');
      let inserted = false;
      if (strongElement && strongElement.parentNode) {
        try { strongElement.insertAdjacentElement('afterend', liElement); inserted = true; }
        catch (e) { inserted = false; }
      }

      if (!inserted) {
        // try to find a ul or ol in technical area
        const techList = document.querySelector('#technical_info') || document.querySelector('.technicallist') || document.querySelector('ul.technical, ol.technical');
        if (techList) {
          try { techList.appendChild(liElement); inserted = true; } catch (e) { inserted = false; }
        }
      }

      // only remove original span if insertion succeeded
      if (inserted) {
        try { spanElement.dataset.kohaMoved = '1'; spanElement.remove(); }
        catch (e) { /* noop */ }
      }
    } catch (err) {
      (function(){})('025-deplacer-grille-technique error:', err);
    }
  }).catch(() => {/* element not present, nothing to do */});

  // Hide elastic record span if present (no failure if not found)
  waitForSelector('#catalogue_detail_elastic_record', 3000).then((elasticRecordSpan) => {
    try {
      if (elasticRecordSpan && elasticRecordSpan.dataset.kohaHidden !== '1') {
        elasticRecordSpan.style.display = 'none';
        elasticRecordSpan.dataset.kohaHidden = '1';
      }
    } catch (e) { /* noop */ }
  }).catch(() => {/* not present */});

  (function(){})('025-deplacer-grille-technique: loaded');
  // si un <li data-koha-injected="025-grille"> existe déjà (par ex. rendu serveur),
  // s'assurer qu'il est bien positionné après le label infotech
  (function ensureInjectedLiPlacement() {
    try {
      const existing = document.querySelector('li[data-koha-injected="025-grille"]');
      if (!existing) return;
      const strongElement = document.querySelector('strong.infotech');
      if (strongElement && strongElement.nextElementSibling !== existing) {
        try { strongElement.insertAdjacentElement('afterend', existing); existing.dataset.kohaMoved = '1'; }
        catch (e) { /* noop */ }
        return;
      }
      // fallback: move to known technical list container if not already inside
      const techList = document.querySelector('#technical_info') || document.querySelector('.technicallist') || document.querySelector('ul.technical, ol.technical');
      if (techList && !techList.contains(existing)) {
        try { techList.appendChild(existing); existing.dataset.kohaMoved = '1'; } catch (e) { /* noop */ }
      }
    } catch (e) { /* noop */ }
  })();

  // si la page ajoute dynamiquement l'élément (ou le strong.infotech apparaît plus tard),
  // observer et réessayer le placement jusqu'à réussite (déconnecte ensuite)
  (function observeAndPlace() {
    try {
      let attempts = 0;
      const mo = new MutationObserver(() => {
        attempts++;
        const existing = document.querySelector('li[data-koha-injected="025-grille"]');
        const strongElement = document.querySelector('strong.infotech');
        if (existing && strongElement) {
          try { strongElement.insertAdjacentElement('afterend', existing); existing.dataset.kohaMoved = '1'; }
          catch (e) { /* noop */ }
          mo.disconnect();
          return;
        }
        if (attempts > 50) mo.disconnect(); // safety stop after some attempts (~observer cycles)
      });
      mo.observe(document.documentElement, { childList: true, subtree: true });
    } catch (e) { /* noop */ }
  })();

  // Déplacer la section technique sous la couverture (col-sm-3.bookcoverimg)
  (function moveTechniqueUnderCover() {
    try {
      function tryMove() {
        const technique = document.querySelector('.technique');
        const coverCol = document.querySelector('.bookcoverimg') || document.querySelector('#biblio-cover-slider')?.closest('.bookcoverimg');
        if (!technique || !coverCol) return false;

        // éviter duplication
        if (technique.dataset.kohaMovedToCover === '1') return true;

        try {
          // placer DANS le conteneur de couverture pour qu'elle soit bien sous l'image
          // appendChild déplace automatiquement l'élément s'il existe ailleurs
          coverCol.appendChild(technique);
          technique.dataset.kohaMovedToCover = '1';
          technique.classList.add('koha-technique-moved');

          // injecter un style minimal pour s'assurer que la section occupe la largeur
          if (!document.getElementById('025-tech-style')) {
            const s = document.createElement('style');
            s.id = '025-tech-style';
            s.textContent = `
              .bookcoverimg .technique { display: block; width: 100%; margin-top: 12px; box-sizing: border-box; background: #fff; padding: 15px; }
              .bookcoverimg .technique, .bookcoverimg .technique * { text-align: left !important; }
              .bookcoverimg .technique .content { display: block !important; }
            `;
            document.head.appendChild(s);
          }

          return true;
        } catch (e) { return false; }
      }

      if (!tryMove()) {
        // observer et déplacer dès que les deux éléments sont présents
        let attempts = 0;
        const mo = new MutationObserver(() => {
          attempts++;
          if (tryMove() || attempts > 50) mo.disconnect();
        });
        mo.observe(document.documentElement, { childList: true, subtree: true });
      }
    } catch (e) { (function(){})('025 moveTechniqueUnderCover failed', e); }
  })();
})();

},destroy:function(){return false;},onConfigChange:function(){return {reloadRequired:true};}};
KT.registerModule(runtime);if(CFG.mode==="shadow"){KT.record({module:MODULE_ID,level:"info",kind:"shadow-exact-parity-sealed",sources:runtime.sourceFiles});return;}runtime.init();
})();