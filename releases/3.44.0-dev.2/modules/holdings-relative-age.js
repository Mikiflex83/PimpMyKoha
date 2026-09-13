(function(){"use strict";
const KT=window.KohaTools;if(!KT||!KT.Config)return;
const MODULE_ID='holdings-relative-age',CFG=KT.Config.getCanonical(MODULE_ID),Scope=KT.getService&&KT.getService("scope");
if(!CFG||!CFG.enabled||!["shadow","live"].includes(CFG.mode))return;
if(Scope&&!Scope.match(CFG.general&&CFG.general.scope).ok)return;
const runtime={
 id:MODULE_ID,
 description:'Ajoute un âge relatif aux dates techniques du tableau des exemplaires.',
 sourceFiles:['081-holdings-table-durations-detail.js', '100-koha-age-insertion-split.js'],
 parity:"exact-legacy",
 reloadRequiredOnConfigChange:true,
 init:function(){
   if(window["__KT_PARITY_"+MODULE_ID])return;
   window["__KT_PARITY_"+MODULE_ID]=true;
   
/* ===== EXACT LEGACY SOURCE: 081-holdings-table-durations-detail.js ===== */
/*
 Nom du fichier: 081-holdings-table-durations-detail.js
 Dépendances: KOHA_UTILS.waitFor (fallback included)
 Date de création: 2026-02-21
 Auteur: Assistant (pour Michael)
 Description: Ajoute les libellés "il y a X..." aux colonnes Date d'acquisition, Date du dernier emprunt et Vu en dernier
              dans `#holdings_table` sur la page detail.pl.
*/
(function(){
  'use strict';
  try{
    if (!window.location.pathname || !window.location.pathname.includes('detail.pl')) return;
    (function(){})('081-holdings-table-durations-detail: loaded');

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

    function parseDateFR(dateStr){
      if (window.VC_DATE_UTILS && typeof window.VC_DATE_UTILS.parseDateFR === 'function') return window.VC_DATE_UTILS.parseDateFR(dateStr);
      if (!dateStr) return null;
      const m = dateStr.trim().match(/(\d{2})\/(\d{2})\/(\d{4})/);
      if (!m) return null;
      const day = parseInt(m[1],10), month = parseInt(m[2],10), year = parseInt(m[3],10);
      return new Date(year, month-1, day);
    }

    function parseDateTimeFR(dateStr){
      if (window.VC_DATE_UTILS && typeof window.VC_DATE_UTILS.parseDateTimeFR === 'function') return window.VC_DATE_UTILS.parseDateTimeFR(dateStr);
      if (!dateStr) return null;
      const parts = dateStr.trim().split(/\s+/);
      const date = parseDateFR(parts[0]);
      if (!date) return null;
      if (parts[1]){
        const t = parts[1].split(':').map(Number);
        if (t.length >= 2) date.setHours(t[0], t[1], 0, 0);
      }
      return date;
    }

    function tempsEcoule(date){
      if (window.VC_DATE_UTILS && typeof window.VC_DATE_UTILS.tempsEcoule === 'function') return window.VC_DATE_UTILS.tempsEcoule(date);
      if (!date || isNaN(date)) return null;
      const now = new Date();
      const diffMs = now - date;
      const minutes = Math.floor(diffMs / 60000);
      const hours = Math.floor(diffMs / 3600000);
      const days = Math.floor(diffMs / 86400000);
      const months = Math.floor(days / 30.44);
      const years = Math.floor(days / 365.25);
      if (years >= 1) return `il y a ${years} an${years > 1 ? 's' : ''}`;
      if (months >= 1) return `il y a ${months} mois`;
      if (days >= 1) return `il y a ${days} jour${days > 1 ? 's' : ''}`;
      if (hours >= 1) return `il y a ${hours} heure${hours > 1 ? 's' : ''}`;
      if (minutes >= 1) return `il y a ${minutes} minute${minutes > 1 ? 's' : ''}`;
      return "à l’instant";
    }

    function processTable(table){
      if (!table) return;
      const headers = Array.from(table.querySelectorAll('thead th'));
      const rows = Array.from(table.querySelectorAll('tbody tr'));

      let colAcq = -1, colDernierEmprunt = -1, colVuEnDernier = -1;
      headers.forEach((th, idx) => {
        const name = (th.dataset.colname || th.textContent || '').toString().trim().toLowerCase();
        if (name === 'dateaccessioned' || name.includes("date d'acquisition")) colAcq = idx;
        if (name === 'datelastborrowed' || name.includes('date du dernier emprunt')) colDernierEmprunt = idx;
        if (name === 'lastseen' || name.includes('vu en dernier')) colVuEnDernier = idx;
      });

      rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        function traiter(index, parseFn){
          if (index === -1) return;
          const cell = cells[index];
          if (!cell) return;
          if (cell.dataset.vcAgeProcessed) return;
          const txt = cell.textContent.trim();
          if (!txt) return;
          const date = parseFn(txt);
          if (!date || isNaN(date)) return;
          const age = tempsEcoule(date);
          if (!age) return;
          const div = document.createElement('div');
          div.className = 'vc-age';
          div.style.marginTop = '4px';
          div.style.fontSize = '0.85em';
          div.style.color = '#555';
          div.textContent = age;
          cell.appendChild(div);
          cell.dataset.vcAgeProcessed = '1';
        }

        traiter(colAcq, parseDateFR);
        traiter(colDernierEmprunt, parseDateFR);
        traiter(colVuEnDernier, parseDateTimeFR);
      });
    }

    waitFor('#holdings_table', 3000).then(table => {
      try{
        processTable(table);

        // Observe tbody changes
        const tbody = table.querySelector('tbody');
        if (tbody){
          const mo = new MutationObserver(() => processTable(table));
          mo.observe(tbody, { childList: true, subtree: true });
        }

        if (!document.getElementById('vc-age-style')){
          const s = document.createElement('style'); s.id = 'vc-age-style';
          s.textContent = `.vc-age{ color:#555; font-size:0.85em; margin-top:4px }`;
          document.head.appendChild(s);
        }
      }catch(e){ (function(){})('081:init error', e); }
    }).catch(()=>{/* not found */});

  }catch(e){ (function(){})('081-holdings-table-durations-detail: failed', e); }
})();


/* ===== EXACT LEGACY SOURCE: 100-koha-age-insertion-split.js ===== */
/*
 Nom du fichier: 100-koha-age-insertion-split.js
 Description: Split qui réplique l'insertion des libellés "il y a X" dans `#holdings_table` (détail notice).
*/
(function(){
  'use strict';
  try{
    (function(){})('100-koha-age-insertion-split: loaded');
    if (!window.location.pathname || !window.location.pathname.includes('detail.pl')) return;

    function parseDateFR(dateStr) {
      if (!dateStr) return null;
      const parts = dateStr.trim().split('/');
      if (parts.length !== 3) return null;
      const [day, month, year] = parts.map(Number);
      return new Date(year, month - 1, day);
    }

    function parseDateTimeFR(dateStr) {
      if (!dateStr) return null;
      const [datePart, timePart] = dateStr.trim().split(' ');
      const date = parseDateFR(datePart);
      if (!date || !timePart) return date;
      const [h, m] = timePart.split(':').map(Number);
      date.setHours(h, m, 0, 0);
      return date;
    }

    function tempsEcoule(date) {
      const now = new Date();
      const diffMs = now - date;
      const minutes = Math.floor(diffMs / 60000);
      const hours = Math.floor(diffMs / 3600000);
      const days = Math.floor(diffMs / 86400000);
      const months = Math.floor(days / 30.44);
      const years = Math.floor(days / 365.25);
      if (years >= 1) return `il y a ${years} an${years > 1 ? 's' : ''}`;
      if (months >= 1) return `il y a ${months} mois`;
      if (days >= 1) return `il y a ${days} jour${days > 1 ? 's' : ''}`;
      if (hours >= 1) return `il y a ${hours} heure${hours > 1 ? 's' : ''}`;
      if (minutes >= 1) return `il y a ${minutes} minute${minutes > 1 ? 's' : ''}`;
      return "à l’instant";
    }

    // robust waitFor + observer to handle DataTables redraws
    const waitFor = (selector, timeout) => {
      if (window.KOHA_UTILS && typeof window.KOHA_UTILS.waitFor === 'function') return window.KOHA_UTILS.waitFor(selector, timeout);
      return new Promise((resolve, reject) => {
        const el = document.querySelector(selector);
        if (el) return resolve(el);
        const obs = new MutationObserver(() => { const found = document.querySelector(selector); if (found) { obs.disconnect(); resolve(found); } });
        obs.observe(document.documentElement, { childList: true, subtree: true });
        setTimeout(() => { obs.disconnect(); reject(new Error('timeout')); }, timeout || 5000);
      });
    };

    function processTable(table) {
      if (!table) return;
      const headers = Array.from(table.querySelectorAll('thead th'));
      const rows = Array.from(table.querySelectorAll('tbody tr'));

      let colAcq = -1, colDernierEmprunt = -1, colVuEnDernier = -1;
      headers.forEach((th, idx) => {
        const name = (th.dataset.colname || th.textContent || '').toString().trim().toLowerCase();
        if (name === 'dateaccessioned' || name.includes("date d'acquisition") || name.includes('acquisition')) colAcq = idx;
        if (name === 'datelastborrowed' || name.includes('date du dernier emprunt') || name.includes('dernier emprunt')) colDernierEmprunt = idx;
        if (name === 'lastseen' || name.includes('vu en dernier') || name.includes('vu en dernier')) colVuEnDernier = idx;
      });

      rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        function traiter(index, parseFn){
          if (index === -1) return;
          const cell = cells[index];
          if (!cell) return;
          if (cell.dataset.vcAgeProcessed) return; // idempotent
          const txt = cell.textContent.trim();
          if (!txt) return;
          const date = (window.VC_DATE_UTILS && typeof window.VC_DATE_UTILS.parseDateFR === 'function' && parseFn === parseDateFR)
            ? window.VC_DATE_UTILS.parseDateFR(txt)
            : (window.VC_DATE_UTILS && typeof window.VC_DATE_UTILS.parseDateTimeFR === 'function' && parseFn === parseDateTimeFR)
              ? window.VC_DATE_UTILS.parseDateTimeFR(txt)
              : parseFn(txt);
          if (!date || isNaN(date)) return;
          const age = (window.VC_DATE_UTILS && typeof window.VC_DATE_UTILS.tempsEcoule === 'function') ? window.VC_DATE_UTILS.tempsEcoule(date) : tempsEcoule(date);
          if (!age) return;
          const div = document.createElement('div');
          div.className = 'vc-age';
          div.style.marginTop = '4px';
          div.style.fontSize = '0.85em';
          div.style.color = '#555';
          div.textContent = age;
          cell.appendChild(div);
          cell.dataset.vcAgeProcessed = '1';
        }

        traiter(colAcq, parseDateFR);
        traiter(colDernierEmprunt, parseDateFR);
        traiter(colVuEnDernier, parseDateTimeFR);
      });
    }

    waitFor('#holdings_table', 5000).then(table => {
      try{
        processTable(table);
        const tbody = table.querySelector('tbody');
        if (tbody) {
          const mo = new MutationObserver(() => processTable(table));
          mo.observe(tbody, { childList: true, subtree: true });
        }
        const thead = table.querySelector('thead');
        if (thead) {
          const mo2 = new MutationObserver(() => processTable(table));
          mo2.observe(thead, { childList: true, subtree: true });
        }
      }catch(e){ (function(){})('100:init error', e); }
    }).catch(()=>{/* timeout */});

  }catch(e){ (function(){})('100-koha-age-insertion-split: failed', e); }
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