(function(){"use strict";
const KT=window.KohaTools;if(!KT||!KT.Config)return;
const MODULE_ID='patron-required-contact',CFG=KT.Config.getCanonical(MODULE_ID),Scope=KT.getService&&KT.getService("scope");
if(!CFG||!CFG.enabled||!["shadow","live"].includes(CFG.mode))return;
if(Scope&&!Scope.match(CFG.general&&CFG.general.scope).ok)return;
const runtime={
 id:MODULE_ID,
 description:'Exige au moins un moyen de contact selon les règles configurées avant validation.',
 sourceFiles:['118-mail-tel-obligatoire.js'],
 parity:"exact-legacy",
 reloadRequiredOnConfigChange:true,
 init:function(){
   if(window["__KT_PARITY_"+MODULE_ID])return;
   window["__KT_PARITY_"+MODULE_ID]=true;
   
/* ===== EXACT LEGACY SOURCE: 118-mail-tel-obligatoire.js ===== */
// Script pour rendre obligatoire au moins un champ de contact (téléphone ou email)
document.addEventListener('DOMContentLoaded', function() {
    // Ne s'exécute que sur les pages memberentry.pl
    if (!window.location.pathname.includes('memberentry.pl')) {
        return;
    }

    // Récupérer les éléments du formulaire
    const form = document.getElementById('entryform');
    const phone = document.getElementById('phone');
    const mobile = document.getElementById('mobile');
    const email = document.getElementById('email');
    const emailpro = document.getElementById('emailpro');
    const saveButton = document.getElementById('saverecord');
    const fieldset = document.getElementById('memberentry_contact');

    if (!form || !fieldset) {
        (function(){})('Formulaire ou fieldset contact non trouvé');
        return;
    }

    // Variables pour suivre l'état
    let hasAttemptedSubmit = false;

    // Fonction pour vérifier si au moins un champ est rempli
    function isContactFilled() {
        return (phone && phone.value.trim() !== '') ||
               (mobile && mobile.value.trim() !== '') ||
               (email && email.value.trim() !== '') ||
               (emailpro && emailpro.value.trim() !== '');
    }

    // Fonction pour ajouter un message d'erreur à côté d'un champ
    function addFieldError(field, message) {
        if (!field) return;
        
        // Supprimer l'ancien message d'erreur pour ce champ
        removeFieldError(field);
        
        const li = field.closest('li');
        if (!li) return;
        
        // Créer le message d'erreur
        const errorSpan = document.createElement('span');
        errorSpan.className = 'field-error-message';
        errorSpan.style.cssText = 'color: #cc0000; font-size: 12px; display: block; margin-top: 5px; font-weight: normal;';
        errorSpan.textContent = '⚠️ ' + message;
        errorSpan.id = 'error_' + field.id;
        
        li.appendChild(errorSpan);
        
        // Mettre le champ en évidence
        field.style.borderColor = '#cc0000';
        field.style.backgroundColor = '#fff5f5';
    }

    // Fonction pour supprimer le message d'erreur d'un champ
    function removeFieldError(field) {
        if (!field) return;
        const errorSpan = document.getElementById('error_' + field.id);
        if (errorSpan) {
            errorSpan.remove();
        }
        field.style.borderColor = '';
        field.style.backgroundColor = '';
    }

    // Fonction pour supprimer tous les messages d'erreur
    function removeAllErrors() {
        const fields = [phone, mobile, email, emailpro];
        fields.forEach(field => removeFieldError(field));
        
        fieldset.style.border = '';
        fieldset.style.padding = '';
        fieldset.style.borderRadius = '';
        fieldset.style.backgroundColor = '';
    }

    // Fonction pour afficher les erreurs
    function showValidationErrors() {
        const filled = isContactFilled();
        const fields = [phone, mobile, email, emailpro];
        
        // Supprimer tous les messages d'erreur existants
        fields.forEach(field => removeFieldError(field));
        
        if (!filled) {
            // Ajouter des messages d'erreur à côté des champs vides
            fields.forEach(field => {
                if (field && field.value.trim() === '') {
                    addFieldError(field, 'Au moins un champ de contact est obligatoire');
                }
            });
            
            // Mettre en évidence le fieldset
            fieldset.style.border = '2px solid #cc0000';
            fieldset.style.padding = '10px';
            fieldset.style.borderRadius = '5px';
            fieldset.style.backgroundColor = '#fffafa';
            
            // Scroll vers le premier champ vide
            for (let field of fields) {
                if (field && field.value.trim() === '') {
                    field.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    break;
                }
            }
        } else {
            // Tout est OK, nettoyer
            removeAllErrors();
        }
    }

    // Fonction de validation principale - sera appelée avant la soumission
    function validateContactFields() {
        // Marquer qu'on a tenté de soumettre
        hasAttemptedSubmit = true;
        
        if (!isContactFilled()) {
            // Afficher les erreurs
            showValidationErrors();
            
            // Animation de shake sur le bouton
            if (saveButton) {
                saveButton.style.transform = 'translateX(-5px)';
                setTimeout(() => saveButton.style.transform = 'translateX(5px)', 100);
                setTimeout(() => saveButton.style.transform = 'translateX(-3px)', 200);
                setTimeout(() => saveButton.style.transform = 'translateX(3px)', 300);
                setTimeout(() => saveButton.style.transform = 'translateX(0)', 400);
            }
            
            // Focus sur le premier champ vide
            const fields = [phone, mobile, email, emailpro];
            for (let field of fields) {
                if (field && field.value.trim() === '') {
                    field.focus();
                    break;
                }
            }
            
            return false;
        }
        
        // Tout est OK, nettoyer les erreurs
        removeAllErrors();
        return true;
    }

    // Ajouter les gestionnaires d'événements sur les champs
    const contactFields = [phone, mobile, email, emailpro];
    contactFields.forEach(field => {
        if (field) {
            // Nettoyer les erreurs quand l'utilisateur commence à taper
            field.addEventListener('input', function() {
                // Supprimer l'erreur de ce champ
                removeFieldError(this);
                
                // Si tous les champs sont remplis, nettoyer tout
                if (isContactFilled()) {
                    removeAllErrors();
                }
            });
            
            // Nettoyer les erreurs si le champ est rempli
            field.addEventListener('blur', function() {
                if (this.value.trim() !== '') {
                    removeFieldError(this);
                    
                    // Si tous les champs sont remplis, nettoyer tout
                    if (isContactFilled()) {
                        removeAllErrors();
                    }
                }
            });
        }
    });

    // INTERCEPTION DE LA SOUMISSION - Méthode 1: Intercepter le submit du formulaire
    form.addEventListener('submit', function(event) {
        // Si la validation échoue, on bloque la soumission
        if (!validateContactFields()) {
            event.preventDefault();
            event.stopPropagation();
            return false;
        }
        // Sinon, on laisse passer
        return true;
    }, true); // true = capturer avant les autres événements

    // INTERCEPTION DE LA SOUMISSION - Méthode 2: Patcher la fonction check_form_borrowers
    // Sauvegarder la fonction originale
    const originalCheckForm = window.check_form_borrowers;
    
    if (typeof originalCheckForm === 'function') {
        // Remplacer par notre version
        window.check_form_borrowers = function() {
            // D'abord notre validation
            if (!validateContactFields()) {
                return false;
            }
            // Puis la validation originale
            return originalCheckForm.apply(this, arguments);
        };
        (function(){})('Function check_form_borrowers patched with contact validation');
    } else {
        (function(){})('check_form_borrowers not found, using fallback method');
    }

    // INTERCEPTION DE LA SOUMISSION - Méthode 3: Intercepter le clic sur le bouton
    if (saveButton) {
        // Ajouter un écouteur qui s'exécute avant les autres
        saveButton.addEventListener('click', function(event) {
            // Si la validation échoue, on bloque
            if (!validateContactFields()) {
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation(); // Important pour bloquer les autres écouteurs
                return false;
            }
            // Sinon on laisse passer
            return true;
        }, true); // true = capturer avant les autres événements
    }

    // Si des champs sont pré-remplis (modification), nettoyer les erreurs
    if (isContactFilled()) {
        removeAllErrors();
    }

    (function(){})('Script de validation des contacts chargé avec succès');
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