(function(){"use strict";
const KT=window.KohaTools;if(!KT||!KT.Config)return;const MODULE_ID='responsive-sidebar-visibility',CFG=KT.Config.getCanonical(MODULE_ID),Scope=KT.getService&&KT.getService("scope");
if(!CFG||!CFG.enabled||!["shadow","live"].includes(CFG.mode))return;if(Scope&&!Scope.match(CFG.general&&CFG.general.scope).ok)return;
const runtime={id:MODULE_ID,sourceFiles:['024-hide-sidebar-small-window.js'],parity:"exact-legacy",init:function(){if(window["__KT_PARITY_"+MODULE_ID])return;window["__KT_PARITY_"+MODULE_ID]=true;

/* ===== EXACT LEGACY SOURCE: 024-hide-sidebar-small-window.js ===== */
/*
 Nom du fichier: 024-hide-sidebar-small-window.js
 Dépendances: aucune
 Date de dernière modification: 2026-02-21
 Auteur: Michael Mundet
 Description: Cache certains éléments de la sidebar pour les petites résolutions et gère le resize de façon performante.
*/

(function(){
  document.addEventListener('DOMContentLoaded', function(){
    const path = window.location.pathname || '';
    const href = window.location.href || '';
    const isLoginPage = !!document.getElementById('login') || /\/cgi-bin\/koha\/mainpage\.pl$/.test(path);
    const isPrintLikePage = /print|slip/i.test(path) || /print|slip/i.test(href) || /\/cgi-bin\/koha\/circ\/print_overdues\.pl$/i.test(path);
    if (isLoginPage || isPrintLikePage) return;

    const HIDE_CLASS = 'koha-hidden-small';
    const THRESHOLD = 600; // px

    // inject CSS once
    if (!document.getElementById('koha-hide-small-style')) {
      const s = document.createElement('style');
      s.id = 'koha-hide-small-style';
      s.textContent = `
        .${HIDE_CLASS} { display: none !important; }
        .koha-sidebar-toggle { display:inline-flex; align-items:center; gap:6px; padding:4px 8px; margin:4px; cursor:pointer; }
      `;
      document.head.appendChild(s);
    }

    // selectors scoped to sidebar area only
    const sidebar = document.querySelector('#sidebar') || document.querySelector('.sidebar');
    if (!sidebar) return;

    function getTargets() {
      const ids = ['jeuDuMoment', 'historique', 'sidebar5'];
      const els = ids.map(id => sidebar.querySelector('#'+id)).filter(Boolean);
      const tech = Array.from(sidebar.querySelectorAll('.technique'));
      return {els, tech};
    }

    function applyHideClass(el, hide) {
      if (!el) return;
      if (hide) el.classList.add(HIDE_CLASS); else el.classList.remove(HIDE_CLASS);
    }

    function checkWindowSize() {
      const show = window.innerWidth >= THRESHOLD;
      const {els, tech} = getTargets();
      els.forEach(el => applyHideClass(el, !show));
      tech.forEach(el => applyHideClass(el, !show));
    }

    // setup a small toggle to manually show/hide sidebar on small screens
    function setupToggleButton() {
      if (!sidebar || sidebar.dataset.toggleSetup === '1') return;
      const toggle = document.createElement('button');
      toggle.className = 'koha-sidebar-toggle btn btn-sm btn-light';
      toggle.type = 'button';
      toggle.setAttribute('aria-expanded', 'true');
      toggle.innerHTML = '<i class="fa fa-bars" aria-hidden="true"></i><span>Afficher la sidebar</span>';
      toggle.addEventListener('click', () => {
        const expanded = toggle.getAttribute('aria-expanded') === 'true';
        toggle.setAttribute('aria-expanded', String(!expanded));
        const {els, tech} = getTargets();
        // toggle visibility irrespective of window width
        els.concat(tech).forEach(el => el.classList.toggle(HIDE_CLASS));
      });
      // insert at the top of sidebar
      const firstChild = sidebar.firstElementChild;
      if (firstChild) sidebar.insertBefore(toggle, firstChild);
      else sidebar.appendChild(toggle);
      sidebar.dataset.toggleSetup = '1';
    }

    // initial run
    setupToggleButton();
    checkWindowSize();

    // efficient resize handling via rAF
    let resizeScheduled = false;
    window.addEventListener('resize', () => {
      if (resizeScheduled) return;
      resizeScheduled = true;
      requestAnimationFrame(() => { checkWindowSize(); resizeScheduled = false; });
    });

    // Observe sidebar subtree for elements added dynamically and re-apply hiding
    const obsRoot = sidebar.querySelector('nav, .sidebar, #sidebar') || sidebar;
    const mo = new MutationObserver(mutations => {
      let need = false;
      for (const m of mutations) {
        if (m.addedNodes && m.addedNodes.length) { need = true; break; }
      }
      if (need) {
        // small delay to allow nodes to be ready
        requestAnimationFrame(() => checkWindowSize());
      }
    });
    mo.observe(obsRoot, { childList: true, subtree: true });
  });
})();

},destroy:function(){return false;},onConfigChange:function(){return {reloadRequired:true};}};
KT.registerModule(runtime);if(CFG.mode==="shadow"){KT.record({module:MODULE_ID,level:"info",kind:"shadow-exact-parity-sealed",sources:runtime.sourceFiles});return;}runtime.init();
})();