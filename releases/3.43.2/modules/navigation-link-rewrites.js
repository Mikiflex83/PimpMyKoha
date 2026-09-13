(function(){"use strict";
const KT=window.KohaTools;if(!KT||!KT.Config)return;
const MODULE_ID='navigation-link-rewrites',CFG=KT.Config.getCanonical(MODULE_ID),Scope=KT.getService&&KT.getService("scope");
if(!CFG||!CFG.enabled||!["shadow","live"].includes(CFG.mode))return;
if(Scope&&!Scope.match(CFG.general&&CFG.general.scope).ok)return;
const runtime={
 id:MODULE_ID,
 description:'Réécrit des liens Koha vers des rapports/fonctions personnalisés, en regroupant 052 et 076.',
 sourceFiles:['052-modify-circulation-menu-links.js', '076-modify-holdsqueue-links.js'],
 parity:"exact-legacy",
 reloadRequiredOnConfigChange:true,
 init:function(){
   if(window["__KT_PARITY_"+MODULE_ID])return;
   window["__KT_PARITY_"+MODULE_ID]=true;
   
/* ===== EXACT LEGACY SOURCE: 052-modify-circulation-menu-links.js ===== */
/*
 Nom du fichier: 052-modify-circulation-menu-links.js
 Dépendances: KOHA_UTILS.waitFor (fallback included)
 Date de dernière modification: 2026-02-21
 Auteur: Michael Mundet
 Description: Remplace certains liens du menu Circulation par des rapports/fonctions personnalisées
*/

(function(){
  (function(){})('052-modify-circulation-menu-links: loaded');
  // Remplacer certains liens du menu circulation par des rapports/fonctions personnalisées
  if (window.location.href.match(/circulation-home\.pl|circulation\.pl/)) {
      var replacements = [
        { modele: '/cgi-bin/koha/circ/transferstoreceive.pl', reportKey: 'transfersToReceive' },
        { modele: '/cgi-bin/koha/circ/transfers_to_send.pl', reportKey: 'transfersToSend' }
      ];

      var tousLesLiens = document.getElementsByTagName('a');
      for (var i = 0; i < tousLesLiens.length; i++) {
        var lien = tousLesLiens[i];
        var lienHref = lien.getAttribute('href') || '';
        for (var j = 0; j < replacements.length; j++) {
          var modele = replacements[j].modele;
          var nouveauLien = replacements[j].nouveauLien;
          var regex = new RegExp(modele.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
          if (regex.test(lienHref)) {
            lien.setAttribute('href', nouveauLien);
            break;
          }
        }
      }

      // Wait for the buttons list to appear, then inject our links.
      function localWaitForSelector(selector, timeout) {
        return new Promise(function(resolve, reject) {
          var el = document.querySelector(selector);
          if (el) return resolve(el);
          var obs = new MutationObserver(function(mutations, observer) {
            var node = document.querySelector(selector);
            if (node) {
              observer.disconnect();
              resolve(node);
            }
          });
          obs.observe(document.documentElement || document.body, { childList: true, subtree: true });
          if (typeof timeout === 'number') {
            setTimeout(function() {
              obs.disconnect();
              reject(new Error('Timed out waiting for ' + selector));
            }, timeout);
          }
        });
      }

      var waitForSelector = (window.KOHA_UTILS && typeof window.KOHA_UTILS.waitFor === 'function') ? window.KOHA_UTILS.waitFor : localWaitForSelector;
      var targetSelector = '.circulation-actions ul.buttons-list, ul.buttons-list';

      waitForSelector(targetSelector, 5000).then(function(buttonsList) {
        try {
          var hasTransferReceiveLink = Array.prototype.some.call(buttonsList.querySelectorAll('a'), function(link) {
            return (link.getAttribute('href') || '').indexOf('/cgi-bin/koha/circ/transferstoreceive.pl') !== -1;
          });
          var hasTransferSendLink = Array.prototype.some.call(buttonsList.querySelectorAll('a'), function(link) {
            return (link.getAttribute('href') || '').indexOf('/cgi-bin/koha/circ/transfers_to_send.pl') !== -1;
          });

          if (!hasTransferReceiveLink) {
            const li1 = document.createElement('li');
            const link1 = document.createElement('a');
            link1.className = 'circ-button';
            link1.href = '/cgi-bin/koha/circ/transferstoreceive.pl';
            link1.innerHTML = '<i class="fa-solid fa-truck"></i> Transferts à recevoir';
            li1.appendChild(link1);
            buttonsList.appendChild(li1);
          }

          if (!hasTransferSendLink) {
            const li2 = document.createElement('li');
            const link2 = document.createElement('a');
            link2.className = 'circ-button';
            link2.href = '/cgi-bin/koha/circ/transfers_to_send.pl';
            link2.innerHTML = '<i class="fa-solid fa-truck-ramp-box"></i> Transferts à envoyer';
            li2.appendChild(link2);
            buttonsList.appendChild(li2);
          }
        } catch (err) {
          (function(){})('052-modify-circulation-menu-links: failed to inject buttons', err);
        }
      }).catch(function() {
        // not present within timeout - nothing to do
      });
    }
})();

/* ===== EXACT LEGACY SOURCE: 076-modify-holdsqueue-links.js ===== */
/*
 Nom du fichier: 076-modify-holdsqueue-links.js
 Dépendances: KOHA_UTILS.waitFor (fallback included)
 Date de dernière modification: 2026-02-21
 Auteur: Michael Mundet
 Description: Remplace les liens vers la file de réservations par le rapport guidé.
*/

(function(){
  'use strict';
  try{
    (function(){})('076-modify-holdsqueue-links: loaded');
    const waitFor = (selector) => {
      if (window.KOHA_UTILS && typeof window.KOHA_UTILS.waitFor === 'function') return window.KOHA_UTILS.waitFor(selector);
      return new Promise((resolve) => {
        const el = document.querySelector(selector);
        if (el) return resolve(el);
        const obs = new MutationObserver(() => { const found = document.querySelector(selector); if (found) { obs.disconnect(); resolve(found); } });
        obs.observe(document.documentElement, { childList: true, subtree: true });
      });
    };

    waitFor('a').then(function(){
      try{
        const oldLinkPath = '/cgi-bin/koha/circ/view_holdsqueue.pl';
        const rid=Number(window.KohaTools?.Config?.getCanonical?.('navigation-link-rewrites')?.installation?.reportIds?.holdsQueue||0); const newLink=rid?`/cgi-bin/koha/reports/guided_reports.pl?id=${rid}&op=run`:oldLinkPath;
        document.querySelectorAll('a[href]').forEach(function(link){
          const href = (link.getAttribute('href') || '').replace(/&amp;/g, '&');
          if (href.indexOf(oldLinkPath) !== -1) {
            link.setAttribute('href', newLink);
          }
        });
      }catch(e){ (function(){})('076: replaceLinks error', e); }
    }).catch(()=>{});
  }catch(e){ (function(){})('076-modify-holdsqueue-links: failed', e); }
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