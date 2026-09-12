(function(){"use strict";
const KT=window.KohaTools;if(!KT||!KT.Config)return;const MODULE_ID='page-scroll-controls',CFG=KT.Config.getCanonical(MODULE_ID),Scope=KT.getService&&KT.getService("scope");
if(!CFG||!CFG.enabled||!["shadow","live"].includes(CFG.mode))return;if(Scope&&!Scope.match(CFG.general&&CFG.general.scope).ok)return;
const runtime={id:MODULE_ID,sourceFiles:['106-scroll-buttons.js'],parity:"exact-legacy",init:function(){if(window["__KT_PARITY_"+MODULE_ID])return;window["__KT_PARITY_"+MODULE_ID]=true;

/* ===== EXACT LEGACY SOURCE: 106-scroll-buttons.js ===== */
/*
 Nom du fichier: 106-scroll-buttons.js
 Dépendances: aucune
 Description: Ajoute deux boutons flottants pour descendre en bas de page et remonter en haut
*/

(function () {
  'use strict';

  const BTN_SCROLL_DOWN_ID = 'scroll-button-down';
  const BTN_SCROLL_UP_ID = 'scroll-button-up';
  const STYLE_ID = 'scroll-buttons-style';
  const SCROLL_THRESHOLD = 200;
  const BOTTOM_EPSILON = 2;
  const UNLOCK_COOLDOWN_MS = 1000;
  let lastUnlockTs = 0;

  function getScrollElement() {
    return document.scrollingElement || document.documentElement || document.body;
  }

  function getScrollY() {
    const el = getScrollElement();
    return window.pageYOffset || el.scrollTop || 0;
  }

  function getMaxScrollTop() {
    const el = getScrollElement();
    return Math.max(0, el.scrollHeight - el.clientHeight);
  }

  function supportsSmoothScroll() {
    return 'scrollBehavior' in document.documentElement.style;
  }

  function scrollToY(top) {
    const target = Math.max(0, Math.min(top, getMaxScrollTop()));

    try {
      if (supportsSmoothScroll()) {
        window.scrollTo({ top: target, behavior: 'smooth' });
      } else {
        window.scrollTo(0, target);
      }
    } catch (_) {
      window.scrollTo(0, target);
    }

    // Fallback legacy moteurs
    document.documentElement.scrollTop = target;
    document.body.scrollTop = target;
  }

  function hasVisibleModal() {
    const selectors = [
      '.modal.show',
      '.modal.in',
      '[aria-modal="true"]',
      '.ui-dialog'
    ];

    for (let i = 0; i < selectors.length; i++) {
      const nodes = document.querySelectorAll(selectors[i]);
      for (let j = 0; j < nodes.length; j++) {
        const node = nodes[j];
        if (node && node.offsetParent !== null) return true;
      }
    }

    return false;
  }

  // Corrige un blocage scroll si html/body restent en overflow hidden hors modal.
  function tryUnlockScroll(reason) {
    const now = Date.now();
    if (now - lastUnlockTs < UNLOCK_COOLDOWN_MS) return;

    const html = document.documentElement;
    const body = document.body;
    if (!html || !body) return;
    if (hasVisibleModal()) return;

    const htmlStyle = window.getComputedStyle(html);
    const bodyStyle = window.getComputedStyle(body);

    const htmlLocked = htmlStyle.overflowY === 'hidden' || htmlStyle.overflow === 'hidden';
    const bodyLocked = bodyStyle.overflowY === 'hidden' || bodyStyle.overflow === 'hidden';
    const bodyFixed = bodyStyle.position === 'fixed';

    if (!htmlLocked && !bodyLocked && !bodyFixed) return;

    if (htmlLocked) {
      html.style.overflow = '';
      html.style.overflowY = '';
    }

    if (bodyLocked) {
      body.style.overflow = '';
      body.style.overflowY = '';
    }

    if (bodyFixed) {
      body.style.position = '';
      body.style.top = '';
      body.style.left = '';
      body.style.right = '';
      body.style.width = '';
    }

    lastUnlockTs = now;

  }

  // Injecte le style une seule fois
  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .scroll-btn {
        position: fixed;
        right: 28px;
        width: 50px;
        height: 50px;
        border: none;
        background-color: rgb(64, 133, 64);
        color: white;
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        font-size: 20px;
        line-height: 1;
        display: none;
        align-items: center;
        justify-content: center;
        transition: background-color 0.2s ease, opacity 0.3s ease;
        opacity: 0;
        z-index: 10000;
        touch-action: manipulation;
      }
      .scroll-btn.visible {
        display: flex;
        opacity: 1;
      }
      .scroll-btn:hover {
        background-color: #0056b3;
      }
      .scroll-btn span {
        font-size: 22px;
        font-weight: bold;
      }
      #${BTN_SCROLL_DOWN_ID} { top: 40px; }
      #${BTN_SCROLL_UP_ID} { bottom: 30px; }
    `;
    document.head.appendChild(style);
  }

  // Cree un bouton s'il n'existe pas deja
  function createButton(id, title, symbol, onClick) {
    let btn = document.getElementById(id);
    if (btn) return btn;
    btn = document.createElement('button');
    btn.type = 'button';
    btn.id = id;
    btn.className = 'scroll-btn';
    btn.title = title;
    btn.setAttribute('aria-label', title);
    btn.innerHTML = `<span aria-hidden="true">${symbol}</span>`;
    btn.addEventListener('click', onClick);
    document.body.appendChild(btn);
    return btn;
  }

  // Met a jour la visibilite des boutons
  function updateVisibility(btnDown, btnUp) {
    const scrollY = getScrollY();
    const maxScrollTop = getMaxScrollTop();

    btnDown.classList.toggle('visible', scrollY < maxScrollTop - BOTTOM_EPSILON);
    btnUp.classList.toggle('visible', scrollY > SCROLL_THRESHOLD);
  }

  // Initialise les boutons
  function initScrollButtons() {
    injectStyles();

    const btnDown = createButton(
      BTN_SCROLL_DOWN_ID,
      'Descendre en bas',
      '▼',
      () => {
        tryUnlockScroll('click-down');
        scrollToY(getMaxScrollTop());
      }
    );
    const btnUp = createButton(
      BTN_SCROLL_UP_ID,
      'Remonter en haut',
      '▲',
      () => {
        tryUnlockScroll('click-up');
        scrollToY(0);
      }
    );

    // Gestion scroll et resize (limite les recalculs)
    let ticking = false;
    const scheduleUpdate = function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        updateVisibility(btnDown, btnUp);
        ticking = false;
      });
    };

    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate, { passive: true });

    // En cas de lock involontaire, on debloque lors d'une intention utilisateur.
    window.addEventListener('wheel', function () { tryUnlockScroll('wheel'); }, { passive: true });
    window.addEventListener('touchstart', function () { tryUnlockScroll('touchstart'); }, { passive: true });
    window.addEventListener('keydown', function (ev) {
      const keys = ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', 'Space'];
      if (keys.indexOf(ev.key) !== -1) {
        tryUnlockScroll('keydown:' + ev.key);
      }
    }, { passive: true });

    // Mise a jour initiale
    tryUnlockScroll('init');
    updateVisibility(btnDown, btnUp);
  }

  // Lancement au DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initScrollButtons);
  } else {
    initScrollButtons();
  }
})();


},destroy:function(){return false;},onConfigChange:function(){return {reloadRequired:true};}};
KT.registerModule(runtime);if(CFG.mode==="shadow"){KT.record({module:MODULE_ID,level:"info",kind:"shadow-exact-parity-sealed",sources:runtime.sourceFiles});return;}runtime.init();
})();