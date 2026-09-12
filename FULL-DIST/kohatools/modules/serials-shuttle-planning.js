(function(){"use strict";
const KT=window.KohaTools;if(!KT||!KT.Config)return;const MODULE_ID='serials-shuttle-planning',CFG=KT.Config.getCanonical(MODULE_ID),Scope=KT.getService&&KT.getService("scope");
if(!CFG||!CFG.enabled||!["shadow","live"].includes(CFG.mode))return;if(Scope&&!Scope.match(CFG.general&&CFG.general.scope).ok)return;
const runtime={id:MODULE_ID,sourceFiles:['030-planning-navette.js'],parity:"exact-legacy",init:function(){if(window["__KT_PARITY_"+MODULE_ID])return;window["__KT_PARITY_"+MODULE_ID]=true;

/* ===== EXACT LEGACY SOURCE: 030-planning-navette.js ===== */
(function(){
  const safeLabel = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  document.addEventListener('DOMContentLoaded', function(){
    (function(){})('030-planning-navette: loaded');
    // Planning de navette / réorganisation des onglets (subscription-detail.pl, serials-search.pl)
    if (window.location.pathname.indexOf("subscription-detail.pl")!== -1) {
      const subscriptionInfoPanel = document.getElementById('subscription_info_panel');
      const subscriptionIssuesPanel = document.getElementById('subscription_issues_panel');
      const subscriptionSummaryPanel = document.getElementById('subscription_summary_panel');
      const subscriptionPlanningPanel = document.getElementById('subscription_planning_panel');

      const style = document.createElement('style');
      style.innerHTML = `
       .three-column-container { display: flex; flex-wrap: wrap; gap: 20px; }
       .column { flex: 1; min-width: 150px; }
       .column-content { background-color: #f9f9f9; padding: 10px; }
       .section-header { background-color: #408540; color: #ffffff; padding: 10px; }
      `;
      document.head.appendChild(style);

      const container = document.createElement('div');
      container.className = 'three-column-container';

      const column1 = document.createElement('div'); column1.className = 'column';
      const column2 = document.createElement('div'); column2.className = 'column';
      const column3 = document.createElement('div'); column3.className = 'column';

      column1.innerHTML += '<div class="column-content">';
      column1.innerHTML += '<h2 class="section-header">' + safeLabel(CFG?.display?.sectionLabels?.information || 'Information') + '</h2>';
      column1.innerHTML += '<div>' + (subscriptionInfoPanel ? subscriptionInfoPanel.innerHTML : '') + '</div>';
      column1.innerHTML += '</div>';

      column2.innerHTML += '<div class="column-content">';
      column2.innerHTML += '<h2 class="section-header">' + safeLabel(CFG?.display?.sectionLabels?.calendar || 'Calendrier') + '</h2>';
      column2.innerHTML += '<div>' + (subscriptionPlanningPanel ? subscriptionPlanningPanel.innerHTML : '') + '</div>';
      column2.innerHTML += '</div>';

      column2.innerHTML += '<div class="column-content">';
      column2.innerHTML += '<h2 class="section-header">' + safeLabel(CFG?.display?.sectionLabels?.issues || 'Fascicules') + '</h2>';
      column2.innerHTML += '<div class="tableau-fasci">' + (subscriptionIssuesPanel ? subscriptionIssuesPanel.innerHTML : '') + '</div>';
      column2.innerHTML += '</div>';

      column3.innerHTML += '<div class="column-content">';
      column3.innerHTML += '<h2 class="section-header">' + safeLabel(CFG?.display?.sectionLabels?.summary || 'Résumé') + '</h2>';
      column3.innerHTML += '<div>' + (subscriptionSummaryPanel ? subscriptionSummaryPanel.innerHTML : '') + '</div>';
      column3.innerHTML += '</div>';

      container.appendChild(column1);
      container.appendChild(column2);
      container.appendChild(column3);

      if (subscriptionInfoPanel) {
        subscriptionInfoPanel.innerHTML = '';
        subscriptionInfoPanel.appendChild(container);
      }

      const tabs = document.querySelectorAll('.nav-tabs li');
      tabs.forEach(tab => {
        const tabText = tab.querySelector('a span')?.textContent;
        if ((Array.isArray(CFG?.display?.hiddenTabs) ? CFG.display.hiddenTabs : ['Fascicules','Résumé','Calendrier']).includes(tabText)) {
          tab.style.display = 'none';
        }
      });

      if (subscriptionIssuesPanel) subscriptionIssuesPanel.innerHTML = '';
      if (subscriptionSummaryPanel) subscriptionSummaryPanel.innerHTML = '';
      if (subscriptionPlanningPanel) subscriptionPlanningPanel.innerHTML = '';
    }

    // Ajustements pour serials-search.pl et subscription-detail.pl (liens / stockage prix)
    if (window.location.pathname.indexOf("serials-search.pl") !== -1 || window.location.pathname.indexOf("subscription-detail.pl") !== -1) {
      if (window.location.pathname.indexOf("serials-search.pl") !== -1) {
        var links = document.querySelectorAll('a[href*="serials-edit.pl?subscriptionid="]');
        links.forEach(function(link) {
          var href = link.getAttribute('href');
          var serstatusIndex = href.indexOf('serstatus=');
          if (serstatusIndex !== -1) {
            var endOfSerstatusIndex = href.indexOf('&', serstatusIndex);
            if (endOfSerstatusIndex === -1) endOfSerstatusIndex = href.length;
            var baseUrl = href.substring(0, serstatusIndex);
            var restOfUrl = href.substring(endOfSerstatusIndex);
            var newSerstatus = String(CFG?.serials?.statusFilter || '1,3,7,4,41,42,43,44,7,6');
            var newHref = baseUrl + 'serstatus=' + newSerstatus + restOfUrl;
            link.setAttribute('href', newHref);
          }
        });
      }

      if (window.location.pathname.indexOf("serials-search.pl") !== -1) {
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

        waitForSelector('table.dataTable', 2000).then(() => {
          function getColumnIndexByHeader(table, header) {
            var headers = table.querySelectorAll('th');
            for (var i = 0; i < headers.length; i++) {
              if (headers[i].textContent.trim() === header) return i;
            }
            return -1;
          }

          function handleButtonClick(event) {
            var buttonDiv = event.target.closest('.btn-group');
            if (!buttonDiv) return;
            var row = buttonDiv.closest('tr');
            if (!row) return;
            var cells = row.querySelectorAll('td');
            if (!cells[priceColumnIndex]) return;
            var priceValue = cells[priceColumnIndex].textContent.trim();
            localStorage.setItem('selectedPrice', priceValue);
          }

          var table = document.querySelector('table.dataTable');
          if (table) {
            var priceColumnIndex = getColumnIndexByHeader(table, String(CFG?.serials?.priceHeader || 'Prix fascicule'));
            if (priceColumnIndex !== -1) {
              var buttonDivs = table.querySelectorAll('.btn-group');
              buttonDivs.forEach(function(div) { div.addEventListener('click', handleButtonClick); });
            }
          }
        }).catch(() => {});
      }

      if (window.location.pathname.indexOf("subscription-detail.pl") !== -1) {
        document.addEventListener('click', function(event) {
          var target = event.target.closest('#receive');
          if (target) {
            var priceElement = Array.from(document.querySelectorAll('li')).find(li => li.textContent.includes('Prix fascicule:'));
            if (priceElement) {
              var priceText = priceElement.textContent.split('Prix fascicule:')[1].trim();
              localStorage.setItem('selectedPrice', priceText);
            }
          }
        });
      }
    }

    // Toggle sections helpers (used by planning UI)
    var boutons = document.querySelectorAll('.bouton');
    var sections = document.querySelectorAll('.sectionz');

    boutons.forEach(function(bouton) {
      bouton.onclick = function() {
        var sectionz = bouton.parentElement.nextElementSibling;
        toggleSection(sectionz);
      };
    });

    document.addEventListener('click', function(event) {
      var isButtonClick = false;
      boutons.forEach(function(bouton) {
        if (event.target === bouton || bouton.contains(event.target)) isButtonClick = true;
      });
      if (!isButtonClick) sections.forEach(function(section) { section.style.display = 'none'; });
    });

    function toggleSection(sectionz) {
      sections.forEach(function(section) {
        if (section !== sectionz) section.style.display = 'none';
      });
      sectionz.style.display = (sectionz.style.display === 'block') ? 'none' : 'block';
    }
  });
})();

},destroy:function(){return false;},onConfigChange:function(){return {reloadRequired:true};}};
KT.registerModule(runtime);if(CFG.mode==="shadow"){KT.record({module:MODULE_ID,level:"info",kind:"shadow-exact-parity-sealed",sources:runtime.sourceFiles});return;}runtime.init();
})();