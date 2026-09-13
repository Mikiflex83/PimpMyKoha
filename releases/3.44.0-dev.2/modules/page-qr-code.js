(function(){"use strict";
const KT=window.KohaTools;if(!KT||!KT.Config)return;
const MODULE_ID='page-qr-code',CFG=KT.Config.getCanonical(MODULE_ID),Scope=KT.getService&&KT.getService("scope");
if(!CFG||!CFG.enabled||!["shadow","live"].includes(CFG.mode))return;
if(Scope&&!Scope.match(CFG.general&&CFG.general.scope).ok)return;
const runtime={
 id:MODULE_ID,
 description:'Génère un QR-code de l’URL courante sur plusieurs pages Koha.',
 sourceFiles:['086-qr-code-book-detail.js'],
 parity:"exact-legacy",
 reloadRequiredOnConfigChange:true,
 init:function(){
   if(window["__KT_PARITY_"+MODULE_ID])return;
   window["__KT_PARITY_"+MODULE_ID]=true;
   
/* ===== EXACT LEGACY SOURCE: 086-qr-code-book-detail.js ===== */
/*
 Nom du fichier: 086-qr-code-book-detail.js
 Dépendances: qr-code-styling-v2 (chargé dynamiquement via CDN)
 Date de dernière modification: 2026-05-19
 Auteur: Michael Mundet
 Description: Génère un QR-code encodant l'URL courante sur les pages
              detail.pl, search.pl, course-details.pl et guided_reports.pl.
              Le QR code est positionné en haut à droite du conteneur principal.
*/

document.addEventListener('DOMContentLoaded', function () {
  (function () {
    var path = window.location.pathname;

    // Ne s'exécute que sur les pages ciblées
    if (!/detail\.pl$/.test(path) &&
        !/search\.pl$/.test(path) &&
        !/course-details\.pl$/.test(path) &&
        !/guided_reports\.pl$/.test(path)) return;

    // 1. Charger qr-code-styling-v2
    function loadLib(cb) {
      if (window.QRCodeStyling) return cb();
      var s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/qr-code-styling-v2';
      s.onload = cb;
      document.head.appendChild(s);
    }

    // 2. Générateur commun
    function makeQR(container, size) {
      try {
        var qrSize = size || 120;
        const qr = new QRCodeStyling({
          width: qrSize,
          height: qrSize,
          data: window.location.href,
          margin: 8,
          errorCorrectionLevel: 'L',
          dotsOptions: {
            type: 'rounded',
            color: '#37474f'
          },
          backgroundOptions: {
            color: 'transparent'
          },
          cornersSquareOptions: {
            type: 'dot',
            color: '#d32f2f'
          },
          cornersDotOptions: {
            type: 'square',
            color: '#2e7d32'
          },
          imageOptions: {
            src: '',
            imageSize: 0.4,
            margin: 4
          }
        });
        qr.append(container);
        setTimeout(function () {
          const canvas = container.querySelector('canvas');
          if (canvas) {
            Object.assign(canvas.style, {
              display: 'block',
              width: '100%',
              height: 'auto',
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
            });
          }
        }, 50);
      } catch (e) {
        (function(){})('086-qr-code-book-detail: erreur génération QR code', e);
      }
    }

    // 3. Injection sur detail.pl
    function handleDetail() {
      var tech = document.querySelector('.technique');
      if (!tech) return;
      tech.style.position = tech.style.position || 'relative';
      tech.style.overflow = 'visible';
      if (tech.parentElement) tech.parentElement.style.overflow = 'visible';

      var old = tech.querySelector('#qrDetail');
      if (old) old.remove();

      var container = document.createElement('div');
      container.id = 'qrDetail';
      Object.assign(container.style, {
        position: 'absolute',
        top: '0.5em',
        right: '0.5em',
        width: '120px',
        height: '120px',
        zIndex: '9999',
        overflow: 'visible'
      });
      container.title = 'Scannez moi pour retrouver cette page sur votre appareil mobile';
      tech.insertBefore(container, tech.firstChild);
      makeQR(container, 120);
    }

    // 4. Injection sur search.pl
    function handleSearch() {
      var results = document.getElementById('searchresults');
      if (!results) return;
      results.style.position = results.style.position || 'relative';
      results.style.overflow = 'visible';

      var old = results.querySelector('#qrSearch');
      if (old) old.remove();

      var container = document.createElement('div');
      container.id = 'qrSearch';
      Object.assign(container.style, {
        position: 'absolute',
        top: '0.5em',
        right: '0.5em',
        width: '120px',
        height: '120px',
        zIndex: '9999',
        overflow: 'visible'
      });
      container.title = 'Scannez moi pour retrouver cette page sur votre appareil mobile';
      results.insertBefore(container, results.firstChild);
      makeQR(container, 120);
    }

    // 5. Injection sur course-details.pl
    function handleCourseDetails() {
      var section = document.querySelector('.page-section');
      if (!section) return;
      section.style.position = section.style.position || 'relative';
      section.style.overflow = 'visible';

      var old = section.querySelector('#qrCourseDetails');
      if (old) old.remove();

      var container = document.createElement('div');
      container.id = 'qrCourseDetails';
      Object.assign(container.style, {
        position: 'absolute',
        top: '0.5em',
        right: '0.5em',
        width: '120px',
        height: '120px',
        zIndex: '9999',
        overflow: 'visible'
      });
      container.title = 'Scannez moi pour retrouver cette page sur votre appareil mobile';
      section.insertBefore(container, section.firstChild);
      makeQR(container, 120);
    }

    // 6. Injection sur guided_reports.pl
    function handleGuidedReports() {
      var section = document.querySelector('.page-section');
      if (!section) return;
      section.style.position = section.style.position || 'relative';
      section.style.overflow = 'visible';

      var old = section.querySelector('#qrGuidedReports');
      if (old) old.remove();

      var container = document.createElement('div');
      container.id = 'qrGuidedReports';
      Object.assign(container.style, {
        position: 'absolute',
        top: '-2.5em',
        right: '0.5em',
        width: '180px',
        height: '180px',
        zIndex: '9999',
        overflow: 'visible'
      });
      container.title = 'Scannez moi pour retrouver cette page sur votre appareil mobile';
      section.insertBefore(container, section.firstChild);
      makeQR(container, 180);
    }

    // 7. Lancement
    loadLib(function () {
      if (/detail\.pl$/.test(path))         handleDetail();
      if (/search\.pl$/.test(path))         handleSearch();
      if (/course-details\.pl$/.test(path)) handleCourseDetails();
      if (/guided_reports\.pl$/.test(path)) handleGuidedReports();
    });
  })();
});


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