(function(){"use strict";
const KT=window.KohaTools;if(!KT||!KT.Config)return;const MODULE_ID='new-release-indicators',CFG=KT.Config.getCanonical(MODULE_ID),Scope=KT.getService&&KT.getService("scope");
if(!CFG||!CFG.enabled||!["shadow","live"].includes(CFG.mode))return;if(Scope&&!Scope.match(CFG.general&&CFG.general.scope).ok)return;
const runtime={id:MODULE_ID,sourceFiles:['079-new-release-logos.js'],parity:"exact-legacy",init:function(){if(window["__KT_PARITY_"+MODULE_ID])return;window["__KT_PARITY_"+MODULE_ID]=true;

/* ===== EXACT LEGACY SOURCE: 079-new-release-logos.js ===== */
/*
 Nom du fichier: 079-new-release-logos.js
 Dépendances: KOHA_UTILS.waitFor (fallback included)
 Date de dernière modification: 2026-02-21
 Auteur: Michael Mundet
 Description: Affiche des repères visuels pour nouveautés sur `search.pl` et `detail.pl`.
*/

(function(){
  'use strict';
  try{
    (function(){})('079-new-release-logos: loaded');

    function getIndicator(date, type) {
      const today = new Date();
      const diffDays = (today - date) / (1000 * 60 * 60 * 24);
      const defaults = [
        { days:90, label:'3m', color:'green', tooltip:'Nouveauté de moins de 3 mois', acquisitionTooltip:'Nouveauté de moins de 3 mois (date acquisition exemplaire le plus récent)' },
        { days:180, label:'6m', color:'orange', tooltip:'Nouveauté de moins de 6 mois', acquisitionTooltip:'Nouveauté de moins de 6 mois (date acquisition exemplaire le plus récent)' },
        { days:365, label:'1a', color:'red', tooltip:'Nouveauté de moins de 1 an', acquisitionTooltip:'Nouveauté de moins de 1 an (date acquisition exemplaire le plus récent)' }
      ];
      const thresholds = Array.isArray(CFG?.rules?.thresholds) && CFG.rules.thresholds.length ? CFG.rules.thresholds : defaults;
      const rule = thresholds.slice().sort((a,b)=>Number(a.days||0)-Number(b.days||0)).find(x=>diffDays <= Number(x.days||0));
      if (!rule) return null;
      return { label:String(rule.label||''), color:String(rule.color||'green'), tooltip:type === 'acquisition' ? String(rule.acquisitionTooltip||rule.tooltip||'') : String(rule.tooltip||'') };
    }

    function createStarElement(indicator) {
      const starEl = document.createElement('span');
      starEl.style.display = 'inline-block';
      starEl.style.backgroundColor = indicator.color;
      starEl.style.color = '#fff';
      starEl.style.fontSize = '14px';
      starEl.style.padding = '4px 8px';
      starEl.style.borderRadius = '20px';
      starEl.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.2)';
      starEl.style.cursor = 'default';
      starEl.style.transition = 'background-color 0.3s ease, opacity 0.3s ease';
      starEl.textContent = '★ ' + indicator.label;
      starEl.title = indicator.tooltip;
      starEl.addEventListener('mouseover', function() { starEl.style.opacity = '0.8'; });
      starEl.addEventListener('mouseout', function() { starEl.style.opacity = '1'; });
      return starEl;
    }

    function createStarsWrapper(indicators) {
      const starsContainer = document.createElement('div');
      starsContainer.style.display = 'inline-flex';
      starsContainer.style.alignItems = 'center';
      starsContainer.style.gap = '5px';
      Object.values(indicators).forEach(indicator => { starsContainer.appendChild(createStarElement(indicator)); });
      const wrapper = document.createElement('div');
      wrapper.appendChild(starsContainer);
      wrapper.appendChild(document.createElement('br'));
      return wrapper;
    }

    function processSearch() {
      const rows = document.querySelectorAll('tr[id^="row"]');
      rows.forEach(row => {
        const dateDivs = row.querySelectorAll('.date_achat');
        const indicators = {};
        dateDivs.forEach(div => {
          const text = (div.textContent || '').trim();
          if (text) {
            const d = new Date(text);
            if (!isNaN(d.getTime())) {
              const indicator = getIndicator(d, 'achat');
              if (indicator) indicators[indicator.label] = indicator;
            }
          }
        });
        if (Object.keys(indicators).length > 0) {
          const coverCell = row.querySelector('.bookcoverimg') || row;
          const wrapper = createStarsWrapper(indicators);
          coverCell.appendChild(wrapper);
        }
      });
    }

    function processDetail() {
      const rows = document.querySelectorAll('#holdings_table tbody tr');
      const allIndicators = {};
      rows.forEach(row => {
        const dateCells = row.querySelectorAll('td.dateaccessioned');
        if (!dateCells.length) return;
        dateCells.forEach(td => {
          const dateText = (td.textContent || '').trim();
          const parts = dateText.split('/');
          if (parts.length !== 3) return;
          const d = new Date(parts[2], parts[1] - 1, parts[0]);
          if (isNaN(d.getTime())) return;
          const indicator = getIndicator(d, 'acquisition');
          if (indicator) allIndicators[indicator.label] = indicator;
        });
      });
      if (Object.keys(allIndicators).length > 0) {
        const wrapper = createStarsWrapper(allIndicators);
        const target = document.querySelector('p.first');
        if (target && target.parentNode) target.parentNode.insertBefore(wrapper, target); else (function(){})("079: no <p class='first'> found on detail.pl");
      }
    }

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

    const path = window.location.pathname || '';
    if (path.includes('search.pl') && CFG?.features?.searchResults !== false) {
      waitFor('tr[id^="row"]', 2000).then(processSearch).catch(() => { /* no rows found */ });
    } else if (path.includes('detail.pl') && CFG?.features?.detailPage !== false) {
      waitFor('#holdings_table tbody tr', 2000).then(processDetail).catch(() => { /* no holdings */ });
    }

  }catch(e){ (function(){})('079-new-release-logos: failed', e); }
})();


},destroy:function(){return false;},onConfigChange:function(){return {reloadRequired:true};}};
KT.registerModule(runtime);if(CFG.mode==="shadow"){KT.record({module:MODULE_ID,level:"info",kind:"shadow-exact-parity-sealed",sources:runtime.sourceFiles});return;}runtime.init();
})();