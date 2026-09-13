(function(){"use strict";
const KT=window.KohaTools;if(!KT||!KT.Config)return;
const MODULE_ID='detail-layout-tweaks',CFG=KT.Config.getCanonical(MODULE_ID),Scope=KT.getService&&KT.getService("scope");
if(!CFG||!CFG.enabled||!["shadow","live"].includes(CFG.mode))return;
if(Scope&&!Scope.match(CFG.general&&CFG.general.scope).ok)return;
const runtime={
 id:MODULE_ID,
 description:'Ensemble de neuf améliorations visuelles indépendantes de la page détail, chacune activable séparément.',
 sourceFiles:['107-detail-layout-tweaks.js'],
 parity:"exact-legacy",
 reloadRequiredOnConfigChange:true,
 init:function(){
   if(window["__KT_PARITY_"+MODULE_ID])return;
   window["__KT_PARITY_"+MODULE_ID]=true;
   
/* ===== EXACT LEGACY SOURCE: 107-detail-layout-tweaks.js ===== */
/*
 Nom du fichier: 107-detail-layout-tweaks.js
 Dépendances: 063-mis-en-page-catalogue.js (pour .catalogue-info), 086-qr-code-book-detail.js (pour #qrDetail)
 Date de dernière modification: 2026-05-20
 Auteur: Michael Mundet
 Description: Améliorations de mise en forme de la page detail.pl :
              1.  Liens de recherche externe en vrais boutons, grille 2×2 décalée sous le QR
              2.  Menu de partage affiché en ligne (sans bouton intermédiaire)
              3.  Label "Scan mobile" sous le QR code
              4.  Séparateurs visuels dans la liste technique
              5.  Alignement flex du titre + bouton "Mettre de côté"
              6.  Effet hover sur les lignes bibliographiques
              7.  Feedback visuel sur les boutons Copier ISBN/EAN
              8.  Style amélioré de l'accordéon 4ème de couverture
              9.  Lien "Statistiques détaillées" mis en forme comme un bouton
*/

(function () {
  'use strict';

  if (window.location.pathname.indexOf('detail.pl') === -1) return;

  /* ------------------------------------------------------------------ *
   * Utilitaire : attendre qu'un sélecteur soit présent dans le DOM
   * ------------------------------------------------------------------ */
  function waitFor(selector, timeout) {
    return new Promise(function (resolve, reject) {
      var el = document.querySelector(selector);
      if (el) return resolve(el);
      var obs = new MutationObserver(function () {
        var found = document.querySelector(selector);
        if (found) { obs.disconnect(); resolve(found); }
      });
      obs.observe(document.documentElement, { childList: true, subtree: true });
      setTimeout(function () { obs.disconnect(); reject(new Error('timeout: ' + selector)); }, timeout || 5000);
    });
  }

  /* ------------------------------------------------------------------ *
   * 1. Liens de recherche externe en vrais boutons (grille 2×2)
   *    Cible : les <li class="liste-tech-site"> enfants directs du <ul>
   *    dans .technique (ISBN, EAN, Titre, Auteur)
   *    La grille est décalée vers le bas (marginTop) pour éviter la
   *    superposition avec le QR code positionné en haut à droite (120px).
   * ------------------------------------------------------------------ */
  function tweakSearchLinks() {
    var ul = document.querySelector('.technique .content ul.liste-tech-site');
    if (!ul) return;

    // Sélectionner uniquement les 4 li de liens de recherche portail
    var linkItems = Array.prototype.filter.call(
      ul.querySelectorAll(':scope > li.liste-tech-site'),
      function (li) { const needle=String(CFG?.externalSearch?.hrefContains||'').trim(); return needle ? li.querySelector(`a[href*="${CSS.escape(needle)}"]`) : null; }
    );
    if (!linkItems.length) return;

    // Styler le label introductif "Rechercher sur le site par :"
    // pour qu'il ne passe pas sous le QR (laisser 130px à droite)
    var introStrong = ul.querySelector(':scope > strong');
    if (introStrong) {
      Object.assign(introStrong.style, {
        display: 'block',
        marginRight: '130px',
        fontSize: '0.78em',
        color: '#546e7a',
        marginBottom: '4px'
      });
    }

    // Créer un wrapper grille décalé sous le QR
    var grid = document.createElement('div');
    grid.id = 'koha-search-links-grid';
    Object.assign(grid.style, {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '6px',
      // marginRight laisse la place au QR code (120px + 0.5em ≈ 128px)
      marginRight: '130px',
      marginBottom: '8px'
    });

    // Icônes associées à chaque type de lien
    var ICONS = { 'isbn': '🔢', 'ean': '📦', 'titre': '📖', 'auteur': '✍️' };

    linkItems.forEach(function (li) {
      var a = li.querySelector('a');
      if (!a) return;
      var label = a.textContent.trim();
      var key   = label.toLowerCase().replace(/[^a-zéàèù]/g, '');
      var icon  = ICONS[key] || '🔗';

      var btn = document.createElement('a');
      btn.href   = a.href;
      btn.target = a.target || '_blank';
      btn.rel    = 'noopener noreferrer';
      btn.textContent = icon + ' ' + label;
      Object.assign(btn.style, {
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        gap:            '4px',
        padding:        '6px 8px',
        background:     '#eceff1',
        color:          '#455a64',
        borderRadius:   '6px',
        fontSize:       '0.78em',
        fontWeight:     '600',
        textDecoration: 'none',
        textAlign:      'center',
        boxShadow:      '0 1px 3px rgba(96,125,139,0.18)',
        transition:     'background 0.15s, box-shadow 0.15s, transform 0.1s',
        cursor:         'pointer'
      });
      btn.addEventListener('mouseenter', function () {
        btn.style.background  = '#e1e6e9';
        btn.style.boxShadow   = '0 2px 5px rgba(96,125,139,0.24)';
        btn.style.transform   = 'translateY(-1px)';
      });
      btn.addEventListener('mouseleave', function () {
        btn.style.background  = '#eceff1';
        btn.style.boxShadow   = '0 1px 3px rgba(96,125,139,0.18)';
        btn.style.transform   = '';
      });

      grid.appendChild(btn);
      li.style.display = 'none'; // masquer l'original
    });

    // Insérer la grille avant le premier li masqué
    linkItems[0].parentNode.insertBefore(grid, linkItems[0]);
  }

  /* ------------------------------------------------------------------ *
   * 2. Menu de partage affiché en ligne (supprime le bouton toggle)
   *    Cible : .liens_externes .share-menu et .share-button
   * ------------------------------------------------------------------ */
  function tweakShareMenu() {
    var shareMenu = document.querySelector('.liens_externes .share-menu');
    var shareBtn  = document.querySelector('.liens_externes .share-button');
    if (!shareMenu) return;

    // Afficher le menu directement en flex
    Object.assign(shareMenu.style, {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '8px',
      alignItems: 'center',
      marginTop: '4px',
      paddingLeft: '0'
    });

    // Masquer le bouton de toggle devenu inutile
    if (shareBtn) shareBtn.style.display = 'none';

    // Supprimer les <br> orphelins dans .liens_externes
    var lExternes = document.querySelector('.liens_externes');
    if (lExternes) {
      lExternes.querySelectorAll('br').forEach(function (br) { br.remove(); });
    }

    // Effet hover sur les logos
    shareMenu.querySelectorAll('img').forEach(function (img) {
      Object.assign(img.style, {
        borderRadius: '4px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
        transition: 'transform 0.15s, box-shadow 0.15s',
        cursor: 'pointer'
      });
      img.addEventListener('mouseenter', function () {
        img.style.transform = 'scale(1.12)';
        img.style.boxShadow = '0 3px 8px rgba(0,0,0,0.25)';
      });
      img.addEventListener('mouseleave', function () {
        img.style.transform = '';
        img.style.boxShadow = '0 1px 3px rgba(0,0,0,0.15)';
      });
    });
  }

  /* ------------------------------------------------------------------ *
   * 3. Label "Scan mobile" sous le QR code
   *    Dépend de 086 qui crée #qrDetail — on attend qu'il soit injecté
   * ------------------------------------------------------------------ */
  function tweakQrLabel() {
    waitFor('#qrDetail canvas', 3000).then(function () {
      var qrDiv = document.getElementById('qrDetail');
      if (!qrDiv || qrDiv.querySelector('.qr-label')) return;

      var label = document.createElement('div');
      label.className = 'qr-label';
      label.textContent = '📱 Scan mobile';
      Object.assign(label.style, {
        fontSize: '0.60em',
        textAlign: 'center',
        marginTop: '3px',
        color: '#546e7a',
        whiteSpace: 'nowrap',
        letterSpacing: '0.02em'
      });
      qrDiv.style.height = 'auto';
      qrDiv.appendChild(label);
    }).catch(function () { /* QR non présent, silencieux */ });
  }

  /* ------------------------------------------------------------------ *
   * 4. Séparateurs visuels entre groupes dans la liste technique
   *    On insère un <hr> avant "Création notice" et avant "Acquisition"
   * ------------------------------------------------------------------ */
  function tweakTechniqueSeparators() {
    var content = document.querySelector('.technique .content');
    if (!content) return;

    content.querySelectorAll('li').forEach(function (li) {
      var strong = li.querySelector('strong');
      if (!strong) return;
      var txt = strong.textContent || '';
      if (/Création notice|Acquisition/.test(txt)) {
        var hr = document.createElement('hr');
        Object.assign(hr.style, {
          margin: '6px 0',
          border: 'none',
          borderTop: '1px solid #e0e0e0'
        });
        li.parentNode.insertBefore(hr, li);
      }
    });
  }

  /* ------------------------------------------------------------------ *
   * 5. Alignement flex du titre + bouton "Mettre de côté"
   *    Cible : p.first dans .page-section
   * ------------------------------------------------------------------ */
  function tweakTitleAlignment() {
    var titleP = document.querySelector('#catalogue_detail_biblio p.first');
    if (!titleP) return;
    Object.assign(titleP.style, {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      flexWrap: 'wrap',
      marginBottom: '8px'
    });
    var btn = titleP.querySelector('button');
    if (btn) btn.style.flexShrink = '0';
  }

  /* ------------------------------------------------------------------ *
   * 6. Effet hover léger sur les lignes bibliographiques
   *    Cible : tous les <li> dans .catalogue-info (hors .technique)
   * ------------------------------------------------------------------ */
  function tweakBibliographicHover() {
    var infoContainer = document.querySelector('.catalogue-info');
    if (!infoContainer) return;

    infoContainer.querySelectorAll('li').forEach(function (li) {
      Object.assign(li.style, {
        borderRadius: '3px',
        padding: '2px 4px',
        transition: 'background 0.12s'
      });
      li.addEventListener('mouseenter', function () { li.style.background = '#f5f7fa'; });
      li.addEventListener('mouseleave', function () { li.style.background = ''; });
    });
  }

  /* ------------------------------------------------------------------ *
   * 7. Feedback visuel "Copié !" sur les boutons Copier ISBN / EAN
   *    Les images .copy-isbn et .copy-ean déclenchent un copie dans 063 ;
   *    on ajoute un badge temporaire à côté.
   * ------------------------------------------------------------------ */
  function tweakCopyFeedback() {
    document.querySelectorAll('.copy-isbn, .copy-ean').forEach(function (img) {
      img.addEventListener('click', function () {
        var existing = img.parentNode.querySelector('.koha-copied-badge');
        if (existing) return;
        var badge = document.createElement('span');
        badge.className = 'koha-copied-badge';
        badge.textContent = '✓ Copié';
        Object.assign(badge.style, {
          marginLeft: '5px',
          fontSize: '0.75em',
          color: '#2e7d32',
          fontWeight: '600',
          animation: 'kohaFadeOut 1.6s forwards'
        });
        img.parentNode.appendChild(badge);
        setTimeout(function () { badge.remove(); }, 1700);
      });
    });

    // Injecter le keyframe si absent
    if (!document.getElementById('koha-copy-anim')) {
      var style = document.createElement('style');
      style.id = 'koha-copy-anim';
      style.textContent = '@keyframes kohaFadeOut { 0%{opacity:1} 70%{opacity:1} 100%{opacity:0} }';
      document.head.appendChild(style);
    }
  }

  /* ------------------------------------------------------------------ *
   * 8. Style amélioré de l'accordéon 4ème de couverture
   *    Cible : .femecouv-accordion généré par 009-4eme-de-couv.js
   * ------------------------------------------------------------------ */
  function tweakAccordion() {
    var accordion = document.querySelector('.femecouv-accordion');
    if (!accordion) return;

    var header = accordion.querySelector('.header');
    var body   = accordion.querySelector('.body');

    if (header) {
      Object.assign(header.style, {
        background: 'linear-gradient(90deg, #eceff1 0%, #f5f7fa 100%)',
        borderLeft: '3px solid #78909c',
        borderRadius: '3px',
        padding: '5px 10px',
        fontSize: '0.88em',
        fontWeight: '600',
        color: '#37474f',
        cursor: 'pointer',
        userSelect: 'none'
      });
    }

    if (body) {
      Object.assign(body.style, {
        borderLeft: '3px solid #eceff1',
        paddingLeft: '10px',
        fontSize: '0.90em',
        color: '#424242',
        marginTop: '4px'
      });
    }
  }

  /* ------------------------------------------------------------------ *
   * 9. Lien "Consulter les statistiques détaillées" en bouton stylisé
   *     Cible : le dernier <li><a> dans .technique .content
   * ------------------------------------------------------------------ */
  function tweakStatsLink() {
    var content = document.querySelector('.technique .content');
    if (!content) return;

    content.querySelectorAll('li').forEach(function (li) {
      var a = li.querySelector('a[href*="guided_reports"]');
      if (!a || !/statistiques/i.test(a.textContent)) return;

      Object.assign(a.style, {
        display: 'inline-block',
        marginTop: '6px',
        padding: '5px 10px',
        background: '#e8f5e9',
        border: '1px solid #a5d6a7',
        borderRadius: '4px',
        color: '#2e7d32',
        fontSize: '0.80em',
        fontWeight: '600',
        textDecoration: 'none',
        transition: 'background 0.15s, border-color 0.15s'
      });
      a.addEventListener('mouseenter', function () {
        a.style.background = '#c8e6c9';
        a.style.borderColor = '#66bb6a';
      });
      a.addEventListener('mouseleave', function () {
        a.style.background = '#e8f5e9';
        a.style.borderColor = '#a5d6a7';
      });
    });
  }

  /* ------------------------------------------------------------------ *
   * Lancement — on attend que le DOM principal soit prêt
   * ------------------------------------------------------------------ */
  function run() {
    tweakTitleAlignment();       // 5 — pas de dépendance externe
    tweakSearchLinks();          // 1
    tweakShareMenu();            // 2
    tweakTechniqueSeparators();  // 4
    tweakBibliographicHover();   // 6 — dépend de 063
    tweakCopyFeedback();         // 7
    tweakAccordion();            // 8 — dépend de 009
    tweakStatsLink();            // 9
    tweakQrLabel();              // 3 — dépend de 086, asynchrone
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
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