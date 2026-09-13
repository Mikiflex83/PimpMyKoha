(function(){"use strict";
const KT=window.KohaTools;if(!KT||!KT.Config)return;const MODULE_ID='guided-reports-tools',CFG=KT.Config.getCanonical(MODULE_ID),Scope=KT.getService&&KT.getService("scope");
if(!CFG||!CFG.enabled||!["shadow","live"].includes(CFG.mode))return;if(Scope&&!Scope.match(CFG.general&&CFG.general.scope).ok)return;
const runtime={id:MODULE_ID,sourceFiles:['062-guided-reports-toolss.js'],parity:"exact-legacy",init:function(){if(window["__KT_PARITY_"+MODULE_ID])return;window["__KT_PARITY_"+MODULE_ID]=true;

/* ===== EXACT LEGACY SOURCE: 062-guided-reports-toolss.js ===== */
//-----------------------------------------------------------------------------------------------------------------------------
// 062-guided-reports-tools: enhance guided_reports.pl tables with filtering, sorting, highlights (defensive)
//-----------------------------------------------------------------------------------------------------------------------------
(function(){
  (function(){})('062-guided-reports-tools: loaded');
  try {
    if (window.location.pathname.indexOf('guided_reports.pl') === -1) return;

    function localWaitForSelector(selector, timeout) {
      return new Promise(function(resolve, reject) {
        var el = document.querySelector(selector);
        if (el) return resolve(el);
        var obs = new MutationObserver(function() { var node = document.querySelector(selector); if (node) { obs.disconnect(); resolve(node); } });
        obs.observe(document.documentElement || document.body, { childList: true, subtree: true });
        if (typeof timeout === 'number') setTimeout(function() { obs.disconnect(); reject(new Error('Timed out waiting for ' + selector)); }, timeout);
      });
    }
    var waitForSelector = (window.KOHA_UTILS && typeof window.KOHA_UTILS.waitForSelector === 'function') ? window.KOHA_UTILS.waitForSelector : localWaitForSelector;

    waitForSelector('.pages + table', 3000).then(function(table) {
      try {
        // inject centralised styles (prefixed grt-)
        if (!document.getElementById('grt-styles')) {
          var style = document.createElement('style'); style.id = 'grt-styles'; style.type = 'text/css';
          style.textContent = '\n.grt-filter-row{display:none;}\n.grt-filter-row th{padding:6px 4px;background:#f6f8fb;}\n.grt-filter-row input[type="text"]{box-sizing:border-box;width:100%;height:32px;padding:5px 8px;border:1px solid #c7d1dc;border-radius:4px;background:#fff;color:#263746;}\n.grt-filter-row input[type="text"]:focus{outline:0;border-color:#287ea3;box-shadow:0 0 0 2px rgba(40,126,163,.15);}\n.grt-highlight{background:yellow;padding:0 2px;border-radius:2px;}\n.grt-highlighted td, .grt-highlighted{background:#fffbdd !important;}\n.grt-sort-icon.asc, .grt-sort-icon.desc{margin-left:6px;font-size:0.9em;}\n.grt-sticky th{position:sticky;top:0;background:#fff;z-index:3;}\n.grt-tools{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:8px 0;position:relative;z-index:10;}\n.grt-tools button{height:34px;padding:0 12px;border:1px solid #c7d1dc;border-radius:4px;background:#fff;color:#34495a;font-weight:600;cursor:pointer;transition:background .15s,border-color .15s,color .15s,box-shadow .15s;}\n.grt-tools button:hover{border-color:#287ea3;background:#eef7fb;color:#1d607e;}\n.grt-tools button:focus{outline:0;box-shadow:0 0 0 2px rgba(40,126,163,.15);}\n.grt-general-search{min-width:260px;height:34px;padding:6px 10px;border:1px solid #c7d1dc;border-radius:4px;}\n.grt-general-search:focus{outline:0;border-color:#287ea3;box-shadow:0 0 0 2px rgba(40,126,163,.15);}\n.grt-columns-anchor{position:relative;}\n.grt-columns-button[aria-expanded="true"]{border-color:#287ea3;background:#eaf5f9;color:#1d607e;}\n.grt-columns-toggle{display:none;position:absolute;top:calc(100% + 5px);left:0;min-width:220px;max-height:360px;overflow-y:auto;padding:11px;border:1px solid #d8e0e8;border-radius:6px;background:#fff;box-shadow:0 5px 16px rgba(30,45,60,.16);}\n.grt-columns-title{margin-bottom:8px;font-size:13px;font-weight:600;color:#526273;}\n.grt-columns-grid{display:flex;flex-direction:column;gap:2px;}\n.grt-columns-grid label{display:flex;align-items:center;gap:8px;padding:7px 8px;font-weight:400;border-radius:4px;cursor:pointer;}\n.grt-columns-grid label:hover{background:#f1f6f8;}\n.grt-columns-grid input{width:16px;height:16px;accent-color:#287ea3;}\n#grt-stats{position:fixed;right:10px;top:80px;background:white;border:1px solid #ccc;padding:8px;z-index:9999;}\n';
          document.head.appendChild(style);
        }

        // optional chart area adjustment
        var chartDiv = document.querySelector('.clearfix#chart');
        if (chartDiv) { var newParagraph = document.createElement('p'); newParagraph.innerHTML = ''; chartDiv.appendChild(newParagraph); }

        if (!table) return;
        if (table.dataset.grtInited === '1') return; // idempotence
        var rows = Array.from(table.querySelectorAll('tr'));
        if (!rows || rows.length === 0) return;

        var highlightedRows = [];
        var CONFIG = Object.assign({ debounce: Number(CFG?.filters?.debounceMs ?? 250) }, window.GUIDED_REPORTS_TOOLS || {});
        var SPECIAL_REPORT_IDS = (Array.isArray(CFG?.reportPresets?.specialReportIds) ? CFG.reportPresets.specialReportIds : []).map(String);

        // utilities
        function debounce(fn, wait){ var t; return function(){ var args=arguments; var ctx=this; clearTimeout(t); t=setTimeout(function(){ fn.apply(ctx,args); }, wait); }; }
        function escapeRegExp(s){ return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
        function removeHighlights(cell){ var spans = cell.querySelectorAll('span.grt-highlight'); for(var i=0;i<spans.length;i++){ var span=spans[i]; span.replaceWith(document.createTextNode(span.textContent)); } }
        // use event delegation for row highlighting
        var tbody = table.tBodies && table.tBodies[0] ? table.tBodies[0] : null;
        if (!tbody) tbody = table;
        var originalRowOrder = Array.from(tbody.rows || []);
        tbody.addEventListener('click', function(event){ var tr = event.target.closest('tr'); if (!tr || tr === rows[0]) return; var index = highlightedRows.indexOf(tr); var isAltPressed = event.altKey; if (index === -1) { if (!isAltPressed) { highlightedRows.forEach(function(r){ r.classList.remove('grt-highlighted'); }); highlightedRows = []; } tr.classList.add('grt-highlighted'); highlightedRows.push(tr); } else { if (!isAltPressed) { tr.classList.remove('grt-highlighted'); highlightedRows.splice(index,1); } } });

        // rendre la première ligne sticky
        try { rows[0].classList.add('grt-sticky'); table.style.borderCollapse = 'separate'; } catch(e){ }

        function detectDateFormat(dateString) { if (/^\d{2}-\d{2}-\d{4}$/.test(dateString)) return 'DD-MM-YYYY'; if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return 'YYYY-MM-DD'; return null; }
        function parseDate(dateString, format) { if (format === 'DD-MM-YYYY') { var parts = dateString.split('-'); return new Date(parts[2], parts[1] - 1, parts[0]); } else if (format === 'YYYY-MM-DD') { return new Date(dateString); } return null; }

        function customCompare(a, b, asc) {
          a = (a||'').trim(); b = (b||'').trim(); if (!a && !b) return 0; if (!a) return asc ? -1 : 1; if (!b) return asc ? 1 : -1;
          var parseDuration = function(str){ var match = str.match(/(\d+)\s*mois.*?(\d+)\s*jours?/i); if (match) return parseInt(match[1],10)*30 + parseInt(match[2],10); return null; };
          var durA = parseDuration(a); var durB = parseDuration(b); if (durA !== null && durB !== null) return asc ? durA - durB : durB - durA;
          var parseCote = function(str){ var match = str.match(/^(\d+(?:\.\d+)?)(?:\s+(.+))?$/); if (match) return { type: 'dewey', number: parseFloat(match[1]), suffix: match[2] ? match[2].trim() : '' }; return { type: 'alpha', text: str }; };
          var coteA = parseCote(a); var coteB = parseCote(b);
          if (coteA.type === 'dewey' && coteB.type === 'dewey') { if (coteA.number !== coteB.number) return asc ? coteA.number - coteB.number : coteB.number - coteA.number; return asc ? coteA.suffix.localeCompare(coteB.suffix, 'fr', { numeric: true }) : coteB.suffix.localeCompare(coteA.suffix, 'fr', { numeric: true }); }
          if (coteA.type === 'dewey' && coteB.type === 'alpha') return asc ? -1 : 1; if (coteA.type === 'alpha' && coteB.type === 'dewey') return asc ? 1 : -1; if (coteA.type === 'alpha' && coteB.type === 'alpha') return asc ? coteA.text.localeCompare(coteB.text, 'fr', { numeric: true }) : coteB.text.localeCompare(coteA.text, 'fr', { numeric: true });
          var numA = parseFloat(a.replace(',','.')); var numB = parseFloat(b.replace(',','.')); if (!isNaN(numA) && !isNaN(numB)) return asc ? numA - numB : numB - numA;
          var parseDateGeneric = function(str){ var m; if ((m = str.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/))) return new Date(+m[3], m[2]-1, +m[1]); if ((m = str.match(/^(\d{4})[\/\-](\d{2})[\/\-](\d{2})$/))) return new Date(+m[1], m[2]-1, +m[3]); return null; };
          var dateA = parseDateGeneric(a); var dateB = parseDateGeneric(b); if (dateA && dateB) return asc ? dateA - dateB : dateB - dateA;
          return asc ? a.localeCompare(b, 'fr', { numeric: true }) : b.localeCompare(a, 'fr', { numeric: true });
        }

        var sortColumns = [];
        var headerRow = rows[0];
        var allRows = Array.from(table.rows || []);
        var columnVisibilityState = {};

        function assignColumnIds() {
          var headers = Array.from(headerRow.cells || []);
          headers.forEach(function(th, idx){
            var colId = th.dataset.grtColId || ('grt-col-' + idx);
            th.dataset.grtColId = colId;
            for (var ri = 1; ri < allRows.length; ri++) {
              var row = allRows[ri];
              if (!row || !row.cells || !row.cells[idx]) continue;
              row.cells[idx].dataset.grtColId = colId;
            }
          });
        }

        function setColumnVisibility(colId, visible) {
          if (!colId) return;
          columnVisibilityState[colId] = visible;
          var cells = table.querySelectorAll('[data-grt-col-id="' + colId + '"]');
          cells.forEach(function(cell){
            try {
              if (visible) {
                cell.style.display = '';
                if (cell.dataset) delete cell.dataset.grtHidden;
                if (cell.classList) cell.classList.remove('grt-hidden');
              } else {
                cell.style.display = 'none';
                if (cell.dataset) cell.dataset.grtHidden = '1';
                if (cell.classList) cell.classList.add('grt-hidden');
              }
            } catch(e){}
          });
          try {
            var filterCell = filterRow && filterRow.querySelector('[data-grt-col-id="' + colId + '"]');
            if (filterCell) filterCell.style.display = visible ? '' : 'none';
          } catch(e){}
        }

        function createColumnToggleUI(buttonContainer) {
          var wrap = document.createElement('div');
          wrap.className = 'grt-columns-toggle';
          wrap.id = 'grt-columns-toggle';

          var title = document.createElement('div');
          title.className = 'grt-columns-title';
          title.textContent = 'Colonnes visibles';
          wrap.appendChild(title);

          var button = document.createElement('button');
          button.type = 'button';
          button.className = 'btn btn-default grt-columns-button';
          button.textContent = 'Colonnes visibles';
          button.setAttribute('aria-expanded', 'false');
          button.setAttribute('aria-controls', wrap.id);
          button.addEventListener('click', function(){
            var visible = window.getComputedStyle(wrap).display !== 'none';
            wrap.style.display = visible ? 'none' : 'block';
            button.setAttribute('aria-expanded', String(!visible));
          });
          var anchor = document.createElement('div');
          anchor.className = 'grt-columns-anchor';
          anchor.appendChild(button);
          document.addEventListener('click', function(event){
            if (!anchor.contains(event.target) && window.getComputedStyle(wrap).display !== 'none') {
              wrap.style.display = 'none';
              button.setAttribute('aria-expanded', 'false');
            }
          });

          var grid = document.createElement('div');
          grid.className = 'grt-columns-grid';

          Array.from(headerRow.cells || []).forEach(function(th, idx){
            var colId = th.dataset.grtColId || ('grt-col-' + idx);
            th.dataset.grtColId = colId;
            columnVisibilityState[colId] = window.getComputedStyle(th).display !== 'none';
            var label = document.createElement('label');
            var input = document.createElement('input');
            input.type = 'checkbox';
            input.checked = true;
            input.dataset.grtToggleCol = colId;
            var text = document.createElement('span');
            var headerName = (th.innerText || th.textContent || '').trim();
            text.textContent = headerName || ('Colonne ' + (idx + 1));
            input.addEventListener('change', function(){ setColumnVisibility(colId, input.checked); });
            label.appendChild(input);
            label.appendChild(text);
            grid.appendChild(label);
          });

          wrap.appendChild(grid);
          anchor.appendChild(wrap);
          buttonContainer.appendChild(anchor);
        }

        assignColumnIds();

        // --- Report-specific presets (e.g. RAPPORT 5191) -----------------
        function isReport5191() {
          try {
            if (location.pathname !== '/cgi-bin/koha/reports/guided_reports.pl') return false;
            var params = new URLSearchParams(location.search);
            if (SPECIAL_REPORT_IDS.includes(String(params.get('id') || ''))) return true;
            var hiddenId = document.querySelector('#limitselect input[name="id"]');
            if (hiddenId && SPECIAL_REPORT_IDS.includes(String(hiddenId.value || ''))) return true;
            var sql = document.querySelector('#sql');
            if (sql && sql.value && SPECIAL_REPORT_IDS.some(id=>sql.value.indexOf('saved_sql.id: '+id) !== -1)) return true;
          } catch (e) {}
          return false;
        }

        if (isReport5191()) {
          (function initReport5191(){
            var DEFAULT_VISIBLE = new Set(['grt-col-0','grt-col-1','grt-col-2','grt-col-6','grt-col-7','grt-col-8','grt-col-9','grt-col-11']);
            Array.from(headerRow.cells || []).forEach(function(th, idx){
              var headerText = (th.innerText || th.textContent || '').trim().toLowerCase();
              if (headerText === 'code collection' || headerText === 'collection') DEFAULT_VISIBLE.add(th.dataset.grtColId || ('grt-col-' + idx));
            });
            var tries = 0;
            var t = setInterval(function(){
              tries++;
              var checkboxes = document.querySelectorAll('#grt-columns-toggle input[data-grt-toggle-col]');
              if (!checkboxes.length) {
                if (tries > 50) clearInterval(t);
                return;
              }
              clearInterval(t);
              // apply initial visibility according to DEFAULT_VISIBLE
              Array.from(checkboxes).forEach(function(cb){
                try {
                  var colId = cb.getAttribute('data-grt-toggle-col');
                  var visible = DEFAULT_VISIBLE.has(colId);
                  cb.checked = visible;
                  setColumnVisibility(colId, visible);
                } catch(e){}
              });
              // signal readiness so print code can wait
              try { document.dispatchEvent(new CustomEvent('grt:columns-ready', { detail: { report: 5191 } })); } catch(e){}
            }, 100);
          })();
        }

        // Propagate existing hidden state set by other scripts (e.g. report 5191)
        (function markExistingHiddenCols(){
          try {
            if (!headerRow) return;
            Array.from(headerRow.cells || []).forEach(function(th, idx){
              try {
                var st = window.getComputedStyle(th);
                var colId = th.dataset && th.dataset.grtColId ? th.dataset.grtColId : ('grt-col-' + idx);
                if (st && st.display === 'none') {
                  var cells = table.querySelectorAll('[data-grt-col-id="' + colId + '"]');
                  cells.forEach(function(cell){
                    try {
                      cell.style.display = 'none';
                      if (cell.dataset) cell.dataset.grtHidden = '1';
                      if (cell.classList) cell.classList.add('grt-hidden');
                    } catch(e){}
                  });
                  // if our toggle UI exists, uncheck the corresponding checkbox
                  var toggle = document.querySelector('input[data-grt-toggle-col="' + colId + '"]');
                  try { if (toggle) toggle.checked = false; } catch(e){}
                }
              } catch(e){}
            });
          } catch(e){}
        })();
        // Publish a ready event so other scripts (e.g. print button) can wait
        try {
          window.GRT = window.GRT || {};
          window.GRT.columnsReady = false;
          window.GRT.columnsReadyPromise = new Promise(function(resolve){
            try {
              var handler = function(e){
                window.GRT.columnsReady = true;
                resolve(e && e.detail);
                document.removeEventListener('grt:columns-ready', handler);
              };
              document.addEventListener('grt:columns-ready', handler);
              // dispatch now if already ready
              var alreadyReady = (function(){
                // consider ready when toggle UI exists or we marked inited
                return !!document.querySelector('#grt-columns-toggle') || table.dataset.grtInited === '1';
              })();
              if (alreadyReady) {
                var evt = new CustomEvent('grt:columns-ready', { detail: { tableSelector: '.pages + table' } });
                document.dispatchEvent(evt);
              }
            } catch(e) { resolve(); }
          });
        } catch(e){}
        // Observe future changes (other scripts may hide columns after init)
        (function observeHiddenChanges(){
          try {
            if (!headerRow || !table) return;

            // small debounced wrapper to avoid flooding
            var debSetColumnVisibility = debounce(function(colId, visible){ setColumnVisibility(colId, visible); }, 50);

            var headerObserver = new MutationObserver(function(mutations){
              mutations.forEach(function(m){
                try {
                  var th = (m.target && m.target.nodeName === 'TH') ? m.target : null;
                  if (!th && m.target && m.target.closest) th = m.target.closest('th');
                  if (th) {
                    var idx = Array.prototype.indexOf.call(headerRow.cells, th);
                    var colId = th.dataset && th.dataset.grtColId ? th.dataset.grtColId : ('grt-col-' + idx);
                    var st = window.getComputedStyle(th);
                    var hidden = st && st.display === 'none';
                    debSetColumnVisibility(colId, !hidden);
                    var toggle = document.querySelector('input[data-grt-toggle-col="' + colId + '"]');
                    try { if (toggle) toggle.checked = !hidden; } catch(e){}
                  }
                } catch(e){}
              });
            });
            // observe only header attributes (no subtree)
            headerObserver.observe(headerRow, { attributes: true, subtree: false, attributeFilter: ['style','class'] });

            // observe tbody attribute changes only (no childList/subtree)
            var tbodyNode = table.tBodies && table.tBodies[0] ? table.tBodies[0] : null;
            var tableObserver = new MutationObserver(function(mutations){
              mutations.forEach(function(m){
                try {
                  if (m.type === 'attributes' && (m.attributeName === 'style' || m.attributeName === 'class')) {
                    var t = m.target;
                    if (t && t.nodeName === 'TD') {
                      var colId = t.dataset && t.dataset.grtColId ? t.dataset.grtColId : null;
                      if (colId) { var st = window.getComputedStyle(t); debSetColumnVisibility(colId, !(st && st.display === 'none')); }
                    }
                  }
                } catch(e){}
              });
            });
            if (tbodyNode) tableObserver.observe(tbodyNode, { attributes: true, subtree: false, attributeFilter: ['style','class'] });

            // lightweight childList watcher for initial dynamic additions: short-lived
            var childListObserver = new MutationObserver(function(mutations){
              try { assignColumnIds(); } catch(e){}
            });
            childListObserver.observe(table, { childList: true, subtree: true });
            // disconnect childList watcher after short grace period
            setTimeout(function(){ try { childListObserver.disconnect(); } catch(e){} }, 2000);

          } catch(e){}
        })();
        function sortTable() {
          var tbody = table.tBodies[0]; var rowsArray = Array.from(tbody.rows); var fragment = document.createDocumentFragment();
          rowsArray.sort(function(rowA, rowB){ for (var idx=0; idx<sortColumns.length; idx++){ var col = sortColumns[idx]; var cellA = (rowA.cells[col.index] && rowA.cells[col.index].textContent) ? rowA.cells[col.index].textContent.trim() : ''; var cellB = (rowB.cells[col.index] && rowB.cells[col.index].textContent) ? rowB.cells[col.index].textContent.trim() : ''; var comp = customCompare(cellA, cellB, col.asc); if (comp !== 0) return comp; } return 0; });
          requestAnimationFrame(function(){
            rowsArray.forEach(function(r){ fragment.appendChild(r); });
            tbody.appendChild(fragment);
          });
        }

        // header click sorting
        headerRow.addEventListener('click', function(event){ if (event.target && event.target.tagName === 'TH'){
          var columnIndex = event.target.cellIndex; var existingIndex = -1; for (var s=0;s<sortColumns.length;s++) if (sortColumns[s].index===columnIndex) { existingIndex=s; break; }
          if (existingIndex !== -1) sortColumns[existingIndex].asc = !sortColumns[existingIndex].asc; else sortColumns.push({ index: columnIndex, asc: true });
          Array.from(this.cells).forEach(function(cell){ cell.classList.remove('asc','desc'); var icon = cell.querySelector('.sort-icon'); if (icon) icon.parentNode.removeChild(icon); });
          for (var sc=0; sc<sortColumns.length; sc++){ var col = sortColumns[sc]; var sortIcon = document.createElement('span'); sortIcon.className = 'sort-icon ' + (col.asc ? 'asc':'desc'); sortIcon.innerHTML = col.asc ? '&#9650;' : '&#9660;'; try { headerRow.cells[col.index].classList.add(col.asc ? 'asc' : 'desc'); headerRow.cells[col.index].append(sortIcon); } catch(e){} }
          requestAnimationFrame(sortTable);
        }});

        // Création des filtres par colonne (with debounce)
        var filterRow = document.createElement('tr'); filterRow.className = 'grt-filter-row';
        for (var ci = 0; ci < headerRow.cells.length; ci++) {
          var filterName = (headerRow.cells[ci] && headerRow.cells[ci].innerText ? headerRow.cells[ci].innerText.trim() : '') || ('Colonne ' + (ci + 1));
          var filterCell = document.createElement('th');
          filterCell.dataset.grtColId = headerRow.cells[ci].dataset.grtColId || ('grt-col-' + ci);
          var filterInput = document.createElement('input'); filterInput.type='text'; filterInput.value=''; filterInput.setAttribute('data-column-index', ci); filterInput.placeholder = 'Filtrer...'; filterInput.setAttribute('aria-label', 'Filtrer ' + filterName); filterInput.addEventListener('input', debounce(createFilterHandler(), CONFIG.debounce)); filterCell.appendChild(filterInput); filterRow.appendChild(filterCell);
        }
        if (headerRow.parentNode) headerRow.parentNode.appendChild(filterRow);
        Array.from(headerRow.cells || []).forEach(function(headerCell, idx){
          try {
            if (window.getComputedStyle(headerCell).display === 'none' && filterRow.cells[idx]) filterRow.cells[idx].style.display = 'none';
          } catch(e){}
        });

        function createFilterHandler(){ return function(){
          var filterInputs = filterRow.querySelectorAll('input[data-column-index]');
          var filterValues = Array.from(filterInputs).map(function(input){ return input.value.trim().toLowerCase(); });
          table.querySelectorAll('span.grt-highlight').forEach(function(span){ span.replaceWith(document.createTextNode(span.textContent)); });
          for (var r=1; r<rows.length; r++) {
            var row = rows[r];
            var cells = row.querySelectorAll('td');
            var hideRow = false;
            for (var j=0; j<cells.length; j++) {
              var filterCell = filterRow.cells[j];
              if (filterCell && window.getComputedStyle(filterCell).display === 'none') continue;
              var filterValue = filterValues[j] || '';
              if (filterValue && (cells[j].textContent || '').toLowerCase().indexOf(filterValue) === -1) { hideRow = true; break; }
            }
            row.style.display = hideRow ? 'none' : '';
          }
          for (var visibleIndex=1; visibleIndex<rows.length; visibleIndex++) {
            var visibleRow = rows[visibleIndex];
            if (visibleRow.style.display === 'none') continue;
            var visibleCells = visibleRow.querySelectorAll('td');
            for (var cellIndex=0; cellIndex<visibleCells.length; cellIndex++) {
              var visibleFilterCell = filterRow.cells[cellIndex];
              var visibleFilter = filterValues[cellIndex] || '';
              if (!visibleFilterCell || window.getComputedStyle(visibleFilterCell).display === 'none' || !visibleFilter) continue;
              try {
                var regex = new RegExp(escapeRegExp(visibleFilter), 'gi');
                var matchText = visibleCells[cellIndex].innerText;
                visibleCells[cellIndex].innerHTML = matchText.replace(regex, '<span class="grt-highlight">$&</span>');
              } catch(e){}
            }
          }
        }; }

        var toolsWrapper = document.createElement('div'); toolsWrapper.className = 'grt-tools';
        var limitSelectForm = document.getElementById('limitselect'); if (limitSelectForm && limitSelectForm.parentNode) { limitSelectForm.parentNode.insertBefore(toolsWrapper, limitSelectForm.nextSibling); }

        var filterToggleButton = document.createElement('button'); filterToggleButton.type = 'button'; filterToggleButton.textContent = 'Filtres'; filterToggleButton.className = 'btn btn-default grt-filter-toggle'; filterToggleButton.setAttribute('aria-expanded', 'false'); filterToggleButton.setAttribute('aria-controls', 'grt-filter-row'); toolsWrapper.appendChild(filterToggleButton);
        filterRow.id = 'grt-filter-row';
        filterToggleButton.addEventListener('click', function(){
          var visible = filterRow.style.display !== 'table-row';
          filterRow.style.display = visible ? 'table-row' : 'none';
          Object.keys(columnVisibilityState).forEach(function(colId){ setColumnVisibility(colId, columnVisibilityState[colId]); });
          filterToggleButton.setAttribute('aria-expanded', String(visible));
        });

        var resetButton = document.createElement('button'); resetButton.textContent = 'Réinitialiser les filtres'; resetButton.className='btn btn-default grt-reset'; toolsWrapper.appendChild(resetButton); resetButton.addEventListener('click', function(){ var filterInputs = filterRow.querySelectorAll('input[data-column-index]'); for (var i=0;i<filterInputs.length;i++) filterInputs[i].value=''; createFilterHandler()(); });

        var resetSortButton = document.createElement('button'); resetSortButton.type = 'button'; resetSortButton.textContent = 'Réinitialiser les tris'; resetSortButton.className = 'btn btn-default grt-reset-sort'; toolsWrapper.appendChild(resetSortButton);
        resetSortButton.addEventListener('click', function(){
          sortColumns.length = 0;
          Array.from(headerRow.cells).forEach(function(cell){
            cell.classList.remove('asc', 'desc');
            var icon = cell.querySelector('.sort-icon');
            if (icon) icon.parentNode.removeChild(icon);
          });
          var fragment = document.createDocumentFragment();
          originalRowOrder.forEach(function(row){ fragment.appendChild(row); });
          tbody.appendChild(fragment);
        });

        // Masquage/affichage dynamique des colonnes (toutes colonnes, quel que soit le tableau)
        createColumnToggleUI(toolsWrapper);

        // Champ de recherche général
        var searchInput = document.createElement('input'); searchInput.type='text'; searchInput.placeholder='Rechercher dans toutes les colonnes...'; searchInput.classList.add('grt-general-search'); toolsWrapper.appendChild(searchInput);
        var doGeneralSearch = debounce(function(){ var searchTerm = (searchInput.value||'').toLowerCase(); for (var ri=1; ri<rows.length; ri++){ var row = rows[ri]; var rowText = row.dataset.grtText || Array.from(row.querySelectorAll('td')).map(function(c){ return (c && c.innerText)?c.innerText.toLowerCase():''; }).join(' '); var hideRow = rowText.indexOf(searchTerm) === -1; row.style.display = hideRow ? 'none' : ''; } }, CONFIG.debounce);
        searchInput.addEventListener('input', doGeneralSearch);
        // Sélection et stats (Shift + clic)
        var selectedCells = [];
        function calculerStats(tableau) { var somme=0; var min=Infinity; var max=-Infinity; for (var si=0; si<tableau.length; si++){ var valeur = parseFloat(tableau[si].textContent) || 0; somme += valeur; min = Math.min(min, valeur); max = Math.max(max, valeur); } var moyenne = somme / (tableau.length||1); return { somme: somme, moyenne: isNaN(moyenne)? 'Calcul impossible' : moyenne.toFixed(2), minimum: min===Infinity? 'Calcul impossible' : min, maximum: max===-Infinity? 'Calcul impossible' : max }; }
        function updateStatsDiv(event) { var statsDiv = document.getElementById('grt-stats'); if (event.shiftKey) { if (!statsDiv) { statsDiv = document.createElement('div'); statsDiv.id='grt-stats'; document.body.appendChild(statsDiv); } var stats = calculerStats(selectedCells); statsDiv.innerHTML = '<p>Somme : '+stats.somme+'</p><p>Moyenne : '+stats.moyenne+'</p><p>Minimum : '+stats.minimum+'</p><p>Maximum : '+stats.maximum+'</p>'; statsDiv.style.display='block'; } else { if (statsDiv) { statsDiv.style.display='none'; } } }
        function cellClickHandler(event){ var cell = event.target.closest('td'); if (!cell) return; if (event.shiftKey) { selectedCells.push(cell); cell.style.backgroundColor='yellow'; } updateStatsDiv(event); }
        function shiftUpHandler(event){ selectedCells.forEach(function(c){ c.style.backgroundColor=''; }); selectedCells = []; var statsDiv = document.getElementById('grt-stats'); if (statsDiv) { statsDiv.style.display='none'; } }
        // delegate cell clicks
        tbody.addEventListener('click', function(e){ if (e.target && e.target.closest('td')) cellClickHandler(e); });
        document.addEventListener('keydown', function(event){ if (event.key === 'Shift') document.body.classList.add('grt-shiftPressed'); }); document.addEventListener('keyup', function(event){ if (event.key === 'Shift') { document.body.classList.remove('grt-shiftPressed'); shiftUpHandler(event); } });

        // Drag/drop
        var isDragging = false; var sourceColumnIndex = null;
        function handleDragStart(event){ isDragging = true; sourceColumnIndex = event.target.cellIndex; try { event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', String(sourceColumnIndex)); } catch(e){} }
        function handleDragOver(event){ event.preventDefault(); try{ event.dataTransfer.dropEffect = 'move'; } catch(e){} }
        function handleDragEnd(){ isDragging = false; sourceColumnIndex = null; }
        function handleDrop(event){ event.preventDefault(); try{ var targetIndex = event.target.cellIndex; var src = parseInt(event.dataTransfer.getData('text/plain'),10); if (isNaN(src)) return; if (src === targetIndex) return; // rebuild rows with new column order
            var headers = Array.from(headerRow.cells); var newOrder = headers.map(function(_,i){ return i; }); // move src to target
            newOrder.splice(targetIndex,0,newOrder.splice(src,1)[0]); var tbodyRows = Array.from(tbody.rows); tbodyRows.forEach(function(r){ var cells = Array.from(r.children); var newCells = newOrder.map(function(i){ return cells[i] || document.createElement('td'); }); // replace row
              while (r.firstChild) r.removeChild(r.firstChild); newCells.forEach(function(c){ r.appendChild(c); }); });
          } catch(e){} finally { isDragging=false; sourceColumnIndex=null; } }
        var tableHeaders = headerRow.querySelectorAll('th'); tableHeaders.forEach(function(header){ try{ header.setAttribute('draggable','true'); header.addEventListener('dragstart', handleDragStart); header.addEventListener('dragover', handleDragOver); header.addEventListener('dragend', handleDragEnd); header.addEventListener('drop', handleDrop); } catch(e){} });

        // observe tbody changes to refresh caches
        var observer = new MutationObserver(function(m){ try { cacheAllRows(); } catch(e){} });
        try { if (tbody) observer.observe(tbody, { childList: true, subtree: false }); } catch(e){}

        function cacheAllRows(){ for (var ri=1; ri<rows.length; ri++){ try{ var row = rows[ri]; var text = Array.from(row.querySelectorAll('td')).map(function(c){ return (c && c.innerText) ? c.innerText.toLowerCase() : ''; }).join('||'); row.dataset.grtText = text; } catch(e){} } }
        cacheAllRows();

        // mark as initialised
        table.dataset.grtInited = '1';

      } catch (e) { (function(){})('062-guided-reports-tools inner error:', e); }
    }).catch(function(){ /* table not present in time */ });

  } catch (err) { (function(){})('062-guided-reports-tools error:', err); }
})();


},destroy:function(){return false;},onConfigChange:function(){return {reloadRequired:true};}};
KT.registerModule(runtime);if(CFG.mode==="shadow"){KT.record({module:MODULE_ID,level:"info",kind:"shadow-exact-parity-sealed",sources:runtime.sourceFiles});return;}runtime.init();
})();