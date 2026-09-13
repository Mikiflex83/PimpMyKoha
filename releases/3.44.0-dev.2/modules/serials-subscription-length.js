(function(){"use strict";
const KT=window.KohaTools;if(!KT||!KT.Config)return;const MODULE_ID='serials-subscription-length',CFG=KT.Config.getCanonical(MODULE_ID),Scope=KT.getService&&KT.getService("scope");
if(!CFG||!CFG.enabled||!["shadow","live"].includes(CFG.mode))return;if(Scope&&!Scope.match(CFG.general&&CFG.general.scope).ok)return;
const runtime={id:MODULE_ID,sourceFiles:['104-bouton-calculer-subscription-add.js'],parity:"exact-legacy",init:function(){if(window["__KT_PARITY_"+MODULE_ID])return;window["__KT_PARITY_"+MODULE_ID]=true;
document.addEventListener('DOMContentLoaded', () => {
    (function(){})('DOMContentLoaded - Initialisation du calcul automatique sublength'); // Pour le débogage
    
    // Fonction pour obtenir la valeur de la date de fin
    function getEndDate() {
        const endDateElement = document.getElementById('to');
        return endDateElement && endDateElement.value ? endDateElement.value : '';
    }
    
    // Fonction pour obtenir la valeur de la prochaine date d'acquisition
    function getNextAcquiDate() {
        const nextAcquiDateElement = document.getElementById('nextacquidate');
        return nextAcquiDateElement && nextAcquiDateElement.value ? nextAcquiDateElement.value : '';
    }
    
    // Variables pour stocker les valeurs
    let startDate = document.getElementById('acqui_date')?.value || '';
    let endDate = getEndDate();
    let nextAcquiDate = getNextAcquiDate();
    let frequency = document.getElementById('frequency')?.value || '';
    let subtype = document.getElementById('subtype')?.value || '';
    
    // Fonction pour calculer la différence de dates et mettre à jour "sublength"
    function calculateSublength() {
        (function(){})('Fonction calculateSublength appelée');
        (function(){})('Données:', { startDate, endDate, nextAcquiDate, frequency, subtype });
        
        const inputSublength = document.getElementById('sublength');
        if (!inputSublength) {
            (function(){})('Input sublength non trouvé');
            return;
        }
        
        // Mettre à jour les valeurs
        startDate = document.getElementById('acqui_date')?.value || '';
        endDate = getEndDate();
        nextAcquiDate = getNextAcquiDate();
        frequency = document.getElementById('frequency')?.value || '';
        subtype = document.getElementById('subtype')?.value || '';
        
        // Vérifier si toutes les données nécessaires sont présentes
        if (!endDate || !startDate || !frequency || !subtype) {
            (function(){})('Données manquantes pour le calcul');
            return;
        }
        
        // Choix de la date de début selon le subtype
        const startDateToUse = subtype === 'issues' ? nextAcquiDate : startDate;
        const start = new Date(startDateToUse);
        const end = new Date(endDate);
        
        (function(){})('Dates utilisées:', { startDateToUse, endDate: endDate });
        
        if (startDateToUse && endDate) {
            // Calcul de la différence en jours
            const diffTime = end - start;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            (function(){})('Différence en jours:', diffDays);
            
            // Calcul en fonction de la périodicité et du type
            let calculatedValue = 0;
            
            switch (subtype) {
                case 'issues': // fascicules
                    const freqDays = getFrequencyDays(frequency);
                    calculatedValue = Math.ceil(diffDays / freqDays);
                    (function(){})('Calcul fascicules:', { freqDays, calculatedValue });
                    break;
                case 'weeks': // semaines
                    calculatedValue = Math.ceil(diffDays / Math.max(1, Number(CFG?.calculation?.weekDays ?? 7)));
                    (function(){})('Calcul semaines:', calculatedValue);
                    break;
                case 'months': // mois
                    calculatedValue = Math.ceil(diffDays / Math.max(1, Number(CFG?.calculation?.monthDays ?? 30)));
                    (function(){})('Calcul mois:', calculatedValue);
                    break;
                default:
                    (function(){})('Subtype non reconnu:', subtype);
                    break;
            }
            
            // Mise à jour de l'input "sublength"
            inputSublength.value = calculatedValue;
            (function(){})('Valeur mise à jour:', calculatedValue);
        } else {
            (function(){})('Dates manquantes');
        }
    }
    
    // Fonction pour obtenir le nombre de jours basé sur la fréquence
    function getFrequencyDays(frequency) {
        const map = CFG?.calculation?.frequencyDays || {};
        if (Object.prototype.hasOwnProperty.call(map, String(frequency))) {
            const n = Number(map[String(frequency)]);
            if (Number.isFinite(n) && n > 0) return n;
        }
        return Math.max(0.1, Number(CFG?.calculation?.defaultFrequencyDays ?? 30));
    }
    
    // Fonction pour mettre à jour les variables et recalculer
    function updateAndCalculate() {
        (function(){})('Mise à jour des données');
        
        startDate = document.getElementById('acqui_date')?.value || '';
        endDate = getEndDate();
        nextAcquiDate = getNextAcquiDate();
        frequency = document.getElementById('frequency')?.value || '';
        subtype = document.getElementById('subtype')?.value || '';
        
        (function(){})('Données mises à jour:', { startDate, endDate, nextAcquiDate, frequency, subtype });
        
        // Appel de la fonction de calcul
        calculateSublength();
    }
    
    // Ajout des écouteurs d'événements pour les changements dans les éléments
    const acquiDate = document.getElementById('acqui_date');
    const toDate = document.getElementById('to');
    const frequencySelect = document.getElementById('frequency');
    const subtypeSelect = document.getElementById('subtype');
    const nextAcquiDateInput = document.getElementById('nextacquidate');
    
    if (acquiDate) acquiDate.addEventListener('change', updateAndCalculate);
    if (toDate) toDate.addEventListener('change', updateAndCalculate);
    if (frequencySelect) frequencySelect.addEventListener('change', updateAndCalculate);
    if (subtypeSelect) subtypeSelect.addEventListener('change', updateAndCalculate);
    if (nextAcquiDateInput) nextAcquiDateInput.addEventListener('change', updateAndCalculate);
    
    // Appeler updateAndCalculate au chargement pour initialiser les valeurs
    setTimeout(updateAndCalculate, 100); // Délai pour s'assurer que tout est chargé
});

},destroy:function(){return false;},onConfigChange:function(){return {reloadRequired:true};}};
KT.registerModule(runtime);if(CFG.mode==="shadow"){KT.record({module:MODULE_ID,level:"info",kind:"shadow-exact-parity-sealed",sources:runtime.sourceFiles});return;}runtime.init();
})();