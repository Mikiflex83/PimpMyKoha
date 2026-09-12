(function(){"use strict";
const KT=window.KohaTools;if(!KT||!KT.Config)return;const MODULE_ID='cover-placement-coordinator',CFG=KT.Config.getCanonical(MODULE_ID),Scope=KT.getService&&KT.getService("scope");
if(!CFG||!CFG.enabled||!["shadow","live"].includes(CFG.mode))return;if(Scope&&!Scope.match(CFG.general&&CFG.general.scope).ok)return;
const runtime={id:MODULE_ID,sourceFiles:['090-positionnement-couvertures.js', '096-result-and-detail-image-placement.js', '121-placement-couv.js', '054-align-856-images.js'],parity:"exact-legacy",init:function(){if(window["__KT_PARITY_"+MODULE_ID])return;window["__KT_PARITY_"+MODULE_ID]=true;

/* ===== EXACT LEGACY SOURCE: 090-positionnement-couvertures.js ===== */
/*
 Nom du fichier: 090-positionnement-couvertures.js
 Dépendances: KOHA_UTILS.waitFor (fallback included)
 Date de dernière modification: 2026-05-22 (2)
 Auteur: Michael Mundet
 Description: Positionne et évite les doublons d'images de couvertures sur catalogue/detail.
*/

(function(){
  'use strict';
  try{
    (function(){})('090-positionnement-couvertures: loaded');

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

    if (window.location.pathname && window.location.pathname.includes('/detail.pl')){
      waitFor('#catalogue_detail_biblio', 3000).then(target => {
        try{
          if (!target) return;
          const coverCol = document.querySelector('.bookcoverimg') || document.querySelector('#biblio-cover-slider')?.closest('.bookcoverimg') || target;

          function getBestImgSource(img) {
            if (!img) return '';
            return img.getAttribute('src') || img.currentSrc || img.src || '';
          }

          function isLikelyPlaceholder(src) {
            return /no[-_ ]?cover|nocover|placeholder|cover_unavailable|no[-_ ]?image/i.test(src || '');
          }

          function isLikelyObsolete856Url(src) {
            return /electre\.com\/GetBlob\.ashx\?Ean=.*,/i.test(src || '');
          }

          function isUsableImage(img) {
            if (!img) return false;
            const src = getBestImgSource(img);
            if (!src || isLikelyPlaceholder(src)) return false;
            if (!img.complete) return false;
            return (img.naturalWidth || 0) > 20 && (img.naturalHeight || 0) > 20;
          }

          function ensure856InsideSlider() {
            const imgcouv = document.querySelector('.imgcouv');
            const coverSlider = document.getElementById('biblio-cover-slider') || document.querySelector('.bookcoverimg .cover-slides');
            if (!imgcouv || !coverSlider) return;

            const src = getBestImgSource(imgcouv);
            if (!src) return;

            const existing856Block = coverSlider.querySelector('.cover-image.koha-856-cover-image');

            // If a valid non-856 image already exists in slider, do not inject 856 clone.
            const hasOtherValidCover = Array.from(coverSlider.querySelectorAll('.cover-image')).some(function (block) {
              if (block.classList.contains('koha-856-cover-image')) return false;
              const im = block.querySelector('img');
              return isUsableImage(im);
            });

            if (hasOtherValidCover) {
              if (existing856Block) existing856Block.remove();
              if (!coverCol.contains(imgcouv)) coverCol.appendChild(imgcouv);
              imgcouv.style.maxWidth = '120px';
              imgcouv.style.marginRight = '12px';
              return;
            }

            // Ignore known obsolete 856 URL patterns, keep legacy image visible as fallback.
            if (isLikelyObsolete856Url(src)) {
              if (existing856Block) existing856Block.remove();
              if (!coverCol.contains(imgcouv)) coverCol.appendChild(imgcouv);
              imgcouv.style.maxWidth = '120px';
              imgcouv.style.marginRight = '12px';
              return;
            }

            const existingSame = Array.from(coverSlider.querySelectorAll('.cover-image img')).some(function (im) {
              return getBestImgSource(im) === src;
            });

            // keep legacy image as source/fallback, but display through slider block
            if (!coverCol.contains(imgcouv)) coverCol.appendChild(imgcouv);
            imgcouv.style.maxWidth = '120px';
            imgcouv.style.marginRight = '12px';

            if (!existingSame) {
              let block = existing856Block;
              if (!block) {
                block = document.createElement('div');
                block.className = 'cover-image koha-856-cover-image';
                block.style.display = 'block';

                const im = document.createElement('img');
                block.appendChild(im);

                const hint = document.createElement('div');
                hint.className = 'hint';
                hint.textContent = 'Image provenant du 856';
                block.appendChild(hint);

                coverSlider.appendChild(block);
              }

              const blockImg = block.querySelector('img');
              if (blockImg && getBestImgSource(blockImg) !== src) blockImg.src = src;
            }
          }

          let syncRunning = false;
          let syncQueued = false;

          function syncCoverState() {
            if (syncRunning) return;
            syncRunning = true;
            try {
              ensure856InsideSlider();
              updateDetailCoverVisibility();
            } finally {
              syncRunning = false;
            }
          }

          function queueSyncCoverState() {
            if (syncQueued) return;
            syncQueued = true;
            requestAnimationFrame(function () {
              syncQueued = false;
              syncCoverState();
            });
          }

          syncCoverState();

          const sliderImg = document.querySelector('.slider .img'); const mainImg = document.querySelector('.imgcouv');
          if (sliderImg && mainImg && sliderImg.src && mainImg.src && sliderImg.src === mainImg.src) sliderImg.style.display='none';

          // Hide .imgcouv only when slider has a real visible cover image.
          // This prevents hiding the 856 cover when slider only has placeholders.
          function updateDetailCoverVisibility() {
            const imgcouv = (document.querySelector('.bookcoverimg .imgcouv') || document.querySelector('#catalogue_detail_biblio .imgcouv') || document.querySelector('.imgcouv'));
            if (!imgcouv) return;
            const coverSlider = document.querySelector('#biblio-cover-slider, .bookcoverimg .cover-slides');
            if (!coverSlider) return;

            function isVisible(el) {
              if (!el) return false;
              const cs = window.getComputedStyle(el);
              return cs.display !== 'none' && cs.visibility !== 'hidden' && parseFloat(cs.opacity || '1') > 0;
            }

            const hasVisible = Array.from(coverSlider.querySelectorAll('.cover-image')).some(function(el){
              if (!isVisible(el)) return false;
              const img = el.querySelector('img');
              if (!img || !img.src) return false;
              if (isLikelyPlaceholder(img.src)) return false;
              if (!img.complete) return false;
              return (img.naturalWidth || 0) > 20 && (img.naturalHeight || 0) > 20;
            });

            imgcouv.style.display = hasVisible ? 'none' : '';
          }

          const coverSlider = document.querySelector('#biblio-cover-slider, .bookcoverimg .cover-slides');
          if (coverSlider) {
            const obs = new MutationObserver(queueSyncCoverState);
            obs.observe(coverSlider, {
              subtree: true,
              childList: true,
              attributes: true,
              attributeFilter: ['style', 'class', 'src']
            });
          }

          const imgcouvForLoad = document.querySelector('.imgcouv');
          if (imgcouvForLoad) {
            imgcouvForLoad.addEventListener('load', function () {
              queueSyncCoverState();
            }, { once: true });
          }
        }catch(e){ (function(){})('090: positioning failed', e); }
      }).catch(()=>{});
    }

  }catch(e){ (function(){})('090-positionnement-couvertures: failed', e); }
})();


/* ===== EXACT LEGACY SOURCE: 096-result-and-detail-image-placement.js ===== */
/*
 Nom du fichier: 096-result-and-detail-image-placement.js
 Dépendances: KOHA_UTILS.waitFor (fallback included)
 Date de dernière modification: 2026-02-21
 Auteur: Michael Mundet
 Description: Réorganise l'emplacement des images sur les pages de résultats et de détail.
*/

(function(){
  'use strict';
  try{
    (function(){})('096-result-and-detail-image-placement: loaded');
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

    if (window.location.pathname && window.location.pathname.includes('/search.pl')){
      waitFor('.result', 3000).then(() => {
        try{ document.querySelectorAll('.result').forEach(r => { const thumb = r.querySelector('.thumbimg'); const title = r.querySelector('.title'); if (thumb && title && title.parentNode) title.parentNode.insertBefore(thumb, title); }); }catch(e){ (function(){})('096: search reposition failed', e); }
      }).catch(()=>{});
    }

    if (window.location.pathname && window.location.pathname.includes('/detail.pl')){
      waitFor('#catalogue_detail_biblio, .imgcouv', 3000).then(() => {
        try{
          // If a cover slider exists, script 090 handles placement inside it.
          if (document.getElementById('biblio-cover-slider') || document.querySelector('.bookcoverimg .cover-slides')) return;

          const img = document.querySelector('.imgcouv');
          const coverCol = document.querySelector('.bookcoverimg') || document.querySelector('#biblio-cover-slider')?.closest('.bookcoverimg');
          if (img && coverCol && !coverCol.contains(img)) {
            coverCol.insertBefore(img, coverCol.firstChild);
            img.style.float = 'none';
            img.style.marginRight = '0';
            img.style.marginBottom = '8px';
            img.style.maxWidth = '140px';
            img.style.display = '';
          }
        }catch(e){ (function(){})('096: detail reposition failed', e); }
      }).catch(()=>{});
    }

  }catch(e){ (function(){})('096-result-and-detail-image-placement: failed', e); }
})();


/* ===== EXACT LEGACY SOURCE: 121-placement-couv.js ===== */
(function() {
    'use strict';

    // Fonction principale pour repositionner la couverture
    function repositionnerCouverture() {
        // Sélectionner le conteneur du slider
        const slider = document.getElementById('biblio-cover-slider');
        if (!slider) return;

        // Sélectionner la zone technique (avec les points verts)
        const zoneTech = document.querySelector('.technique');
        if (!zoneTech) return;

        // Sélectionner l'image active dans le slider
        const imageActive = slider.querySelector('.cover-image img');
        if (!imageActive) return;

        // Récupérer les positions
        const rectSlider = slider.getBoundingClientRect();
        const rectTech = zoneTech.getBoundingClientRect();

        // Vérifier si la couverture (le slider) est en dessous de la zone technique
        // ou si elle la chevauche trop
        const basSlider = rectSlider.top + rectSlider.height;
        const hautTech = rectTech.top;

        // Si le slider est en dessous ou chevauche la zone technique
        if (basSlider > hautTech + 10) {
            // Forcer le slider à rester au-dessus
            slider.style.position = 'relative';
            slider.style.marginBottom = '20px';
            slider.style.display = 'block';
            
            // Si l'image est trop grande, on la redimensionne
            const img = slider.querySelector('img');
            if (img) {
                img.style.maxWidth = '100%';
                img.style.height = 'auto';
            }

            (function(){})('✅ Couverture repositionnée au-dessus de la zone technique');
        } else {
            // Réinitialiser si tout va bien
            slider.style.marginBottom = '';
        }
    }

    // Fonction pour forcer le repositionnement avec délai
    function forcerRepositionnement() {
        repositionnerCouverture();
        // Rappels pour être sûr
        setTimeout(repositionnerCouverture, 100);
        setTimeout(repositionnerCouverture, 300);
        setTimeout(repositionnerCouverture, 500);
        setTimeout(repositionnerCouverture, 1000);
    }

    // Initialisation
    function initialiser() {
        // Au chargement
        if (document.readyState === 'complete') {
            forcerRepositionnement();
        } else {
            window.addEventListener('load', forcerRepositionnement);
        }

        // Surveiller les clics sur les points verts (cover-nav)
        document.addEventListener('click', function(e) {
            const target = e.target.closest('.cover-nav');
            if (target) {
                (function(){})('🟢 Clic sur un point vert - repositionnement...');
                // Attendre que le slider ait fini sa transition
                setTimeout(repositionnerCouverture, 50);
                setTimeout(repositionnerCouverture, 150);
                setTimeout(repositionnerCouverture, 300);
            }
        });

        // Surveiller les changements dans le slider
        const observer = new MutationObserver(function() {
            repositionnerCouverture();
        });

        const slider = document.getElementById('biblio-cover-slider');
        if (slider) {
            observer.observe(slider, {
                attributes: true,
                childList: true,
                subtree: true,
                attributeFilter: ['style', 'class']
            });
        }

        // Surveiller les changements d'image
        document.addEventListener('load', function(e) {
            if (e.target.tagName === 'IMG' && e.target.closest('#biblio-cover-slider')) {
                setTimeout(repositionnerCouverture, 50);
            }
        }, true);

        // Redimensionnement
        window.addEventListener('resize', debounce(repositionnerCouverture, 200));
    }

    // Fonction debounce
    function debounce(fn, delay) {
        let timer;
        return function() {
            clearTimeout(timer);
            timer = setTimeout(fn, delay);
        };
    }

    // Ajouter du style pour fluidifier
    const style = document.createElement('style');
    style.textContent = `
        #biblio-cover-slider {
            transition: height 0.3s ease, margin 0.3s ease;
        }
        #biblio-cover-slider img {
            transition: opacity 0.3s ease;
            max-width: 100%;
        }
        .technique {
            clear: both;
            position: relative;
            z-index: 1;
        }
    `;
    document.head.appendChild(style);

    // Démarrer
    initialiser();

    // Exposer la fonction
    window.repositionnerCouverture = repositionnerCouverture;

    (function(){})('🔄 Script de repositionnement du slider activé');
    (function(){})('ℹ️ La couverture reste au-dessus de la zone technique (points verts)');
})();

/* ===== EXACT LEGACY SOURCE: 054-align-856-images.js ===== */
/*
 Nom du fichier: 054-align-856-images.js
 Dépendances: none
 Date de dernière modification: 2026-02-21
 Auteur: Michael Mundet
 Description: Aligne les images de couverture (`.imgcouvlist`) dans les résultats `search.pl`.
*/

(function(){
  if (!window.location.href.match(/search\.pl/)) {
    (function(){})('054-align-856-images: skipped (not search.pl)');
    return;
  }

  try {
    // Move imgcouvlist into .bookcoverimg if not already there
    document.querySelectorAll('.imgcouvlist').forEach(function(image) {
      try {
        var parentRow = image.closest('tr');
        if (!parentRow) return;
        var tdCible = parentRow.querySelector('.bookcoverimg');
        if (tdCible && !tdCible.contains(image)) tdCible.appendChild(image);
      } catch (e) { /* ignore per-image errors */ }
    });

    // Hide imgcouvlist when cover-slides already shows a cover image
    function updateCoverVisibility(bookcoverTd) {
      var imgcouvlist = bookcoverTd.querySelector('.imgcouvlist');
      if (!imgcouvlist) return;
      var coverSlides = bookcoverTd.querySelector('.cover-slides');
      if (!coverSlides) return;
      var hasVisibleCover = Array.from(coverSlides.querySelectorAll('.cover-image')).some(function(el) {
        return el.style.display === 'block';
      });
      imgcouvlist.style.display = hasVisibleCover ? 'none' : '';
    }

    // Initial synchronous check (covers already loaded / cached)
    document.querySelectorAll('.bookcoverimg').forEach(updateCoverVisibility);

    // Watch for async cover loading (cover-slides updates style asynchronously)
    var observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mut) {
        var bookcoverTd = mut.target.closest ? mut.target.closest('.bookcoverimg') : null;
        if (bookcoverTd) updateCoverVisibility(bookcoverTd);
      });
    });
    document.querySelectorAll('.cover-slides').forEach(function(slides) {
      observer.observe(slides, { subtree: true, attributes: true, attributeFilter: ['style'] });
    });

  } catch (err) {
    (function(){})('054-align-856-images error:', err);
  }

  (function(){})('054-align-856-images: loaded');
})();

},destroy:function(){return false;},onConfigChange:function(){return {reloadRequired:true};}};
KT.registerModule(runtime);if(CFG.mode==="shadow"){KT.record({module:MODULE_ID,level:"info",kind:"shadow-exact-parity-sealed",sources:runtime.sourceFiles});return;}runtime.init();
})();