(function(){"use strict";
const KT=window.KohaTools;if(!KT||!KT.Config)return;const MODULE_ID='holdings-table-presentation',CFG=KT.Config.getCanonical(MODULE_ID),Scope=KT.getService&&KT.getService("scope");
if(!CFG||!CFG.enabled||!["shadow","live"].includes(CFG.mode))return;if(Scope&&!Scope.match(CFG.general&&CFG.general.scope).ok)return;
const runtime={id:MODULE_ID,sourceFiles:['033-mod-table-exemplaires.js'],parity:"exact-legacy",init:function(){if(window["__KT_PARITY_"+MODULE_ID])return;window["__KT_PARITY_"+MODULE_ID]=true;

/* ===== EXACT LEGACY SOURCE: 033-mod-table-exemplaires.js ===== */
(function(){
  document.addEventListener('DOMContentLoaded', function(){
    (function(){})('033-mod-table-exemplaires: loaded');
    // Modifications d'éléments du tableau des exemplaires (detail.pl / course-details.pl)
    if (window.location.pathname.indexOf("detail.pl") !== -1 || window.location.pathname.indexOf("course-details.pl") !== -1) {
      function waitForSelector(selector, timeout = 3000) {
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

      waitForSelector('td', 3000).then(() => {
        function replaceTableCellText(selector, originalText, newText) {
          var cells = document.querySelectorAll(selector);
          cells.forEach(function(cell) {
            var text = cell.textContent;
            if (text.includes(originalText)) {
              cell.textContent = text.replace(originalText, newText);
            }
          });
        }

        replaceTableCellText('th#holdings_copynumber', "Numéro d'exemplaire", 'Sous-localisation');
        replaceTableCellText('th#holdings_barcode', 'Code à barres', 'Code barres');
        replaceTableCellText('th#holdings_enumchron', 'Enumération/chronologie du périodique', 'Etage / Numéro');
        replaceTableCellText('th#holdings_course_reserves', "Réserves de cours", "Listes d'exemplaires");

        if (window.location.pathname.indexOf("detail.pl") !== -1) {
          var elements = document.getElementsByTagName('td');
          Array.from(elements).forEach(function(element) {
            var content = element.innerHTML;
            if (content.indexOf("Exclu du prêt") !== -1) {
              content = content.replace(/Exclu du prêt/g, '<span style="color:#900;font-weight:bold;">Exclu du prêt</span>');
              element.innerHTML = content;
            } else if (content.indexOf("Disponible") !== -1) {
              content = content.replace(/Disponible/g, '<span style="color:green;font-weight:bold;">Disponible</span>');
              element.innerHTML = content;
            }
          });

          // Apply row-level classes and background colors according to status text
          try {
            // inject CSS once to ensure styles persist
            if (!document.getElementById('vc-holdings-row-styles')) {
              const s = document.createElement('style');
              s.id = 'vc-holdings-row-styles';
              s.textContent = `
                #holdings_table tbody tr.vc-disponible td { background-color: #ebfaeb !important; }
                #holdings_table tbody tr.vc-prete td { background-color: #f7f1e9 !important; }
                #holdings_table tbody tr.vc-exclu td { background-color: #fcd2d2 !important; }
                #holdings_table tbody tr.vc-prete-pret td { background-color: #fff3cd !important; }
              `;
              document.head.appendChild(s);
            }

            function applyRowColorsToRow(row) {
              if (!row || row.dataset.vcRowColored === '1') return;
              const statusCell = row.querySelector('.status') || row.querySelector('td:nth-child(7)');
              const statusText = statusCell ? statusCell.textContent.trim() : '';

              // clear previous vc- classes
              row.classList.remove('vc-disponible','vc-prete','vc-exclu','vc-prete-pret');

              if (/En transfert|retour prévu|En attente/i.test(statusText)) {
                row.classList.add('vc-prete');
                (function(){})('033: mark row as prete-like ->', statusText);
              } else if (/Disponible/i.test(statusText)) {
                row.classList.add('vc-disponible');
                (function(){})('033: mark row as disponible ->', statusText);
                // add star for items available at logged-in branch
                try {
                  const location = (row.querySelector('.location') && row.querySelector('.location').textContent || '').trim();
                  const loggedInBranch = (document.querySelector('.logged-in-branch-name') && document.querySelector('.logged-in-branch-name').textContent || '').trim();
                  if (location && loggedInBranch && location === loggedInBranch) {
                    const span = statusCell ? statusCell.querySelector('span') : null;
                    if (statusCell && !statusCell.querySelector('img.vc-star, img[src$="starred.png"]')) {
                      const starUrl=String(CFG?.assets?.currentBranchStar||'');
                      const img=starUrl?document.createElement('img'):document.createElement('span');
                      if(starUrl){img.src=starUrl;img.className='vc-star'}else{img.textContent='★';img.className='vc-star-text'}
                      img.style.marginRight='5px';
                      if (span && span.parentNode) span.parentNode.insertBefore(img, span);
                      else statusCell.insertBefore(img, statusCell.firstChild);
                    }
                  }
                } catch (e) { /* noop */ }
              } else if (/Exclu du prêt/i.test(statusText)) {
                row.classList.add('vc-exclu');
                (function(){})('033: mark row as exclu ->', statusText);
              } else if (/Prêté/i.test(statusText)) {
                row.classList.add('vc-prete-pret');
                (function(){})('033: mark row as prete (borrowed) ->', statusText);
              } else {
                // nothing matched
                (function(){})('033: no status match for row ->', statusText);
              }

              row.dataset.vcRowColored = '1';
            }

            const table = document.querySelector('#holdings_table');
            if (table) {
              table.querySelectorAll('tbody tr').forEach(applyRowColorsToRow);

              // Observe future added rows
              const tbody = table.tBodies && table.tBodies[0];
              if (tbody) {
                const mo = new MutationObserver(muts => {
                  muts.forEach(m => {
                    m.addedNodes.forEach(n => { if (n.nodeType === 1 && n.matches('tr')) applyRowColorsToRow(n); });
                  });
                });
                mo.observe(tbody, { childList: true });
              }
            } else {
              (function(){})('033: #holdings_table not found when applying row colors');
            }
          } catch (e) { (function(){})('033 row color error', e); }
        } else if (window.location.pathname.indexOf("course-details.pl") !== -1) {
          var elements = document.getElementsByTagName('td');
          Array.from(elements).forEach(function(element) {
            var content = element.innerHTML;
            if (content.indexOf("Disponible") !== -1) {
              content = content.replace(/Disponible/g, '<span style="color:green;font-weight:bold;">Non emprunté</span>');
              element.innerHTML = content;
            } else if (content.indexOf("Prêté") !== -1) {
              content = content.replace(/Prêté/g, '<span style="color:#900;font-weight:bold;">Prêté</span>');
              element.innerHTML = content;
            }
          });
        }
      }).catch(() => {});
    }
  });
})();

},destroy:function(){return false;},onConfigChange:function(){return {reloadRequired:true};}};
KT.registerModule(runtime);if(CFG.mode==="shadow"){KT.record({module:MODULE_ID,level:"info",kind:"shadow-exact-parity-sealed",sources:runtime.sourceFiles});return;}runtime.init();
})();