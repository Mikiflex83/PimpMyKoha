(function(){"use strict";
const KT=window.KohaTools;if(!KT||!KT.Config)return;
const MODULE_ID='cataloging-6xx-suggestions',CFG=KT.Config.getCanonical(MODULE_ID),Scope=KT.getService&&KT.getService("scope");
if(!CFG||!CFG.enabled||!["shadow","live"].includes(CFG.mode))return;
if(Scope&&!Scope.match(CFG.general&&CFG.general.scope).ok)return;
const runtime={
 id:MODULE_ID,
 description:'Moteur configurable de listes de suggestions pour plusieurs sous-zones UNIMARC 6XX.',
 sourceFiles:['081-6xx-genre-select2.js', '082-6xx-indexation-select2.js', '083-6xx-element-entry-suggestions.js', '084-6xx-subject-category-suggestions.js'],
 parity:"exact-legacy",
 reloadRequiredOnConfigChange:true,
 init:function(){
   if(window["__KT_PARITY_"+MODULE_ID])return;
   window["__KT_PARITY_"+MODULE_ID]=true;
   
/* ===== EXACT LEGACY SOURCE: 081-6xx-genre-select2.js ===== */
/*
 Nom du fichier: 081-6xx-genre-select2.js
 Dépendances: Select2 (CDN)
 Date de dernière modification: 2026-04-02
 Auteur: Michael Mundet
 Description: Zone 608$a - version de référence (fonctionnelle) pour liste déroulante complète.
*/

document.addEventListener('DOMContentLoaded', function () {
  if (!window.location.pathname.includes('/addbiblio.pl')) return;

  const loadSelect2 = function () {
    if (!document.getElementById('select2-css')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/css/select2.min.css';
      link.id = 'select2-css';
      document.head.appendChild(link);
    }
    if (!document.getElementById('select2-js')) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/js/select2.min.js';
      script.id = 'select2-js';
      document.body.appendChild(script);
    }
  };

  const ensureSelect2DropdownStyles = function () {
    if (document.getElementById('select2-genre-dropdown-styles')) return;

    const style = document.createElement('style');
    style.id = 'select2-genre-dropdown-styles';
    style.textContent = [
      '.select2-container--open { z-index: 99999; }',
      '.select2-container--open .select2-dropdown { z-index: 99999; }',
      '.select2-results__options { max-height: min(70vh, 520px) !important; overflow-y: auto !important; }'
    ].join(' ');
    document.head.appendChild(style);
  };

  loadSelect2();
  ensureSelect2DropdownStyles();

  const tab = document.getElementById('tab6XX-tab');
  if (!tab) return;

  tab.addEventListener('click', function () {
    setTimeout(function () {
      const label = Array.from(document.querySelectorAll('label.labelsubfield'))
        .find(el => el.textContent.trim() === 'Genre littéraire');

      if (!label) return;

      const inputId = label.getAttribute('for');
      const originalInput = document.getElementById(inputId);

      if (!originalInput || originalInput.dataset.modified) return;

      const originalValue = originalInput.value;
      const container = document.createElement('div');
      container.style.display = 'flex';
      container.style.gap = '10px';
      container.style.alignItems = 'center';
      container.style.width = '100%';

      const textInput = originalInput.cloneNode(true);
      textInput.style.width = '50%';
      textInput.disabled = true;
      textInput.dataset.modified = 'true';

      const select = document.createElement('select');
      select.style.width = '50%';
      select.className = originalInput.className;
      select.name = originalInput.name + '_select';
      select.setAttribute('placeholder', 'Sélectionner un genre');
      select.dataset.modified = 'true';

      const options = [
        { value: '', text: 'Sélectionner un genre' },
        { value: 'Abécédaires', text: 'Abécédaires' },
        { value: 'Action & Aventure', text: 'Action & Aventure' },
        { value: 'Albums pour les plus grands', text: 'Albums pour les plus grands' },
        { value: 'Apprentissage', text: 'Apprentissage' },
        { value: 'Aventure', text: 'Aventure' },
        { value: 'Bandes originales de films', text: 'Bandes originales de films' },
        { value: 'Biographies romancées', text: 'Biographies romancées' },
        { value: 'Black Music', text: 'Black Music' },
        { value: 'Classiques', text: 'Classiques' },
        { value: 'Comics', text: 'Comics' },
        { value: 'Comptine, chanson', text: 'Comptine, chanson' },
        { value: 'Dark romance', text: 'Dark romance' },
        { value: 'Docu-fictions, biographies, histoires vécues', text: 'Docu-fictions, biographies, histoires vécues' },
        { value: 'Dystopie', text: 'Dystopie' },
        { value: 'Electro', text: 'Electro' },
        { value: 'Érotique', text: 'Érotique' },
        { value: 'Espionnage', text: 'Espionnage' },
        { value: 'Fantastique/Fantasy', text: 'Fantastique/Fantasy' },
        { value: 'Feel good', text: 'Feel good' },
        { value: 'Film Famille', text: 'Film Famille' },
        { value: 'Film d\'animation', text: 'Film d\'animation' },
        { value: 'Film-Vintage', text: 'Film-Vintage' },
        { value: 'Films - Grands classiques', text: 'Films - Grands classiques' },
        { value: 'Films-Aventure', text: 'Films-Aventure' },
        { value: 'Films-Action', text: 'Films-Action' },
        { value: 'Films-Courts métrages', text: 'Films-Courts métrages' },
        { value: 'Films-Drames', text: 'Films-Drames' },
        { value: 'Films-Japanimation', text: 'Films-Japanimation' },
        { value: 'Films-Regards de femmes', text: 'Films-Regards de femmes' },
        { value: 'Films-Science-fiction', text: 'Films-Science-fiction' },
        { value: 'Films-Se détendre', text: 'Films-Se détendre' },
        { value: 'Films-Western', text: 'Films-Western' },
        { value: 'Films d\'horreur', text: 'Films d\'horreur' },
        { value: 'Films historiques', text: 'Films historiques' },
        { value: 'Films muets', text: 'Films muets' },
        { value: 'Films musicaux', text: 'Films musicaux' },
        { value: 'Films noirs', text: 'Films noirs' },
        { value: 'Frissons', text: 'Frissons' },
        { value: 'Historique', text: 'Historique' },
        { value: 'Horreur', text: 'Horreur' },
        { value: 'Humour', text: 'Humour' },
        { value: 'Imagiers', text: 'Imagiers' },
        { value: 'Initiatique', text: 'Initiatique' },
        { value: 'Jazz', text: 'Jazz' },
        { value: 'Légendes, mythes, fables', text: 'Légendes, mythes, fables' },
        { value: 'Livre à toucher', text: 'Livre à toucher' },
        { value: 'Livre sonore', text: 'Livre sonore' },
        { value: 'Livre animé', text: 'Livre animé' },
        { value: 'Livres à compter', text: 'Livres à compter' },
        { value: 'Livre-jeu', text: 'Livre-jeu' },
        { value: 'Mondes Imaginaires', text: 'Mondes Imaginaires' },
        { value: 'Mystères et enquêtes', text: 'Mystères et enquêtes' },
        { value: 'Musique Classique', text: 'Musique Classique' },
        { value: 'Musique Francophone', text: 'Musique Francophone' },
        { value: 'Musique actuelle', text: 'Musique actuelle' },
        { value: 'Musique du monde', text: 'Musique du monde' },
        { value: 'Nature', text: 'Nature' },
        { value: 'Novélisation de films/séries', text: 'Novélisation de films/séries' },
        { value: 'Novélisation de jeux vidéo', text: 'Novélisation de jeux vidéo' },
        { value: 'Nouvelles', text: 'Nouvelles' },
        { value: 'Policier', text: 'Policier' },
        { value: 'Psychologique', text: 'Psychologique' },
        { value: 'Réaliste', text: 'Réaliste' },
        { value: 'Récits de vie', text: 'Récits de vie' },
        { value: 'Rimes', text: 'Rimes' },
        { value: 'Romance', text: 'Romance' },
        { value: 'Science-fiction', text: 'Science-fiction' },
        { value: 'Sentimental', text: 'Sentimental' },
        { value: 'Serie', text: 'serie' },
        { value: 'Séries courtes', text: 'Séries courtes' },
        { value: 'Terroir', text: 'Terroir' },
        { value: 'Thriller', text: 'Thriller' }
      ];

      options.forEach(function (opt) {
        const option = document.createElement('option');
        option.value = opt.value;
        option.textContent = opt.text;
        if (opt.value === originalValue) option.selected = true;
        select.appendChild(option);
      });

      select.addEventListener('change', function () {
        textInput.value = this.value || '';
      });

      if (originalValue && !options.find(opt => opt.value === originalValue)) {
        select.value = '';
      } else {
        textInput.value = select.value;
      }

      originalInput.parentNode.replaceChild(container, originalInput);
      container.appendChild(textInput);
      container.appendChild(select);

      const waitForSelect2 = setInterval(function () {
        if (window.jQuery && window.jQuery.fn.select2) {
          window.jQuery(select).select2({
            width: '100%',
            placeholder: 'Sélectionner un genre',
            allowClear: true,
            dropdownParent: window.jQuery(document.body)
          });
          clearInterval(waitForSelect2);
        }
      }, 100);

      originalInput.dataset.modified = true;
    }, 1500);
  });
});


/* ===== EXACT LEGACY SOURCE: 082-6xx-indexation-select2.js ===== */
/*
 Nom du fichier: 082-6xx-indexation-select2.js
 Dépendances: KOHA_UTILS.waitFor (fallback included), optional Select2
 Date de dernière modification: 2026-02-21
 Auteur: Michael Mundet
 Description: Zone 610 - propose un champ mixte avec suggestions et Select2 si disponible.
*/

(function(){
  'use strict';
  try{
    (function(){})('082-6xx-indexation-select2: loaded');
    if (!window.location.pathname || !window.location.pathname.includes('/addbiblio.pl')) return;

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

    waitFor('#tab6XX-tab', 3000).then(tab => {
      tab.addEventListener('click', () => {
        waitFor('label.labelsubfield', 2000).then(() => {
          try{
            const label610 = Array.from(document.querySelectorAll('label.labelsubfield')).find(el => (el.textContent||'').trim() === 'Indexation');
            if (!label610) return;
            const inputId610 = label610.getAttribute('for');
            const originalSelect610 = document.getElementById(inputId610);
            if (!originalSelect610 || originalSelect610.dataset.modified610) return;

            const originalValue610 = originalSelect610.value || '';
            const container = document.createElement('div'); Object.assign(container.style, { display: 'flex', gap: '10px', alignItems: 'center', width: '100%' });
            const cloneSelect610 = originalSelect610.cloneNode(true); cloneSelect610.style.width='50%'; cloneSelect610.id += '_clone'; cloneSelect610.disabled = true;
            const suggestionSelect610 = document.createElement('select'); suggestionSelect610.style.width='50%'; suggestionSelect610.className = 'koha-6xx-suggestions-select'; suggestionSelect610.name = originalSelect610.name + '_suggestions'; suggestionSelect610.setAttribute('data-koha-custom', '1');

            const options610 = [
              { value: '', text: 'Sélectionner une indexation' },
              { value: 'Adaptation litteraire', text: 'Adaptation littéraire' },
              { value: 'Album sans texte', text: 'Album sans texte' },
              { value: 'Antivol', text: 'Antivol' },
              { value: 'Bandes originales', text: 'Bandes originales' },
              { value: 'BD Documentaire', text: 'BD Documentaire' },
              { value: 'BD One Shot', text: 'BD One Shot' },
              { value: 'BD petit format', text: 'BD Petit format' },
              { value: 'BD sans texte', text: 'BD sans texte' },
              { value: 'Biographie', text: 'Biographie' },
              { value: 'Black Music', text: 'Black Music' },
              { value: 'Comics', text: 'Comics' },
              { value: 'Corner nature', text: 'Corner nature' },
              { value: 'DVD Musicaux', text: 'DVD Musicaux' },
              { value: 'DVD Théâtre', text: 'DVD Théâtre' },
              { value: 'Dyslexique', text: 'Dyslexique' },
              { value: 'Electro', text: 'Electro' },
              { value: 'Film d\'animation', text: 'Film d\'animation' },
              { value: 'Film Famille', text: 'Film Famille' },
              { value: 'Film-Drame', text: 'Film-Drame' },
              { value: 'Film-Vintage', text: 'Film-Vintage' },
              { value: 'Films - Grands classiques', text: 'Films - Grands classiques' },
              { value: 'Films-Aventure', text: 'Films-Aventure' },
              { value: 'Films-Action', text: 'Films-Action' },
              { value: 'Films-Courts métrages', text: 'Films-Courts métrages' },
              { value: 'Films-Grands classiques', text: 'Films-Grands classiques' },
              { value: 'Films-Japanimation', text: 'Films-Japanimation' },
              { value: 'Films-Regards de femmes', text: 'Films-Regards de femmes' },
              { value: 'Films-Science-fiction', text: 'Films-Science-fiction' },
              { value: 'Films-Se détendre', text: 'Films-Se détendre' },
              { value: 'Films-Western', text: 'Films-Western' },
              { value: 'Films d\'horreur', text: 'Films d\'horreur' },
              { value: 'Films historiques', text: 'Films historiques' },
              { value: 'Films muets', text: 'Films muets' },
              { value: 'Films musicaux', text: 'Films musicaux' },
              { value: 'Films noirs', text: 'Films noirs' },
              { value: 'Facile a lire', text: 'Facile a lire' },
              { value: 'Humour', text: 'Humour' },
              { value: 'Images de dragons', text: 'Images de dragons' },
              { value: 'Instruments de musique', text: 'Instruments de musique' },
              { value: 'Jazz', text: 'Jazz' },
              { value: 'Jeu illustrateur', text: 'Jeu illustrateur' },
              { value: 'Jeux de société', text: 'Jeux de société' },
              { value: 'Langues etrangeres', text: 'Langues étrangères' },
              { value: 'litteratures', text: 'Littératures' },
              { value: 'Mangas', text: 'Mangas' },
              { value: 'Musique à Lire', text: 'Musique à Lire' },
              { value: 'Musique actuelle', text: 'Musique actuelle' },
              { value: 'Musique Classique', text: 'Musique Classique' },
              { value: 'Musique du monde', text: 'Musique du monde' },
              { value: 'Musique Francophone', text: 'Musique Francophone' },
              { value: 'Parents et compagnie', text: 'Parents et compagnie' },
              { value: 'Poesie et theatre', text: 'Poésie et théâtre' },
              { value: 'Première lecture', text: 'Première lecture' },
              { value: 'Premieres cases', text: 'Premières cases' },
              { value: 'Romans Ados', text: 'Romans Ados' },
              { value: 'Scène locale', text: 'Scène locale' },
              { value: 'serie', text: 'Série' },
              { value: 'Séries courtes', text: 'Séries courtes' },
              { value: 'Textes illustrés', text: 'Textes illustrés' },
              { value: 'vintage', text: 'Film - Vintage' }
            ];
            options610.forEach(opt => { const option = document.createElement('option'); option.value = opt.value; option.textContent = opt.text; if (opt.value === originalValue610) option.selected = true; suggestionSelect610.appendChild(option); });

            suggestionSelect610.addEventListener('change', function(){ if (this.value) { cloneSelect610.value = this.value; try{ if (window.jQuery && window.jQuery.fn && window.jQuery.fn.select2) window.jQuery(cloneSelect610).trigger('change.select2'); } catch(e){ (function(){})('082: triggering select2 change failed', e); } } });

            if (originalSelect610.parentNode) originalSelect610.parentNode.replaceChild(container, originalSelect610);
            container.appendChild(cloneSelect610); container.appendChild(suggestionSelect610);

            (function waitForSelect2(remaining){ if (window.jQuery && window.jQuery.fn && window.jQuery.fn.select2){ try{ window.jQuery(suggestionSelect610).select2({ width: '100%', placeholder: 'Selectionnez une indexation', allowClear: true }); }catch(e){ (function(){})('082: select2 init error', e); } return; } if (remaining<=0) return; setTimeout(()=>waitForSelect2(10),200); })(10);

            originalSelect610.dataset.modified610 = true;
          }catch(e){ (function(){})('082: handling tab content failed', e); }
        }).catch(()=>{});
      });
    }).catch(()=>{});

  }catch(e){ (function(){})('082-6xx-indexation-select2: failed', e); }
})();


/* ===== EXACT LEGACY SOURCE: 083-6xx-element-entry-suggestions.js ===== */
/*
 Nom du fichier: 083-6xx-element-entry-suggestions.js
 Dépendances: KOHA_UTILS.waitFor (fallback included), optional Select2
 Date de dernière modification: 2026-02-21
 Auteur: Michael Mundet
 Description: Zone 623 - suggestions pour l'élément d'entrée avec init Select2 si disponible.
*/

(function(){
  'use strict';
  try{
    (function(){})('083-6xx-element-entry-suggestions: loaded');
    if (!window.location.pathname || !window.location.pathname.includes('/addbiblio.pl')) return;

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

    waitFor('#tab6XX-tab', 3000).then(tab => {
      tab.addEventListener('click', () => {
        waitFor('label.labelsubfield', 2000).then(() => {
          try{
            const label623 = Array.from(document.querySelectorAll('label.labelsubfield')).find(el => (el.textContent||'').trim() === "Elément d'entrée");
            if (!label623) return;
            const inputId623 = label623.getAttribute('for');
            const originalInput623 = document.getElementById(inputId623);
            if (!originalInput623 || originalInput623.dataset.modified623) return;

            const originalValue623 = originalInput623.value || '';
            const container623 = document.createElement('div'); Object.assign(container623.style, { display: 'flex', gap: '10px', alignItems: 'center', width: '100%' });
            const cloneInput623 = originalInput623.cloneNode(true); cloneInput623.style.width='50%'; cloneInput623.id += '_clone'; cloneInput623.disabled = true;
            const suggestionSelect623 = document.createElement('select'); suggestionSelect623.style.width='50%'; suggestionSelect623.className = 'koha-6xx-suggestions-select'; suggestionSelect623.name = originalInput623.name + '_suggestions'; suggestionSelect623.setAttribute('data-koha-custom', '1');

            const options623 = [ { value: '', text: 'Sélectionner un personnage' }, { value: 'Sorcières', text: 'Sorcières' }, { value: 'Le loup', text: 'Le loup' }, { value: 'Monstres', text: 'Monstres' }, { value: 'Sirènes', text: 'Sirènes' }, { value: 'Princes, chevaliers et princesses', text: 'Princes, chevaliers et princesses' }, { value: 'Pirates', text: 'Pirates' }, { value: 'Indiens, Cow-boys', text: 'Indiens, Cow-boys' }, { value: 'Superhéros', text: 'Superhéros' }, { value: 'Multiculturalisme et diversité', text: 'Multiculturalisme et diversité' } ];
            options623.forEach(opt => { const option = document.createElement('option'); option.value = opt.value; option.textContent = opt.text; if (opt.value === originalValue623) option.selected = true; suggestionSelect623.appendChild(option); });

            suggestionSelect623.addEventListener('change', function(){ if (this.value) { cloneInput623.value = this.value; cloneInput623.dispatchEvent(new Event('input')); } });

            if (originalInput623.parentNode) originalInput623.parentNode.replaceChild(container623, originalInput623);
            container623.appendChild(cloneInput623); container623.appendChild(suggestionSelect623);

            (function waitForSelect2(remaining){ if (window.jQuery && window.jQuery.fn && window.jQuery.fn.select2){ try{ window.jQuery(suggestionSelect623).select2({ width: '100%', placeholder: 'Sélectionner un personnage', allowClear: true }); }catch(e){ (function(){})('083: select2 init error', e); } return; } if (remaining<=0) return; setTimeout(()=>waitForSelect2(10),200); })(10);

            originalInput623.dataset.modified623 = true;
          }catch(e){ (function(){})('083: handling tab content failed', e); }
        }).catch(()=>{});
      });
    }).catch(()=>{});

  }catch(e){ (function(){})('083-6xx-element-entry-suggestions: failed', e); }
})();


/* ===== EXACT LEGACY SOURCE: 084-6xx-subject-category-suggestions.js ===== */
/*
 Nom du fichier: 084-6xx-subject-category-suggestions.js
 Dépendances: KOHA_UTILS.waitFor (fallback included), optional Select2
 Date de dernière modification: 2026-02-21
 Auteur: Michael Mundet
 Description: Zone 615 - suggestions pour la catégorie sujet avec Select2 si disponible.
*/

(function(){
  'use strict';
  try{
    (function(){})('084-6xx-subject-category-suggestions: loaded');
    if (!window.location.pathname || !window.location.pathname.includes('/addbiblio.pl')) return;

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

    waitFor('#tab6XX-tab', 3000).then(tab => {
      tab.addEventListener('click', () => {
        waitFor('label.labelsubfield', 2000).then(() => {
          try{
            const label615 = Array.from(document.querySelectorAll('label.labelsubfield')).find(el => (el.textContent||'').trim() === "catégorie sujet");
            if (!label615) return;
            const inputId615 = label615.getAttribute('for');
            const originalInput615 = document.getElementById(inputId615);
            if (!originalInput615 || originalInput615.dataset.modified615) return;

            const originalValue615 = originalInput615.value || '';
            const container615 = document.createElement('div'); Object.assign(container615.style, { display: 'flex', gap: '10px', alignItems: 'center', width: '100%' });
            const cloneInput615 = originalInput615.cloneNode(true); cloneInput615.style.width='50%'; cloneInput615.id += '_clone'; cloneInput615.disabled = true;
            const suggestionSelect615 = document.createElement('select'); suggestionSelect615.style.width='50%'; suggestionSelect615.className = 'koha-6xx-suggestions-select'; suggestionSelect615.name = originalInput615.name + '_suggestions'; suggestionSelect615.setAttribute('data-koha-custom', '1');

            const options615 = [
              { value: '', text: 'Sélectionner une indexation matière' },
              { value: 'Acquisition de la Propreté', text: 'Acquisition de la Propreté' },
              { value: 'Affirmation de soi et opposition', text: 'Affirmation de soi et opposition' },
              { value: 'Angoisse de séparation', text: 'Angoisse de séparation' },
              { value: 'Alimentation', text: 'Alimentation' },
              { value: 'Amitié', text: 'Amitié' },
              { value: 'Animaux', text: 'Animaux' },
              { value: 'Animaux familiers', text: 'Animaux familiers' },
              { value: 'Animaux sauvages', text: 'Animaux sauvages' },
              { value: 'Arts et spectacles', text: 'Arts et spectacles' },
              { value: 'Bain, hygiène', text: 'Bain, hygiène' },
              { value: 'Bobos', text: 'Bobos' },
              { value: 'Bonnes Manières', text: 'Bonnes Manières' },
              { value: 'Campagne, vie rurale, ferme', text: 'Campagne, vie rurale, ferme' },
              { value: 'Caractères (courageux, curiosité, rêveur, leader...)', text: 'Caractères (courageux, curiosité, rêveur, leader...)' },
              { value: 'Châteaux forts', text: 'Châteaux forts' },
              { value: 'Civilisations (Maya, Viking, esquimau...)', text: 'Civilisations (Maya, Viking, esquimau...)' },
              { value: 'Colère', text: 'Colère' },
              { value: 'Comportements sociaux (antisémitisme, différence, entraide, relation fille-garçons..)', text: 'Comportements sociaux (antisémitisme, différence, entraide, relation fille-garçons..)' },
              { value: 'Conditions de vie (pauvreté, précarité, immigration et réfugiés..)', text: 'Conditions de vie (pauvreté, précarité, immigration et réfugiés..)' },
              { value: 'Corps humain (cinq sens, image du corps..)', text: 'Corps humain (cinq sens, image du corps..)' },
              { value: 'Crèche', text: 'Crèche' },
              { value: 'Déménagement', text: 'Déménagement' },
              { value: 'Dinosaures', text: 'Dinosaures' },
              { value: 'Doudou / Tétine', text: 'Doudou / Tétine' },
              { value: 'Écologie, environnement', text: 'Écologie, environnement' },
              { value: 'Émotions et Sentiments', text: 'Émotions et Sentiments' },
              { value: 'Engins et moyens de Transport', text: 'Engins et moyens de Transport' },
              { value: 'Fêtes (Noël, Pâques...)', text: 'Fêtes (Noël, Pâques...)' },
              { value: 'Histoire (grandes époques, guerres et conflits, personnages célèbres)', text: 'Histoire (grandes époques, guerres et conflits, personnages célèbres)' },
              { value: 'Intimidation / Harcèlement', text: 'Intimidation / Harcèlement' },
              { value: 'Langage, jeux de langage, jeux de mots, contraire', text: 'Langage, jeux de langage, jeux de mots, contraire' },
              { value: 'Le corps et ses différences (handicaps, neurodiversité, lunettes..)', text: 'Le corps et ses différences (handicaps, neurodiversité, lunettes..)' },
              { value: 'Le rituel du coucher', text: 'Le rituel du coucher' },
              { value: 'Les conflits', text: 'Les conflits' },
              { value: 'Livre et bibliothèque', text: 'Livre et bibliothèque' },
              { value: 'Maison, habitation, jardin et jardinage', text: 'Maison, habitation, jardin et jardinage' },
              { value: 'Maternité, naissance', text: 'Maternité, naissance' },
              { value: 'Mers, marins', text: 'Mers, marins' },
              { value: 'Météorologie et saisons', text: 'Météorologie et saisons' },
              { value: 'Mort, deuil', text: 'Mort, deuil' },
              { value: 'Nature', text: 'Nature' },
              { value: 'Nouveau bébé', text: 'Nouveau bébé' },
              { value: 'Orphelins et foyers d\'accueil', text: 'Orphelins et foyers d\'accueil' },
              { value: 'Pays et continents', text: 'Pays et continents' },
              { value: 'Peur du noir', text: 'Peur du noir' },
              { value: 'Politesse, bienséance', text: 'Politesse, bienséance' },
              { value: 'Premiers apprentissages (couleurs, formes, etc)', text: 'Premiers apprentissages (couleurs, formes, etc)' },
              { value: 'Préhistoire', text: 'Préhistoire' },
              { value: 'Questions de genres', text: 'Questions de genres' },
              { value: 'Relation aux autres', text: 'Relation aux autres' },
              { value: 'Relations dans la famille (Fratrie, Parents, Grands-parents, Familles atypiques..)', text: 'Relations dans la famille (Fratrie, Parents, Grands-parents, Familles atypiques..)' },
              { value: 'Religions, croyances', text: 'Religions, croyances' },
              { value: 'Rentrée scolaire', text: 'Rentrée scolaire' },
              { value: 'Santé et maladies', text: 'Santé et maladies' },
              { value: 'Scolarité', text: 'Scolarité' },
              { value: 'Sciences et techniques (espace, inventions...)', text: 'Sciences et techniques (espace, inventions...)' },
              { value: 'Séparation Divorce', text: 'Séparation Divorce' },
              { value: 'Sons, bruits et cris', text: 'Sons, bruits et cris' },
              { value: 'Sport', text: 'Sport' },
              { value: 'Territoires (Amazonie, jungle, montagne, désert, banquise, île, forêt...)', text: 'Territoires (Amazonie, jungle, montagne, désert, banquise, île, forêt...)' },
              { value: 'Transgression des interdits : inceste, maltraitance, violence, violence sexuelle, vol..', text: 'Transgression des interdits : inceste, maltraitance, violence, violence sexuelle, vol..' },
              { value: ' Intimidation / Harcèlement', text: ' Intimidation / Harcèlement' },
              { value: 'Travail et métiers', text: 'Travail et métiers' },
 { value: 'Vacances', text: 'Vacances' },

              { value: 'Ville (bâtiment et construction, zoo, jardin public, marché, musée..etc)', text: 'Ville (bâtiment et construction, zoo, jardin public, marché, musée..etc)' },
              { value: 'Vie quotidienne familiale (bêtises, respect des règles, éducation, fugue..)', text: 'Vie quotidienne familiale (bêtises, respect des règles, éducation, fugue..)' }
            ];
            options615.forEach(opt => { const option = document.createElement('option'); option.value = opt.value; option.textContent = opt.text; if (opt.value === originalValue615) option.selected = true; suggestionSelect615.appendChild(option); });

            suggestionSelect615.addEventListener('change', function(){ if (this.value) { cloneInput615.value = this.value; cloneInput615.dispatchEvent(new Event('input')); } });

            if (originalInput615.parentNode) originalInput615.parentNode.replaceChild(container615, originalInput615);
            container615.appendChild(cloneInput615); container615.appendChild(suggestionSelect615);

            (function waitForSelect2(remaining){ if (window.jQuery && window.jQuery.fn && window.jQuery.fn.select2){ try{ window.jQuery(suggestionSelect615).select2({ width: '100%', placeholder: 'Sélectionner une indexation matière', allowClear: true }); }catch(e){ (function(){})('084: select2 init error', e); } return; } if (remaining<=0) return; setTimeout(()=>waitForSelect2(10),200); })(10);

            originalInput615.dataset.modified615 = true;
          }catch(e){ (function(){})('084: handling tab content failed', e); }
        }).catch(()=>{});
      });
    }).catch(()=>{});

  }catch(e){ (function(){})('084-6xx-subject-category-suggestions: failed', e); }
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