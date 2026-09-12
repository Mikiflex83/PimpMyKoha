(function(){"use strict";
const KT=window.KohaTools;if(!KT||!KT.Config)return;const MODULE_ID='external-search-panel',CFG=KT.Config.getCanonical(MODULE_ID),Scope=KT.getService&&KT.getService("scope");
if(!CFG||!CFG.enabled||!["shadow","live"].includes(CFG.mode))return;if(Scope&&!Scope.match(CFG.general&&CFG.general.scope).ok)return;
const runtime={id:MODULE_ID,sourceFiles:['037-external-search-box.js'],parity:"exact-legacy",init:function(){if(window["__KT_PARITY_"+MODULE_ID])return;window["__KT_PARITY_"+MODULE_ID]=true;

/* ===== EXACT LEGACY SOURCE: 037-external-search-box.js ===== */
/*
 Nom du fichier: 037-external-search-box.js
 Dépendances: KOHA_UTILS.waitForSelector (fallback included), jQuery optional
 Date de dernière modification: 2026-02-21
 Auteur: Michael Mundet
 Description: Ajoute un encart pour relancer la recherche sur des sites externes depuis `search.pl`.
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

  if (document.location.href.indexOf('search.pl') === -1) {
    (function(){})('037-external-search-box: skipped (not search.pl)');
    return;
  }

  waitForSelector('#catalog_results, #breadcrumbs', 2000).then(() => {
    try {
      // prefer jQuery when present for simplicity
      const $ = window.jQuery;
      if (!$ || $('#catalog_results').length === 0) return;

      var s = $('#breadcrumbs li').has('a[href="#"]').text().trim().match(/'(.*?)'/);
      if (!s) return;
      var searchCriteria = s[1];

      var links = [
        { href: 'https://www.google.com/search?q=babelio+' + searchCriteria, text: 'Babelio' },
        { href: 'https://www.allocine.fr/rechercher/?q=' + searchCriteria, text: 'Allocine' },
        { href: 'https://www.google.com/search?q=' + searchCriteria, text: 'Google' },
        { href: 'https://www.google.com/search?tbm=bks&q=' + searchCriteria, text: 'Google Books' },
        { href: 'https://fr.wikipedia.org/w/index.php?search=' + searchCriteria + '&title=Sp%C3%A9cial%3ARecherche&ns0=1', text: 'Wikipedia' },
        { href: 'https://www.amazon.com/s?k=' + searchCriteria, text: 'Amazon (General)' },
        { href: 'https://www.amazon.com/s?k=' + searchCriteria + '&i=stripbooks', text: 'Amazon Livres' }
      ];

      var $searchAlso = $('<div id="search-also" style="border: 1px solid #408540; border-radius: 5px 5px 0 0;"></div>')
        .append('<h4 style="background-color: #408540; border-bottom: 1px solid #408540; border-radius: 5px 5px 0 0; font-size: 90%; margin: 0; padding: 0.4em 0.2em; color: white; text-align: center;">Relancer la recherche sur :</h4>');

      links.forEach(link => { $searchAlso.append('<a href="' + link.href + '" target="_blank">' + link.text + '</a><br/>'); });

      var branchCode = $('.logged-in-branch-code').first().text();
      if (branchCode === 'YOURBRANCHCODE') { $searchAlso.append('<a href="YOUR LINK HERE">SPECIAL LINK 1</a><br/>'); }
      else if (branchCode === 'ANOTHERBRANCHCODE') { $searchAlso.append('<a href="YOUR LINK HERE">SPECIAL LINK 2</a><br/>'); }

      $searchAlso.append('</div>');
      $('aside').append($searchAlso);
    } catch (err) {
      (function(){})('037-external-search-box error:', err);
    }
  }).catch(() => {/* not applicable */});

  (function(){})('037-external-search-box: loaded');
})();

},destroy:function(){return false;},onConfigChange:function(){return {reloadRequired:true};}};
KT.registerModule(runtime);if(CFG.mode==="shadow"){KT.record({module:MODULE_ID,level:"info",kind:"shadow-exact-parity-sealed",sources:runtime.sourceFiles});return;}runtime.init();
})();