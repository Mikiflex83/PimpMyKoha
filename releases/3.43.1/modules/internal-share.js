(function(){"use strict";
const KT=window.KohaTools;if(!KT||!KT.Config)return;const MODULE_ID='internal-share',CFG=KT.Config.getCanonical(MODULE_ID),Scope=KT.getService&&KT.getService("scope");
const FIREBASE_META=CFG?.firebase||{};
const FIREBASE_PUBLIC=KT.getService?.('firebase-module')?.publicConfig?.(MODULE_ID,FIREBASE_META)||null;
if(!CFG||!CFG.enabled||!["shadow","live"].includes(CFG.mode))return;if(Scope&&!Scope.match(CFG.general&&CFG.general.scope).ok)return;
const runtime={id:MODULE_ID,sourceFiles:['111-internal-share.js'],parity:"exact-legacy",init:function(){if(window["__KT_PARITY_"+MODULE_ID])return;window["__KT_PARITY_"+MODULE_ID]=true;

/* ===== EXACT LEGACY SOURCE: 111-internal-share.js ===== */
(function () {
    // --- VERROU ANTI-BOUCLE GLOBAL AVEC COMPTEUR D'INSTANCES ---
    if (window._KOHA_SHARE_INITIALIZED) {
        (function(){})('Koha Share déjà initialisé (instance #' + (window._KOHA_SHARE_INSTANCE_COUNT || 1) + ')');
        window._KOHA_SHARE_INSTANCE_COUNT = (window._KOHA_SHARE_INSTANCE_COUNT || 1) + 1;
        return;
    }
    window._KOHA_SHARE_INITIALIZED = true;
    window._KOHA_SHARE_INSTANCE_COUNT = 1;

    const path = window.location.pathname;
    const ALLOWED_BRANCH_NAMES = (Array.isArray(CFG?.business?.allowedBranchNames) ? CFG.business.allowedBranchNames : []).map(x=>String(x).trim().toUpperCase());
    const isAllowedBranch = branch => ALLOWED_BRANCH_NAMES.includes(String(branch||'').trim().toUpperCase());
    let buttonClass = "btn btn-default";

    let isProcessing = false;
    let isDependenciesLoading = false;
    let dependenciesLoaded = false;

    // --- GESTION DU COMPTEUR ---
    let globalUsageCount = 0;
    const USAGE_CACHE_KEY = 'koha-share-usage-count';
    const USAGE_CACHE_TIME_KEY = 'koha-share-usage-count-time';
    const USAGE_CACHE_TTL_MS = Math.max(0, Number(CFG?.cache?.usageTtlMs ?? 60000));

    // --- RÉFÉRENCES FIREBASE ---
    let firebaseApp = null;
    let database = null;
    let sharesRef = null;
    let isFirebaseConnected = false;
    let firebaseListenersActive = false;
    let recentSharesQuery = null;
    let recentSharesListeners = null;
    let budgetListenerStop = null;
    let connectionStatusElement = null;
    let connectionLogElement = null;
    let connectionLogVisible = false;
    let firebaseInitPromise = null;
    let firebaseInitResolve = null;
    let firebaseInitReject = null;
    let isFirebaseInitializing = false;

    // --- VERROUS ANTI-BOUCLE ---
    let isDisconnecting = false;
    let isReconnecting = false;
    let reconnectTimeout = null;
    let lastDisconnectTime = 0;
    const DISCONNECT_DEBOUNCE_MS = 500;
    const RECONNECT_DEBOUNCE_MS = 1000;
    let pageLoadTime = Date.now();
    let isFirstLoad = true;

    // --- HISTORIQUE DE CONNEXION ---
    const CONNECTION_LOG_KEY = 'koha-share-connection-log';
    const MAX_LOG_ENTRIES = Math.max(1, Number(CFG?.limits?.maxConnectionLogEntries ?? 50));

    function getConnectionLog() {
        try {
            var log = localStorage.getItem(CONNECTION_LOG_KEY);
            if (log) {
                return JSON.parse(log);
            } else {
                return [];
            }
        } catch (e) {
            return [];
        }
    }

    function saveConnectionLog(log) {
        try {
            localStorage.setItem(CONNECTION_LOG_KEY, JSON.stringify(log));
        } catch (e) {
            // Ignorer les erreurs de localStorage
        }
    }

    function addConnectionLogEntry(status, message, details) {
        var log = getConnectionLog();
        var entry = {
            timestamp: new Date().toISOString(),
            time: new Date().toLocaleTimeString(),
            status: status,
            message: message,
            details: details || '',
            page: window.location.pathname
        };
        log.unshift(entry);
        if (log.length > MAX_LOG_ENTRIES) {
            log.length = MAX_LOG_ENTRIES;
        }
        saveConnectionLog(log);
        updateConnectionLogDisplay();
    }

    function clearConnectionLog() {
        saveConnectionLog([]);
        updateConnectionLogDisplay();
    }

    function updateConnectionLogDisplay() {
        if (!connectionLogElement) {
            return;
        }
        var log = getConnectionLog();
        var logContainer = connectionLogElement.querySelector('.connection-log-list');
        if (!logContainer) {
            return;
        }

        if (log.length === 0) {
            logContainer.innerHTML = '<div class="log-empty">Aucun événement enregistré</div>';
            return;
        }

        var html = '';
        for (var i = 0; i < log.length; i++) {
            var entry = log[i];
            var statusClass = entry.status;
            var icon = '';
            if (entry.status === 'connected') {
                icon = '🟢';
            } else if (entry.status === 'disconnected') {
                icon = '⚪';
            } else if (entry.status === 'connecting') {
                icon = '🟠';
            } else if (entry.status === 'error') {
                icon = '🔴';
            } else {
                icon = '⚪';
            }
            html += '<div class="log-entry ' + statusClass + '">';
            html += '<span class="log-time">' + entry.time + '</span>';
            html += '<span class="log-icon">' + icon + '</span>';
            html += '<span class="log-message">' + entry.message + '</span>';
            if (entry.details) {
                html += '<span class="log-details">' + entry.details + '</span>';
            }
            html += '<span class="log-page">' + entry.page + '</span>';
            html += '</div>';
        }
        logContainer.innerHTML = html;
        logContainer.scrollTop = 0;
    }

    // --- MISE À JOUR DE L'INDICATEUR DE CONNEXION ---
    function updateConnectionStatus(status, message) {
        if (!connectionStatusElement) {
            return;
        }
        
        var statusDot = connectionStatusElement.querySelector('.status-dot');
        var statusText = connectionStatusElement.querySelector('.status-text');
        
        if (!statusDot || !statusText) {
            return;
        }
        
        statusDot.classList.remove('connected', 'disconnected', 'connecting', 'error');
        
        if (status === 'connected') {
            statusDot.classList.add('connected');
            if (message) {
                statusText.textContent = message;
            } else {
                statusText.textContent = 'Connecté';
            }
            statusDot.title = 'Connecté - Cliquez pour voir l\'historique';
        } else if (status === 'disconnected') {
            statusDot.classList.add('disconnected');
            if (message) {
                statusText.textContent = message;
            } else {
                statusText.textContent = 'Déconnecté';
            }
            statusDot.title = 'Déconnecté - Cliquez pour voir l\'historique';
        } else if (status === 'connecting') {
            statusDot.classList.add('connecting');
            if (message) {
                statusText.textContent = message;
            } else {
                statusText.textContent = 'Connexion...';
            }
            statusDot.title = 'Connexion en cours... - Cliquez pour voir l\'historique';
        } else if (status === 'error') {
            statusDot.classList.add('error');
            if (message) {
                statusText.textContent = message;
            } else {
                statusText.textContent = 'Erreur';
            }
            statusDot.title = 'Erreur - Cliquez pour voir l\'historique';
        } else {
            statusDot.classList.add('disconnected');
            statusText.textContent = 'Inactif';
            statusDot.title = 'Statut inconnu - Cliquez pour voir l\'historique';
        }
    }

    // --- TOGGLE DU LOG DE CONNEXION ---
    function toggleConnectionLog(e) {
        e.stopPropagation();
        if (!connectionLogElement) {
            return;
        }

        connectionLogVisible = !connectionLogVisible;
        if (connectionLogVisible) {
            connectionLogElement.classList.add('visible');
            updateConnectionLogDisplay();
        } else {
            connectionLogElement.classList.remove('visible');
        }
    }

    function updateUsageCounterDisplay() {
        var modalCounter = document.getElementById('modalUsageCounter');
        if (modalCounter) {
            if (globalUsageCount > 1) {
                modalCounter.textContent = '📊 ' + globalUsageCount + ' utilisations';
            } else {
                modalCounter.textContent = '📊 ' + globalUsageCount + ' utilisation';
            }
        }
        var counters = document.querySelectorAll('.share-usage-counter span');
        for (var i = 0; i < counters.length; i++) {
            var counter = counters[i];
            if (!counter.closest('.koha-share-badge')) {
                continue;
            }
            if (globalUsageCount > 1) {
                counter.textContent = '📊 ' + globalUsageCount + ' utilisations';
            } else {
                counter.textContent = '📊 ' + globalUsageCount + ' utilisation';
            }
        }
    }

    // --- FERMETURE ET NETTOYAGE DE LA CONNEXION FIREBASE ---
    function disconnectFirebase() {
        if (isFirstLoad && Date.now() - pageLoadTime < 3000) {
            (function(){})('Première charge, déconnexion ignorée');
            return;
        }

        if (isDisconnecting) {
            (function(){})('Déconnexion déjà en cours, ignorée');
            return;
        }

        var now = Date.now();
        if (now - lastDisconnectTime < DISCONNECT_DEBOUNCE_MS) {
            (function(){})('Déconnexion trop rapide, ignorée');
            return;
        }
        lastDisconnectTime = now;

        if (reconnectTimeout) {
            clearTimeout(reconnectTimeout);
            reconnectTimeout = null;
        }

        isDisconnecting = true;
        (function(){})('Fermeture de la connexion Firebase...');
        
        if (firebaseListenersActive) {
            try {
                if (recentSharesQuery && recentSharesListeners) {
                    recentSharesQuery.off('child_added', recentSharesListeners.added);
                    recentSharesQuery.off('child_changed', recentSharesListeners.changed);
                    recentSharesQuery.off('child_removed', recentSharesListeners.removed);
                }
                recentSharesQuery = null;
                recentSharesListeners = null;
                if (typeof budgetListenerStop === 'function') budgetListenerStop();
                budgetListenerStop = null;
                firebaseListenersActive = false;
                (function(){})('Écouteurs Firebase détachés');
            } catch (e) {
                (function(){})('Erreur lors du détachement des écouteurs:', e);
            }
        }

        // NOTE : on ne touche plus à activeIntervals ici.
        // Les timers de compte à rebours des badges sont purement locaux
        // (ils ne dépendent pas de la connexion Firebase) : les vider ici
        // les empêchait de repartir correctement à la reconnexion, car
        // renderOrUpdateBadge() ne les recréait que pour les nouveaux éléments DOM.

        if (firebaseApp && isFirebaseConnected) {
            try {
                if (database) {
                    database.goOffline();
                }
                isFirebaseConnected = false;
                (function(){})('Firebase déconnecté (offline)');
                updateConnectionStatus('disconnected', 'Déconnecté');
                addConnectionLogEntry('disconnected', 'Déconnecté', 'database.goOffline()');
            } catch (e) {
                (function(){})('Erreur lors de la déconnexion Firebase:', e);
            }
        }

        try {
            sessionStorage.removeItem(USAGE_CACHE_KEY);
            sessionStorage.removeItem(USAGE_CACHE_TIME_KEY);
        } catch (e) {
            // Ignorer
        }

        isDisconnecting = false;
    }

    // --- GESTIONNAIRES D'ÉVÉNEMENTS POUR LA FERMETURE ---
    function setupDisconnectHandlers() {
        // Fermeture de l'onglet / navigation
        window.addEventListener('beforeunload', function(e) {
            isFirstLoad = false;
            disconnectFirebase();
        });

        // Quand la page est cachée (changement d'onglet, minimisation)
        document.addEventListener('visibilitychange', function() {
            if (document.hidden) {
                isFirstLoad = false;
                disconnectFirebase();
            } else {
                var branch = getBranchName();
                if (isAllowedBranch(branch) && !isReconnecting && !isFirebaseConnected && !isFirebaseInitializing) {
                    var now = Date.now();
                    if (now - pageLoadTime < 2000) {
                        (function(){})('Page récemment chargée, reconnexion différée');
                        return;
                    }

                    if (reconnectTimeout) {
                        clearTimeout(reconnectTimeout);
                    }
                    reconnectTimeout = setTimeout(function() {
                        reconnectTimeout = null;
                        (function(){})('Réactivation de la connexion Firebase...');
                        isReconnecting = true;
                        updateConnectionStatus('connecting', 'Reconnexion...');
                        addConnectionLogEntry('connecting', 'Reconnexion...', 'Retour sur l\'onglet');
                        initFirebase().then(function() {
                            attachFirebaseListeners();
                            isReconnecting = false;
                            updateConnectionStatus('connected', 'Connecté');
                            addConnectionLogEntry('connected', 'Connecté', 'Reconnexion réussie');
                        }).catch(function(e) {
                            (function(){})('Erreur reconnexion Firebase:', e);
                            isReconnecting = false;
                            updateConnectionStatus('error', 'Échec reconnexion');
                            addConnectionLogEntry('error', 'Échec reconnexion', e.message);
                        });
                    }, RECONNECT_DEBOUNCE_MS);
                }
            }
        });

        // Page refresh / navigation interne
        window.addEventListener('pagehide', function(e) {
            isFirstLoad = false;
            disconnectFirebase();
        });

        // Quand le navigateur est fermé
        window.addEventListener('unload', function(e) {
            isFirstLoad = false;
            disconnectFirebase();
        });
    }

    // --- INITIALISATION FIREBASE AVEC PROMISE PARTAGÉE ---
    function initFirebase() {
        // Si déjà connecté, retourner une promesse résolue
        if (firebaseApp && isFirebaseConnected) {
            updateConnectionStatus('connected', 'Connecté');
            return Promise.resolve();
        }

        // Si déjà en cours d'initialisation, retourner la même promesse
        if (isFirebaseInitializing && firebaseInitPromise) {
            return firebaseInitPromise;
        }

        // Démarrer l'initialisation
        isFirebaseInitializing = true;
        updateConnectionStatus('connecting', 'Connexion...');
        addConnectionLogEntry('connecting', 'Connexion...', 'Initialisation Firebase');

        firebaseInitPromise = new Promise(function(resolve, reject) {
            try {
const firebaseConfig = FIREBASE_PUBLIC;
                if (!firebaseConfig) throw new Error(KT.getService?.('firebase-module')?.problem?.(MODULE_ID,FIREBASE_META)||'Connexion Firebase du partage interne non configurée.');


                firebaseApp = (firebase.apps || []).find(function(app){ return app.name === (FIREBASE_META.appName||'KohaToolsInternalShare'); }) || firebase.initializeApp(firebaseConfig, (FIREBASE_META.appName||'KohaToolsInternalShare'));
                database = firebaseApp.database();
                // IMPORTANT : si la base avait été mise offline (disconnectFirebase()
                // appelle database.goOffline()), il faut explicitement la remettre
                // en ligne. Le SDK Firebase ne le fait jamais tout seul : sans cet
                // appel, isFirebaseConnected repasse à true et l'UI affiche
                // "Connecté", mais aucune donnée n'est réellement reçue du serveur
                // (plus d'écoute temps réel) tant que goOnline() n'est pas appelé.
                database.goOnline();

                sharesRef = database.ref('shares');

                firebaseApp.auth().signInAnonymously().then(function(credential) {
                    var uid = credential.user.uid;
                    var accessRef = database.ref('internal_share_access/' + uid);
                    return accessRef.once('value').then(function(snapshot) {
                        if (!snapshot.exists()) {
                            return accessRef.set({ approved: false, role: 'pending', createdAt: firebase.database.ServerValue.TIMESTAMP }).then(function() {
                                throw new Error('Poste Partage interne non approuvé. UID Firebase : ' + uid + '. Approuvez internal_share_access/' + uid + ' dans Firebase.');
                            });
                        }
                        var access = snapshot.val() || {};
                        if (access.approved !== true || ['member','admin'].indexOf(String(access.role || '')) === -1) {
                            throw new Error('Poste Partage interne en attente d’approbation. UID Firebase : ' + uid + '.');
                        }
                    });
                }).then(function() {
                    isFirebaseConnected = true;
                    return loadGlobalUsageCount(database).catch(function() { return globalUsageCount; });
                }).then(function() {
                    updateConnectionStatus('connected', 'Connecté');
                    addConnectionLogEntry('connected', 'Connecté', 'Firebase initialisé');
                    isFirebaseInitializing = false;
                    resolve();
                }).catch(function(error) {
                    isFirebaseConnected = false;
                    updateConnectionStatus('error', 'Accès refusé');
                    addConnectionLogEntry('error', 'Accès refusé', error && error.message ? error.message : String(error));
                    isFirebaseInitializing = false;
                    reject(error);
                });
            } catch (e) {
                (function(){})('Erreur init Firebase:', e);
                updateConnectionStatus('error', 'Erreur init');
                addConnectionLogEntry('error', 'Erreur init', e.message);
                isFirebaseInitializing = false;
                reject(e);
            }
        });

        return firebaseInitPromise;
    }

    function loadGlobalUsageCount(db) {
        return new Promise(function(resolve) {
            try {
                var cached = sessionStorage.getItem(USAGE_CACHE_KEY);
                var cachedTime = sessionStorage.getItem(USAGE_CACHE_TIME_KEY);
                if (cached !== null && cachedTime && (Date.now() - parseInt(cachedTime, 10)) < USAGE_CACHE_TTL_MS) {
                    globalUsageCount = parseInt(cached, 10) || 0;
                    updateUsageCounterDisplay();
                    resolve(globalUsageCount);
                    return;
                }
            } catch (e) {
                // Ignorer
            }

            var statsRef = db.ref('stats/usage_count');
            statsRef.once('value').then(function(snapshot) {
                globalUsageCount = snapshot.val() || 0;
                try {
                    sessionStorage.setItem(USAGE_CACHE_KEY, String(globalUsageCount));
                    sessionStorage.setItem(USAGE_CACHE_TIME_KEY, String(Date.now()));
                } catch (e) {
                    // Ignorer
                }
                updateUsageCounterDisplay();
                resolve(globalUsageCount);
            }).catch(function() {
                globalUsageCount = 0;
                updateUsageCounterDisplay();
                resolve(0);
            });
        });
    }

    function incrementUsageCount(db) {
        return new Promise(function(resolve, reject) {
            var statsRef = db.ref('stats/usage_count');
            statsRef.transaction(function(current) {
                return (current || 0) + 1;
            }, function(error, committed, snapshot) {
                if (error) {
                    (function(){})('Erreur incrémentation:', error);
                    reject(error);
                    return;
                }
                if (committed) {
                    globalUsageCount = snapshot.val() || 0;
                    try {
                        sessionStorage.setItem(USAGE_CACHE_KEY, String(globalUsageCount));
                        sessionStorage.setItem(USAGE_CACHE_TIME_KEY, String(Date.now()));
                    } catch (e) {
                        // Ignorer
                    }
                    updateUsageCounterDisplay();
                    resolve(globalUsageCount);
                } else {
                    statsRef.once('value').then(function(snap) {
                        globalUsageCount = snap.val() || 0;
                        try {
                            sessionStorage.setItem(USAGE_CACHE_KEY, String(globalUsageCount));
                            sessionStorage.setItem(USAGE_CACHE_TIME_KEY, String(Date.now()));
                        } catch (e) {
                            // Ignorer
                        }
                        updateUsageCounterDisplay();
                        resolve(globalUsageCount);
                    }).catch(reject);
                }
            });
        });
    }

    // --- CHARGEMENT DES DÉPENDANCES DE BASE ---
    function loadBaseDependencies() {
        return new Promise(function(resolve, reject) {
            if (window.firebase && window.firebase.database && window.firebase.auth) {
                dependenciesLoaded = true;
                resolve();
                return;
            }

            if (isDependenciesLoading) {
                var checkInterval = setInterval(function() {
                    if (dependenciesLoaded) {
                        clearInterval(checkInterval);
                        resolve();
                    }
                }, 100);
                return;
            }

            isDependenciesLoading = true;

            var scripts = [
                "https://www.gstatic.com/firebasejs/" + (FIREBASE_META.sdkVersion||"10.7.1") + "/firebase-app-compat.js",
                "https://www.gstatic.com/firebasejs/" + (FIREBASE_META.sdkVersion||"10.7.1") + "/firebase-auth-compat.js",
                "https://www.gstatic.com/firebasejs/" + (FIREBASE_META.sdkVersion||"10.7.1") + "/firebase-database-compat.js"
            ];

            var index = 0;

            function loadNextScript() {
                if (index >= scripts.length) {
                    dependenciesLoaded = true;
                    isDependenciesLoading = false;
                    resolve();
                    return;
                }

                var scriptName = scripts[index];
                if (scriptName.indexOf('firebase-app') !== -1 && window.firebase) {
                    index++;
                    loadNextScript();
                    return;
                }
                if (scriptName.indexOf('firebase-auth') !== -1 && window.firebase && window.firebase.auth) {
                    index++;
                    loadNextScript();
                    return;
                }
                if (scriptName.indexOf('firebase-database') !== -1 && window.firebase && window.firebase.database) {
                    index++;
                    loadNextScript();
                    return;
                }

                var script = document.createElement('script');
                script.src = scripts[index];
                script.onload = function() {
                    index++;
                    loadNextScript();
                };
                script.onerror = function(e) {
                    isDependenciesLoading = false;
                    reject(e);
                };
                document.head.appendChild(script);
            }

            loadNextScript();
        });
    }

    function getBranchName() {
        var branchNameSpan = document.querySelector('.logged-in-branch-name');
        if (branchNameSpan) {
            return branchNameSpan.textContent.trim();
        } else {
            return "";
        }
    }

    function getCurrentUserId() {
        var branch = getBranchName();
        if (!window._KOHA_USER_SESSION_ID) {
            window._KOHA_USER_SESSION_ID = branch + '_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        }
        return window._KOHA_USER_SESSION_ID;
    }

    // --- FONCTIONS DE RÉDUCTION/DÉVELOPPEMENT ---
    function toggleItem(itemElement) {
        if (!itemElement) {
            return;
        }
        var isMinimized = itemElement.classList.contains('minimized');
        if (isMinimized) {
            itemElement.classList.remove('minimized');
            var toggleBtn = itemElement.querySelector('.koha-share-toggle');
            if (toggleBtn) {
                var icon = toggleBtn.querySelector('.toggle-icon');
                if (icon) {
                    icon.textContent = '▾';
                    icon.classList.remove('rotated');
                }
            }
            localStorage.setItem('koha-share-minimized-' + itemElement.dataset.key, 'false');
        } else {
            itemElement.classList.add('minimized');
            var toggleBtn = itemElement.querySelector('.koha-share-toggle');
            if (toggleBtn) {
                var icon = toggleBtn.querySelector('.toggle-icon');
                if (icon) {
                    icon.textContent = '▸';
                    icon.classList.add('rotated');
                }
            }
            localStorage.setItem('koha-share-minimized-' + itemElement.dataset.key, 'true');
        }
    }

    function restoreItemState(itemElement, key) {
        var saved = localStorage.getItem('koha-share-minimized-' + key);
        if (saved === 'true') {
            itemElement.classList.add('minimized');
            var toggleBtn = itemElement.querySelector('.koha-share-toggle');
            if (toggleBtn) {
                var icon = toggleBtn.querySelector('.toggle-icon');
                if (icon) {
                    icon.textContent = '▸';
                    icon.classList.add('rotated');
                }
            }
        } else {
            itemElement.classList.remove('minimized');
            var toggleBtn = itemElement.querySelector('.koha-share-toggle');
            if (toggleBtn) {
                var icon = toggleBtn.querySelector('.toggle-icon');
                if (icon) {
                    icon.textContent = '▾';
                    icon.classList.remove('rotated');
                }
            }
        }
    }

    function isCurrentUserCreator(createdBy) {
        var currentUserId = getCurrentUserId();
        return createdBy === currentUserId;
    }

    function handleDeleteShare(key, event) {
        event.preventDefault();
        event.stopPropagation();
        var confirmMessage =  'ATTENTION : Cette action va SUPPRIMER la demande de partage pour TOUS les utilisateurs.\n\nConfirmez-vous la suppression ?';
        if (confirm(confirmMessage)) {
            if (sharesRef) {
                sharesRef.child(key).remove()
                    .then(function() {
                        (function(){})('Demande supprimée');
                    })
                    .catch(function(error) {
                        (function(){})('Erreur suppression:', error);
                        alert('Erreur: ' + error.message);
                    });
            }
        }
    }

    function updateBadgeStatusUI(badge, data) {
        var status = data.status || "en_attente";
        var comment = data.statusComment || null;
        var key = badge.dataset.key;

        badge.classList.remove('status-trouve', 'status-non_trouve', 'status-transmis', 'status-autre');

        var statusText = "⏳ En attente";
        if (status === "trouve") {
            badge.classList.add('status-trouve');
            statusText = "✅ Document Trouvé !";
        } else if (status === "non_trouve") {
            badge.classList.add('status-non_trouve');
            statusText = "❌ Introuvable";
        } else if (status === "transmis") {
            badge.classList.add('status-transmis');
            statusText = "📦 Transmis au lecteur";
        } else if (status === "autre") {
            badge.classList.add('status-autre');
            statusText = "🔄 Autre statut";
        }

        var statusContainer = badge.querySelector('.share-status-text');
        if (statusContainer) {
            statusContainer.innerHTML = statusText;
        }

        var commentContainer = badge.querySelector('.share-status-comment');
        if (commentContainer) {
            if (comment) {
                commentContainer.innerHTML = '<i class="fa fa-info-circle"></i> ' + comment;
                commentContainer.style.display = 'block';
            } else {
                commentContainer.style.display = 'none';
            }
        }

        var cancelBtn = badge.querySelector('.share-cancel-btn');
        if (cancelBtn) {
            // NOTE : 'flex !important' n'est pas une valeur CSS inline valide,
            // le navigateur ignore silencieusement toute la déclaration.
            // L'affichage du bouton est de toute façon garanti par la règle
            // CSS ".share-cancel-btn { display:flex !important; }" plus bas.
            cancelBtn.style.display = 'flex';
            if (!cancelBtn._listenerAttached) {
                cancelBtn.addEventListener('click', function(e) {
                    handleDeleteShare(key, e);
                });
                cancelBtn._listenerAttached = true;
            }
        }

        var statusButtons = badge.querySelectorAll('.share-status-buttons .btn-status');
        for (var i = 0; i < statusButtons.length; i++) {
            statusButtons[i].classList.remove('disabled');
        }
    }

    function renderOrUpdateBadge(key, data) {
        var now = Date.now();
        var fiveMinutes = 5 * 60 * 1000;

        if (now - data.timestamp > fiveMinutes) {
            var oldItem = document.getElementById('share-item-' + key);
            if (oldItem) {
                oldItem.remove();
            }
            if (activeIntervals[key]) {
                clearInterval(activeIntervals[key]);
                delete activeIntervals[key];
            }
            if (sharesRef) {
                sharesRef.child(key).remove().catch(function() {
                    // Ignorer
                });
            }
            return;
        }

        var currentBranch = getBranchName();
        if (!isAllowedBranch(currentBranch)) {
            return;
        }

        var itemElement = document.getElementById('share-item-' + key);
        var isNew = false;

        if (!itemElement) {
            isNew = true;
            itemElement = document.createElement('div');
            itemElement.className = 'koha-share-item';
            itemElement.id = 'share-item-' + key;
            itemElement.dataset.key = key;
        }

        var badge = itemElement.querySelector('.koha-share-badge');
        if (!badge) {
            badge = document.createElement('div');
            badge.className = 'koha-share-badge';
            badge.id = 'share-' + key;
            badge.dataset.key = key;
            itemElement.appendChild(badge);
        }

        var toggleBtn = itemElement.querySelector('.koha-share-toggle');
        if (!toggleBtn) {
            toggleBtn = document.createElement('button');
            toggleBtn.className = 'koha-share-toggle';
            toggleBtn.title = 'Réduire/Développer';
            toggleBtn.innerHTML = '<span class="toggle-icon">▾</span>';
            toggleBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                toggleItem(itemElement);
            });
            itemElement.appendChild(toggleBtn);
        }

        var recipientHtml = '';
        if (data.recipient) {
            recipientHtml = '<div class="share-recipient"><i class="fa fa-user"></i> Pour : <b>' + data.recipient + '</b></div>';
        }
        var noteHtml = '';
        if (data.note) {
            noteHtml = '<div class="share-note"><i class="fa fa-comment"></i> ' + data.note.replace(/\n/g, '<br>') + '</div>';
        }

        var isCreator = isCurrentUserCreator(data.createdBy);
        var creatorLabel = '';
        if (isCreator) {
            creatorLabel = '👤 Vous';
        } else {
            creatorLabel = '👤 Autre';
        }
        var cancelBtnHtml = '<button class="share-cancel-btn" data-key="' + key + '" title="Supprimer cette demande">×</button>';

        var newContent = '';
        newContent += cancelBtnHtml;
        newContent += '<div class="share-title"><i class="fa fa-external-link"></i> ' + data.title + '</div>';
        newContent += recipientHtml;
        newContent += '<div class="share-status-text"></div>';
        newContent += '<div class="share-status-comment" style="display:none;"></div>';
        newContent += noteHtml;
        newContent += '<div class="share-created-by">';
        newContent += '<span>Créé par :</span>';
        newContent += '<span class="creator-badge">' + creatorLabel + '</span>';
        newContent += '</div>';
        newContent += '<div class="share-status-buttons">';
        newContent += '<button class="btn-status btn-status-trouve" data-status="trouve">Trouvé</button>';
        newContent += '<button class="btn-status btn-status-non_trouve" data-status="non_trouve">Pas trouvé</button>';
        newContent += '<button class="btn-status btn-status-transmis" data-status="transmis">Transmis</button>';
        newContent += '<button class="btn-status btn-status-autre" data-status="autre">Autre</button>';
        newContent += '</div>';
        newContent += '<div class="share-actions">';
        newContent += '<span class="share-timer" id="timer-' + key + '">...</span>';
        newContent += '<a href="' + data.url + '" target="_blank">Ouvrir <i class="fa fa-arrow-right"></i></a>';
        newContent += '</div>';
        newContent += '<div class="share-usage-counter">';
        if (globalUsageCount > 1) {
            newContent += '<span>📊 ' + globalUsageCount + ' utilisations</span>';
        } else {
            newContent += '<span>📊 ' + globalUsageCount + ' utilisation</span>';
        }
        newContent += '</div>';

        badge.innerHTML = newContent;

        setTimeout(function() {
            var cancelBtn = badge.querySelector('.share-cancel-btn');
            if (cancelBtn && !cancelBtn._listenerAttached) {
                cancelBtn.addEventListener('click', function(e) {
                    handleDeleteShare(key, e);
                });
                cancelBtn._listenerAttached = true;
            }

            var statusButtons = badge.querySelectorAll('.share-status-buttons .btn-status');
            for (var i = 0; i < statusButtons.length; i++) {
                var btn = statusButtons[i];
                if (!btn._listenerAttached) {
                    btn.addEventListener('click', function(e) {
                        e.preventDefault();
                        currentStatusTargetKey = key;
                        currentStatusTargetValue = this.getAttribute('data-status');

                        if (currentStatusTargetValue === "autre") {
                            autreModalTitle.innerHTML = '<i class="fa fa-tag"></i> Statut personnalisé';
                            autreModalComment.value = data.statusComment || "";
                            autreModalOverlay.style.display = 'flex';
                            autreModalOverlay.classList.add('active');
                            autreModalComment.focus();
                            return;
                        }

                        var humanStatus = "Mettre à jour le statut";
                        if (currentStatusTargetValue === "trouve") {
                            humanStatus = "Marquer comme : Trouvé";
                        } else if (currentStatusTargetValue === "non_trouve") {
                            humanStatus = "Marquer comme : Pas trouvé";
                        } else if (currentStatusTargetValue === "transmis") {
                            humanStatus = "Marquer comme : Transmis";
                        }

                        statusModalTitle.innerHTML = '<i class="fa fa-info-circle"></i> ' + humanStatus;
                        statusModalComment.value = data.statusComment || "";
                        statusModalOverlay.style.display = 'flex';
                        statusModalOverlay.classList.add('active');
                        statusModalComment.focus();
                    });
                    btn._listenerAttached = true;
                }
            }
        }, 0);

        if (isNew) {
            container.appendChild(itemElement);
            restoreItemState(itemElement, key);
        }

        updateBadgeStatusUI(badge, data);

        if (!activeIntervals[key]) {
            // On (re)crée le timer local dès qu'il manque, que le badge soit
            // nouveau ou déjà présent (ex: après une reconnexion, où le badge
            // existait déjà dans le DOM mais son intervalle avait été
            // supprimé par disconnectFirebase() lors d'une ancienne version).
            activeIntervals[key] = setInterval(function() {
                var remaining = fiveMinutes - (Date.now() - data.timestamp);
                if (remaining <= 0) {
                    clearInterval(activeIntervals[key]);
                    delete activeIntervals[key];
                    var item = document.getElementById('share-item-' + key);
                    if (item) {
                        item.remove();
                    }
                    if (sharesRef) {
                        sharesRef.child(key).remove().catch(function() {
                            // Ignorer
                        });
                    }
                } else {
                    var minutes = Math.floor(remaining / 60000);
                    var seconds = Math.floor((remaining % 60000) / 1000);
                    var timerSpan = document.getElementById('timer-' + key);
                    if (timerSpan) {
                        timerSpan.innerText = 'Expire dans ' + minutes + 'm ' + seconds + 's';
                    }
                }
            }, 1000);
        }
    }

    // --- ATTACHE LES ÉCOUTEURS ---
    function attachFirebaseListeners() {
        if (!sharesRef || firebaseListenersActive) {
            return;
        }

        try {
            var fiveMinutes = 5 * 60 * 1000;
            recentSharesQuery = sharesRef.orderByChild('timestamp').startAt(Date.now() - fiveMinutes);

            var listenerAdded = function(snapshot) {
                renderOrUpdateBadge(snapshot.key, snapshot.val());
            };
            var listenerChanged = function(snapshot) {
                renderOrUpdateBadge(snapshot.key, snapshot.val());
            };
            var listenerRemoved = function(snapshot) {
                var key = snapshot.key;
                var item = document.getElementById('share-item-' + key);
                if (item) {
                    item.remove();
                }
                if (activeIntervals[key]) {
                    clearInterval(activeIntervals[key]);
                    delete activeIntervals[key];
                }
                localStorage.removeItem('koha-share-minimized-' + key);
            };

            recentSharesListeners = { added: listenerAdded, changed: listenerChanged, removed: listenerRemoved };
            try { budgetListenerStop = window.KohaTools?.getService?.('firebase-budget')?.listenerStart?.(FIREBASE_META.projectId||'unconfigured','shares-recent','rtdb') || null; } catch (_) {}
            recentSharesQuery.on('child_added', listenerAdded);
            recentSharesQuery.on('child_changed', listenerChanged);
            recentSharesQuery.on('child_removed', listenerRemoved);
            firebaseListenersActive = true;
            (function(){})('Écouteurs Firebase attachés');
            addConnectionLogEntry('connected', 'Écouteurs attachés', '');
        } catch (e) {
            (function(){})('Erreur attachement écouteurs:', e);
            addConnectionLogEntry('error', 'Erreur écouteurs', e.message);
        }
    }

    // --- CONNEXION FIREBASE UNIQUEMENT SUR LES SITES AUTORISÉS ---
    var branchCheckAttempts = 0;
    var MAX_BRANCH_CHECK_ATTEMPTS = 20;

    function connectFirebase(retryDelay) {
        retryDelay = retryDelay || 5000;
        addConnectionLogEntry('connecting', 'Connexion Firebase...', 'Tentative de connexion');
        initFirebase().then(function() {
            attachFirebaseListeners();
        }).catch(function(e) {
            (function(){})('Erreur init Firebase, nouvelle tentative dans ' + Math.round(retryDelay / 1000) + 's:', e);
            addConnectionLogEntry('error', 'Reconnexion dans ' + Math.round(retryDelay/1000) + 's', e.message);
            setTimeout(function() {
                connectFirebase(Math.min(retryDelay * 2, 60000));
            }, retryDelay);
        });
    }

    function initFirebaseForAllowedBranch() {
        var branch = getBranchName();

        if (isAllowedBranch(branch)) {
            addConnectionLogEntry('connecting', 'Connexion Firebase...', 'Site autorisé détecté');
            connectFirebase();
            setupDisconnectHandlers();
            return;
        }

        if (!branch && branchCheckAttempts < MAX_BRANCH_CHECK_ATTEMPTS) {
            branchCheckAttempts++;
            setTimeout(initFirebaseForAllowedBranch, 500);
            return;
        }

        (function(){})('Koha Share : site non concerné, connexion Firebase non établie.');
        addConnectionLogEntry('disconnected', 'Site non supporté', 'Site: ' + (branch || 'indéterminé'));
    }

    // --- CONTENEUR DES BADGES ---
    var container = null;
    var activeIntervals = {};

    // --- CHARGEMENT UNIQUEMENT DES DÉPENDANCES DE BASE ---
    loadBaseDependencies().then(function() {
        if (window._KOHA_SHARE_APP_INITIALIZED) {
            (function(){})('Application déjà initialisée.');
            return;
        }
        window._KOHA_SHARE_APP_INITIALIZED = true;

        pageLoadTime = Date.now();
        setTimeout(function() {
            isFirstLoad = false;
        }, 3000);

        initFirebaseForAllowedBranch();

        // --- INJECTION DES STYLES CSS ---
        if (!document.getElementById('koha-share-styles')) {
            var style = document.createElement('style');
            style.id = 'koha-share-styles';
            style.innerHTML = `
                #koha-share-container { position: fixed; bottom: 20px; right: 20px; z-index: 99999; display: flex; flex-direction: column; align-items: flex-end; gap: 8px; max-width: 400px; width: 380px; pointer-events: none; }
                .koha-share-item { pointer-events: auto; width: 100%; display: flex; flex-direction: column; align-items: flex-end; transition: all 0.3s ease; }
                .koha-share-badge { position: relative; background: #2c3e50; color: #fff; padding: 12px 35px 12px 15px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.25); font-family: Arial, sans-serif; font-size: 13px; display: flex; flex-direction: column; animation: slideIn 0.3s ease-out; border-left: 5px solid #007bff; transition: all 0.3s ease; width: 100%; max-height: 800px; overflow: hidden; transform-origin: bottom right; }
                .koha-share-item.minimized .koha-share-badge { max-height: 0 !important; padding: 0 !important; margin: 0 !important; border: none !important; opacity: 0 !important; transform: scale(0.8) translateY(20px); pointer-events: none !important; overflow: hidden !important; }
                .koha-share-toggle { display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; background: #2c3e50; color: #fff; border: none; border-radius: 50%; cursor: pointer; font-size: 18px; box-shadow: 0 2px 10px rgba(0,0,0,0.2); transition: all 0.3s ease; pointer-events: auto; border: 2px solid #007bff; flex-shrink: 0; margin-top: 4px; position: relative; }
                .koha-share-toggle:hover { background: #34495e; transform: scale(1.1); }
                .koha-share-toggle .toggle-icon { transition: transform 0.3s ease; display: block; line-height: 1; }
                .koha-share-toggle .toggle-icon.rotated { transform: rotate(180deg); }
                .koha-share-item:not(.minimized) .koha-share-toggle { display: none !important; }
                .koha-share-item.minimized .koha-share-toggle { display: flex !important; }
                .koha-share-item:has(.koha-share-badge) .koha-share-toggle { display: flex !important; }
                .koha-share-item:not(:has(.koha-share-badge)) { display: none !important; }
                .koha-share-badge.status-trouve { border-left-color: #2ecc71; }
                .koha-share-badge.status-non_trouve { border-left-color: #e74c3c; background: #3a2226; }
                .koha-share-badge.status-transmis { border-left-color: #9b59b6; background: #271f30; }
                .koha-share-badge.status-autre { border-left-color: #f39c12; background: #2c2a1f; }
                .koha-share-badge .share-title { font-weight: bold; margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding-right: 10px; font-size: 14px; }
                .koha-share-badge .share-recipient { font-size: 12px; color: #f1c40f; font-style: italic; margin-bottom: 4px; }
                .koha-share-badge .share-status-text { font-size: 12px; font-weight: bold; margin-bottom: 4px; text-transform: uppercase; }
                .koha-share-badge .share-status-comment { font-size: 11px; font-style: italic; color: #bdc3c7; background: rgba(255,255,255,0.05); padding: 5px; border-radius: 4px; margin-bottom: 6px; border-left: 2px solid #bdc3c7; word-break: break-word; }
                .koha-share-badge .share-note { font-size: 12px; background: rgba(0,0,0,0.2); padding: 6px 8px; border-radius: 4px; margin-bottom: 6px; border-left: 3px solid #e74c3c; word-break: break-word; }
                .koha-share-badge .share-actions { display: flex; justify-content: space-between; align-items: center; margin-top: 5px; gap: 5px; }
                .koha-share-badge .share-status-buttons { display: flex; gap: 4px; margin-top: 5px; flex-wrap: wrap; }
                .koha-share-badge .btn-status { font-size: 10px; padding: 3px 6px; border: none; border-radius: 3px; cursor: pointer; color: white; font-weight: bold; transition: opacity 0.2s; }
                .koha-share-badge .btn-status-trouve { background-color: #2ecc71; }
                .koha-share-badge .btn-status-non_trouve { background-color: #e74c3c; }
                .koha-share-badge .btn-status-transmis { background-color: #9b59b6; }
                .koha-share-badge .btn-status-autre { background-color: #f39c12; }
                .koha-share-badge .btn-status:hover { opacity: 0.8; }
                .koha-share-badge .btn-status.disabled { opacity: 0.4; cursor: not-allowed; }
                .koha-share-badge a { color: #5cb85c; text-decoration: none; font-weight: bold; background: rgba(255,255,255,0.1); padding: 3px 8px; border-radius: 4px; transition: background 0.2s; white-space: nowrap; }
                .koha-share-badge a:hover { background: #5cb85c; color: #fff; }
                .koha-share-badge .share-timer { font-size: 11px; color: #bdc3c7; }
                .koha-share-badge .share-cancel-btn { position: absolute; top: 8px; right: 10px; background: transparent; border: none; color: #e74c3c; font-size: 20px; cursor: pointer; line-height: 1; padding: 0 4px; transition: color 0.2s; font-weight: bold; z-index: 10; width: 24px; height: 24px; display: flex !important; align-items: center; justify-content: center; border-radius: 50%; }
                .koha-share-badge .share-cancel-btn:hover { color: #ff6b6b; background: rgba(231,76,60,0.2); }
                .koha-share-badge .share-usage-counter { font-size: 10px; color: #95a5a6; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 5px; margin-top: 5px; display: flex; justify-content: flex-end; gap: 10px; align-items: center; }
                .koha-share-badge .share-usage-counter span { background: rgba(255,255,255,0.05); padding: 2px 8px; border-radius: 10px; }
                .koha-custom-modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(3px); z-index: 100000; display: none; align-items: center; justify-content: center; opacity: 0; pointer-events: none; transition: opacity 0.2s ease; }
                .koha-custom-modal-overlay.active { opacity: 1; pointer-events: auto; }
                .koha-custom-modal { background: white; padding: 25px; border-radius: 10px; width: 100%; max-width: 440px; box-shadow: 0 10px 25px rgba(0,0,0,0.3); transform: translateY(-20px); transition: transform 0.2s ease; }
                .koha-custom-modal-overlay.active .koha-custom-modal { transform: translateY(0); }
                .koha-custom-modal h3 { margin-top: 0; margin-bottom: 15px; color: #2c3e50; font-size: 18px; border-bottom: 1px solid #eee; padding-bottom: 10px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; }
                .koha-custom-modal h3 .modal-usage-counter { font-size: 12px; color: #95a5a6; font-weight: normal; background: #f0f0f0; padding: 2px 10px; border-radius: 12px; }
                
                .connection-status { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; color: #666; background: #f5f5f5; padding: 3px 10px 3px 6px; border-radius: 12px; cursor: pointer; transition: all 0.2s; position: relative; }
                .connection-status:hover { background: #e8e8e8; transform: scale(1.02); }
                .connection-status .status-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; transition: all 0.3s ease; }
                .connection-status .status-dot.connected { background: #2ecc71; box-shadow: 0 0 6px rgba(46, 204, 113, 0.5); }
                .connection-status .status-dot.disconnected { background: #95a5a6; }
                .connection-status .status-dot.connecting { background: #f39c12; animation: pulse 1s infinite; }
                .connection-status .status-dot.error { background: #e74c3c; box-shadow: 0 0 6px rgba(231, 76, 60, 0.5); }
                .connection-status .status-text { font-size: 10px; color: #777; }
                
                .connection-log-popup { 
                    position: fixed; 
                    bottom: 80px; 
                    right: 20px; 
                    width: 380px; 
                    max-height: 350px; 
                    background: white; 
                    border-radius: 10px; 
                    box-shadow: 0 8px 30px rgba(0,0,0,0.3); 
                    z-index: 100001; 
                    display: none; 
                    flex-direction: column;
                    overflow: hidden;
                    border: 1px solid #e0e0e0;
                }
                .connection-log-popup.visible { display: flex; }
                .connection-log-header { 
                    display: flex; 
                    justify-content: space-between; 
                    align-items: center; 
                    padding: 10px 15px; 
                    background: #2c3e50; 
                    color: white; 
                    border-radius: 10px 10px 0 0;
                    flex-shrink: 0;
                }
                .connection-log-header h4 { 
                    margin: 0; 
                    font-size: 13px; 
                    font-weight: 600;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .connection-log-header .log-actions { 
                    display: flex; 
                    gap: 8px; 
                    align-items: center;
                }
                .connection-log-header .log-actions button {
                    background: rgba(255,255,255,0.15);
                    border: none;
                    color: white;
                    padding: 3px 10px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 11px;
                    transition: background 0.2s;
                }
                .connection-log-header .log-actions button:hover {
                    background: rgba(255,255,255,0.25);
                }
                .connection-log-list {
                    padding: 8px 10px;
                    overflow-y: auto;
                    max-height: 280px;
                    flex: 1;
                }
                .log-empty {
                    text-align: center;
                    color: #999;
                    padding: 20px;
                    font-size: 13px;
                }
                .log-entry {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 4px 6px;
                    font-size: 11px;
                    border-bottom: 1px solid #f0f0f0;
                    font-family: monospace;
                    flex-wrap: wrap;
                }
                .log-entry:last-child { border-bottom: none; }
                .log-entry .log-time { color: #999; font-size: 10px; min-width: 60px; }
                .log-entry .log-icon { font-size: 12px; }
                .log-entry .log-message { color: #333; flex: 1; }
                .log-entry .log-details { color: #666; font-size: 10px; background: #f5f5f5; padding: 1px 6px; border-radius: 3px; }
                .log-entry .log-page { color: #bbb; font-size: 9px; max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
                .log-entry.connected { border-left: 3px solid #2ecc71; padding-left: 8px; }
                .log-entry.disconnected { border-left: 3px solid #95a5a6; padding-left: 8px; }
                .log-entry.connecting { border-left: 3px solid #f39c12; padding-left: 8px; }
                .log-entry.error { border-left: 3px solid #e74c3c; padding-left: 8px; }
                
                @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
                
                .koha-custom-modal label { display: inline-flex; margin-bottom: 6px; font-weight: bold; color: #555; font-size: 13px; }
                .koha-custom-modal input, .koha-custom-modal textarea { width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 5px; box-sizing: border-box; margin-bottom: 15px; font-size: 14px; font-family: Arial, sans-serif; }
                .koha-custom-modal textarea { resize: vertical; min-height: 60px; }
                .koha-custom-modal input:focus, .koha-custom-modal textarea:focus { border-color: #007bff; outline: none; box-shadow: 0 0 5px rgba(0,123,255,0.2); }
                .koha-custom-modal-buttons { display: flex; justify-content: flex-end; gap: 10px; margin-top: 10px; }
                .koha-custom-modal-buttons button { padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 13px; }
                .koha-custom-modal-btn-cancel { background: #e0e0e0; color: #333; }
                .koha-custom-modal-btn-cancel:hover { background: #d5d5d5; }
                .koha-custom-modal-btn-confirm { background: #007bff; color: white; }
                .koha-custom-modal-btn-confirm:hover { background: #0056b3; }
                .koha-custom-modal-btn-confirm.disabled { background: #cccccc; cursor: not-allowed; }
                .btn-share-row { padding: 2px 6px; font-size: 11px; margin-left: 8px; background: #777; color: #fff; border: none; border-radius: 3px; cursor: pointer; vertical-align: middle; transition: background 0.2s; }
                .btn-share-row:hover { background: #555; color: #fff; }
                @keyframes slideIn { from { transform: translateX(120%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
                h1 #koha-share-btn { font-size: 14px; padding: 5px 10px; vertical-align: middle; margin-left: 15px; font-weight: normal; }
                .share-created-by { font-size: 10px; color: #95a5a6; margin-top: 3px; display: flex; align-items: center; gap: 5px; }
                .share-created-by .creator-badge { background: rgba(255,255,255,0.1); padding: 1px 8px; border-radius: 10px; font-size: 9px; }
                .koha-autre-modal textarea { width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 5px; box-sizing: border-box; margin-bottom: 15px; font-size: 14px; font-family: Arial, sans-serif; resize: vertical; min-height: 80px; }
                .koha-autre-modal textarea:focus { border-color: #f39c12; outline: none; box-shadow: 0 0 5px rgba(243,156,18,0.3); }
            `;
            document.head.appendChild(style);
        }

        // --- CRÉATION DU CONTENEUR ---
        container = document.getElementById('koha-share-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'koha-share-container';
            document.body.appendChild(container);
        }

        // --- INJECTION DU POPUP DE LOG DE CONNEXION ---
        if (!document.getElementById('connectionLogPopup')) {
            var logPopup = document.createElement('div');
            logPopup.className = 'connection-log-popup';
            logPopup.id = 'connectionLogPopup';
            logPopup.innerHTML = `
                <div class="connection-log-header">
                    <h4>🔌 Historique des connexions</h4>
                    <div class="log-actions">
                        <button id="clearLogBtn" title="Effacer l'historique">🗑️ Effacer</button>
                        <button id="closeLogBtn" title="Fermer">✕</button>
                    </div>
                </div>
                <div class="connection-log-list"></div>
            `;
            document.body.appendChild(logPopup);
            connectionLogElement = logPopup;

            document.getElementById('closeLogBtn').addEventListener('click', function(e) {
                e.stopPropagation();
                connectionLogVisible = false;
                connectionLogElement.classList.remove('visible');
            });

            document.getElementById('clearLogBtn').addEventListener('click', function(e) {
                e.stopPropagation();
                if (confirm('Effacer tout l\'historique de connexion ?')) {
                    clearConnectionLog();
                }
            });

            document.addEventListener('click', function(e) {
                if (connectionLogVisible && connectionLogElement) {
                    var isClickInside = connectionLogElement.contains(e.target) || (connectionStatusElement && connectionStatusElement.contains(e.target));
                    if (!isClickInside) {
                        connectionLogVisible = false;
                        connectionLogElement.classList.remove('visible');
                    }
                }
            });
        }

        // --- INJECTION DES MODALES ---
        if (!document.getElementById('kohaShareModalOverlay')) {
            var modalOverlay = document.createElement('div');
            modalOverlay.className = 'koha-custom-modal-overlay';
            modalOverlay.id = 'kohaShareModalOverlay';
            modalOverlay.innerHTML = `
                <div class="koha-custom-modal">
                    <h3>
                        <i class="fa fa-share-alt"></i> Partager cette page
                        <span style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
                            <span class="modal-usage-counter" id="modalUsageCounter">📊 Chargement...</span>
                            <span class="connection-status" id="connectionStatus">
                                <span class="status-dot disconnected"></span>
                                <span class="status-text">Déconnecté</span>
                            </span>
                        </span>
                    </h3>
                    <label for="kohaShareRecipient">Destinataire (optionnel) :</label>
                    <input type="text" id="kohaShareRecipient" placeholder="Ex: Bureau, Accueil, Prénom...">
                    <label for="kohaShareNote">Informations supplémentaires (optionnel) :</label>
                    <textarea id="kohaShareNote" placeholder="Ex: A rechercher pour le comptoir, ..."></textarea>

                    <div class="koha-custom-modal-buttons">
                        <button type="button" class="koha-custom-modal-btn-cancel" id="kohaModalCancel">Annuler</button>
                        <button type="button" class="koha-custom-modal-btn-confirm" id="kohaModalConfirm">Partager</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modalOverlay);
            
            connectionStatusElement = document.getElementById('connectionStatus');
            if (connectionStatusElement) {
                connectionStatusElement.addEventListener('click', toggleConnectionLog);
            }
        }

        if (!document.getElementById('kohaStatusModalOverlay')) {
            var statusModalOverlay = document.createElement('div');
            statusModalOverlay.className = 'koha-custom-modal-overlay';
            statusModalOverlay.id = 'kohaStatusModalOverlay';
            statusModalOverlay.innerHTML = `
                <div class="koha-custom-modal">
                    <h3 id="kohaStatusModalTitle"><i class="fa fa-info-circle"></i> Mettre à jour le statut</h3>
                    <label for="kohaStatusComment">Ajouter un commentaire :</label>
                    <textarea id="kohaStatusComment" placeholder="Ex: Rangé dans le mauvais rayon..."></textarea>
                    <div class="koha-custom-modal-buttons">
                        <button type="button" class="koha-custom-modal-btn-cancel" id="kohaStatusModalCancel">Annuler</button>
                        <button type="button" class="koha-custom-modal-btn-confirm" id="kohaStatusModalConfirm">Valider</button>
                    </div>
                </div>
            `;
            document.body.appendChild(statusModalOverlay);
        }

        if (!document.getElementById('kohaAutreModalOverlay')) {
            var autreModalOverlay = document.createElement('div');
            autreModalOverlay.className = 'koha-custom-modal-overlay';
            autreModalOverlay.id = 'kohaAutreModalOverlay';
            autreModalOverlay.innerHTML = `
                <div class="koha-custom-modal koha-autre-modal">
                    <h3 id="kohaAutreModalTitle"><i class="fa fa-tag"></i> Statut personnalisé</h3>
                    <label for="kohaAutreComment">Décrivez le statut :</label>
                    <textarea id="kohaAutreComment" placeholder="Ex: En attente de validation..."></textarea>
                    <div class="koha-custom-modal-buttons">
                        <button type="button" class="koha-custom-modal-btn-cancel" id="kohaAutreModalCancel">Annuler</button>
                        <button type="button" class="koha-custom-modal-btn-confirm" id="kohaAutreModalConfirm">Valider</button>
                    </div>
                </div>
            `;
            document.body.appendChild(autreModalOverlay);
        }

        // --- RÉFÉRENCES ---
        var modalOverlay = document.getElementById('kohaShareModalOverlay');
        var modalInput = document.getElementById('kohaShareRecipient');
        var modalNote = document.getElementById('kohaShareNote');
        var btnCancel = document.getElementById('kohaModalCancel');
        var btnConfirm = document.getElementById('kohaModalConfirm');

        var statusModalOverlay = document.getElementById('kohaStatusModalOverlay');
        var statusModalComment = document.getElementById('kohaStatusComment');
        var btnStatusCancel = document.getElementById('kohaStatusModalCancel');
        var btnStatusConfirm = document.getElementById('kohaStatusModalConfirm');
        var statusModalTitle = document.getElementById('kohaStatusModalTitle');

        var autreModalOverlay = document.getElementById('kohaAutreModalOverlay');
        var autreModalComment = document.getElementById('kohaAutreComment');
        var btnAutreCancel = document.getElementById('kohaAutreModalCancel');
        var btnAutreConfirm = document.getElementById('kohaAutreModalConfirm');
        var autreModalTitle = document.getElementById('kohaAutreModalTitle');

        if (!connectionStatusElement) {
            connectionStatusElement = document.getElementById('connectionStatus');
            if (connectionStatusElement) {
                connectionStatusElement.addEventListener('click', toggleConnectionLog);
            }
        }
        if (!connectionLogElement) {
            connectionLogElement = document.getElementById('connectionLogPopup');
        }

        var currentStatusTargetKey = null;
        var currentStatusTargetValue = null;
        var lastTitleGenerated = "Page Koha";

        // --- FERMETURE MODALS ---
        function closeModal() {
            modalOverlay.classList.remove('active');
            modalOverlay.style.display = 'none';
            modalOverlay.style.opacity = '0';
            modalInput.value = '';
            modalNote.value = '';
            btnConfirm.classList.remove('disabled');
            isProcessing = false;
        }

        function closeStatusModal() {
            statusModalOverlay.classList.remove('active');
            statusModalOverlay.style.display = 'none';
            statusModalComment.value = '';
            currentStatusTargetKey = null;
            currentStatusTargetValue = null;
        }

        function closeAutreModal() {
            autreModalOverlay.classList.remove('active');
            autreModalOverlay.style.display = 'none';
            autreModalComment.value = '';
            currentStatusTargetKey = null;
            currentStatusTargetValue = null;
        }

        btnCancel.onclick = function(e) {
            e.preventDefault();
            isProcessing = false;
            closeModal();
        };
        modalOverlay.onclick = function(e) {
            if (e.target === modalOverlay) {
                isProcessing = false;
                closeModal();
            }
        };
        btnStatusCancel.onclick = function(e) {
            e.preventDefault();
            closeStatusModal();
        };
        statusModalOverlay.onclick = function(e) {
            if (e.target === statusModalOverlay) {
                closeStatusModal();
            }
        };
        btnAutreCancel.onclick = function(e) {
            e.preventDefault();
            closeAutreModal();
        };
        autreModalOverlay.onclick = function(e) {
            if (e.target === autreModalOverlay) {
                closeAutreModal();
            }
        };

        // --- TITRE ---
        function generatePageTitle() {
            var nameHeader = document.querySelector('#main_moremember h1, #main_moremember h3, .main h1, .main h3, #patron-template h1');
            var cleanName = "";
            if (nameHeader) {
                cleanName = nameHeader.textContent.replace("Partage interne", "").trim().substring(0, 30);
            } else {
                cleanName = "Lecteur";
            }
            if (path.indexOf('moremember.pl') !== -1) {
                return "Fiche: " + cleanName;
            }
            if (path.indexOf('circulation.pl') !== -1) {
                return "Prêt: " + cleanName;
            }
            if (path.indexOf('readingrec.pl') !== -1) {
                return "Hist. Lecture: " + cleanName;
            }
            if (path.indexOf('holdshistory.pl') !== -1) {
                return "Hist. Réserv.: " + cleanName;
            }
            if (path.indexOf('notices.pl') !== -1) {
                return "Notifications: " + cleanName;
            }
            if (path.indexOf('search.pl') !== -1) {
                var params = new URLSearchParams(window.location.search);
                var q = params.get('q');
                if (q) {
                    return "Recherche: " + q;
                } else {
                    return "Recherche: Catalogue";
                }
            }
            if (path.indexOf('addbiblio.pl') !== -1) {
                var biblioNum = new URLSearchParams(window.location.search).get('biblionumber');
                if (biblioNum) {
                    return "Modif. Notice #" + biblioNum;
                } else {
                    return "Nouvelle Notice";
                }
            }
            if (path.indexOf('additem.pl') !== -1) {
                var h1Element = document.querySelector('h1');
                if (h1Element) {
                    var cleanText = h1Element.textContent.replace("Partage interne", "").trim();
                    return cleanText.substring(0, 45) + "...";
                }
                return "Modif. Exemplaires";
            }
            if (path.indexOf('request.pl') !== -1) {
                return "Gestion Réservations";
            }
            var titleElement = document.querySelector('.title, h1, h2');
            if (titleElement) {
                return titleElement.textContent.replace("Partage interne", "").trim().substring(0, 30) + '...';
            } else {
                var biblio = new URLSearchParams(window.location.search).get('biblionumber');
                if (biblio) {
                    return 'Notice #' + biblio;
                } else {
                    return 'Page Koha';
                }
            }
        }

        // --- BOUTONS D'INJECTION ---
        function injectMainButton() {
            if (document.getElementById('koha-share-btn')) {
                return;
            }
            var target = null;
            if (path.indexOf('detail.pl') !== -1) {
                target = document.getElementById('toolbar');
            } else if (path.indexOf('search.pl') !== -1) {
                target = document.getElementById('selection_ops');
            } else if (path.indexOf('moremember.pl') !== -1 || path.indexOf('circulation.pl') !== -1 ||
                     path.indexOf('readingrec.pl') !== -1 || path.indexOf('holdshistory.pl') !== -1 ||
                     path.indexOf('notices.pl') !== -1) {
                target = document.querySelector('#toolbar.btn-toolbar');
            } else if (path.indexOf('additem.pl') !== -1) {
                target = document.querySelector('h1');
            } else if (path.indexOf('addbiblio.pl') !== -1) {
                target = document.getElementById('toolbar') || document.querySelector('.main-toolbar') || document.querySelector('#breadcrumbs');
            }
            if (target && !target.querySelector('#koha-share-btn')) {
                var shareBtn = document.createElement('a');
                shareBtn.id = 'koha-share-btn';
                shareBtn.href = '#';
                shareBtn.className = buttonClass;
                shareBtn.innerHTML = '<i class="fa fa-share-alt" aria-hidden="true"></i> Partage interne';
                target.appendChild(shareBtn);
                shareBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    if (isProcessing) {
                        return;
                    }
                    
                    // Mettre à jour le statut avant d'ouvrir le modal
                    if (isFirebaseConnected) {
                        updateConnectionStatus('connected', 'Connecté');
                    } else if (isFirebaseInitializing) {
                        updateConnectionStatus('connecting', 'Connexion en cours...');
                    } else {
                        updateConnectionStatus('disconnected', 'Déconnecté');
                    }
                    
                    lastTitleGenerated = generatePageTitle();
                    updateUsageCounterDisplay();
                    modalOverlay.style.display = 'flex';
                    modalOverlay.classList.add('active');
                    modalOverlay.style.opacity = '1';
                    modalInput.focus();
                });
            }
        }

        function injectReservationButtons() {
            if (path.indexOf('request.pl') === -1) {
                return;
            }
            var allRows = document.querySelectorAll('table tbody tr');
            if (allRows.length === 0) {
                return;
            }
            for (var i = 0; i < allRows.length; i++) {
                var row = allRows[i];
                if (row.querySelector('.btn-share-row')) {
                    continue;
                }
                var firstTd = row.cells[0];
                var patronLink = row.querySelector('a[href*="moremember.pl"]');
                if (firstTd && patronLink) {
                    var patronName = patronLink.textContent.trim();
                    var rowBtn = document.createElement('button');
                    rowBtn.type = 'button';
                    rowBtn.className = 'btn-share-row';
                    rowBtn.innerHTML = '<i class="fa fa-share-alt"></i>';
                    rowBtn.title = 'Partage interne : ' + patronName;
                    firstTd.appendChild(rowBtn);
                    rowBtn.addEventListener('click', function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        if (isProcessing) {
                            return;
                        }
                        
                        // Mettre à jour le statut avant d'ouvrir le modal
                        if (isFirebaseConnected) {
                            updateConnectionStatus('connected', 'Connecté');
                        } else if (isFirebaseInitializing) {
                            updateConnectionStatus('connecting', 'Connexion en cours...');
                        } else {
                            updateConnectionStatus('disconnected', 'Déconnecté');
                        }
                        
                        var currentRow = this.closest('tr');
                        var patronName = currentRow.querySelector('a[href*="moremember.pl"]').textContent.trim();
                        lastTitleGenerated = 'Réservation : ' + patronName;
                        updateUsageCounterDisplay();
                        var priorityBadge = currentRow.querySelector('.current_priority');
                        var priority = '1';
                        if (priorityBadge) {
                            priority = priorityBadge.textContent.trim();
                        }
                        modalNote.value = 'Lecteur : ' + patronName + '\nPriorité/Statut : ' + priority;
                        modalOverlay.style.display = 'flex';
                        modalOverlay.classList.add('active');
                        modalOverlay.style.opacity = '1';
                        modalInput.focus();
                    });
                }
            }
        }

        var injectionInterval = null;
        function startInjection() {
            if (injectionInterval) {
                return;
            }
            injectionInterval = setInterval(function() {
                var branchName = getBranchName();
                if (isAllowedBranch(branchName)) {
                    injectMainButton();
                    injectReservationButtons();
                }
            }, 1000);
        }
        startInjection();

        // --- EXECUTE SHARE ---
        var executeShare = function(customTitle, currentBtn) {
            if (isProcessing) {
                return;
            }
            isProcessing = true;

            var recipient = modalInput.value.trim();
            var note = modalNote.value.trim();
            var userId = getCurrentUserId();

            btnConfirm.classList.add('disabled');
            var originalBtnHtml = '';
            if (currentBtn) {
                originalBtnHtml = currentBtn.innerHTML;
                currentBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Envoi...';
            }

            (function() {
                var promise;
                if (!firebaseApp || !isFirebaseConnected) {
                    updateConnectionStatus('connecting', 'Connexion en cours...');
                    promise = initFirebase();
                } else {
                    promise = Promise.resolve();
                }
                promise.then(function() {
                    updateConnectionStatus('connected', 'Connecté');
                    return incrementUsageCount(database);
                }).then(function() {
                    closeModal();
                    var newShare = {
                        url: window.location.href,
                        title: customTitle,
                        recipient: recipient || null,
                        note: note || null,
                        status: "en_attente",
                        statusComment: null,
                        sender: getBranchName() || "Inconnu",
                        createdBy: userId,
                        timestamp: firebase.database.ServerValue.TIMESTAMP,
                        usageCount: globalUsageCount
                    };

                    sharesRef.push(newShare, function(error) {
                        isProcessing = false;
                        if (error) {
                            alert("Erreur de base de données : " + error.message);
                            if (currentBtn) {
                                currentBtn.innerHTML = originalBtnHtml;
                            }
                        } else if (currentBtn) {
                            currentBtn.innerHTML = '<i class="fa fa-check" style="color: green;"></i> Partagé !';
                            currentBtn.classList.add('disabled');
                            setTimeout(function() {
                                currentBtn.innerHTML = originalBtnHtml;
                                currentBtn.classList.remove('disabled');
                            }, 3000);
                        }
                    });
                }).catch(function(error) {
                    (function(){})('Erreur executeShare:', error);
                    isProcessing = false;
                    updateConnectionStatus('error', 'Erreur');
                    if (currentBtn) {
                        currentBtn.innerHTML = originalBtnHtml;
                    }
                    alert('Erreur de connexion: ' + error.message);
                });
            })();
        };

        btnConfirm.addEventListener('click', function() {
            executeShare(lastTitleGenerated, document.getElementById('koha-share-btn'));
        });
        modalInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                executeShare(lastTitleGenerated, document.getElementById('koha-share-btn'));
            }
        });

        // --- STATUT ---
        btnStatusConfirm.onclick = function() {
            if (currentStatusTargetKey && currentStatusTargetValue) {
                (function() {
                    var promise;
                    if (!firebaseApp || !isFirebaseConnected) {
                        promise = initFirebase();
                    } else {
                        promise = Promise.resolve();
                    }
                    promise.then(function() {
                        var comment = statusModalComment.value.trim();
                        sharesRef.child(currentStatusTargetKey).update({
                            status: currentStatusTargetValue,
                            statusComment: comment || null
                        }, function(error) {
                            if (error) {
                                alert("Erreur: " + error.message);
                            }
                            closeStatusModal();
                        });
                    }).catch(function(error) {
                        alert('Erreur de connexion: ' + error.message);
                    });
                })();
            }
        };

        btnAutreConfirm.onclick = function() {
            if (currentStatusTargetKey) {
                var comment = autreModalComment.value.trim();
                if (!comment) {
                    alert("Veuillez décrire le statut.");
                    return;
                }
                (function() {
                    var promise;
                    if (!firebaseApp || !isFirebaseConnected) {
                        promise = initFirebase();
                    } else {
                        promise = Promise.resolve();
                    }
                    promise.then(function() {
                        sharesRef.child(currentStatusTargetKey).update({
                            status: "autre",
                            statusComment: comment
                        }, function(error) {
                            if (error) {
                                alert("Erreur: " + error.message);
                            }
                            closeAutreModal();
                        });
                    }).catch(function(error) {
                        alert('Erreur de connexion: ' + error.message);
                    });
                })();
            }
        };

        autreModalComment.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                btnAutreConfirm.click();
            }
        });

        statusModalComment.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                btnStatusConfirm.click();
            }
        });

        // --- NETTOYAGE ---
        window.addEventListener('beforeunload', function() {
            if (injectionInterval) {
                clearInterval(injectionInterval);
                injectionInterval = null;
            }
            disconnectFirebase();
        });

    }).catch(function(error) {
        (function(){})('Erreur de chargement:', error);
        window._KOHA_SHARE_INITIALIZED = false;
        window._KOHA_SHARE_APP_INITIALIZED = false;
    });
})();


},destroy:function(){return false;},onConfigChange:function(){return {reloadRequired:true};}};
KT.registerModule(runtime);if(CFG.mode==="shadow"){KT.record({module:MODULE_ID,level:"info",kind:"shadow-exact-parity-sealed",sources:runtime.sourceFiles});return;}runtime.init();
})();