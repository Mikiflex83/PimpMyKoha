(function(){"use strict";
const KT=window.KohaTools;if(!KT||!KT.Config)return;
const MODULE_ID='efficiency-indicators',CFG=KT.Config.getCanonical(MODULE_ID),Scope=KT.getService&&KT.getService("scope");
if(!CFG||!CFG.enabled||!["shadow","live"].includes(CFG.mode))return;
if(Scope&&!Scope.match(CFG.general&&CFG.general.scope).ok)return;
const runtime={
 id:MODULE_ID,
 description:'Moteur d’indicateurs d’efficacité notice/exemplaires, comparable entre notices via normalisation par exemplaire.',
 sourceFiles:['099-efficiency-indicators.js'],
 parity:"exact-legacy",
 reloadRequiredOnConfigChange:true,
 init:function(){
   if(window["__KT_PARITY_"+MODULE_ID])return;
   window["__KT_PARITY_"+MODULE_ID]=true;
   
/* ===== EXACT LEGACY SOURCE: 099-efficiency-indicators.js ===== */

//Indicateur efficacité exemplaires et notices détail et liste de résultats
document.addEventListener('DOMContentLoaded', function () {
    if (!window.location.pathname.includes('/cgi-bin/koha/catalogue/detail.pl')) {
        return;
    }

    function waitForAny(selectors, onFound, maxWaitMs = 20000) {
        const find = () => {
            for (const selector of selectors) {
                const el = document.querySelector(selector);
                if (el) return el;
            }
            return null;
        };

        const immediate = find();
        if (immediate) {
            onFound(immediate);
            return;
        }

        const observer = new MutationObserver(() => {
            const el = find();
            if (!el) return;
            observer.disconnect();
            onFound(el);
        });

        observer.observe(document.documentElement, { childList: true, subtree: true });
        setTimeout(() => observer.disconnect(), maxWaitMs);
    }
    
    const possibleSelectors = ["#holdingst", "#holdings_table", "table.holdingst", "table#items", "table[itemtype]"];
    waitForAny(possibleSelectors, function (table) {

        function parseDate(dateStr) {
            if (!dateStr) return null;
            const cleanStr = dateStr.split("il y a")[0].split(" ")[0].trim();
            const parts = cleanStr.split(/[\/-]/);
            if (parts.length !== 3) return null;
            const [a, b, c] = parts.map(s => parseInt(s, 10));
            return cleanStr.includes('-') ? new Date(a, b - 1, c) : new Date(c, b - 1, a);
        }

        function ageInYears(date) {
            if (!date) return null;
            const now = Date.now();
            const rawAge = (now - date) / 31557600000; // 1000*60*60*24*365.25
            return Math.max(rawAge, 1.0);
        }

        function inactivityWeight(lastLoanDate) {
            if (!lastLoanDate) return 0.2;
            const now = Date.now();
            const diffDays = (now - lastLoanDate) / 86400000; // 1000*60*60*24
            return diffDays <= 365 ? 1 : diffDays <= 1095 ? 0.5 : 0.2; // 365*3 = 1095
        }

        function getNoticeDomain() {
            const techniqueText = document.querySelector('.technique-text');
            if (!techniqueText) return null;
            
            const liElements = techniqueText.querySelectorAll('li');
            for (let element of liElements) {
                const strong = element.querySelector('strong');
                if (strong && strong.textContent.includes('Acquisition :')) {
                    const html = element.innerHTML;
                    const domaineMatch = html.match(/<u>Domaine<\/u>\s*:\s*<a[^>]*>([^<]+)<\/a>/);
                    if (domaineMatch) return domaineMatch[1].trim();
                    
                    const text = element.textContent;
                    const match = text.match(/Domaine\s*:\s*([^\n<]+)/);
                    if (match) return match[1].trim();
                }
            }
            return null;
        }

        function getRowLocation(row) {
            const locationCell = row.querySelector('td.location');
            if (locationCell) {
                const text = locationCell.textContent.trim();
                if (text) return text;
            }
            return null;
        }

        function getHomeLocation(row) {
            const homeCell = row.querySelector('td.homebranch');
            if (homeCell) {
                const homeSpan = homeCell.querySelector('span.homebranchdesc');
                if (homeSpan) {
                    const text = homeSpan.textContent.trim();
                    if (text) return text;
                }
                const text = homeCell.textContent.trim();
                if (text) return text;
            }
            return null;
        }

        function getShelvingLocation(row) {
            const homeCell = row.querySelector('td.homebranch');
            if (homeCell) {
                const shelvingSpan = homeCell.querySelector('span.shelvingloc');
                if (shelvingSpan) {
                    const text = shelvingSpan.textContent.trim();
                    if (text) return text;
                }
            }
            
            const shelvingSpans = row.querySelectorAll('span.shelvingloc');
            for (let span of shelvingSpans) {
                const text = span.textContent.trim();
                if (text) return text;
            }
            return null;
        }

        const ignoreLocations = [
            'tri', 'Zone de tri', 'Magasin', 'Magasin/reserve',
            'MBA-BIB', 'Bibliothèque', 'MBA-J', 'Espace Jeunesse',
            'MBA-R1', 'Réserve 1', 'MBA-R2', 'Réserve 2',
            'Espace consultation', 'Collectivités', 'conservation',
            'Conservation', 'bureaux', 'Bureaux', 'anim', 'Animations',
            'Service archéologique'
        ];

        function shouldIgnoreRow(row) {
            const allLocations = [
                getRowLocation(row),
                getHomeLocation(row),
                getShelvingLocation(row)
            ].filter(Boolean);

            for (let loc of allLocations) {
                const locLower = loc.toLowerCase();
                for (let ignoreLoc of ignoreLocations) {
                    if (locLower.includes(ignoreLoc.toLowerCase())) {
                        return true;
                    }
                }
            }
            return false;
        }

        const specialKeywords = [
            'Parents et compagnie', 'parents-enfants', 'réservoir',
            'reserv_', 'parents', 'réserv', 'Réservoir Jeunesse', 'Réservoir Adulte'
        ];

        function isParentChildLocation(row) {
            const allLocations = [
                getRowLocation(row),
                getHomeLocation(row),
                getShelvingLocation(row)
            ].filter(Boolean);

            for (let loc of allLocations) {
                const locLower = loc.toLowerCase();
                for (let keyword of specialKeywords) {
                    if (locLower.includes(keyword.toLowerCase())) {
                        return true;
                    }
                }
            }
            return false;
        }

        const lowRotationDomainsSet = new Set([
            'Littérature', 'Les Arts', 'Arts', 'Arts du spectacle', 
            'Poésie et Théâtre', 'Musique à lire', 'Vie pratique',
            'Hommes et Société', 'Sciences et Techniques', 
            'Les civilisations', 'Le Var', 'La Région Sud'
        ]);
        
        const normalRotationDomainsSet = new Set([
            'Bande dessinée', 'Romans Ados', 'Romans adultes', 
            'Romans jeunesse', 'Albums', 'Contes', 'Cinéma', 
            'Musique', 'Vivre ensemble', 'Découvrir le monde',
            'Mon quotidien', 'Parents et compagnie', 'Objets',
            'Grandeur nature', 'Informatique', 'Lire autrement',
            'Pop-Up', 'V.O'
        ]);

        function efficiencyIndicator(score, domain = null, hasParentChildLocation = false) {
            if (hasParentChildLocation) {
                if (score >= 10) return "👑 Exceptionnel";
                if (score >= 3) return "🔥 Excellent";
                if (score >= 1) return "✅ Bon";
                if (score >= 0.3) return "⚠️ Moyen";
                if (score > 0) return "🛏️ Dormant"; 
                return "❌ Faible";
            }
            
            const isLowRotation = domain && lowRotationDomainsSet.has(domain);
            const isNormalRotation = domain && normalRotationDomainsSet.has(domain);
            
            if (isLowRotation) {
                if (score >= 10) return "👑 Exceptionnel";
                if (score >= 3) return "🔥 Excellent";
                if (score >= 1) return "✅ Bon";
                if (score >= 0.3) return "⚠️ Moyen";
                if (score > 0) return "🛏️ Dormant"; 
                return "❌ Faible";
            } else if (isNormalRotation) {
                if (score >= 20) return "👑 Exceptionnel";
                if (score >= 7) return "🔥 Excellent";
                if (score >= 2) return "✅ Bon";
                if (score >= 0.5) return "⚠️ Moyen";
                if (score > 0) return "🛏️ Dormant"; 
                return "❌ Faible";
            } else {
                if (score >= 15) return "👑 Exceptionnel";
                if (score >= 5) return "🔥 Excellent";
                if (score >= 1.5) return "✅ Bon";
                if (score >= 0.4) return "⚠️ Moyen";
                if (score > 0) return "🛏️ Dormant"; 
                return "❌ Faible";
            }
        }

        function getEvaluationScaleText(domain = null, hasParentChildLocation = false) {
            let scaleType = "mixte";
            let scaleText = "";
            
            if (hasParentChildLocation) {
                scaleType = "faible (localisation spéciale)";
                scaleText = `--- Échelle d'Évaluation (LOCALISATION SPÉCIALE - ROTATION FAIBLE) ---
Score ≥10 | 👑 Exceptionnel | Performance rare pour cette localisation.
Score ≥3 et <10 | 🔥 Excellent | Très forte rotation pour cette localisation.
Score ≥1 et <3 | ✅ Bon | Circulation saine pour cette localisation.
Score ≥0.3 et <1 | ⚠️ Moyen | Circulation faible mais acceptable.
Score >0 et <0.3 | 🛏️ Dormant | Circulation critique. Cible de désherbage/stockage.
Score ≤0 | ❌ Faible | Inactif - jamais prêté ou erreur de calcul.
------------------------------------------------------`;
            } else if (domain && lowRotationDomainsSet.has(domain)) {
                scaleType = "faible";
                scaleText = `--- Échelle d'Évaluation (DOMAINE ${domain} - ROTATION FAIBLE) ---
Score ≥10 | 👑 Exceptionnel | Performance rare pour ce domaine.
Score ≥3 et <10 | 🔥 Excellent | Très forte rotation pour ce domaine.
Score ≥1 et <3 | ✅ Bon | Circulation saine pour ce domaine.
Score ≥0.3 et <1 | ⚠️ Moyen | Circulation faible mais acceptable pour ce domaine.
Score >0 et <0.3 | 🛏️ Dormant | Circulation critique pour ce domaine.
Score ≤0 | ❌ Faible | Inactif - jamais prêté ou erreur de calcul.
------------------------------------------------------`;
            } else if (domain && normalRotationDomainsSet.has(domain)) {
                scaleType = "normale";
                scaleText = `--- Échelle d'Évaluation (DOMAINE ${domain} - ROTATION NORMALE) ---
Score ≥20 | 👑 Exceptionnel | Performance rare, forte sous-dotation.
Score ≥7 et <20 | 🔥 Excellent | Très forte rotation, justifie le fonds.
Score ≥2 et <7 | ✅ Bon | Circulation saine.
Score ≥0.5 et <2 | ⚠️ Moyen | Circulation faible/irrégulière.
Score >0 et <0.5 | 🛏️ Dormant | Circulation critique. Cible de désherbage/stockage.
Score ≤0 | ❌ Faible | Inactif - jamais prêté ou erreur de calcul.
------------------------------------------------------`;
            } else {
                scaleType = "par défaut";
                scaleText = `--- Échelle d'Évaluation (DOMAINE ${domain ? domain + ' - ' : ''}NON RECONNU) ---
Score ≥15 | 👑 Exceptionnel | Performance rare.
Score ≥5 et <15 | 🔥 Excellent | Très forte rotation.
Score ≥1.5 et <5 | ✅ Bon | Circulation saine.
Score ≥0.4 et <1.5 | ⚠️ Moyen | Circulation faible/irrégulière.
Score >0 et <0.4 | 🛏️ Dormant | Circulation critique. Cible de désherbage/stockage.
Score ≤0 | ❌ Faible | Inactif - jamais prêté ou erreur de calcul.
------------------------------------------------------`;
            }
            
            return scaleText + `
Définitions :
- Âge (ans) : temps écoulé depuis la date d'acquisition (min. 1 an pour le calcul).
- Pondération d'inactivité : 1 si prêté dans l'année, 0.5 si prêté dans les 3 ans, 0.2 sinon.
- Efficacité (exemplaire) : (Nombre de prêts cumulés / Âge) × Pondération d'inactivité.
- Efficacité moyenne notice : moyenne des efficacités des exemplaires (score par exemplaire, comparable entre notices avec 1 ou plusieurs exemplaires).

Note : L'échelle est adaptée ${hasParentChildLocation ? 'à la localisation spéciale' : `au domaine "${domain || 'non spécifié'}"`} (type: ${scaleType}).
Les seuils tiennent compte des usages spécifiques de chaque type de document.`;
        }

        function getNoticeCreationDate() {
            const creationElements = document.querySelectorAll('li.date-creation-tech');
            for (let element of creationElements) {
                const text = element.textContent.trim();
                if (text.includes("Création notice :")) {
                    const dateMatch = text.match(/\d{2}\/\d{2}\/\d{4}/);
                    if (dateMatch) return dateMatch[0];
                }
            }
            return null;
        }

        const headers = Array.from(table.querySelectorAll("thead th"));
        const colIndices = {};
        headers.forEach((th, idx) => {
            const text = th.textContent.trim().toLowerCase();
            if (text.includes("prêt")) colIndices.loans = idx;
            else if (text.includes("acquisition")) colIndices.acquisition = idx;
            else if (text.includes("dernier emprunt")) colIndices.lastLoan = idx;
        });

        const noticeCreationDateStr = getNoticeCreationDate();
        const noticeCreationDate = noticeCreationDateStr ? parseDate(noticeCreationDateStr) : null;
        const noticeDomain = getNoticeDomain();

        const rows = table.querySelectorAll("tbody tr");
        let globalLoans = 0, globalAgeSum = 0, globalWeightSum = 0, globalEffSum = 0, countedRows = 0;
        let usedApproximateDates = false, ignoredRows = 0, hasParentChildLocationInTable = false;

        rows.forEach((row) => {
            if (shouldIgnoreRow(row)) {
                ignoredRows++;
                const loansCell = row.querySelector(`td:nth-child(${colIndices.loans + 1})`);
                if (loansCell) {
                    const ignoreIcon = document.createElement("span");
                    ignoreIcon.textContent = "🔒";
                    ignoreIcon.style.cssText = "margin-top:15px; display:inline-block; margin-left:5px; cursor:pointer; color:#4caf50; font-weight:bold";
                    
                    const location = getRowLocation(row) || getHomeLocation(row) || getShelvingLocation(row);
                    ignoreIcon.title = `🔒 Exemplaire non pris en compte
Localisation : ${location || 'Non spécifiée'}
Raison : En magasin/réserve/consultation

Ces exemplaires ne sont pas inclus dans les calculs d'efficacité
car ils ne sont pas en libre accès ou disponibles au prêt direct.`;
                    
                    loansCell.appendChild(document.createElement("br"));
                    loansCell.appendChild(ignoreIcon);
                }
                return;
            }
            
            if (isParentChildLocation(row)) {
                hasParentChildLocationInTable = true;
            }
            
            const loansCell = row.querySelector(`td:nth-child(${colIndices.loans + 1})`);
            const acquisitionCell = colIndices.acquisition !== undefined ? 
                row.querySelector(`td:nth-child(${colIndices.acquisition + 1})`) : null;
            const lastLoanCell = colIndices.lastLoan !== undefined ? 
                row.querySelector(`td:nth-child(${colIndices.lastLoan + 1})`) : null;

            const dateAcqStr = acquisitionCell ? acquisitionCell.textContent.trim() : null;
            const dateLastLoanStr = lastLoanCell ? lastLoanCell.textContent.trim() : null;
            const nbLoans = loansCell ? parseInt(loansCell.textContent.trim(), 10) || 0 : 0;

            let dateAcq = parseDate(dateAcqStr);
            let usingApproximateDate = false;
            
            if (!dateAcq && noticeCreationDate) {
                dateAcq = noticeCreationDate;
                usingApproximateDate = true;
                usedApproximateDates = true;
            }
            
            const dateLastLoan = parseDate(dateLastLoanStr);
            const age = ageInYears(dateAcq);
            const weight = inactivityWeight(dateLastLoan);

            let efficiency = 0;
            let canCalculate = age && age > 0 && !isNaN(nbLoans);
            
            if (canCalculate) {
                efficiency = (nbLoans / age) * weight;
                efficiency = Number(efficiency.toFixed(2));
                const indicator = efficiencyIndicator(efficiency, noticeDomain, isParentChildLocation(row));
                const emoji = indicator.split(" ")[0];

                if (age) {
                    globalLoans += nbLoans;
                    globalAgeSum += age;
                    globalWeightSum += weight;
                    globalEffSum += efficiency;
                    countedRows++;
                }

                const icon = document.createElement("span");
                icon.textContent = emoji + (usingApproximateDate ? " ≈" : "");
                icon.style.cssText = "margin-top:15px; display:inline-block; margin-left:5px; cursor:pointer";
                
                if (usingApproximateDate) {
                    icon.style.fontWeight = "bold";
                    icon.style.color = "#1976d2";
                }
                
                if (isParentChildLocation(row)) {
                    icon.style.borderLeft = "2px solid #ff9800";
                    icon.style.paddingLeft = "3px";
                }

                const evaluationScaleText = getEvaluationScaleText(noticeDomain, isParentChildLocation(row));
                const dateSource = usingApproximateDate ? 
                    "≈ Date de création de la notice (approximation)" : 
                    "📅 Date d'acquisition";
                    
                const locationInfo = isParentChildLocation(row) ? 
                    `📍 Localisation spéciale : ${getRowLocation(row) || getHomeLocation(row) || getShelvingLocation(row) || 'Parents/Réservoir'}` : 
                    '';
                    
                icon.title = `📊 Efficacité de l'exemplaire ${usingApproximateDate ? '(approximative)' : '(indicatif)'}
${noticeDomain ? `📌 Domaine : ${noticeDomain}` : ''}
${locationInfo}
- Nombre de prêts (cumulés) : ${nbLoans}
- Âge de l'exemplaire : ${age ? age.toFixed(2) : "invalide"} ans
- ${dateSource}
- Pondération d'inactivité appliquée : ${weight}
- Efficacité (exemplaire) = (Prêts / Âge) × Pondération
  → Score calculé : ${efficiency}
- Indicateur qualitatif : ${indicator}

${usingApproximateDate ? '⚠️ APPROXIMATION : Score calculé avec la date de création de la notice.' : ''}
${usingApproximateDate ? 'La date d\'acquisition réelle peut différer.' : ''}
${isParentChildLocation(row) ? '→ Échelle adaptée à la localisation spéciale (Parents/Réservoir)' : noticeDomain ? `→ Échelle adaptée au domaine "${noticeDomain}"` : ''}

${evaluationScaleText}
⚠️ Score indicatif. À interpréter avec le contexte du fonds, de la politique documentaire et des spécificités du public.`;

                loansCell.appendChild(document.createElement("br"));
                loansCell.appendChild(icon);
            } else {
                const errorIcon = document.createElement("span");
                errorIcon.textContent = "❌";
                errorIcon.style.cssText = "margin-top:15px; display:inline-block; margin-left:5px; cursor:pointer; color:#d32f2f; font-weight:bold";

                const missingData = [];
                if (!dateAcqStr && !noticeCreationDateStr) missingData.push("📅 Date acquisition manquante");
                if (isNaN(nbLoans)) missingData.push("🔢 Nombre de prêts invalide");
                
                const evaluationScaleText = getEvaluationScaleText(noticeDomain, isParentChildLocation(row));
                
                errorIcon.title = `🚫 Calcul impossible pour cet exemplaire
${noticeDomain ? `📌 Domaine : ${noticeDomain}` : ''}
${isParentChildLocation(row) ? '📍 Localisation spéciale : Parents/Réservoir' : ''}

Raisons:
${missingData.join('\n')}

💡 Données disponibles:
• Prêts: ${nbLoans || 'inconnu'}
• Date acq: ${dateAcqStr || 'ABSENTE'}
• Date création notice: ${noticeCreationDateStr || 'ABSENTE'}
• Dernier prêt: ${dateLastLoanStr || 'inconnu'}

💡 Solution: Ajoutez la "Date de création" dans Koha pour activer le calcul.

${evaluationScaleText}`;
                
                loansCell.appendChild(document.createElement("br"));
                loansCell.appendChild(errorIcon);
            }
        });

        if (countedRows > 0) {
            const globalAge = globalAgeSum / countedRows;
            const globalWeight = globalWeightSum / countedRows;
            const avgLoansPerCopy = globalLoans / countedRows;
            const avgEffPerCopy = globalEffSum / countedRows;

            const avgEffRounded = Number(avgEffPerCopy.toFixed(2));
            const globalIndicator = efficiencyIndicator(avgEffRounded, noticeDomain, hasParentChildLocationInTable);
            const evaluationScaleText = getEvaluationScaleText(noticeDomain, hasParentChildLocationInTable);

            const globalTooltip = `📊 Efficacité moyenne des exemplaires de la notice ${usedApproximateDates ? '(approximative)' : '(indicatif)'}
${noticeDomain ? `📌 Domaine : ${noticeDomain}` : ''}
${hasParentChildLocationInTable ? '📍 Localisation spéciale détectée : Parents/Réservoir' : ''}
${ignoredRows > 0 ? `⚠️ ${ignoredRows} exemplaire(s) ignoré(s) (magasin/réserve/consultation)` : ''}
${usedApproximateDates ? '≈ Calcul avec date de création de notice (approximation)' : ''}

Notion clé : ce score est une MOYENNE PAR EXEMPLAIRE.
Il est donc comparable entre notices avec 1 exemplaire et celles avec plusieurs.
${hasParentChildLocationInTable ? '→ Échelle adaptée à la localisation spéciale (Parents/Réservoir)' : noticeDomain ? `→ Échelle adaptée au domaine "${noticeDomain}"` : ''}

Données agrégées :
- Nombre d'exemplaires pris en compte : ${countedRows}
- Exemplaires ignorés (magasin/réserve/consultation) : ${ignoredRows}
- Nombre total de prêts (tous exemplaires) : ${globalLoans}
- Âge moyen des exemplaires : ${globalAge.toFixed(2)} ans
- Pondération moyenne d'inactivité : ${globalWeight.toFixed(2)}
- Prêts moyens par exemplaire : ${avgLoansPerCopy.toFixed(2)}

Calcul de l'efficacité moyenne :
- Efficacité (exemplaire) = (Prêts exemplaire / Âge exemplaire) × Pondération d'inactivité.
- Efficacité moyenne notice = moyenne des efficacités des exemplaires.
  → Score calculé : ${avgEffRounded}
  → Indicateur qualitatif : ${globalIndicator}

${usedApproximateDates ? '⚠️ APPROXIMATION : Les dates d\'acquisition réelles peuvent différer des dates de création de notice.' : ''}

${evaluationScaleText}
⚠️ Score indicatif. Il doit être confronté aux usages locaux, à la politique documentaire, à la saisonnalité et au rôle du titre dans le fonds.`;

            const globalDiv = document.createElement("div");
            globalDiv.style.cssText = "margin:10px 0; padding:8px; background:#f9f9f9; border:1px solid #ccc; border-radius:5px; font-weight:bold";
            
            globalDiv.textContent = `${usedApproximateDates ? '≈ ' : ''}📊 Eff. moyenne ex. notice : ${avgEffRounded} (${globalIndicator})`;
            
            if (usedApproximateDates) {
                globalDiv.style.borderLeft = "4px solid #1976d2";
                globalDiv.style.fontStyle = "italic";
            }
            
            if (noticeDomain && !hasParentChildLocationInTable) {
                if (['Littérature', 'Les Arts', 'Arts', 'Arts du spectacle', 'Poésie et Théâtre'].includes(noticeDomain)) {
                    globalDiv.style.borderTop = "2px solid #9c27b0";
                } else if (['Bande dessinée', 'Romans Ados', 'Romans adultes', 'Romans jeunesse'].includes(noticeDomain)) {
                    globalDiv.style.borderTop = "2px solid #4caf50";
                }
            }
            
            if (hasParentChildLocationInTable) {
                globalDiv.style.borderRight = "3px solid #ff9800";
                globalDiv.style.backgroundColor = "#fff8e1";
            }
            
            globalDiv.title = globalTooltip;
            table.parentNode.insertBefore(globalDiv, table);
        } else if (ignoredRows === rows.length) {
            const globalDiv = document.createElement("div");
            globalDiv.style.cssText = "margin:10px 0; padding:8px; background:#e8f5e8; border:2px solid #4caf50; border-radius:5px; font-weight:bold; font-size:14px; color:#2e7d32; text-align:center; border-left: 4px solid #2e7d32";
            
            globalDiv.textContent = "🔒 Tous les exemplaires sont en magasin/réserve/consultation";
            globalDiv.title = `📋 Aucun calcul d'efficacité effectué

Tous les exemplaires (${rows.length}) sont dans des localisations non prises en compte :
- Magasin / Réserve
- Consultation / Bureaux
- Collectivités / Conservation
- Zone de tri / Animations

Ces exemplaires ne sont pas inclus dans les calculs d'efficacité
car ils ne sont pas en libre accès ou disponibles au prêt direct.`;

            table.parentNode.insertBefore(globalDiv, table);
        }
    });
});

document.addEventListener('DOMContentLoaded', function () {
    if (!window.location.pathname.includes('/cgi-bin/koha/catalogue/search.pl')) {
        return;
    }

    function waitForAny(selectors, onFound, maxWaitMs = 20000) {
        const find = () => {
            for (const selector of selectors) {
                const el = document.querySelector(selector);
                if (el) return el;
            }
            return null;
        };

        const immediate = find();
        if (immediate) {
            onFound(immediate);
            return;
        }

        const observer = new MutationObserver(() => {
            const el = find();
            if (!el) return;
            observer.disconnect();
            onFound(el);
        });

        observer.observe(document.documentElement, { childList: true, subtree: true });
        setTimeout(() => observer.disconnect(), maxWaitMs);
    }
    
    waitForAny(['tr[id^="row"]'], function () {
        const noticeRows = document.querySelectorAll('tr[id^="row"]');
        if (noticeRows.length === 0) return;

        function parseDate(dateStr) {
            if (!dateStr) return null;
            const cleanStr = dateStr.split("il y a")[0].split(" ")[0].trim();
            const parts = cleanStr.split(/[\/-]/);
            if (parts.length !== 3) return null;
            const [a, b, c] = parts.map(s => parseInt(s, 10));
            return cleanStr.includes('-') ? new Date(a, b - 1, c) : new Date(c, b - 1, a);
        }

        function ageInYears(date) {
            if (!date) return null;
            const now = Date.now();
            const rawAge = (now - date) / 31557600000;
            return Math.max(rawAge, 1.0);
        }

        function inactivityWeight(lastLoanDate) {
            if (!lastLoanDate) return 0.2;
            const now = Date.now();
            const diffDays = (now - lastLoanDate) / 86400000;
            return diffDays <= 365 ? 1 : diffDays <= 1095 ? 0.5 : 0.2;
        }

        function getItemLocation(blocExemplaire) {
            const detailsDiv = blocExemplaire.querySelector('.details-exemplaire');
            if (!detailsDiv) return null;
            
            const li = Array.from(detailsDiv.querySelectorAll('li')).find(li => {
                const strong = li.querySelector('strong');
                return strong && strong.textContent.trim().replace(/[:\s]+$/, '') === "Localisation";
            });

            if (li) {
                const clone = li.cloneNode(true);
                const strong = clone.querySelector('strong');
                if (strong) strong.remove();
                clone.querySelectorAll('.duree').forEach(d => d.remove());
                return clone.textContent.trim();
            }
            return null;
        }

        function getItemCurrentSite(blocExemplaire) {
            const detailsDiv = blocExemplaire.querySelector('.details-exemplaire');
            if (!detailsDiv) return null;
            
            const li = Array.from(detailsDiv.querySelectorAll('li')).find(li => {
                const strong = li.querySelector('strong');
                return strong && strong.textContent.trim().replace(/[:\s]+$/, '') === "Site actuel";
            });

            if (li) {
                const clone = li.cloneNode(true);
                const strong = clone.querySelector('strong');
                if (strong) strong.remove();
                clone.querySelectorAll('.duree').forEach(d => d.remove());
                return clone.textContent.trim();
            }
            return null;
        }

        const ignoreLocations = [
            'tri', 'Zone de tri', 'Magasin', 'Magasin/reserve',
            'MBA-BIB', 'Bibliothèque', 'MBA-J', 'Espace Jeunesse',
            'MBA-R1', 'Réserve 1', 'MBA-R2', 'Réserve 2',
            'Espace consultation', 'Collectivités', 'conservation',
            'Conservation', 'bureaux', 'Bureaux', 'anim', 'Animations',
            'Service archéologique'
        ];

        function shouldIgnoreItem(blocExemplaire) {
            const location = getItemLocation(blocExemplaire);
            const currentSite = getItemCurrentSite(blocExemplaire);
            
            if (location) {
                const locLower = location.toLowerCase();
                for (let ignoreLoc of ignoreLocations) {
                    if (locLower.includes(ignoreLoc.toLowerCase())) {
                        return true;
                    }
                }
            }
            
            if (currentSite) {
                const siteLower = currentSite.toLowerCase();
                for (let ignoreLoc of ignoreLocations) {
                    if (siteLower.includes(ignoreLoc.toLowerCase())) {
                        return true;
                    }
                }
            }
            
            return false;
        }

        const specialKeywords = [
            'parents et compagnie', 'parents-enfants', 'réservoir',
            'reserv_', 'parents', 'réserv', 'reservoir adulte',
            'reservoir jeunesse', 'Réservoir Jeunesse', 'Réservoir Adulte'
        ];

        function isParentChildLocationItem(blocExemplaire) {
            const location = getItemLocation(blocExemplaire);
            const currentSite = getItemCurrentSite(blocExemplaire);
            
            if (location) {
                const locLower = location.toLowerCase();
                for (let keyword of specialKeywords) {
                    if (locLower.includes(keyword.toLowerCase())) {
                        return true;
                    }
                }
            }
            
            if (currentSite) {
                const siteLower = currentSite.toLowerCase();
                for (let keyword of specialKeywords) {
                    if (siteLower.includes(keyword.toLowerCase())) {
                        return true;
                    }
                }
            }
            
            return false;
        }

        function getNoticeDomain(noticeRow) {
            const liElements = noticeRow.querySelectorAll('li');
            for (let element of liElements) {
                const strong = element.querySelector('strong');
                if (strong && strong.textContent.includes('Domaine :')) {
                    const link = element.querySelector('a');
                    if (link) return link.textContent.trim();
                    
                    const text = element.textContent;
                    const match = text.match(/Domaine\s*:\s*([^\n<]+)/);
                    if (match) return match[1].trim();
                }
                
                if (strong && strong.textContent.includes('Acquisition :')) {
                    const text = element.innerHTML;
                    const domaineMatch = text.match(/<u>Domaine<\/u>\s*:\s*<a[^>]*>([^<]+)<\/a>/);
                    if (domaineMatch) return domaineMatch[1].trim();
                }
            }
            return null;
        }

        const lowRotationDomainsSet = new Set([
            'Littérature', 'Les Arts', 'Arts', 'Arts du spectacle', 
            'Poésie et Théâtre', 'Musique à lire', 'Vie pratique',
            'Hommes et Société', 'Sciences et Techniques', 
            'Les civilisations', 'Le Var', 'La Région Sud'
        ]);
        
        const normalRotationDomainsSet = new Set([
            'Bande dessinée', 'Romans Ados', 'Romans adultes', 
            'Romans jeunesse', 'Albums', 'Contes', 'Cinéma', 
            'Musique', 'Vivre ensemble', 'Découvrir le monde',
            'Mon quotidien', 'Parents et compagnie', 'Objets',
            'Grandeur nature', 'Informatique', 'Lire autrement',
            'Pop-Up', 'V.O'
        ]);

        function efficiencyIndicator(score, domain = null, hasParentChildLocation = false) {
            if (hasParentChildLocation) {
                if (score >= 10) return "👑 Exceptionnel";
                if (score >= 3) return "🔥 Excellent";
                if (score >= 1) return "✅ Bon";
                if (score >= 0.3) return "⚠️ Moyen";
                if (score > 0) return "🛏️ Dormant"; 
                return "❌ Très faible ou problème de calcul";
            }
            
            const isLowRotation = domain && lowRotationDomainsSet.has(domain);
            const isNormalRotation = domain && normalRotationDomainsSet.has(domain);
            
            if (isLowRotation) {
                if (score >= 10) return "👑 Exceptionnel";
                if (score >= 3) return "🔥 Excellent";
                if (score >= 1) return "✅ Bon";
                if (score >= 0.3) return "⚠️ Moyen";
                if (score > 0) return "🛏️ Dormant"; 
                return "❌ Très faible ou problème de calcul";
            } else if (isNormalRotation) {
                if (score >= 20) return "👑 Exceptionnel";
                if (score >= 7) return "🔥 Excellent";
                if (score >= 2) return "✅ Bon";
                if (score >= 0.5) return "⚠️ Moyen";
                if (score > 0) return "🛏️ Dormant"; 
                return "❌ Très faible";
            } else {
                if (score >= 15) return "👑 Exceptionnel";
                if (score >= 5) return "🔥 Excellent";
                if (score >= 1.5) return "✅ Bon";
                if (score >= 0.4) return "⚠️ Moyen";
                if (score > 0) return "🛏️ Dormant"; 
                return "❌ Très faible";
            }
        }

        function getEvaluationScaleText(domain = null, hasParentChildLocation = false) {
            let scaleType = "mixte";
            let scaleText = "";
            
            if (hasParentChildLocation) {
                scaleType = "faible (localisation spéciale)";
                scaleText = `--- Échelle d'Évaluation (LOCALISATION SPÉCIALE - ROTATION FAIBLE) ---
Score ≥10 | 👑 Exceptionnel | Performance rare pour cette localisation.
Score ≥3 et <10 | 🔥 Excellent | Très forte rotation pour cette localisation.
Score ≥1 et <3 | ✅ Bon | Circulation saine pour cette localisation.
Score ≥0.3 et <1 | ⚠️ Moyen | Circulation faible mais acceptable.
Score >0 et <0.3 | 🛏️ Dormant | Circulation critique.
Score ≤0 | ❌ Très faible | Inactif ou erreur de calcul.
------------------------------------------------------`;
            } else if (domain && lowRotationDomainsSet.has(domain)) {
                scaleType = "faible";
                scaleText = `--- Échelle d'Évaluation (DOMAINE ${domain} - ROTATION FAIBLE) ---
Score ≥10 | 👑 Exceptionnel | Performance rare pour ce domaine.
Score ≥3 et <10 | 🔥 Excellent | Très forte rotation pour ce domaine.
Score ≥1 et <3 | ✅ Bon | Circulation saine pour ce domaine.
Score ≥0.3 et <1 | ⚠️ Moyen | Circulation faible mais acceptable pour ce domaine.
Score >0 et <0.3 | 🛏️ Dormant | Circulation critique pour ce domaine.
Score ≤0 | ❌ Très faible | Inactif ou erreur de calcul.
------------------------------------------------------`;
            } else if (domain && normalRotationDomainsSet.has(domain)) {
                scaleType = "normale";
                scaleText = `--- Échelle d'Évaluation (DOMAINE ${domain} - ROTATION NORMALE) ---
Score ≥20 | 👑 Exceptionnel | Performance rare, forte sous-dotation.
Score ≥7 et <20 | 🔥 Excellent | Très forte rotation, justifie le fonds.
Score ≥2 et <7 | ✅ Bon | Circulation saine.
Score ≥0.5 et <2 | ⚠️ Moyen | Circulation faible/irrégulière.
Score >0 et <0.5 | 🛏️ Dormant | Circulation critique.
Score ≤0 | ❌ Très faible | Inactif - jamais prêté ou erreur de calcul.
------------------------------------------------------`;
            } else {
                scaleType = "par défaut";
                scaleText = `--- Échelle d'Évaluation (DOMAINE ${domain ? domain + ' - ' : ''}NON RECONNU) ---
Score ≥15 | 👑 Exceptionnel | Performance rare.
Score ≥5 et <15 | 🔥 Excellent | Très forte rotation.
Score ≥1.5 et <5 | ✅ Bon | Circulation saine.
Score ≥0.4 et <1.5 | ⚠️ Moyen | Circulation faible/irrégulière.
Score >0 et <0.4 | 🛏️ Dormant | Circulation critique.
Score ≤0 | ❌ Très faible | Inactif ou erreur de calcul.
------------------------------------------------------`;
            }
            
            return scaleText + `
Définitions :
- Âge (ans) : temps écoulé depuis la date de création/acquisition (min. 1 an pour le calcul).
- Pondération d'inactivité : 1 si prêt dans l'année, 0.5 si prêt dans les 3 ans, 0.2 sinon.
- Efficacité exemplaire : (Prêts / Âge) × Pondération.
- Efficacité moyenne notice : moyenne des efficacités des exemplaires (score par exemplaire).

Note : L'échelle est adaptée ${hasParentChildLocation ? 'à la localisation spéciale' : `au domaine "${domain || 'non spécifié'}"`} (type: ${scaleType}).
Les seuils tiennent compte des usages spécifiques de chaque type de document.`;
        }

        function extractDetail(detailsExemplaireDiv, label) {
            const blocExemplaire = detailsExemplaireDiv.closest('.bloc-exemplaire');
            if (!blocExemplaire) return null;

            const li = Array.from(detailsExemplaireDiv.querySelectorAll('li')).find(li => {
                const strong = li.querySelector('strong');
                return strong && strong.textContent.trim().replace(/[:\s]+$/, '') === label;
            });

            if (li) {
                const clone = li.cloneNode(true);
                const strong = clone.querySelector('strong');
                if (strong) strong.remove();
                clone.querySelectorAll('.duree').forEach(d => d.remove());
                return clone.textContent.trim();
            }
            return null;
        }

        noticeRows.forEach((noticeRow) => {
            const noticeDomain = getNoticeDomain(noticeRow);
            const blocExemplaires = noticeRow.querySelectorAll('.bloc-exemplaire');
            
            let noticeLoans = 0, noticeAgeSum = 0, noticeWeightSum = 0, noticeEffSum = 0;
            let noticeCountedItems = 0, calculationErrors = [], ignoredItems = 0;
            let hasParentChildLocationInNotice = false;
            
            blocExemplaires.forEach((bloc, index) => {
                if (shouldIgnoreItem(bloc)) {
                    ignoredItems++;
                    return;
                }
                
                if (isParentChildLocationItem(bloc)) {
                    hasParentChildLocationInNotice = true;
                }
                
                const detailsDiv = bloc.querySelector('.details-exemplaire');
                if (!detailsDiv) {
                    calculationErrors.push(`Exemplaire ${index+1}: Détails non trouvés`);
                    return;
                }

                const dateAcqStr = extractDetail(detailsDiv, "Date de création");
                const dateLastLoanStr = extractDetail(detailsDiv, "Dernier emprunt");
                const nbLoansStr = extractDetail(detailsDiv, "Nombre de prêts");
                
                const nbLoans = nbLoansStr ? parseInt(nbLoansStr, 10) || 0 : 0;
                const dateAcq = parseDate(dateAcqStr);
                const dateLastLoan = parseDate(dateLastLoanStr);
                const age = ageInYears(dateAcq);
                const weight = inactivityWeight(dateLastLoan);

                if (age && age > 0 && !isNaN(nbLoans)) {
                    const effEx = (nbLoans / age) * weight;
                    const effExRounded = Number(effEx.toFixed(2));

                    noticeLoans += nbLoans;
                    noticeAgeSum += age;
                    noticeWeightSum += weight;
                    noticeEffSum += effExRounded;
                    noticeCountedItems++;
                } else {
                    const errors = [];
                    if (!dateAcqStr || !dateAcq) errors.push(`Ex.${index+1}: Date création manquante`);
                    if (!nbLoansStr || isNaN(nbLoans)) errors.push(`Ex.${index+1}: Prêts manquants`);
                    calculationErrors.push(...errors);
                }
            });

            const titleCell = noticeRow.querySelector('td:nth-child(3)');
            if (!titleCell) return;

            const globalDiv = document.createElement("div");
            globalDiv.classList.add("global-efficiency-indicator"); 
            
            if (noticeCountedItems > 0) {
                const globalAge = noticeAgeSum / noticeCountedItems;
                const globalWeight = noticeWeightSum / noticeCountedItems;
                const avgLoansPerCopy = noticeLoans / noticeCountedItems;
                const avgEffPerCopy = noticeEffSum / noticeCountedItems;

                const globalEfficiency = Number(avgEffPerCopy.toFixed(2));
                const globalIndicator = efficiencyIndicator(globalEfficiency, noticeDomain, hasParentChildLocationInNotice);
                const evaluationScaleText = getEvaluationScaleText(noticeDomain, hasParentChildLocationInNotice);

                const globalTooltip = `📊 Efficacité moyenne par exemplaire (notice)
${noticeDomain ? `📌 Domaine : ${noticeDomain}` : '📌 Domaine : Non détecté'}
${hasParentChildLocationInNotice ? '📍 Localisation spéciale : Parents/Réservoir' : ''}
${ignoredItems > 0 ? `⚠️ ${ignoredItems} exemplaire(s) ignoré(s) (magasin/réserve/consultation)` : ''}

Notion clé : indicateur normalisé PAR EXEMPLAIRE
→ comparable entre notices avec 1, 2, 5 ou 8 exemplaires.
${noticeDomain ? `→ échelle adaptée au domaine "${noticeDomain}"` : '→ échelle par défaut (domaine non détecté)'}
${hasParentChildLocationInNotice ? '→ échelle adaptée à la localisation spéciale (Parents/Réservoir)' : ''}

Données agrégées sur les exemplaires :
- Nombre d'exemplaires pris en compte : ${noticeCountedItems}/${blocExemplaires.length - ignoredItems}
- Exemplaires ignorés (magasin/réserve/consultation) : ${ignoredItems}
- Nombre total de prêts (tous exemplaires) : ${noticeLoans}
- Âge moyen des exemplaires : ${globalAge.toFixed(2)} ans
- Pondération moyenne d'inactivité : ${globalWeight.toFixed(2)}
- Prêts moyens par exemplaire : ${avgLoansPerCopy.toFixed(2)}

Calcul détaillé :
- Pour chaque exemplaire :
    Efficacité_exemplaire = (Prêts / Âge) × Pondération d'inactivité.
- Pour la notice :
    Efficacité moyenne notice = moyenne des efficacités des exemplaires.
  → Score moyen par exemplaire : ${globalEfficiency}
  → Indicateur qualitatif : ${globalIndicator}

${evaluationScaleText}
⚠️ Score indicatif. À utiliser comme aide à la décision, à croiser avec la connaissance fine du territoire, des publics, de la politique documentaire et des usages saisonniers.`;

                let bgColor, borderColor;
                if (globalIndicator.includes("👑")) { bgColor = "#fffdf0"; borderColor = "#ffd700"; } 
                else if (globalIndicator.includes("🔥")) { bgColor = "#f0fff0"; borderColor = "#8fbc8f"; }
                else if (globalIndicator.includes("✅")) { bgColor = "#f0f8ff"; borderColor = "#add8e6"; }
                else if (globalIndicator.includes("⚠️")) { bgColor = "#fffdf0"; borderColor = "#e6e6a0"; }
                else if (globalIndicator.includes("🛏️")) { bgColor = "#ffe0c2"; borderColor = "#ffb564"; }
                else { bgColor = "#fff0f0"; borderColor = "#e6a0a0"; }

                const style = {
                    margin: "5px 5px",
                    padding: "4px 6px",
                    backgroundColor: bgColor,
                    border: `1px solid ${borderColor}`,
                    borderRadius: "3px",
                    fontWeight: "bold",
                    fontSize: "12px",
                    color: '#333',
                    display: 'inline-block'
                };
                
                Object.assign(globalDiv.style, style);
                
                if (noticeDomain && ['Littérature', 'Les Arts', 'Arts', 'Arts du spectacle', 'Poésie et Théâtre'].includes(noticeDomain)) {
                    globalDiv.style.borderLeft = "3px solid #9c27b0";
                } else if (noticeDomain && ['Bande dessinée', 'Romans Ados', 'Romans adultes', 'Romans jeunesse'].includes(noticeDomain)) {
                    globalDiv.style.borderLeft = "3px solid #4caf50";
                }
                
                if (hasParentChildLocationInNotice) {
                    globalDiv.style.borderRight = "3px solid #ff9800";
                    globalDiv.style.backgroundColor = "#fff8e1";
                }
                
                globalDiv.textContent = `${globalEfficiency} (${globalIndicator})`;
                globalDiv.title = globalTooltip;
            } else {
                const allIgnored = ignoredItems === blocExemplaires.length;
                
                if (allIgnored) {
                    globalDiv.style.cssText = "margin:5px 5px; padding:6px 8px; background:#e8f5e8; border:2px solid #4caf50; border-radius:4px; font-weight:bold; font-size:12px; color:#2e7d32; display:inline-block";
                    globalDiv.textContent = "🔒 Hors calcul (magasin/réserve)";
                    globalDiv.title = `📋 Tous les exemplaires sont en magasin/réserve/consultation
                        
Exemplaires ignorés : ${ignoredItems}/${blocExemplaires.length}
Localisations : Magasin, Réserve, Consultation, Bureaux, Animations, etc.

Ces exemplaires ne sont pas pris en compte dans le calcul d'efficacité
car ils ne sont pas en libre accès ou disponibles au prêt direct.`;
                } else {
                    globalDiv.style.cssText = "margin:5px 5px; padding:6px 8px; background:#fff0f0; border:2px solid #d32f2f; border-radius:4px; font-weight:bold; font-size:12px; color:#d32f2f; display:inline-block";
                    globalDiv.textContent = "❌ Calcul impossible";
                    const evaluationScaleText = getEvaluationScaleText(noticeDomain, hasParentChildLocationInNotice);
                    
                    globalDiv.title = `🚫 Impossible de calculer l'efficacité de la notice
${noticeDomain ? `📌 Domaine : ${noticeDomain}` : '📌 Domaine : Non détecté'}
${hasParentChildLocationInNotice ? '📍 Localisation spéciale : Parents/Réservoir' : ''}
${ignoredItems > 0 ? `⚠️ ${ignoredItems} exemplaire(s) ignoré(s) (magasin/réserve/consultation)` : ''}

Raisons des échecs (${calculationErrors.length}/${blocExemplaires.length - ignoredItems} exemplaires):
${calculationErrors.join('\n') || 'Données insuffisantes globales'}

💡 Données manquantes principales:
• "Date de création" absente sur ${calculationErrors.length} exemplaire${calculationErrors.length>1?'s':''}
• Ajoutez cette date dans Koha pour activer les calculs

${evaluationScaleText}
⚠️ Notice non évaluable tant que les dates de création ne sont pas complétées.`;
                }
            }
            
            const targetElement = titleCell.querySelector('span.copy-ean-result'); 
            if (targetElement) {
                targetElement.parentNode.insertBefore(globalDiv, targetElement.nextSibling);
            } else {
                titleCell.appendChild(globalDiv); 
            }
        });
    }); 
});

/**
 * Script pour ajouter une icône d'aide (?) discrète à côté de chaque indicateur.
 * S'exécute après 5 secondes.
 */
document.addEventListener('DOMContentLoaded', function () {
    // Délai en millisecondes (5000 ms = 5 secondes)
    const delaiExecution = 5000;

    // L'URL de destination pour l'aide
    const urlAide = '/cgi-bin/koha/tools/page.pl?page_id=127';

    // *** SÉLECTEUR MIS À JOUR POUR COUVRIR TOUS LES CAS ***
    // 1. Indicateur de Notice AVEC classe (du premier exemple)
    // 2. Indicateur d'Exemplaire (dans la colonne 'issues')
    // 3. Indicateur de Notice SANS classe (ciblé par l'attribut 'title')
    const selecteurIndicateurs = '.global-efficiency-indicator, .issues > span:last-of-type, div[title*="Efficacité moyenne des exemplaires"]'; 
    
    // Le style pour rendre l'icône discrète
    const styleIcone = 'font-size: 0.8em; margin-left: 5px; text-decoration: none; color: #007bff; opacity: 0.7; cursor: pointer; font-weight: normal;';
    
    // Le contenu de l'icône (un point d'interrogation)
    const contenuIcone = '?';

    /**
     * Fonction principale qui exécute l'ajout des icônes.
     */
    function ajouterIconesAide() {
        // 1. Trouver tous les éléments indicateurs
        const elementsIndicateurs = document.querySelectorAll(selecteurIndicateurs);

        if (elementsIndicateurs.length === 0) {
            (function(){})('Aucun indicateur trouvé après le délai. Vérifiez le sélecteur.');
        }

        elementsIndicateurs.forEach(element => {
            // 2. Créer l'élément de lien (l'icône ?)
            const lienAide = document.createElement('a');
            
            // 3. Configurer le lien
            lienAide.href = urlAide;
            lienAide.target = '_blank';
            lienAide.title = 'Aide sur l\'indicateur d\'efficacité (Ouvrir dans un nouvel onglet)';
            lienAide.textContent = contenuIcone;
            lienAide.style.cssText = styleIcone; 

            // 4. Insérer le lien après le contenu de l'indicateur
            element.appendChild(lienAide);
        });
    }

    // Exécuter la fonction 'ajouterIconesAide' après le délai spécifié (5000 ms)
    setTimeout(ajouterIconesAide, delaiExecution);
});




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