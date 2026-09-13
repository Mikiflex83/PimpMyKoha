(function(){"use strict";
const KT=window.KohaTools;if(!KT||!KT.Config)return;const MODULE_ID='serials-receipt-assistant',CFG=KT.Config.getCanonical(MODULE_ID),Scope=KT.getService&&KT.getService("scope");
if(!CFG||!CFG.enabled||!["shadow","live"].includes(CFG.mode))return;if(Scope&&!Scope.match(CFG.general&&CFG.general.scope).ok)return;
const runtime={id:MODULE_ID,sourceFiles:['073-serials-bulletinage.js'],parity:"exact-legacy",init:function(){if(window["__KT_PARITY_"+MODULE_ID])return;window["__KT_PARITY_"+MODULE_ID]=true;
/*
 Nom du fichier: 073-serials-bulletinage.js
 pourquoi
 Date de dernière modification: 2026-02-21
 Auteur: Michael Mundet
 Description: Ajoute boutons d'aide au bulletinage et contrôles ergonomiques pour `serials-edit.pl`.
*/

(function(){
  'use strict';
  try{
    (function(){})('073-serials-bulletinage: loaded');
    if (!window.location.pathname || !window.location.pathname.includes('serials-edit.pl')) return;

    function countFields() {
      const serialSeqInputs = document.querySelectorAll('input[name="serialseq"]');
      const plannedDateInputs = document.querySelectorAll('input[name="planneddate"]');
      (function(){})("073: serialseq count", serialSeqInputs.length);
      (function(){})("073: planneddate count", plannedDateInputs.length);
    }

    function addIndicesToFields() { /* legacy stub */ }

    function extractNumber(text) {
      const patterns = [/N°\s*(\d+)(?:\s*-\s*(.*))?/i, /N°\s*(\d+)(?:-(\d+))?/i];
      for (const pattern of patterns) {
        const match = (text || '').match(pattern);
        if (match) return { number: String(match[1]).trim(), fullText: match[2] ? String(match[2]).trim() : '' };
      }
      return null;
    }

    function isValidDate(dateString) { const date = new Date(dateString); return date instanceof Date && !isNaN(date); }
    function formatDate(dateString) { if (!isValidDate(dateString)) return 'Invalid Date'; const date = new Date(dateString); return date.toLocaleDateString('fr-FR'); }
    function formatValueForField(number, fullText, publicationDate) { return `${number} ${fullText} (${publicationDate})`; }

    function updateField(section, labelText, value) {
      const label = Array.from(section.querySelectorAll('label')).find(label => label.textContent && label.textContent.trim() === labelText);
      if (label) {
        const li = label.closest('li');
        if (!li) return;
        const input = li.querySelector('input[type="text"], select');
        if (input) {
          if (input.tagName === 'SELECT') Array.from(input.options).forEach(option => { if (option.value === value) { input.value = option.value; } });
          else input.value = input.value.trim() ? `${input.value.trim()} ${value}` : value;
        }
      }
    }

    function appendToSerialSeqAndFields(section, textToAdd, index) {
      const serialSeqInputs = document.querySelectorAll('input[name="serialseq"]');
      const kField = Array.from(section.querySelectorAll('label')).find(label => label.textContent && label.textContent.trim() === 'k - Cote');
      const vField = Array.from(section.querySelectorAll('label')).find(label => label.textContent && label.textContent.trim() === 'v - Numéro de la revue');
      const serialSeqInput = serialSeqInputs[index];
      if (serialSeqInput) serialSeqInput.value = `${serialSeqInput.value.trim()} ${textToAdd}`;
      if (kField) { const kInput = kField.closest('li').querySelector('input[type="text"]'); if (kInput) kInput.value = `${kInput.value.trim()} ${textToAdd}`; }
      if (vField) { const vInput = vField.closest('li').querySelector('input[type="text"]'); if (vInput) { const currentValue = vInput.value.trim(); const position = currentValue.indexOf('('); if (position !== -1) vInput.value = `${currentValue.slice(0, position)} ${textToAdd} ${currentValue.slice(position)}`; else vInput.value = `${currentValue} ${textToAdd}`; } }
    }

    function applyButtonStyles(button) {
      button.style.backgroundColor = '#4CAF50'; button.style.border = 'none'; button.style.color = 'white'; button.style.padding = '5px 5px'; button.style.textAlign = 'center'; button.style.textDecoration = 'none'; button.style.display = 'inline-block'; button.style.fontSize = '13px'; button.style.margin = '2px 2px'; button.style.cursor = 'pointer'; button.style.borderRadius = '5px'; button.style.transition = 'background-color 0.3s ease';
      button.addEventListener('mouseover', function() { button.style.backgroundColor = '#45a049'; });
      button.addEventListener('mouseout', function() { button.style.backgroundColor = '#4CAF50'; });
    }

    function createButtonForSection(section, config, index) {
      const button = document.createElement('button'); button.textContent = `${config.text}`; button.id = config.id; button.type = 'button'; section.appendChild(button); applyButtonStyles(button);
      button.addEventListener('click', function(event) { event.preventDefault(); updateField(section, 'q - Public', config.public); updateField(section, 's - Etage', config.floor); updateField(section, 'e - Localisation', config.location ?? config.Location ?? ''); updateField(section, 'j - Sous localisation', config.subLocation); });
    }

    function initializeButtons() {
      countFields(); addIndicesToFields();
      const legends = document.querySelectorAll('legend');
      legends.forEach(function(legend, index) {
        if (legend.textContent && legend.textContent.includes('Exemplaire')) {
          const section = legend.closest('fieldset') || legend.parentElement;
          const buttonFill = document.createElement('button'); buttonFill.textContent = `Remplir les champs`; buttonFill.id = `exemplaire-button-fill`; buttonFill.type = 'button'; section.appendChild(buttonFill); applyButtonStyles(buttonFill);
          buttonFill.addEventListener('click', function(event) {
            event.preventDefault();
            const adjustedIndex = index - 1;
            const serialSeqInputs = document.querySelectorAll('input[name="serialseq"]');
            const plannedDateInputs = document.querySelectorAll('input[name="planneddate"]');
            if (adjustedIndex >= 0 && adjustedIndex < serialSeqInputs.length && adjustedIndex < plannedDateInputs.length) {
              const serialSeqInput = serialSeqInputs[adjustedIndex];
              const plannedDateInput = plannedDateInputs[adjustedIndex];
              if (serialSeqInput && plannedDateInput) {
                const extractedData = extractNumber(serialSeqInput.value);
                if (extractedData) {
                  const number = extractedData.number; const fullText = extractedData.fullText; const selectedPrice = localStorage.getItem('selectedPrice');
                  const plannedDate = plannedDateInput.value; const formattedInitialDate = formatDate(plannedDate); const formattedValue = formatValueForField(number, fullText, formattedInitialDate);
                  updateField(section, 'v - Numéro de la revue', formattedValue); updateField(section, 'k - Cote', number);
                  if (selectedPrice) updateField(section, 'p - Prix', selectedPrice);
                  plannedDateInput.value = new Date().toISOString().split('T')[0];
                }
              }
            }
          });

          const buttonDoublon = document.createElement('button'); applyButtonStyles(buttonDoublon);
          buttonDoublon.addEventListener('click', function(event) { event.preventDefault(); const adjustedIndex = index - 1; if (adjustedIndex >= 0) { const serialSeqInput = document.querySelectorAll('input[name="serialseq"]')[adjustedIndex]; if (serialSeqInput) appendToSerialSeqAndFields(section, '(Doublon)', adjustedIndex); } });

          const buttonHS = document.createElement('button'); buttonHS.textContent = `Ajouter HS`; buttonHS.id = `exemplaire-button-hs`; buttonHS.type = 'button'; section.appendChild(buttonHS); applyButtonStyles(buttonHS);
          buttonHS.addEventListener('click', function(event) { event.preventDefault(); const adjustedIndex = index - 1; if (adjustedIndex >= 0) { const serialSeqInput = document.querySelectorAll('input[name="serialseq"]')[adjustedIndex]; if (serialSeqInput) appendToSerialSeqAndFields(section, 'HS', adjustedIndex); } });

          const buttonConfigs = Array.isArray(CFG?.presets?.itemButtons) ? CFG.presets.itemButtons : [];
          buttonConfigs.forEach(function(config) { createButtonForSection(section, config, index); });
        }
      });
    }

    // run initialization once the document body is present
    const waitFor = (selector, timeout) => {
      if (window.KOHA_UTILS && typeof window.KOHA_UTILS.waitFor === 'function') return window.KOHA_UTILS.waitFor(selector, timeout);
      return new Promise((resolve, reject) => {
        const el = document.querySelector(selector);
        if (el) return resolve(el);
        const obs = new MutationObserver(() => {
          const found = document.querySelector(selector);
          if (found) { obs.disconnect(); resolve(found); }
        });
        obs.observe(document.documentElement, { childList: true, subtree: true });
        setTimeout(() => { obs.disconnect(); reject(new Error('timeout')); }, timeout || 3000);
      });
    };

    waitFor('body', 3000).then(function(){
      try{
        initializeButtons();

        let legends = document.querySelectorAll('legend');
        legends.forEach(function(legend) {
          if (legend.textContent && legend.textContent.includes('Exemplaire')) {
            let button = document.createElement('button');
            button.textContent = String(CFG?.reporting?.buttonLabel || 'Signaler un problème de bulletinage');
            button.style.marginLeft = '10px'; button.type = 'button'; legend.parentNode.insertBefore(button, legend.nextSibling);
            button.addEventListener('click', function(event) {
              event.preventDefault();
              try{
                var h1Em = document.querySelector('h1 em'); var nomAbonnement = h1Em ? h1Em.textContent : 'Nom non disponible';
                var h1Text = document.querySelector('h1') ? document.querySelector('h1').textContent : '';
                var cote = h1Text.match(/:\s*([A-Z]{3})/) ? h1Text.match(/:\s*([A-Z]{3})/)[1] : 'Côte non disponible';
                var nomUtilisateurElement = document.querySelector('.loggedinusername'); var nomUtilisateur = nomUtilisateurElement ? nomUtilisateurElement.textContent : 'Nom d\'utilisateur non disponible';
                var numFasciculeElement = document.querySelector('input[name="serialseq"]'); var numFascicule = numFasciculeElement ? numFasciculeElement.value : 'Numéro de fascicule non disponible';
                const plannedDateInputs = document.querySelectorAll('input[name="planneddate"]');
                var datePublication = plannedDateInputs.length > 0 ? plannedDateInputs[0].value : 'Date de publication non disponible';
                var codeBarresElement = document.querySelector('input[name="barcode"]'); var codeBarres = codeBarresElement ? codeBarresElement.value : 'Code-barres non disponible';
                var subject = encodeURIComponent(String(CFG?.reporting?.subjectPrefix || 'Problème de Bulletinage') + ' : ' + nomAbonnement + ' de ' + cote);
                var body = encodeURIComponent('Bonjour,\n\nJe vous signale un problème lors du bulletinage. Voici les informations présentes avant le bulletinage :\n\n- Nom de l\'abonnement : ' + nomAbonnement + '\n- Côte : ' + cote + '\n- Nom de l\'utilisateur : ' + nomUtilisateur + '\n- Numéro de fascicule : ' + numFascicule + '\n- Date de publication : ' + datePublication + '\n- Code-barres : ' + codeBarres + '\n\nMerci de renseigner ici les informations qui étaient attendues :\n\n- Nom de l\'abonnement : ' + nomAbonnement + '\n- Côte : ' + cote + '\n- Numéro de fascicule : ____________\n- Date de publication : ____________\n- Code-barres : ____________\n- Autres remarques :\n\n\nCordialement,');
                var recipients = (Array.isArray(CFG?.reporting?.recipients) ? CFG.reporting.recipients.filter(Boolean) : []).join(',');
                var mailtoLink = 'mailto:' + recipients + '?subject=' + subject + '&body=' + body;
                window.location.href = mailtoLink;
              }catch(e){ (function(){})('073: report click error', e); }
            });
          }
        });

        // overlay and field blocking logic
        if (window.location.pathname && window.location.pathname.includes('serials-edit.pl')){
          try{
            const fieldsToDisable = ['b - Site Propriétaire','c - Site actuel','s - Etage','e - Localisation','j - Sous localisation','k - Cote','r - Type de document','q - Public','t - Achat/don','A - Fournisseur','p - Prix','u - Note interne','v - Numéro de la revue','x - Note OPAC'];
            let isBlocked = true;
            const style = document.createElement('style');
            style.textContent = `.overlay{position:absolute;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.05);pointer-events:auto;visibility:visible;opacity:1;transition:visibility 0s, opacity 0.5s linear;z-index:10}.overlay.hidden{visibility:hidden;opacity:0}.field-overlay{position:absolute;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.05);pointer-events:none;z-index:1000}.blocked{background-color:#f5f5f5;pointer-events:none;opacity:0.5;}`;
            document.head.appendChild(style);
            function blockFields() { fieldsToDisable.forEach(function(labelText){ var labels = document.querySelectorAll('label'); labels.forEach(function(label){ if (label.textContent && label.textContent.trim() === labelText) { var input = label.nextElementSibling; if (input && (input.tagName === 'INPUT' || input.tagName === 'SELECT')) input.classList.add('blocked'); } }); }); }
            function addOverlay() { const rows = document.querySelectorAll('table tbody tr'); rows.forEach((row) => { if (row.textContent && row.textContent.includes('Fascicule')) { const overlay = document.createElement('div'); overlay.classList.add('overlay'); row.style.position = 'relative'; row.appendChild(overlay); const inputs = row.querySelectorAll('input, select'); inputs.forEach(input => input.classList.add('blocked')); } }); }
            function toggleOverlaysAndFields() { const overlays = document.querySelectorAll('.overlay'); overlays.forEach(overlay => { if (isBlocked) overlay.classList.add('hidden'); else overlay.classList.remove('hidden'); }); const inputs = document.querySelectorAll('input, select'); inputs.forEach(input => { if (isBlocked) input.classList.remove('blocked'); else input.classList.add('blocked'); }); isBlocked = !isBlocked; }
            document.addEventListener('keydown', function(e) { if (e.ctrlKey && e.shiftKey && e.key === 'U') { e.preventDefault(); toggleOverlaysAndFields(); } });
            const addButtonExists = Array.from(document.querySelectorAll('a')).some(link => link.textContent && link.textContent.includes('Ajouter un exemplaire'));
            if (addButtonExists) addOverlay();
            blockFields();
          }catch(e){ (function(){})('073: overlay init error', e); }
        }
      }catch(e){ (function(){})('073: init error', e); }
    });

  }catch(e){ (function(){})('073-serials-bulletinage: failed', e); }
})();

},destroy:function(){return false;},onConfigChange:function(){return {reloadRequired:true};}};
KT.registerModule(runtime);if(CFG.mode==="shadow"){KT.record({module:MODULE_ID,level:"info",kind:"shadow-exact-parity-sealed",sources:runtime.sourceFiles});return;}runtime.init();
})();