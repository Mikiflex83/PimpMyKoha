(function(){"use strict";
const KT=window.KohaTools;if(!KT||!KT.Config)return;
const MODULE_ID='detail-status-summary-style',CFG=KT.Config.getCanonical(MODULE_ID),Scope=KT.getService&&KT.getService("scope");
if(!CFG||!CFG.enabled||!["shadow","live"].includes(CFG.mode))return;
if(Scope&&!Scope.match(CFG.general&&CFG.general.scope).ok)return;
const runtime={
 id:MODULE_ID,
 description:'Regroupe les résumés Réservations/Cours/Listes et applique des styles de statut aux lignes d’exemplaires.',
 sourceFiles:['103-detail-reservations-summary-style.js'],
 parity:"exact-legacy",
 reloadRequiredOnConfigChange:true,
 init:function(){
   if(window["__KT_PARITY_"+MODULE_ID])return;
   window["__KT_PARITY_"+MODULE_ID]=true;
   
/* ===== EXACT LEGACY SOURCE: 103-detail-reservations-summary-style.js ===== */
/*
 Nom du fichier: 103-detail-reservations-summary-style.js
 Date de dernière modification: 2026-04-04
 Auteur: Michael Mundet
 Description: Mise en forme du bloc results_summary (Réservations, Cours, Listes) sur detail.pl
*/

(function(){
  'use strict';
  try {
    (function(){})('103-detail-reservations-summary-style: loaded');
    if (!window.location.pathname || !window.location.pathname.includes('detail.pl')) return;

    setTimeout(function(){
      const loggedInBranch = document.querySelector('.logged-in-branch-name')?.textContent.trim();

      const containers = {
        reservations: createContainer('rgba(50, 205, 50, 0.5)'),
        coursReserved: createContainer('rgba(135, 206, 250, 0.5)'),
        listContainingTitle: createContainer('rgba(250, 72, 72, 0.5)')
      };

      function createContainer(bgColor) {
        const div = document.createElement('div');
        div.style.backgroundColor = bgColor;
        div.style.borderRadius = '5px';
        return div;
      }

      function addImageBeforeSpan(span) {
        if (!span) return;
        const statusCell = span.closest('td.status') || span.parentNode;
        if (statusCell && statusCell.querySelector('img.vc-star, img[src$="starred.png"]')) return;
        const starUrl=String(CFG?.assets?.currentBranchStar||CFG?.installation?.currentBranchStarUrl||'');
        const img = starUrl ? document.createElement('img') : document.createElement('span');
        if(starUrl){img.src=starUrl;img.className='vc-star'}else{img.textContent='★';img.className='vc-star-text'}
        img.style.marginRight='5px';
        span.parentNode.insertBefore(img, span);
      }

      function styleSpan(span) {
        if (!span) return;
        Object.assign(span.style, {
          padding: '10px',
          borderRadius: '5px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '16px',
          textTransform: 'uppercase',
          marginTop: '10px'
        });
      }

      const resultsSummarySpans = document.querySelectorAll('span.results_summary');
      resultsSummarySpans.forEach(function(span){
        const text = span.textContent || '';
        if (text.includes('Réservations')) containers.reservations.appendChild(span);
        if (text.includes('Cours ayant réservé ce titre')) {
          containers.coursReserved.appendChild(span);
          const label = span.querySelector('.label');
          if (label) label.textContent = "Est présent dans la liste d'exemplaire : ";
        }
        if (text.includes('Listes contenant ce titre')) containers.listContainingTitle.appendChild(span);
      });

      const infoContainer = document.querySelector('.catalogue-info');
      if (infoContainer) {
        Object.values(containers).forEach(function(container){
          if (container.children.length > 0) {
            Array.from(container.children).forEach(styleSpan);
            infoContainer.appendChild(container);
          }
        });
      }

      const rows = document.querySelectorAll('#holdings_table tbody tr');
      rows.forEach(function(row){
        const statusCell = row.querySelector('.status');
        if (!statusCell) return;
        const statusText = (statusCell.textContent || '').trim();

        let bgColor = '';
        if (/En transfert|retour prévu|En attente/.test(statusText)) {
          row.classList.add('prete');
          bgColor = '#f7f1e9';
        } else if (/Disponible/.test(statusText)) {
          const location = row.querySelector('.location')?.textContent.trim();
          if (location === loggedInBranch) addImageBeforeSpan(statusCell.querySelector('span'));
          row.classList.add('disponible');
          bgColor = '#ebfaeb';
        } else if (/Exclu du prêt/.test(statusText)) {
          row.classList.add('exclu');
          bgColor = '#fcd2d2';
        } else if (/Prêté/.test(statusText)) {
          row.classList.add('prete');
          bgColor = '#fff3cd';
        }
        row.querySelectorAll('td').forEach(function(td){ td.style.backgroundColor = bgColor; });
      });

      const number = parseInt(document.querySelector('.number_box a')?.textContent.trim(), 10);
      if (!isNaN(number)) {
        const link = document.querySelector('.number_box a');
        if (link) link.style.color = number === 3 ? 'orange' : number > 3 ? 'red' : '';
      }
    }, 1000);
  } catch (err) {
    (function(){})('103-detail-reservations-summary-style: failed', err);
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