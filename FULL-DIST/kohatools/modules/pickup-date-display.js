(function(){"use strict";
const KT=window.KohaTools;if(!KT||!KT.Config)return;
const MODULE_ID='pickup-date-display',CFG=KT.Config.getCanonical(MODULE_ID),Scope=KT.getService&&KT.getService("scope");
if(!CFG||!CFG.enabled||!["shadow","live"].includes(CFG.mode))return;
if(Scope&&!Scope.match(CFG.general&&CFG.general.scope).ok)return;
const runtime={
 id:MODULE_ID,
 description:'Affiche la date de retrait uniquement lorsque le document est passé en retour au site final de retrait.',
 sourceFiles:['120-date-retrait-reservations.js'],
 parity:"exact-legacy",
 reloadRequiredOnConfigChange:true,
 init:function(){
   if(window["__KT_PARITY_"+MODULE_ID])return;
   window["__KT_PARITY_"+MODULE_ID]=true;
   
/* ===== EXACT LEGACY SOURCE: 120-date-retrait-reservations.js ===== */
// Calcul et affichage de la date de retrait
(function () {
    "use strict";

    // ============================================================
    // CONFIGURATION
    // ============================================================

    var API_ENDPOINT = "/api/v1/holds";

    // Nombre de jours de mise de côté configuré dans Koha
    var FALLBACK_DAYS = Number(CFG?.rules?.fallbackOpenDays ?? 11);

    // Champs possibles contenant la date d'expiration
    var CANDIDATE_FIELDS = Array.isArray(CFG?.rules?.expirationFields) && CFG.rules.expirationFields.length
        ? CFG.rules.expirationFields.slice()
        : ["expiration_date", "patron_expiration_date", "waiting_expires_on", "expirationdate"];
    var CLOSED_WEEKDAYS = new Set(Array.isArray(CFG?.rules?.closedWeekdays) ? CFG.rules.closedWeekdays.map(Number) : [0]);


    // ============================================================
    // FORMATAGE DES DATES
    // ============================================================

    function formatDateFr(date) {
        return date.toLocaleDateString("fr-FR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        });
    }


    // ============================================================
    // PARSING D'UNE DATE API
    // ============================================================

    function parseApiDate(isoString) {
        var date = new Date(isoString);

        if (isNaN(date.getTime())) {
            return null;
        }

        return date;
    }


    // ============================================================
    // CALCUL DU FALLBACK
    //
    // Koha utilise ReservesMaxPickUpDelay = 11 jours.
    // Le calendrier Koha exclut les dimanches.
    //
    // Exemple :
    // 18/08/2026 + 11 jours disponibles
    // en ignorant les dimanches
    // = 31/08/2026
    // ============================================================

    function computeFallbackDate() {
        var date = new Date();
        var remainingDays = FALLBACK_DAYS;

        while (remainingDays > 0) {

            // Avancer d'un jour
            date.setDate(date.getDate() + 1);

            // Dimanche = 0
            // Le dimanche n'est donc pas décompté.
            if (CLOSED_WEEKDAYS.has(date.getDay())) {
                continue;
            }

            // Jour comptabilisé
            remainingDays--;
        }

        return date;
    }


    // ============================================================
    // RECHERCHE DE LA DATE D'EXPIRATION DANS LE HOLD
    // ============================================================

    function pickExpirationField(hold) {

        for (var i = 0; i < CANDIDATE_FIELDS.length; i++) {

            var field = CANDIDATE_FIELDS[i];

            if (hold[field]) {

                var parsedDate = parseApiDate(hold[field]);

                if (parsedDate) {

                    return {
                        field: field,
                        date: parsedDate,
                        isFallback: false
                    };
                }
            }
        }

        return null;
    }


    // ============================================================
    // APPEL DE L'API KOHA
    // ============================================================

    function fetchHold(reserveId) {

        var url =
            API_ENDPOINT +
            "?hold_id=" +
            encodeURIComponent(reserveId);

        (function(){})(
            "[hold-expiration] appel API :",
            url
        );

        return fetch(url, {
            method: "GET",
            headers: {
                "Accept": "application/json"
            },
            credentials: "same-origin"
        })

        .then(function (response) {

            (function(){})(
                "[hold-expiration] statut réponse API :",
                response.status
            );

            if (!response.ok) {

                throw new Error(
                    "Réponse API " +
                    response.status +
                    " pour le hold " +
                    reserveId
                );
            }

            return response.json();
        })

        .then(function (list) {

            if (!Array.isArray(list) || list.length === 0) {

                throw new Error(
                    "Aucun hold trouvé pour l'id " +
                    reserveId
                );
            }

            return list[0];
        });
    }


    // ============================================================
    // AFFICHAGE DE LA DATE D'EXPIRATION
    // ============================================================

    function injectExpirationLine(modalBody, hold) {

        // --------------------------------------------------------
        // Supprimer une éventuelle ancienne information
        // --------------------------------------------------------

        var existingElements =
            modalBody.querySelectorAll(
                "#hold-expiration-info"
            );

        existingElements.forEach(function (element) {
            element.remove();
        });


        // --------------------------------------------------------
        // Chercher la date dans les données API
        // --------------------------------------------------------

        var picked = pickExpirationField(hold);


        // --------------------------------------------------------
        // Si aucune date n'est trouvée :
        // utiliser le fallback basé sur le calendrier Koha
        // --------------------------------------------------------

        if (!picked) {

            picked = {
                field: "fallback",
                date: computeFallbackDate(),
                isFallback: true
            };
        }


        (function(){})(
            "[hold-expiration] champ utilisé :",
            picked.field,
            "| fallback :",
            picked.isFallback,
            "| date :",
            picked.date
        );


        // --------------------------------------------------------
        // Création du bloc d'information
        // --------------------------------------------------------

        var container = document.createElement("div");

        container.id = "hold-expiration-info";
        container.className = "alert alert-info";

        container.style.cssText =
            "margin: 10px 0; padding: 8px 12px;";


        var strongLabel = document.createElement("strong");
        strongLabel.textContent = String(CFG?.labels?.expirationTitle || "📅 Mise de côté jusqu'au :");
        container.appendChild(strongLabel);
        container.appendChild(document.createTextNode(" " + formatDateFr(picked.date)));


        // --------------------------------------------------------
        // Recherche de l'endroit où insérer le bloc
        // --------------------------------------------------------

        var titleElement =
            modalBody.querySelector("h1") ||
            modalBody.querySelector(".modal-title");


        if (titleElement) {

            // Insérer juste après le titre
            titleElement.parentNode.insertBefore(
                container,
                titleElement.nextSibling
            );

        } else {

            // Sinon chercher un h4
            var firstH4 =
                modalBody.querySelector("h4");


            if (firstH4) {

                firstH4.parentNode.insertBefore(
                    container,
                    firstH4
                );

            } else {

                // Dernier recours :
                // placer au début du modal
                modalBody.prepend(container);
            }
        }
    }


    // ============================================================
    // RECHERCHE DU CONTENEUR DU MODAL
    // ============================================================

    function findModalContainer(form) {

        var modalBody =
            form.querySelector(".modal-body") ||
            form.querySelector("#hold-found-modal-body");


        if (!modalBody) {

            // Chercher le modal-content parent
            modalBody =
                form.closest(".modal-content") ||
                form;


            // Chercher ensuite un modal-body
            var contentContainer =
                modalBody.querySelector(".modal-body");


            if (contentContainer) {
                modalBody = contentContainer;
            }
        }

        return modalBody;
    }


    // ============================================================
    // TRAITEMENT DU FORMULAIRE DU MODAL
    // ============================================================

    function handleModalForm(form) {

        var reserveInput =
            form.querySelector(
                'input[name="reserve_id"]'
            );


        // --------------------------------------------------------
        // Pas de reserve_id
        // --------------------------------------------------------

        if (!reserveInput || !reserveInput.value) {

            (function(){})(
                "[hold-expiration] " +
                "pas de reserve_id trouvé dans le formulaire"
            );


            // Vérifier le cas du second modal
            var confirmBarcode =
                form.querySelector(
                    "#confirm-hold-barcode"
                );


            if (
                confirmBarcode &&
                confirmBarcode.value
            ) {

                (function(){})(
                    "[hold-expiration] " +
                    "Réservation déjà en attente, barcode :",
                    confirmBarcode.value
                );


                // Nouvelle tentative de recherche
                var altReserveInput =
                    form.querySelector(
                        'input[name="reserve_id"]'
                    );


                if (
                    altReserveInput &&
                    altReserveInput.value
                ) {

                    reserveInput =
                        altReserveInput;

                } else {

                    (function(){})(
                        "[hold-expiration] " +
                        "Impossible de trouver reserve_id, " +
                        "utilisation du fallback"
                    );


                    var modalBody =
                        findModalContainer(form);


                    injectExpirationLine(
                        modalBody,
                        {}
                    );

                    return;
                }

            } else {

                (function(){})(
                    "[hold-expiration] " +
                    "Aucune information de réservation trouvée"
                );

                return;
            }
        }


        // --------------------------------------------------------
        // Récupérer l'ID de réservation
        // --------------------------------------------------------

        var reserveId =
            reserveInput.value;


        var modalBody =
            findModalContainer(form);


        // --------------------------------------------------------
        // Appel API
        // --------------------------------------------------------

        fetchHold(reserveId)

            .then(function (hold) {

                (function(){})(
                    "[hold-expiration] " +
                    "données du hold reçues :",
                    hold
                );


                // Afficher la date provenant de l'API
                // ou utiliser le fallback si nécessaire
                injectExpirationLine(
                    modalBody,
                    hold
                );
            })

            .catch(function (error) {

                (function(){})(
                    "[hold-expiration] " +
                    "échec API, repli sur estimation :",
                    error
                );


                // En cas d'erreur API :
                // utilisation du fallback
                injectExpirationLine(
                    modalBody,
                    {}
                );
            });
    }


    // ============================================================
    // INITIALISATION
    // ============================================================

    (function(){})(
        "[hold-expiration] " +
        "script chargé, observation du DOM démarrée"
    );


    // ============================================================
    // TRAITER LES FORMULAIRES DÉJÀ PRÉSENTS
    // ============================================================

    var existingForms =
        document.querySelectorAll(
            "#hold-found-modal-form, form.confirm"
        );


    if (existingForms.length > 0) {

        (function(){})(
            "[hold-expiration] " +
            "formulaire(s) déjà présent(s) au chargement"
        );


        existingForms.forEach(function (form) {

            var reserveInput =
                form.querySelector(
                    'input[name="reserve_id"]'
                );


            if (
                reserveInput &&
                reserveInput.value
            ) {

                handleModalForm(form);

            } else {

                // Vérifier si le second modal est visible
                var modalDialog =
                    form.closest(
                        ".modal-dialog"
                    );


                if (
                    modalDialog &&
                    modalDialog.style.display !== "none"
                ) {

                    (function(){})(
                        "[hold-expiration] " +
                        "Formulaire visible sans reserve_id, " +
                        "tentative de récupération"
                    );


                    handleModalForm(form);
                }
            }
        });
    }


    // ============================================================
    // OBSERVATION DES NOUVEAUX MODAUX
    // ============================================================

    var observer =
        new MutationObserver(
            function (mutations) {

                mutations.forEach(
                    function (mutation) {

                        mutation.addedNodes.forEach(
                            function (node) {

                                // Ignorer les nœuds qui ne sont pas des éléments
                                if (node.nodeType !== 1) {
                                    return;
                                }


                                var forms = [];


                                // ------------------------------------------------
                                // Si le nœud ajouté est directement un formulaire
                                // ------------------------------------------------

                                if (
                                    node.id ===
                                    "hold-found-modal-form" ||

                                    (
                                        node.tagName === "FORM" &&
                                        node.classList.contains(
                                            "confirm"
                                        )
                                    )
                                ) {

                                    forms.push(node);

                                }


                                // ------------------------------------------------
                                // Sinon chercher les formulaires à l'intérieur
                                // ------------------------------------------------

                                else if (node.querySelector) {

                                    var foundForms =
                                        node.querySelectorAll(
                                            "#hold-found-modal-form, form.confirm"
                                        );


                                    foundForms.forEach(
                                        function (form) {
                                            forms.push(form);
                                        }
                                    );
                                }


                                // ------------------------------------------------
                                // Traiter les formulaires trouvés
                                // ------------------------------------------------

                                forms.forEach(
                                    function (form) {

                                        var modalDialog =
                                            form.closest(
                                                ".modal-dialog"
                                            );


                                        var isVisible = true;


                                        if (modalDialog) {

                                            var parentModal =
                                                modalDialog.closest(
                                                    ".modal"
                                                );


                                            isVisible =
                                                modalDialog.style.display !== "none" &&
                                                !modalDialog.classList.contains("hidden") &&
                                                (
                                                    !parentModal ||
                                                    parentModal.style.display !== "none"
                                                );
                                        }


                                        if (isVisible) {

                                            (function(){})(
                                                "[hold-expiration] " +
                                                "Modal détecté, traitement..."
                                            );


                                            // Laisser le temps au modal
                                            // de s'afficher complètement
                                            setTimeout(
                                                function () {
                                                    handleModalForm(form);
                                                },
                                                200
                                            );
                                        }
                                    }
                                );
                            }
                        );
                    }
                );
            }
        );


    observer.observe(
        document.body,
        {
            childList: true,
            subtree: true
        }
    );


    // ============================================================
    // MODAUX BOOTSTRAP
    // ============================================================

    document.addEventListener(
        "shown.bs.modal",
        function (event) {

            var modal = event.target;


            var form =
                modal.querySelector(
                    "#hold-found-modal-form"
                ) ||
                modal.querySelector(
                    "form.confirm"
                );


            if (form) {

                (function(){})(
                    "[hold-expiration] " +
                    "Modal Bootstrap affiché, traitement..."
                );


                setTimeout(
                    function () {
                        handleModalForm(form);
                    },
                    100
                );
            }
        }
    );


    // ============================================================
    // MODAUX JQUERY
    // ============================================================

    if (typeof jQuery !== "undefined") {

        jQuery(document).on(
            "shown",
            ".modal",
            function (event) {

                var modal =
                    event.currentTarget;


                var form =
                    modal.querySelector(
                        "#hold-found-modal-form"
                    ) ||
                    modal.querySelector(
                        "form.confirm"
                    );


                if (form) {

                    (function(){})(
                        "[hold-expiration] " +
                        "Modal jQuery affiché, traitement..."
                    );


                    setTimeout(
                        function () {
                            handleModalForm(form);
                        },
                        100
                    );
                }
            }
        );
    }

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