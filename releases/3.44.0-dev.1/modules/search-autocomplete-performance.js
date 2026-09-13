(function(){"use strict";
const KT=window.KohaTools;if(!KT||!KT.Config)return;
const MODULE_ID='search-autocomplete-performance',CFG=KT.Config.getCanonical(MODULE_ID),Scope=KT.getService&&KT.getService("scope");
if(!CFG||!CFG.enabled||!["shadow","live"].includes(CFG.mode))return;
if(Scope&&!Scope.match(CFG.general&&CFG.general.scope).ok)return;
const runtime={
 id:MODULE_ID,
 description:'Autocomplétion catalogue Koha complète, avec enrichissement disponibilité/couverture piloté par une file concurrente, cache et annulation des recherches obsolètes.',
 sourceFiles:['113-autocomplete-elestic.js'],
 parity:"exact-legacy",
 reloadRequiredOnConfigChange:true,
 init:function(){
   if(window["__KT_PARITY_"+MODULE_ID])return;
   window["__KT_PARITY_"+MODULE_ID]=true;
   
/* ===== EXACT LEGACY SOURCE: 113-autocomplete-elestic.js ===== */
(function ($) {
    'use strict';

    // Évite toute double initialisation si le fichier est injecté deux fois.
    if (window.__kxCatalogAutocompleteV2) return;
    window.__kxCatalogAutocompleteV2 = true;

    $(function () {
        var $input = $('#search-form');
        if (!$input.length || typeof $input.autocomplete !== 'function') return;

        var currentBranch = $('.logged-in-branch-code').attr('data-logged-in-branch-code') || '';
        var RESULTS_COUNT = 20;
        var AUTO_ENRICH_COUNT = 8;

        var searchGeneration = 0;
        var activeSearchXhr = null;
        var activeEnrichmentXhr = null;
        var enrichmentQueue = [];
        var enrichmentRunning = false;
        var queuedEnrichmentKeys = new Set();
        var currentItemMap = new Map();

        try {
            $input.autocomplete('destroy');
        } catch (e) {
            // Pas de widget existant : rien à faire.
        }

        // ---------------------------------------------------------------------
        // CSS strictement cloisonné au menu de CET autocomplete.
        // ---------------------------------------------------------------------
        if (!document.getElementById('kx-catalog-autocomplete-styles')) {
            $('<style>', { id: 'kx-catalog-autocomplete-styles', type: 'text/css' })
                .text(`
                    .kx-catalog-autocomplete {
                        max-height: 500px;
                        overflow-y: auto;
                        overflow-x: hidden;
                        z-index: 10000;
                    }
                    .kx-catalog-autocomplete .autocomplete-item {
                        display: flex;
                        align-items: flex-start;
                        gap: 10px;
                        padding: 6px 10px;
                        border-bottom: 1px solid #eee;
                        color: inherit;
                        text-decoration: none;
                    }
                    .kx-catalog-autocomplete .autocomplete-item .ac-cover-zone {
                        width: 40px;
                        height: 55px;
                        flex-shrink: 0;
                        background: #e8e8e8;
                        border: 1px solid #ddd;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 0.6em;
                        color: #999;
                        text-align: center;
                        overflow: hidden;
                    }
                    .kx-catalog-autocomplete .autocomplete-item .ac-cover-zone img {
                        width: 100%;
                        height: 100%;
                        object-fit: cover;
                        cursor: zoom-in;
                    }
                    .kx-catalog-autocomplete .autocomplete-item .ac-text {
                        display: flex;
                        flex-direction: column;
                        min-width: 0;
                        flex: 1;
                    }
                    .kx-catalog-autocomplete .autocomplete-item .ac-title-row {
                        display: flex;
                        align-items: center;
                        gap: 6px;
                    }
                    .kx-catalog-autocomplete .autocomplete-item .ac-title {
                        font-weight: bold;
                        color: #2c3e50;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                    }
                    .kx-catalog-autocomplete .autocomplete-item .ac-author {
                        font-size: 0.9em;
                        color: #555;
                    }
                    .kx-catalog-autocomplete .autocomplete-item .ac-meta {
                        font-size: 0.8em;
                        color: #999;
                    }
                    .kx-catalog-autocomplete .ac-menu-actions {
                        position: sticky;
                        top: 0;
                        z-index: 2;
                        background: white;
                        padding: 6px 0 0 0;
                        border-bottom: 1px solid #eee;
                    }
                    .kx-catalog-autocomplete .ac-info-banner {
                        margin: 0 10px 8px 10px;
                        padding: 6px 8px;
                        border-left: 3px solid #f0b429;
                        background: #fff8e1;
                        color: #8a6d3b;
                        font-size: 0.8em;
                        line-height: 1.35;
                        border-radius: 3px;
                    }
                    .kx-catalog-autocomplete .ac-zones-list {
                        margin: 0 10px 8px 10px;
                        padding: 0 0 0 18px;
                        font-size: 0.8em;
                        color: #6b7280;
                    }
                    .kx-catalog-autocomplete .ac-zones-list li {
                        margin: 2px 0;
                    }
                    .kx-catalog-autocomplete .ac-search-form {
                        margin: 0 10px 8px 10px;
                    }
                    .kx-catalog-autocomplete .ac-search-cta {
                        display: block;
                        width: 100%;
                        padding: 7px 10px;
                        text-align: center;
                        border: 1px solid #c7d2fe;
                        background: #eef2ff;
                        color: #4338ca;
                        border-radius: 4px;
                        text-decoration: none;
                        font-size: 0.85em;
                        cursor: pointer;
                    }
                    .kx-catalog-autocomplete .ac-search-cta:hover {
                        background: #e0e7ff;
                        color: #312e81;
                    }
                    .kx-catalog-autocomplete .ac-empty-state {
                        display: none !important;
                    }
                    .kx-catalog-autocomplete .ac-avail-dot {
                        display: inline-block;
                        width: 9px;
                        height: 9px;
                        border-radius: 50%;
                        flex-shrink: 0;
                    }
                    .kx-catalog-autocomplete .ac-avail-dot.available { background-color: #2ecc71; }
                    .kx-catalog-autocomplete .ac-avail-dot.unavailable { background-color: #e74c3c; }
                    .kx-catalog-autocomplete .ac-avail-dot.loading { background-color: #ccc; }
                    .kx-catalog-autocomplete .ac-avail-label {
                        font-size: 0.75em;
                        margin-top: 2px;
                    }
                    .kx-catalog-autocomplete .ac-avail-label.available { color: #27ae60; }
                    .kx-catalog-autocomplete .ac-avail-label.unavailable { color: #c0392b; }
                    .kx-catalog-autocomplete .ac-avail-label.deferred { color: #6b7280; }
                    .kx-catalog-autocomplete .ac-callnumber {
                        font-size: 0.75em;
                        color: #6b7280;
                        margin-top: 2px;
                    }
                    .kx-catalog-autocomplete .ui-menu-item:hover .autocomplete-item {
                        background-color: #f0f7ff;
                    }
                    #ac-cover-preview {
                        position: fixed;
                        display: none;
                        z-index: 20000;
                        border: 3px solid #fff;
                        box-shadow: 0 4px 20px rgba(0,0,0,0.35);
                        border-radius: 4px;
                        pointer-events: none;
                        max-width: 220px;
                        max-height: 320px;
                    }
                    #ac-cover-preview img {
                        display: block;
                        max-width: 220px;
                        max-height: 320px;
                        border-radius: 2px;
                    }
                `)
                .appendTo('head');
        }

        // ---------------------------------------------------------------------
        // Aperçu agrandi des couvertures.
        // ---------------------------------------------------------------------
        if (!$('#ac-cover-preview').length) {
            $('<div>', { id: 'ac-cover-preview' }).append($('<img>', { alt: '' })).appendTo('body');
        }
        var $preview = $('#ac-cover-preview');
        var $previewImg = $preview.find('img');

        $(document)
            .off('.kxCatalogCoverPreview')
            .on('mouseenter.kxCatalogCoverPreview', '.kx-catalog-autocomplete .ac-cover-zone img', function () {
                var src = $(this).attr('src');
                if (!src) return;
                $previewImg.attr('src', src);
                $preview.show();
                positionPreviewNextTo($(this));
            })
            .on('mouseleave.kxCatalogCoverPreview', '.kx-catalog-autocomplete .ac-cover-zone img', function () {
                $preview.hide();
            });

        function positionPreviewNextTo($thumbnail) {
            var rect = $thumbnail[0].getBoundingClientRect();
            var previewWidth = 220;
            var previewHeight = 320;
            var offset = 10;
            var left = rect.right + offset;
            var top = rect.top;

            if (left + previewWidth > window.innerWidth) {
                left = rect.left - previewWidth - offset;
            }
            if (top + previewHeight > window.innerHeight) {
                top = Math.max(0, window.innerHeight - previewHeight - offset);
            }

            $preview.css({ left: left + 'px', top: top + 'px' });
        }

        // ---------------------------------------------------------------------
        // Utilitaires texte / ISBN.
        // ---------------------------------------------------------------------
        function normalizeText(value) {
            return (value == null ? '' : String(value))
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .toLowerCase()
                .trim();
        }

        function digitsOnly(value) {
            return (value == null ? '' : String(value)).replace(/[^0-9Xx]/g, '').toUpperCase();
        }

        // Seuls les ISBN-13 commençant par 978 sont convertibles en ISBN-10.
        function isbn13to10(isbn13) {
            var clean = digitsOnly(isbn13).replace(/X/g, '');
            if (!/^978\d{10}$/.test(clean)) return null;

            var core = clean.substring(3, 12);
            var sum = 0;
            for (var i = 0; i < 9; i++) {
                sum += (10 - i) * parseInt(core[i], 10);
            }
            var check = (11 - (sum % 11)) % 11;
            var checkChar = check === 10 ? 'X' : String(check);
            return core + checkChar;
        }

        // ---------------------------------------------------------------------
        // Mapping index Koha -> champs de l'API /biblios.
        // ---------------------------------------------------------------------
        var INDEX_FIELD_MAP = {
            'kw': null,
            'au': ['author'],
            'pn': ['author'],
            'ti': ['title', 'unititle'],
            'se': ['title'],
            'nb': ['isbn'],
            'ns': ['issn'],
            'pb': ['publisher'],
            'pl': ['publication_place'],
            'nt': ['notes'],
            'callnum': ['cn_sort'],
            'yr': ['publication_year']
        };

        function buildQueryConditions(terms, idxValue) {
            var baseIdx = (idxValue || 'kw').split(',')[0];
            var fields = INDEX_FIELD_MAP[baseIdx];

            return terms.map(function (word) {
                if (fields) {
                    return {
                        '-or': fields.map(function (f) {
                            var cond = {};
                            cond['me.' + f] = { '-like': '%' + word + '%' };
                            return cond;
                        })
                    };
                }

                return {
                    '-or': [
                        { 'me.title': { '-like': '%' + word + '%' } },
                        { 'me.author': { '-like': '%' + word + '%' } },
                        { 'me.unititle': { '-like': '%' + word + '%' } }
                    ]
                };
            });
        }

        // ---------------------------------------------------------------------
        // Classement local : on conserve les pondérations existantes et on
        // ajoute seulement des bonus de pertinence à coût serveur nul.
        // ---------------------------------------------------------------------
        function scoreResult(item, terms, rawQuery) {
            var score = 0;
            var normalizedQuery = normalizeText(rawQuery);
            var title = normalizeText(item.title);
            var author = normalizeText(item.author);
            var unititle = normalizeText(item.unititle);
            var isbn = digitsOnly(item.isbn);
            var ean = digitsOnly(item.ean);
            var queryDigits = digitsOnly(rawQuery);

            var haystacks = [
                { value: item.title || '', weight: 120 },
                { value: item.author || '', weight: 90 },
                { value: item.unititle || '', weight: 70 },
                { value: item.publisher || '', weight: 35 },
                { value: item.publication_year || '', weight: 15 },
                { value: item.item_type || '', weight: 10 },
                { value: item.isbn || '', weight: 25 },
                { value: item.ean || '', weight: 25 }
            ];

            terms.forEach(function (term) {
                var normalizedTerm = normalizeText(term);
                haystacks.forEach(function (entry) {
                    var value = normalizeText(entry.value);
                    if (value && value.indexOf(normalizedTerm) !== -1) {
                        score += entry.weight;
                    }
                });
            });

            if (normalizedQuery) {
                if (title === normalizedQuery) score += 900;
                else if (title.indexOf(normalizedQuery) === 0) score += 500;
                else if (title.indexOf(normalizedQuery) !== -1) score += 220;

                if (author === normalizedQuery) score += 650;
                else if (author.indexOf(normalizedQuery) === 0) score += 350;

                if (unititle === normalizedQuery) score += 400;

                var allTermsInTitle = terms.length > 1 && terms.every(function (term) {
                    return title.indexOf(normalizeText(term)) !== -1;
                });
                if (allTermsInTitle) score += 350;
            }

            if (queryDigits.length >= 8) {
                if (isbn && queryDigits === isbn) score += 1200;
                if (ean && queryDigits === ean) score += 1200;
            }

            return score;
        }

        function sortResults(items, terms, rawQuery) {
            return items.slice().sort(function (a, b) {
                var scoreA = scoreResult(a, terms, rawQuery);
                var scoreB = scoreResult(b, terms, rawQuery);
                if (scoreA !== scoreB) return scoreB - scoreA;
                return (a.title || '').localeCompare(b.title || '', 'fr', { sensitivity: 'base' });
            });
        }

        // ---------------------------------------------------------------------
        // DISPONIBILITÉ : logique volontairement INCHANGÉE à la demande.
        // ---------------------------------------------------------------------
        function isItemAvailable(item) {
            return item.not_for_loan_status === 0 &&
                   !item.checked_out_date &&
                   item.lost_status === 0 &&
                   item.withdrawn === 0;
        }

        function getItemCallnumber(item) {
            return item.itemcallnumber || item.callnumber || item.call_num || item.cn_sort || item.cote || '';
        }

        // La logique de disponibilité ne change pas ; seule la cote choisie devient
        // plus utile : disponible ici > disponible ailleurs > première cote connue.
        function chooseBestCallnumber(items) {
            var i;
            var candidate;

            for (i = 0; i < items.length; i++) {
                candidate = getItemCallnumber(items[i]);
                if (candidate && isItemAvailable(items[i]) && items[i].holding_library_id === currentBranch) {
                    return candidate;
                }
            }

            for (i = 0; i < items.length; i++) {
                candidate = getItemCallnumber(items[i]);
                if (candidate && isItemAvailable(items[i])) {
                    return candidate;
                }
            }

            for (i = 0; i < items.length; i++) {
                candidate = getItemCallnumber(items[i]);
                if (candidate) return candidate;
            }

            return '';
        }

        function getAutocompleteMenu() {
            try {
                return $input.autocomplete('widget').addClass('kx-catalog-autocomplete');
            } catch (e) {
                return $();
            }
        }

        function findRenderedRow(biblioId) {
            return getAutocompleteMenu().find('li[data-kx-biblio-id="' + String(biblioId) + '"]');
        }

        function renderCoverImage($zone, url) {
            $zone.empty();
            var $img = $('<img>', { src: url, alt: 'Couverture' });
            $img.on('error', function () {
                $zone.text('Pas de couverture');
            });
            $zone.append($img);
        }

        function useFallbackCover($zone, item) {
            if (item.fallback_url) renderCoverImage($zone, item.fallback_url);
            else $zone.text('Pas de couverture');
        }

        // ---------------------------------------------------------------------
        // Enrichissement en DEUX PASSES, mais avec UNE SEULE requête active.
        //
        // Priorité absolue :
        //   1. disponibilité + cote pour les résultats demandés ;
        //   2. couvertures seulement lorsqu'aucune disponibilité n'attend.
        //
        // Ainsi une couverture Electre lente ne retarde plus la vérification
        // de disponibilité des résultats suivants.
        // ---------------------------------------------------------------------
        function resetEnrichmentQueue() {
            enrichmentQueue = [];
            queuedEnrichmentKeys.clear();
            enrichmentRunning = false;

            if (activeEnrichmentXhr && typeof activeEnrichmentXhr.abort === 'function') {
                try { activeEnrichmentXhr.abort(); } catch (e) {}
            }
            activeEnrichmentXhr = null;
        }

        function queueKey(type, generation, biblioId) {
            return type + ':' + generation + ':' + biblioId;
        }

        function enqueueAvailability(item, generation, priority) {
            if (!item || !item.biblio_id || generation !== searchGeneration) return;

            var $row = findRenderedRow(item.biblio_id);
            if (!$row.length) return;

            // Si la disponibilité est déjà connue, on peut simplement demander
            // la couverture si elle manque.
            if ($row.attr('data-kx-availability-loaded') === '1') {
                enqueueCover(item, generation, false);
                return;
            }

            var key = queueKey('availability', generation, item.biblio_id);
            if (queuedEnrichmentKeys.has(key)) return;

            queuedEnrichmentKeys.add(key);

            var job = {
                type: 'availability',
                item: item,
                generation: generation,
                key: key
            };

            if (priority) enrichmentQueue.unshift(job);
            else enrichmentQueue.push(job);

            runNextEnrichment();
        }

        function enqueueCover(item, generation, priority) {
            if (!item || !item.biblio_id || generation !== searchGeneration) return;

            var $row = findRenderedRow(item.biblio_id);
            if (!$row.length || $row.attr('data-kx-cover-loaded') === '1') return;

            var key = queueKey('cover', generation, item.biblio_id);
            if (queuedEnrichmentKeys.has(key)) return;

            queuedEnrichmentKeys.add(key);

            var job = {
                type: 'cover',
                item: item,
                generation: generation,
                key: key
            };

            if (priority) enrichmentQueue.unshift(job);
            else enrichmentQueue.push(job);

            runNextEnrichment();
        }

        function takeNextJob() {
            if (!enrichmentQueue.length) return null;

            // Une disponibilité en attente passe TOUJOURS avant une couverture.
            var availabilityIndex = enrichmentQueue.findIndex(function (job) {
                return job.type === 'availability';
            });

            var index = availabilityIndex >= 0 ? availabilityIndex : 0;
            var job = enrichmentQueue.splice(index, 1)[0];
            queuedEnrichmentKeys.delete(job.key);
            return job;
        }

        function runNextEnrichment() {
            if (enrichmentRunning) return;

            while (enrichmentQueue.length) {
                var job = takeNextJob();
                if (!job) return;

                if (job.generation !== searchGeneration) continue;

                var $row = findRenderedRow(job.item.biblio_id);
                if (!$row.length) continue;

                if (
                    job.type === 'availability' &&
                    $row.attr('data-kx-availability-loaded') === '1'
                ) {
                    continue;
                }

                if (
                    job.type === 'cover' &&
                    $row.attr('data-kx-cover-loaded') === '1'
                ) {
                    continue;
                }

                enrichmentRunning = true;

                var done = function () {
                    enrichmentRunning = false;
                    activeEnrichmentXhr = null;

                    if (
                        $row.attr('data-kx-availability-loaded') === '1' &&
                        $row.attr('data-kx-cover-loaded') === '1'
                    ) {
                        $row.attr('data-kx-enriched', '1');
                    }

                    runNextEnrichment();
                };

                if (job.type === 'availability') {
                    loadAvailabilityForRow($row, job.item, job.generation, done);
                } else {
                    loadCoverForRow($row, job.item, job.generation, done);
                }
                return;
            }
        }

        function loadAvailabilityForRow($row, item, generation, done) {
            if (generation !== searchGeneration) {
                done();
                return;
            }

            var $dot = $row.find('.ac-avail-dot');
            var $label = $row.find('.ac-avail-label');
            var $callnumber = $row.find('.ac-callnumber');

            $dot.removeClass('available unavailable').addClass('loading');
            $label.removeClass('available unavailable deferred')
                .addClass('loading')
                .text('Vérification…');

            activeEnrichmentXhr = $.ajax({
                url: '/api/v1/biblios/' + item.biblio_id + '/items',
                method: 'GET',
                dataType: 'json',
                headers: { 'Accept': 'application/json' }
            });

            activeEnrichmentXhr.done(function (items) {
                if (generation !== searchGeneration || !$row.closest(document.documentElement).length) return;

                // LOGIQUE DE DISPONIBILITÉ VOLONTAIREMENT INCHANGÉE.
                var availableAnywhere = items.some(isItemAvailable);
                var availableHere = items.some(function (it) {
                    return isItemAvailable(it) && it.holding_library_id === currentBranch;
                });
                var bestCallnumber = chooseBestCallnumber(items);

                if (bestCallnumber) $callnumber.text('Cote : ' + bestCallnumber).show();
                else $callnumber.text('').hide();

                if (availableAnywhere) {
                    $dot.removeClass('loading unavailable').addClass('available');
                    $label.removeClass('loading unavailable deferred')
                        .addClass('available')
                        .text(availableHere ? 'Disponible ici' : 'Disponible ailleurs');
                } else {
                    $dot.removeClass('loading available').addClass('unavailable');
                    $label.removeClass('loading available deferred')
                        .addClass('unavailable')
                        .text('Indisponible');
                }

                $row.attr('data-kx-availability-loaded', '1');
            }).fail(function (xhr, status) {
                if (status === 'abort' || generation !== searchGeneration) return;

                $dot.removeClass('loading').addClass('unavailable');
                $label.removeClass('loading deferred')
                    .addClass('unavailable')
                    .text('Statut inconnu');

                // On considère la tentative terminée pour ne pas la relancer
                // continuellement au moindre survol.
                $row.attr('data-kx-availability-loaded', '1');
            }).always(function () {
                if (generation === searchGeneration) {
                    // La couverture est mise en file BASSE PRIORITÉ.
                    // Toutes les disponibilités déjà demandées passeront avant.
                    enqueueCover(item, generation, false);
                }
                done();
            });
        }

        function loadCoverForRow($row, item, generation, done) {
            var $zone = $row.find('.ac-cover-zone');

            if (generation !== searchGeneration) {
                done();
                return;
            }

            if ($row.attr('data-kx-cover-loaded') === '1') {
                done();
                return;
            }

            $zone.text('Chargement…');

            var isbn10 = isbn13to10(item.ean) || isbn13to10(item.isbn);

            if (!isbn10) {
                useFallbackCover($zone, item);
                $row.attr('data-kx-cover-loaded', '1');
                done();
                return;
            }

            activeEnrichmentXhr = $.get('/api/v1/contrib/electre/image', {
                isbn10: isbn10,
                side: 'staff',
                result_page: true
            });

            activeEnrichmentXhr.done(function (coverUrl) {
                if (generation !== searchGeneration) return;

                if (coverUrl) renderCoverImage($zone, coverUrl);
                else useFallbackCover($zone, item);

                $row.attr('data-kx-cover-loaded', '1');
            }).fail(function (xhr, status) {
                if (status === 'abort' || generation !== searchGeneration) return;

                useFallbackCover($zone, item);
                $row.attr('data-kx-cover-loaded', '1');
            }).always(function () {
                done();
            });
        }

        // ---------------------------------------------------------------------
        // Bandeau et bouton de recherche classique construits sans concaténer
        // les métadonnées utilisateur dans du HTML.
        // ---------------------------------------------------------------------
        function injectSearchActions($menu) {
            $menu.find('.ac-menu-actions').remove();

            var queryValue = $input.val() || '';
            var idxValue = $('#idx_0').val() || 'kw';

            var $actions = $('<div>', { class: 'ac-menu-actions' });
            $('<div>', { class: 'ac-info-banner' })
                .text('Attention, toutes les zones des notices ne sont pas interrogées par ce système. N’hésitez pas à lancer quand même une recherche classique.')
                .appendTo($actions);

            var $zones = $('<ul>', { class: 'ac-zones-list' }).appendTo($actions);
            $('<li>').text('Zones interrogées : titre, sous-titre, auteur, éditeur, année, ISBN, ISSN, notes, cote et lieu de publication.').appendTo($zones);

            var $form = $('<form>', {
                action: '/cgi-bin/koha/catalogue/search.pl',
                method: 'get',
                class: 'ac-search-form'
            });
            if (queryValue) $('<input>', { type: 'hidden', name: 'q', value: queryValue }).appendTo($form);
            $('<input>', { type: 'hidden', name: 'idx', value: idxValue }).appendTo($form);
            $('<button>', { type: 'submit', class: 'ac-search-cta' })
                .text('Lancer une recherche classique')
                .appendTo($form);
            $form.appendTo($actions);

            $menu.prepend($actions);
        }

        // ---------------------------------------------------------------------
        // Autocomplete.
        // ---------------------------------------------------------------------
        $input.autocomplete({
            minLength: 3,

            create: function () {
                getAutocompleteMenu();
            },

            open: function () {
                var $menu = getAutocompleteMenu();
                $menu.width($input.outerWidth());
            },

            close: function () {
                $preview.hide();
            },

            select: function (event, ui) {
                event.preventDefault();
                if (ui.item && ui.item.biblio_id) {
                    window.location.href = '/cgi-bin/koha/catalogue/detail.pl?biblionumber=' + ui.item.biblio_id;
                }
                return false;
            },

            source: function (request, response) {
                var rawQuery = request.term.trim();
                var terms = rawQuery.split(/\s+/).filter(Boolean);
                var idxValue = $('#idx_0').val() || 'kw';
                var andConditions = buildQueryConditions(terms, idxValue);
                var generation = ++searchGeneration;
                currentItemMap.clear();

                // Une nouvelle saisie rend toutes les recherches/enrichissements
                // précédents obsolètes.
                resetEnrichmentQueue();
                if (activeSearchXhr && typeof activeSearchXhr.abort === 'function') {
                    try { activeSearchXhr.abort(); } catch (e) {}
                }

                activeSearchXhr = $.ajax({
                    url: '/api/v1/biblios',
                    method: 'GET',
                    dataType: 'json',
                    headers: { 'Accept': 'application/json' },
                    data: {
                        q: JSON.stringify({ '-and': andConditions }),
                        _per_page: RESULTS_COUNT
                    }
                });

                activeSearchXhr.done(function (data) {
                    if (generation !== searchGeneration) return;

                    var items = $.map(data, function (item) {
                        return {
                            label: item.title || '',
                            value: item.title || '',
                            title: item.title || '',
                            author: item.author || '',
                            unititle: item.unititle || '',
                            year: item.publication_year || '',
                            publisher: item.publisher || '',
                            item_type: item.item_type || '',
                            isbn: item.isbn || '',
                            ean: item.ean || '',
                            fallback_url: item.url || '',
                            biblio_id: item.biblio_id
                        };
                    });

                    var rankedItems = sortResults(items, terms, rawQuery);
                    rankedItems.forEach(function (item, index) {
                        item.rank = index;
                        item.searchGeneration = generation;
                        currentItemMap.set(String(item.biblio_id), item);
                    });

                    var responseItems = rankedItems.length
                        ? rankedItems
                        : [{ label: '', value: '', isEmptyState: true, searchGeneration: generation }];

                    response(responseItems);

                    // Attendre que jQuery UI ait rendu les <li> du nouveau menu.
                    setTimeout(function () {
                        if (generation !== searchGeneration) return;
                        var $menu = getAutocompleteMenu();
                        injectSearchActions($menu);

                        rankedItems.slice(0, AUTO_ENRICH_COUNT).forEach(function (item) {
                            enqueueAvailability(item, generation, false);
                        });
                    }, 0);
                });

                activeSearchXhr.fail(function (xhr, status) {
                    if (status === 'abort' || generation !== searchGeneration) return;
                    (function(){})('Erreur API autocomplete catalogue', xhr.status, xhr.responseText);
                    response([{ label: '', value: '', isEmptyState: true, searchGeneration: generation }]);
                });
            }
        });

        var instance = $input.autocomplete('instance');
        if (!instance) return;

        instance._renderItem = function (ul, item) {
            if (item.isEmptyState) {
                return $('<li>').addClass('ac-empty-state').appendTo(ul);
            }

            var detailUrl = '/cgi-bin/koha/catalogue/detail.pl?biblionumber=' + encodeURIComponent(item.biblio_id);
            var $li = $('<li>').attr({
                'data-kx-biblio-id': item.biblio_id,
                'data-kx-enriched': '0',
                'data-kx-availability-loaded': '0',
                'data-kx-cover-loaded': '0'
            });

            var $link = $('<a>', { href: detailUrl, class: 'autocomplete-item' }).appendTo($li);
            var $cover = $('<div>', { class: 'ac-cover-zone' }).appendTo($link);
            var $text = $('<div>', { class: 'ac-text' }).appendTo($link);
            var $titleRow = $('<div>', { class: 'ac-title-row' }).appendTo($text);

            $('<span>', { class: 'ac-avail-dot loading' }).appendTo($titleRow);
            $('<span>', { class: 'ac-title' }).text(item.label || '').appendTo($titleRow);

            if (item.author) $('<span>', { class: 'ac-author' }).text(item.author).appendTo($text);

            var meta = [];
            if (item.publisher) meta.push(item.publisher);
            if (item.year) meta.push(item.year);
            if (item.item_type) meta.push(item.item_type);
            if (meta.length) $('<span>', { class: 'ac-meta' }).text(meta.join(' · ')).appendTo($text);

            $('<span>', { class: 'ac-callnumber' }).hide().appendTo($text);

            if (item.rank < AUTO_ENRICH_COUNT) {
                $cover.text('Chargement…');
                $('<span>', { class: 'ac-avail-label loading' }).text('Vérification…').appendTo($text);
            } else {
                $cover.text('Survol');
                $('<span>', { class: 'ac-avail-label deferred' })
                    .text('Survolez pour vérifier disponibilité et cote')
                    .appendTo($text);
            }

            return $li.appendTo(ul);
        };

        // Les résultats 9 à 20 ne déclenchent leur enrichissement que s'ils
        // intéressent réellement l'utilisateur.
        $(document)
            .off('.kxCatalogLazyEnrichment')
            .on('mouseenter.kxCatalogLazyEnrichment focusin.kxCatalogLazyEnrichment', '.kx-catalog-autocomplete li[data-kx-biblio-id]', function () {
                var $row = $(this);
                if ($row.attr('data-kx-enriched') === '1') return;

                var biblioId = String($row.attr('data-kx-biblio-id') || '');
                if (!biblioId) return;

                var item = currentItemMap.get(biblioId);
                if (item) enqueueAvailability(item, searchGeneration, true);
            });
    });
})(jQuery);


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