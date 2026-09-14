(function(){"use strict";
const KT=window.KohaTools;if(!KT||!KT.Config)return;const MODULE_ID='serials-subscription-detail',CFG=KT.Config.getCanonical(MODULE_ID),Scope=KT.getService&&KT.getService("scope");
if(!CFG||!CFG.enabled||!["shadow","live"].includes(CFG.mode))return;if(Scope&&!Scope.match(CFG.general&&CFG.general.scope).ok)return;
const runtime={id:MODULE_ID,sourceFiles:['029-subscription-periodiques.js'],parity:"exact-legacy",init:function(){if(window["__KT_PARITY_"+MODULE_ID])return;window["__KT_PARITY_"+MODULE_ID]=true;
(function(){
  document.addEventListener('DOMContentLoaded', function(){
    (function(){})('029-subscription-periodiques: loaded');
    // Gestion des périodiques (subscription-detail.pl & serials-search.pl)
    // Shared wait helper (available across the module)
    function waitForSelector(selector, timeout = 3000) {
      return new Promise((resolve, reject) => {
        const el = document.querySelector(selector);
        if (el) return resolve(el);
        const obs = new MutationObserver(() => {
          const found = document.querySelector(selector);
          if (found) { obs.disconnect(); resolve(found); }
        });
        obs.observe(document.documentElement || document.body, { childList: true, subtree: true });
        setTimeout(() => { obs.disconnect(); reject(new Error('timeout')); }, timeout);
      });
    }

    if (window.location.pathname.indexOf("subscription-detail.pl")!== -1) {
      waitForSelector('table tbody tr', 2000).then(() => {
        (function() {
          function isSubscriptionDetailPage() {
            const isDetailPage = window.location.pathname.includes('subscription-detail.pl');
            return isDetailPage;
          }

          function parseDate(dateString) {
            const parts = dateString.split('/');
            if (parts.length === 3) {
              const date = new Date(parts[2], parts[1] - 1, parts[0]);
              return date;
            } else {
              (function(){})('Format de date invalide :', dateString);
              return null;
            }
          }

          function getPendingPublicationDate() {
            const rows = document.querySelectorAll('table tbody tr');
            let pendingDate = null;
            let pendingRow = null;

            rows.forEach(row => {
              const statusElement = row.querySelector('td:last-child div');
              if (statusElement) {
                const status = statusElement.textContent.trim();
                if (status === 'Attendu') {
                  const publicationDateElement = row.querySelector('td:nth-child(3)');
                  if (publicationDateElement) {
                    const publicationDateStr = publicationDateElement.textContent.trim();
                    pendingDate = parseDate(publicationDateStr);
                    pendingRow = row;
                  } else {
                    (function(){})('Élément de date de publication introuvable.');
                  }
                }
              } else {
                (function(){})('Élément de statut introuvable.');
              }
            });

            return { pendingDate, pendingRow };
          }

          function getGracePeriod() {
            const listItems = document.querySelectorAll('div.rows ol li');
            let gracePeriod = 0;
            listItems.forEach(item => {
              const span = item.querySelector('span.label');
              if (span && span.textContent.trim() === 'Période de grâce :') {
                const gracePeriodText = item.textContent.trim().split('Période de grâce :')[1].trim();
                if (gracePeriodText) {
                  gracePeriod = parseInt(gracePeriodText, 10);
                  if (isNaN(gracePeriod)) {
                    (function(){})('Période de grâce invalide :', gracePeriodText);
                  }
                } else {
                  (function(){})('Texte de période de grâce introuvable.');
                }
              }
            });

            if (gracePeriod === 0) {
              (function(){})('Période de grâce non trouvée ou non valide.');
            }

            return gracePeriod;
          }

          function checkForDelay() {
            const { pendingDate, pendingRow } = getPendingPublicationDate();
            if (!pendingDate || !pendingRow) {
              (function(){})("Aucune date de publication en attente trouvée.");
              return;
            }

            const gracePeriod = getGracePeriod();
            if (gracePeriod === 0) {
              (function(){})('Impossible de calculer le retard sans période de grâce valide.');
              return;
            }

            const graceEndDate = new Date(pendingDate);
            graceEndDate.setDate(graceEndDate.getDate() + gracePeriod);

            const today = new Date();

            const statusIcon = document.createElement('span');
            statusIcon.classList.add('status-icon');
            if (graceEndDate < today) {
              statusIcon.innerHTML = `\n        <span style="color:red;">&#x274C;</span> A réclamer`;
            } else {
              statusIcon.innerHTML = `\n        <span style="color:green;">&#x2705;</span> Aucune réclamation à faire`;
            }

            const statusContainer = pendingRow.querySelector('td:last-child .status-container');
            if (statusContainer) {
              statusContainer.appendChild(statusIcon);
            } else {
              (function(){})('Élément de statut introuvable pour ajouter l\'icône.');
            }
          }

          if (isSubscriptionDetailPage()) {
            checkForDelay();
          }
        })();
      }).catch(() => {});
    }

    $(document).ready(function() {
      waitForSelector('.subscription-year-table', 1000).then(() => {
        const tables = document.querySelectorAll('.subscription-year-table');

        tables.forEach(table => {
          const statusCells = table.querySelectorAll('td:nth-child(6) span');

          statusCells.forEach(cell => {
            const badge2 = document.createElement('span');
            badge2.textContent = cell.textContent;
            badge2.style.padding = '4px 8px';
            badge2.style.borderRadius = '12px';
            badge2.style.color = 'white';
            badge2.style.fontWeight = 'bold';

            switch (cell.textContent.trim().toLowerCase()) {
              case 'arrivé':
                badge2.style.backgroundColor = 'green';
                break;
              case 'attendu':
                badge2.style.backgroundColor = 'orange';
                break;
              default:
                badge2.style.backgroundColor = 'red';
                break;
            }

            cell.parentNode.replaceChild(badge2, cell);
          });
        });
      }).catch(() => {});

      if (window.location.pathname.indexOf("subscription-detail.pl") !== -1) {
        waitForSelector('.tableau-fasci', 2000).then(() => {
          document.querySelectorAll('th').forEach(th => {
            if (th.textContent.includes('Date prévue')){
              th.textContent = 'Date de réception';
            }
          });

          const style = document.createElement('style');
          style.textContent = `
            /* Conteneur du calendrier */
            .calendar-container { max-width: 900px; margin: 0 auto; }
            .calendar { display: grid; grid-template-columns: repeat(7, 1fr); gap: 1px; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 10px; }
            .calendar .day { padding: 5px; border: 1px solid #ddd; text-align: center; position: relative; min-height: 25px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: flex-start; }
            .calendar .header { background-color: #f4f4f4; font-weight: bold; }
            .calendar .event-list { width: 100%; max-height: 60px; overflow-y: auto; padding: 0; margin: 0; list-style: none; background-color: rgba(0, 0, 0, 0.1); box-sizing: border-box; }
            .calendar .event-list li { padding: 2px; font-size: 0.8em; color: #fff; border-radius: 2px; margin-bottom: 2px; text-overflow: ellipsis; white-space: nowrap; overflow: hidden; }
            .status.pending { background-color: #ffa500; }
            .status.arrived { background-color: #28a745; }
            .status.unknown { background-color: #6c757d; }
            .tableau-fasci .status-container { display: inline-block; padding: 2px 5px; border-radius: 4px; color: #fff; font-size: 0.9em; }
            .status-container.pending { background-color: #ffa500; }
            .status-container.arrived { background-color: #28a745; }
            .status-container.unknown { background-color: #6c757d; }
            .navigation { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; margin-top: 10px; }
            .navigation button { padding: 5px 10px; border: 1px solid #ddd; background-color: #f4f4f4; cursor: pointer; border-radius: 4px; }
            .navigation h2 { margin: 0; font-size: 1em; }
            .calendars-wrapper { display: flex; flex-direction: column; gap: 7px; }
          `;
          document.head.appendChild(style);

          const container = document.createElement('div');
          container.className = 'calendar-container';

          const navigation = document.createElement('div');
          navigation.className = 'navigation';

          const prevButton = document.createElement('button');
          prevButton.id = 'prev-month';
          prevButton.textContent = 'Précédent';
          navigation.appendChild(prevButton);

          const monthYearDisplay = document.createElement('h2');
          monthYearDisplay.id = 'month-year';
          navigation.appendChild(monthYearDisplay);

          const nextButton = document.createElement('button');
          nextButton.id = 'next-month';
          nextButton.textContent = 'Suivant';
          navigation.appendChild(nextButton);

          container.appendChild(navigation);

          const calendarsWrapper = document.createElement('div');
          calendarsWrapper.className = 'calendars-wrapper';
          container.appendChild(calendarsWrapper);

          const tableauFasci = document.querySelector('.tableau-fasci');
          tableauFasci.insertAdjacentElement('afterend', container);

          let currentYear = new Date().getFullYear();
          let currentMonth = new Date().getMonth();

          function generateCalendar(year, month) {
            calendarsWrapper.innerHTML = '';
            const months = [];
            for (let m = 0; m < 6; m++) {
              const calculatedMonth = month - m;
              const calculatedYear = year + Math.floor(calculatedMonth / 12);
              const adjustedMonth = (calculatedMonth + 12) % 12;
              months.push({ year: calculatedYear, month: adjustedMonth });
            }

            months.forEach(({ year, month }) => {
              const calendar = document.createElement('div');
              calendar.className = 'calendar';

              const firstDayOfMonth = new Date(year, month, 1);
              const lastDayOfMonth = new Date(year, month + 1, 0);
              const daysInMonth = lastDayOfMonth.getDate();
              const firstDay = (firstDayOfMonth.getDay() + 6) % 7;

              const weekdays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
              weekdays.forEach(day => {
                const header = document.createElement('div');
                header.className = 'day header';
                header.textContent = day;
                calendar.appendChild(header);
              });

              for (let i = 0; i < firstDay; i++) {
                const emptyDiv = document.createElement('div');
                emptyDiv.className = 'day';
                emptyDiv.style.opacity = 0.5;
                calendar.appendChild(emptyDiv);
              }

              for (let i = 1; i <= daysInMonth; i++) {
                const dayDiv = document.createElement('div');
                dayDiv.className = 'day';
                dayDiv.textContent = i;

                const eventsForDay = getEventsForDate(year, month, i);
                const eventList = document.createElement('ul');
                eventList.className = 'event-list';

                Object.keys(eventsForDay).forEach(title => {
                  const eventListItem = document.createElement('li');
                  eventListItem.className = `event status ${eventsForDay[title]}`;
                  eventListItem.textContent = title;
                  eventList.appendChild(eventListItem);
                });

                dayDiv.appendChild(eventList);
                calendar.appendChild(dayDiv);
              }

              const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin','Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
              const monthHeader = document.createElement('h4');
              monthHeader.textContent = `${monthNames[month]} ${year}`;
              calendarsWrapper.appendChild(monthHeader);
              calendarsWrapper.appendChild(calendar);
            });
          }

          function extractEventsFromTable() {
            const rows = document.querySelectorAll('.tableau-fasci table tbody tr');
            const events = [];
            rows.forEach(row => {
              const columns = row.querySelectorAll('td');
              if (columns.length > 0) {
                const title = columns[0].textContent.trim();
                const dateStr = columns[1].textContent.trim();
                const status = columns[4].textContent.trim().toLowerCase() === 'arrivé' ? 'arrived' : 'pending';
                const [day, month, year] = dateStr.split('/').map(Number);
                events.push({ title, start: `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`, status });
              }
            });
            return events;
          }

          function getEventsForDate(year, month, day) {
            const events = extractEventsFromTable();
            const eventsForDate = events.filter(event => {
              const eventDate = new Date(event.start);
              return eventDate.getFullYear() === year && eventDate.getMonth() === month && eventDate.getDate() === day;
            });
            return eventsForDate.reduce((acc, event) => { acc[event.title] = event.status; return acc; }, {});
          }

          function updateTableStatusContainers() {
            const statusCells = document.querySelectorAll('.tableau-fasci table tbody td:nth-child(5)');
            statusCells.forEach(cell => {
              const statusText = cell.textContent.trim().toLowerCase();
              const statusClass = statusText === 'arrivé' ? 'arrived' : (statusText === 'attendu' ? 'pending' : 'unknown');
              const statusContainer = document.createElement('div');
              statusContainer.className = `status-container ${statusClass}`;
              statusContainer.textContent = statusText.charAt(0).toUpperCase() + statusText.slice(1);
              cell.innerHTML = '';
              cell.appendChild(statusContainer);
            });
          }

          updateTableStatusContainers();
          prevButton.addEventListener('click', () => { currentMonth -= 6; if (currentMonth < 0) { currentMonth += 12; currentYear--; } generateCalendar(currentYear, currentMonth); });
          nextButton.addEventListener('click', () => { currentMonth += 6; if (currentMonth > 11) { currentMonth -= 12; currentYear++; } generateCalendar(currentYear, currentMonth); });
          generateCalendar(currentYear, currentMonth);
        }).catch(() => {});

        // mettre en évidence le tableau si présent (via waitForSelector)
        waitForSelector('.tableau-fasci table', 1000).then(tbl => { tbl.style.backgroundColor = 'red'; }).catch(() => {});
      }
    });
  });
})();
},destroy:function(){return false;},onConfigChange:function(){return {reloadRequired:true};}};
KT.registerModule(runtime);if(CFG.mode==="shadow"){KT.record({module:MODULE_ID,level:"info",kind:"shadow-exact-parity-sealed",sources:runtime.sourceFiles});return;}runtime.init();
})();