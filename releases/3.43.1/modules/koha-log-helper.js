(function(){"use strict";
const KT=window.KohaTools;if(!KT||!KT.Config)return;
const MODULE_ID='koha-log-helper',CFG=KT.Config.getCanonical(MODULE_ID),Scope=KT.getService&&KT.getService("scope");
if(!CFG||!CFG.enabled||!["shadow","live"].includes(CFG.mode))return;
if(Scope&&!Scope.match(CFG.general&&CFG.general.scope).ok)return;
const runtime={
 id:MODULE_ID,
 description:'Assistant d’affichage/lecture des logs Koha côté interface, sans écriture serveur.',
 sourceFiles:['101-koha-log.js'],
 parity:"exact-legacy",
 reloadRequiredOnConfigChange:true,
 init:function(){
   if(window["__KT_PARITY_"+MODULE_ID])return;
   window["__KT_PARITY_"+MODULE_ID]=true;
   
/* ===== EXACT LEGACY SOURCE: 101-koha-log.js ===== */
/**
 * Koha Log Viewer – Amélioration de lisibilité
 * À coller dans : Administration > Préférences système > IntranetUserJS
 *
 * Fonctionnalités :
 *  - Colorisation des lignes par type d'action (add/delete/modify…)
 *  - Badges colorés sur colonnes Module et Action
 *  - Formatage automatique des données $VAR1 = {...} (Data::Dumper Perl)
 *    → résumé des champs importants + tableau dépliable
 *  - Barre de filtres rapides (par module, par action, masquer les cron)
 *  - Ne s'active que sur la page /tools/viewlog.pl
 *  - 100% vanilla JS, aucune dépendance jQuery
 */
(function () {
    'use strict';

    /* ── Guard : uniquement sur la page viewlog ── */
    if (!window.location.pathname.match(/\/tools\/viewlog\.pl/)) return;

    /* ══════════════════════════════════════════
       CSS injecté dynamiquement
    ══════════════════════════════════════════ */
    var CSS = [
        /* Colorisation des lignes par action */
        '#logst tbody tr.kl-add    { background-color: #d4edda !important; }',
        '#logst tbody tr.kl-delete { background-color: #f8d7da !important; }',
        '#logst tbody tr.kl-modify { background-color: #fff3cd !important; }',
        '#logst tbody tr.kl-create { background-color: #cce5ff !important; }',
        '#logst tbody tr.kl-issue  { background-color: #d1ecf1 !important; }',
        '#logst tbody tr.kl-return { background-color: #e8f5e9 !important; }',
        '#logst tbody tr.kl-cron   { background-color: #f3e5f5 !important; }',
        '#logst tbody tr.kl-cancel { background-color: #f5f5f5 !important; }',
        '#logst tbody tr:hover      { filter: brightness(0.94) !important; }',

        /* Badges actions */
        '.kl-badge { display:inline-block; padding:2px 9px; border-radius:4px;',
        '  font-size:0.80em; font-weight:700; white-space:nowrap; }',
        '.kl-b-green  { background:#28a745; color:#fff; }',
        '.kl-b-red    { background:#dc3545; color:#fff; }',
        '.kl-b-orange { background:#fd7e14; color:#fff; }',
        '.kl-b-blue   { background:#007bff; color:#fff; }',
        '.kl-b-teal   { background:#20c997; color:#fff; }',
        '.kl-b-cyan   { background:#17a2b8; color:#fff; }',
        '.kl-b-purple { background:#6f42c1; color:#fff; }',
        '.kl-b-gray   { background:#868e96; color:#fff; }',
        '.kl-b-indigo { background:#4263eb; color:#fff; }',
        '.kl-b-dark   { background:#343a40; color:#fff; }',

        /* Badges modules */
        '.kl-mod { display:inline-block; padding:2px 7px; border-radius:4px;',
        '  font-size:0.80em; font-weight:600; white-space:nowrap; border:1px solid transparent; }',

        /* Colonne Info – wrapper */
        '.kl-info-wrap { max-width:400px; }',

        /* Résumé chips (champs importants) */
        '.kl-chips { display:flex; flex-wrap:wrap; gap:3px; margin-bottom:3px; }',
        '.kl-chip  { background:#e9ecef; padding:1px 6px; border-radius:3px;',
        '  font-size:0.78em; line-height:1.7; white-space:nowrap; }',
        '.kl-chip b { color:#343a40; }',

        /* Bouton dépliable */
        '.kl-toggle { font-size:0.72em; padding:1px 7px; background:none;',
        '  border:1px solid #adb5bd; border-radius:3px; cursor:pointer; color:#495057;',
        '  transition: background 0.12s; }',
        '.kl-toggle:hover { background:#dee2e6; }',

        /* Tableau détail */
        '.kl-detail-table { font-size:0.80em; border-collapse:collapse;',
        '  width:100%; margin-top:5px; }',
        '.kl-detail-table td { padding:2px 8px; border-bottom:1px solid #f0f0f0; vertical-align:top; }',
        '.kl-detail-table td:first-child { color:#6c757d; white-space:nowrap; font-weight:500; width:1%; }',
        '.kl-detail-table tr.kl-key td:first-child { color:#212529; font-weight:700; }',

        /* Données brutes */
        '.kl-raw { display:none; font-size:0.72em; margin-top:4px; padding:5px 8px;',
        '  background:#f8f9fa; border:1px solid #dee2e6; border-radius:3px;',
        '  max-height:150px; overflow-y:auto; white-space:pre-wrap; word-break:break-all; }',

        /* Info texte simple (cron path, etc.) */
        '.kl-plain { font-family:monospace; font-size:0.81em; background:#f8f9fa;',
        '  padding:3px 8px; border-radius:3px; border:1px solid #dee2e6;',
        '  white-space:pre-wrap; word-break:break-all; }',

        /* Blocs MARC (BEFORE/AFTER) */
        '.kl-marc-box { border:1px solid #d7dde4; border-radius:8px; background:#fcfdff; overflow:hidden; }',
        '.kl-marc-top { display:flex; justify-content:space-between; align-items:center; gap:8px;',
        '  padding:6px 8px; border-bottom:1px solid #e5e9ef; background:#f4f7fb; }',
        '.kl-marc-title { font-size:0.76em; font-weight:700; color:#334155; text-transform:uppercase; letter-spacing:0.03em; }',
        '.kl-marc-meta { font-size:0.74em; color:#64748b; }',
        '.kl-marc-grid { display:grid; grid-template-columns:1fr; gap:8px; padding:8px; }',
        '.kl-marc-pane { border:1px solid #e2e8f0; border-radius:6px; background:#fff; min-width:0; }',
        '.kl-marc-pane-head { padding:5px 8px; border-bottom:1px solid #eef2f7; font-size:0.75em; font-weight:700; color:#475569; background:#f8fafc; }',
        '.kl-marc-list { max-height:260px; overflow:auto; }',
        '.kl-marc-row { display:grid; grid-template-columns:42px 1fr; gap:6px; padding:4px 8px; border-bottom:1px dotted #eef2f7; align-items:start; }',
        '.kl-marc-row:last-child { border-bottom:none; }',
        '.kl-marc-tag { display:inline-block; font-size:0.73em; font-weight:700; line-height:1.4;',
        '  color:#1d4ed8; background:#dbeafe; border:1px solid #bfdbfe; border-radius:4px; padding:1px 5px; text-align:center; }',
        '.kl-marc-val { font-family:ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;',
        '  font-size:0.76em; line-height:1.45; white-space:pre-wrap; word-break:break-word; color:#0f172a; }',
        '.kl-marc-empty { padding:8px; font-size:0.78em; color:#94a3b8; font-style:italic; }',
        '.kl-marc-toggle { margin-left:auto; }',

        /* Comparatif BEFORE / AFTER */
        '.kl-marc-legend { display:flex; flex-wrap:wrap; gap:6px; padding:6px 8px; border-top:1px solid #e5e9ef; background:#fbfdff; }',
        '.kl-marc-pill { font-size:0.73em; padding:2px 7px; border-radius:999px; border:1px solid transparent; }',
        '.kl-pill-changed { background:#fff3cd; color:#7a5300; border-color:#ffe08a; }',
        '.kl-pill-added { background:#d4edda; color:#1f6b35; border-color:#a7dfb4; }',
        '.kl-pill-removed { background:#f8d7da; color:#7f1d1d; border-color:#efb3b9; }',
        '.kl-pill-same { background:#edf2f7; color:#475569; border-color:#d7e0ea; }',
        '.kl-pill-warn { background:#ffe8cc; color:#7a3e00; border-color:#f7c58b; }',

        '.kl-marc-compare { border:1px solid #e2e8f0; border-radius:6px; background:#fff; margin:8px; overflow:hidden; }',
        '.kl-marc-c-head, .kl-marc-c-row { display:grid; grid-template-columns:64px 1fr 1fr; }',
        '.kl-marc-c-head { background:#f8fafc; border-bottom:1px solid #e5e9ef; font-size:0.74em; font-weight:700; color:#475569; }',
        '.kl-marc-c-head > div { padding:6px 8px; }',
        '.kl-marc-c-row { border-top:1px dotted #edf2f7; }',
        '.kl-marc-c-row:first-child { border-top:none; }',
        '.kl-marc-c-tag { padding:6px 8px; }',
        '.kl-marc-c-tag span { display:inline-block; font-size:0.73em; font-weight:700; color:#1d4ed8;',
        '  background:#dbeafe; border:1px solid #bfdbfe; border-radius:4px; padding:1px 5px; }',
        '.kl-marc-c-val { padding:6px 8px; font-family:ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;',
        '  font-size:0.75em; line-height:1.45; white-space:pre-wrap; word-break:break-word; color:#0f172a; }',
        '.kl-marc-c-row.kl-diff-changed .kl-marc-c-val { background:#fff9e7; }',
        '.kl-marc-c-row.kl-diff-added .kl-marc-c-val:last-child { background:#e8f8ec; }',
        '.kl-marc-c-row.kl-diff-removed .kl-marc-c-val:nth-child(2) { background:#fdecee; }',
        '.kl-marc-empty-cell { color:#94a3b8; font-style:italic; }',
        '.kl-inline-actions { display:flex; gap:6px; flex-wrap:wrap; margin-top:4px; }',

        '@media (min-width: 1100px) {',
        '  .kl-marc-grid.kl-two { grid-template-columns:1fr 1fr; }',
        '}',

        /* Barre de filtres rapides */
        '#kl-toolbar { margin:8px 0 10px; padding:8px 12px; background:#f8f9fa;',
        '  border:1px solid #dee2e6; border-radius:6px;',
        '  display:flex; flex-wrap:wrap; gap:5px; align-items:center; }',
        '#kl-toolbar .kl-lbl { font-size:0.76em; font-weight:700;',
        '  color:#6c757d; margin-right:2px; }',
        '#kl-toolbar .kl-sep { border-left:1px solid #ced4da; height:18px; margin:0 4px; }',
        '#kl-toolbar button { font-size:0.78em; padding:2px 9px; border:1px solid #adb5bd;',
        '  background:#fff; border-radius:3px; cursor:pointer; transition:background 0.12s; }',
        '#kl-toolbar button:hover { background:#e9ecef; }',
        '#kl-toolbar button.kl-active { background:#343a40; color:#fff; border-color:#343a40; }',
    ].join('\n');

    var styleEl = document.createElement('style');
    styleEl.id  = 'kl-styles';
    styleEl.textContent = CSS;
    document.head.appendChild(styleEl);

    /* ══════════════════════════════════════════
       Tables de correspondance
    ══════════════════════════════════════════ */

    /* Action → { cls de ligne, classe badge } */
    var ACTION_MAP = {
        'Ajouter'                    : { cls: 'kl-add',    badge: 'kl-b-green'  },
        'Créer'                      : { cls: 'kl-create', badge: 'kl-b-blue'   },
        'Supprimer'                  : { cls: 'kl-delete', badge: 'kl-b-red'    },
        'Modifier'                   : { cls: 'kl-modify', badge: 'kl-b-orange' },
        'Prêt'                       : { cls: 'kl-issue',  badge: 'kl-b-cyan'   },
        'Retour'                     : { cls: 'kl-return', badge: 'kl-b-teal'   },
        'Renouveler'                 : { cls: 'kl-issue',  badge: 'kl-b-cyan'   },
        'Annuler'                    : { cls: 'kl-cancel', badge: 'kl-b-gray'   },
        'Remplir'                    : { cls: 'kl-create', badge: 'kl-b-blue'   },
        'Suspendre'                  : { cls: 'kl-cancel', badge: 'kl-b-gray'   },
        'Reprendre'                  : { cls: 'kl-create', badge: 'kl-b-teal'   },
        'Exécuter'                   : { cls: 'kl-cron',   badge: 'kl-b-purple' },
        'Date de fin'                : { cls: 'kl-cron',   badge: 'kl-b-indigo' },
        'Changer le mot de passe'    : { cls: 'kl-modify', badge: 'kl-b-orange' },
        'Réinitialiser le mot de passe': { cls: 'kl-modify', badge: 'kl-b-orange' },
        'Ajouter un message de circulation': { cls: 'kl-add', badge: 'kl-b-green' },
        'Modifier un message de circulation': { cls: 'kl-modify', badge: 'kl-b-orange' },
        'Supprimer un message de circulation': { cls: 'kl-delete', badge: 'kl-b-red' },
        'Créer une suspension'       : { cls: 'kl-delete', badge: 'kl-b-red'    },
        'Modifier une suspension'    : { cls: 'kl-modify', badge: 'kl-b-orange' },
        'Supprimer une suspension'   : { cls: 'kl-add',    badge: 'kl-b-green'  },
        'Recevoir une commande'      : { cls: 'kl-return', badge: 'kl-b-teal'   },
        'Ajouter une commande'       : { cls: 'kl-add',    badge: 'kl-b-green'  },
        'Annuler une commande'       : { cls: 'kl-delete', badge: 'kl-b-red'    },
        'Modifier une commande'      : { cls: 'kl-modify', badge: 'kl-b-orange' },
    };

    /* Module → couleurs du badge */
    var MODULE_MAP = {
        'Tâches cron'           : { bg: '#e8eaf6', fg: '#3949ab' },
        'Réservations'          : { bg: '#e3f2fd', fg: '#1565c0' },
        'Adhérents'             : { bg: '#f3e5f5', fg: '#6a1b9a' },
        'Catalogage'            : { bg: '#e8f5e9', fg: '#2e7d32' },
        'Circulation'           : { bg: '#fff8e1', fg: '#e65100' },
        'Préférences système'   : { bg: '#fce4ec', fg: '#ad1457' },
        'Acquisitions'          : { bg: '#e0f2f1', fg: '#00695c' },
        'Autorités'             : { bg: '#f1f8e9', fg: '#558b2f' },
        'Authentification'      : { bg: '#fff3e0', fg: '#bf360c' },
        'Amendes'               : { bg: '#efebe9', fg: '#4e342e' },
        'Périodiques'           : { bg: '#e8eaf6', fg: '#283593' },
        'Notifications'         : { bg: '#f9fbe7', fg: '#827717' },
        'Rapports'              : { bg: '#e0f7fa', fg: '#006064' },
        'Annonces'              : { bg: '#fffde7', fg: '#f57f17' },
        'Suggestions'           : { bg: '#fbe9e7', fg: '#bf360c' },
        'Prêt entre bibliothèques': { bg: '#f0f4c3', fg: '#827717' },
        'Réclamations'          : { bg: '#fce4ec', fg: '#880e4f' },
        'Rappels'               : { bg: '#e1f5fe', fg: '#01579b' },
        'Moteur de recherche'   : { bg: '#ede7f6', fg: '#4527a0' },
    };

    /* Champs Perl à mettre en avant dans le résumé */
    var KEY_FIELDS = [
        'borrowernumber', 'biblionumber', 'itemnumber',
        'reserve_id', 'branchcode', 'timestamp',
        'reservedate', 'issuedate', 'returndate', 'date_due',
    ];

    /* ══════════════════════════════════════════
       Helpers DOM
    ══════════════════════════════════════════ */

    function el(tag, cls, text) {
        var e = document.createElement(tag);
        if (cls)  e.className   = cls;
        if (text) e.textContent = text;
        return e;
    }

    function qs(sel, ctx) {
        return (ctx || document).querySelector(sel);
    }

    function qsa(sel, ctx) {
        return Array.prototype.slice.call((ctx || document).querySelectorAll(sel));
    }

    /* ══════════════════════════════════════════
       Utilitaires
    ══════════════════════════════════════════ */

    /** Parse un dump Perl Data::Dumper : $VAR1 = { 'key' => val, ... } */
    function parsePerlDump(text) {
        var result = {};
        var lines = text.split('\n');
        for (var i = 0; i < lines.length; i++) {
            var m = lines[i].match(/^\s*'([^']+)'\s*=>\s*(.*?),?\s*$/);
            if (!m) continue;
            var key = m[1];
            var raw = m[2].trim().replace(/,$/, '');
            var val;
            if (raw === 'undef')                              { val = null; }
            else if (/^-?\d+$/.test(raw))                    { val = parseInt(raw, 10); }
            else if (raw[0] === "'" && raw.slice(-1) === "'") { val = raw.slice(1, -1); }
            else                                              { val = raw; }
            result[key] = val;
        }
        return result;
    }

    function countMarcTags(text) {
        var m = text.match(/(?:\bLDR\b|\b\d{3}\b)\s/g);
        return m ? m.length : 0;
    }

    function extractMarcFields(text) {
        var normalized = text.replace(/\s+/g, ' ').trim();
        var out = [];
        var re = /(LDR|\d{3})\s([\s\S]*?)(?=(?:\s(?:LDR|\d{3})\s)|$)/g;
        var m;

        while ((m = re.exec(normalized)) !== null) {
            var tag = m[1].trim();
            var value = m[2].trim();
            if (!tag || !value) continue;
            out.push({ tag: tag, value: value });
        }
        return out;
    }

    function extractBeforeAfterSections(rawText) {
        var markerRe = /(BEFORE|AFTER)\s*=\s*>/ig;
        var markers = [];
        var m;

        while ((m = markerRe.exec(rawText)) !== null) {
            markers.push({
                type: m[1].toUpperCase(),
                start: m.index,
                contentStart: m.index + m[0].length
            });
        }

        var out = {
            contextLabel: '',
            beforeText: '',
            afterText: '',
            hasBefore: false,
            hasAfter: false
        };

        if (!markers.length) return out;

        out.contextLabel = rawText.slice(0, markers[0].start).trim();

        for (var i = 0; i < markers.length; i++) {
            var mk = markers[i];
            var end = (i + 1 < markers.length) ? markers[i + 1].start : rawText.length;
            var chunk = rawText.slice(mk.contentStart, end).trim();
            if (!chunk) continue;

            if (mk.type === 'BEFORE') {
                out.hasBefore = true;
                out.beforeText += (out.beforeText ? '\n' : '') + chunk;
            } else if (mk.type === 'AFTER') {
                out.hasAfter = true;
                out.afterText += (out.afterText ? '\n' : '') + chunk;
            }
        }

        return out;
    }

    function buildMarcPane(title, text) {
        var pane = el('div', 'kl-marc-pane');
        pane.appendChild(el('div', 'kl-marc-pane-head', title));

        var list = el('div', 'kl-marc-list');
        var fields = extractMarcFields(text);

        if (!fields.length) {
            list.appendChild(el('div', 'kl-marc-empty', 'Aucun champ MARC détecté'));
            pane.appendChild(list);
            return { pane: pane, fieldCount: 0 };
        }

        fields.forEach(function (f) {
            var row = el('div', 'kl-marc-row');
            row.appendChild(el('span', 'kl-marc-tag', f.tag));
            row.appendChild(el('div', 'kl-marc-val', f.value));
            list.appendChild(row);
        });

        pane.appendChild(list);
        return { pane: pane, fieldCount: fields.length };
    }

    function buildMarcCompare(beforeText, afterText) {
        var compare = el('div', 'kl-marc-compare');
        var head = el('div', 'kl-marc-c-head');
        head.appendChild(el('div', '', 'Tag'));
        head.appendChild(el('div', '', 'Avant'));
        head.appendChild(el('div', '', 'Après'));
        compare.appendChild(head);

        var beforeFields = extractMarcFields(beforeText);
        var afterFields = extractMarcFields(afterText);

        function buildMap(fields) {
            var map = {};
            fields.forEach(function (f) {
                if (!map[f.tag]) map[f.tag] = [];
                map[f.tag].push(f.value);
            });
            return map;
        }

        var beforeMap = buildMap(beforeFields);
        var afterMap = buildMap(afterFields);

        var tagOrder = [];
        beforeFields.forEach(function (f) {
            if (tagOrder.indexOf(f.tag) === -1) tagOrder.push(f.tag);
        });
        afterFields.forEach(function (f) {
            if (tagOrder.indexOf(f.tag) === -1) tagOrder.push(f.tag);
        });

        var stats = { changed: 0, added: 0, removed: 0, same: 0, total: 0 };

        tagOrder.forEach(function (tag) {
            var bArr = beforeMap[tag] || [];
            var aArr = afterMap[tag] || [];
            var maxLen = Math.max(bArr.length, aArr.length);

            for (var i = 0; i < maxLen; i++) {
                var bVal = bArr[i];
                var aVal = aArr[i];
                var row = el('div', 'kl-marc-c-row');

                var label = tag + (maxLen > 1 ? (' #' + (i + 1)) : '');
                var tagCell = el('div', 'kl-marc-c-tag');
                tagCell.appendChild(el('span', '', label));
                row.appendChild(tagCell);

                var beforeCell = el('div', 'kl-marc-c-val', bVal || '-');
                var afterCell = el('div', 'kl-marc-c-val', aVal || '-');

                if (!bVal) beforeCell.classList.add('kl-marc-empty-cell');
                if (!aVal) afterCell.classList.add('kl-marc-empty-cell');

                if (!bVal && aVal) {
                    row.classList.add('kl-diff-added');
                    stats.added += 1;
                } else if (bVal && !aVal) {
                    row.classList.add('kl-diff-removed');
                    stats.removed += 1;
                } else if (bVal === aVal) {
                    stats.same += 1;
                } else {
                    row.classList.add('kl-diff-changed');
                    stats.changed += 1;
                }

                stats.total += 1;
                row.appendChild(beforeCell);
                row.appendChild(afterCell);
                compare.appendChild(row);
            }
        });

        return { node: compare, stats: stats };
    }

    function buildMarcDiff(rawText) {
        var box = el('div', 'kl-marc-box');

        var parsedBA = extractBeforeAfterSections(rawText);
        var contextLabel = parsedBA.contextLabel;
        var beforeText = parsedBA.beforeText;
        var afterText = parsedBA.afterText;

        var top = el('div', 'kl-marc-top');
        var title = contextLabel ? 'Notice ' + contextLabel : 'Notice bibliographique';
        top.appendChild(el('div', 'kl-marc-title', title));
        var meta = el('div', 'kl-marc-meta', 'Lecture structurée MARC');
        top.appendChild(meta);
        box.appendChild(top);

        if (beforeText && afterText) {
            var cmp = buildMarcCompare(beforeText, afterText);
            meta.textContent = cmp.stats.changed + ' modifié(s), ' + cmp.stats.added + ' ajouté(s), ' + cmp.stats.removed + ' supprimé(s)';
            box.appendChild(cmp.node);

            var legend = el('div', 'kl-marc-legend');
            legend.appendChild(el('span', 'kl-marc-pill kl-pill-changed', 'Modifié: ' + cmp.stats.changed));
            legend.appendChild(el('span', 'kl-marc-pill kl-pill-added', 'Ajouté: ' + cmp.stats.added));
            legend.appendChild(el('span', 'kl-marc-pill kl-pill-removed', 'Supprimé: ' + cmp.stats.removed));
            legend.appendChild(el('span', 'kl-marc-pill kl-pill-same', 'Identique: ' + cmp.stats.same));
            box.appendChild(legend);
        } else {
            var grid = el('div', 'kl-marc-grid');
            var totalFields = 0;

            if (beforeText) {
                var b = buildMarcPane('Avant', beforeText);
                totalFields += b.fieldCount;
                grid.appendChild(b.pane);
            }
            if (afterText) {
                var a = buildMarcPane(beforeText ? 'Après' : 'Contenu', afterText);
                totalFields += a.fieldCount;
                grid.appendChild(a.pane);
            }

            meta.textContent = totalFields + ' champs détectés';
            box.appendChild(grid);

            var legendSingle = el('div', 'kl-marc-legend');
            if (beforeText && !afterText) {
                legendSingle.appendChild(el('span', 'kl-marc-pill kl-pill-warn', 'AFTER non détecté dans ce log'));
            } else if (!beforeText && afterText) {
                legendSingle.appendChild(el('span', 'kl-marc-pill kl-pill-warn', 'BEFORE non détecté dans ce log'));
            }
            if (legendSingle.childNodes.length) {
                box.appendChild(legendSingle);
            }
        }
        return box;
    }

    /* ══════════════════════════════════════════
       Formatage de la cellule Info
    ══════════════════════════════════════════ */
    function formatInfoCell(cell) {
        var loginfo = qs('.loginfo', cell);
        if (!loginfo) return;

        var rawText = loginfo.textContent.trim();
        if (!rawText) return;

        var wrap = el('div', 'kl-info-wrap');

        if (rawText.indexOf('$VAR1 = {') !== -1) {
            var parsed = parsePerlDump(rawText);

            /* ── Résumé : chips champs importants ── */
            var chips = el('div', 'kl-chips');
            var hasChips = false;
            KEY_FIELDS.forEach(function (f) {
                if (parsed[f] != null) {
                    hasChips = true;
                    var chip = el('span', 'kl-chip');
                    var b = el('b', '', f + ': ');
                    chip.appendChild(b);
                    chip.appendChild(document.createTextNode(String(parsed[f])));
                    chips.appendChild(chip);
                }
            });
            if (hasChips) wrap.appendChild(chips);

            /* ── Bouton d'ouverture ── */
            var toggle = el('button', 'kl-toggle', '▼ détails');
            wrap.appendChild(toggle);

            /* ── Tableau détail (masqué par défaut) ── */
            var detail = el('div');
            detail.style.display = 'none';

            var tbl   = document.createElement('table');
            tbl.className = 'kl-detail-table';
            var tbody = document.createElement('tbody');
            tbl.appendChild(tbody);

            Object.keys(parsed).forEach(function (k) {
                if (parsed[k] === null) return;   // masquer les undef
                var tr = document.createElement('tr');
                if (KEY_FIELDS.indexOf(k) !== -1) tr.className = 'kl-key';
                var td1 = el('td', '', k);
                var td2 = el('td', '', String(parsed[k]));
                tr.appendChild(td1);
                tr.appendChild(td2);
                tbody.appendChild(tr);
            });
            detail.appendChild(tbl);

            /* ── Bouton données brutes ── */
            var rawBtn = el('button', 'kl-toggle', '{ brut }');
            rawBtn.style.marginTop = '5px';
            var rawPre = el('pre', 'kl-raw', rawText);
            rawBtn.addEventListener('click', function () {
                rawPre.style.display = rawPre.style.display === 'none' ? 'block' : 'none';
            });
            var rawWrap = el('div');
            rawWrap.style.marginTop = '4px';
            rawWrap.appendChild(rawBtn);
            rawWrap.appendChild(rawPre);
            detail.appendChild(rawWrap);

            wrap.appendChild(detail);

            toggle.addEventListener('click', function () {
                if (detail.style.display === 'none') {
                    detail.style.display = 'block';
                    toggle.textContent = '▲ réduire';
                } else {
                    detail.style.display = 'none';
                    toggle.textContent = '▼ détails';
                }
            });

        } else {
            /* Logs textuels avancés (MARC BEFORE/AFTER) */
            var hasBeforeAfter = /(?:BEFORE|AFTER)\s*=\s*>/i.test(rawText);
            var looksLikeMarc = countMarcTags(rawText) >= 8;

            if (hasBeforeAfter || looksLikeMarc) {
                var toggle = el('button', 'kl-toggle kl-marc-toggle', '▼ notice structurée');
                var rawBtn = el('button', 'kl-toggle', '{ brut }');
                var detail = el('div');
                detail.style.display = 'none';

                var rawBlock = el('div', 'kl-plain', rawText);
                rawBlock.style.display = 'none';

                var actions = el('div', 'kl-inline-actions');
                actions.appendChild(toggle);
                actions.appendChild(rawBtn);
                wrap.appendChild(actions);
                detail.appendChild(buildMarcDiff(rawText));
                wrap.appendChild(detail);
                wrap.appendChild(rawBlock);

                toggle.addEventListener('click', function () {
                    var isOpen = detail.style.display === 'block';
                    detail.style.display = isOpen ? 'none' : 'block';
                    toggle.textContent = isOpen ? '▼ notice structurée' : '▲ réduire la notice';
                });

                rawBtn.addEventListener('click', function () {
                    var rawOpen = rawBlock.style.display === 'block';
                    rawBlock.style.display = rawOpen ? 'none' : 'block';
                    rawBtn.textContent = rawOpen ? '{ brut }' : '{ masquer brut }';
                });
            } else {
                /* Texte simple (chemins cron, messages courts) */
                wrap.appendChild(el('div', 'kl-plain', rawText));
            }
        }

        loginfo.textContent = '';
        loginfo.appendChild(wrap);
    }

    /* ══════════════════════════════════════════
       Mise en forme d'une ligne du tableau
    ══════════════════════════════════════════ */
    function enhanceRow(row) {
        if (row.classList.contains('kl-done')) return;
        row.classList.add('kl-done');

        var cells = row.querySelectorAll('td');
        if (cells.length < 7) return;

        /* ── Action ── */
        var actionSpan = qs('span', cells[3]);
        var actionText = actionSpan ? actionSpan.textContent.trim() : '';
        var actionDef  = ACTION_MAP[actionText];
        if (actionDef) {
            row.classList.add(actionDef.cls);
            if (actionSpan) {
                actionSpan.classList.add('kl-badge');
                actionSpan.classList.add(actionDef.badge);
            }
        }

        /* ── Module ── */
        var modSpan = qs('span', cells[2]);
        var modText = modSpan ? modSpan.textContent.trim() : '';
        var modDef  = MODULE_MAP[modText];
        if (modDef && modSpan) {
            modSpan.classList.add('kl-mod');
            modSpan.style.background   = modDef.bg;
            modSpan.style.color        = modDef.fg;
            modSpan.style.borderColor  = modDef.fg + '55';
        }

        /* ── Colonne Info ── */
        formatInfoCell(cells[5]);
    }

    function enhanceAllRows() {
        qsa('#logst tbody tr').forEach(enhanceRow);
    }

    function ensureEnhancementWithRetry(maxTries, delayMs) {
        var tries = 0;
        var timer = setInterval(function () {
            tries += 1;
            enhanceAllRows();

            var done = qsa('#logst tbody tr.kl-done').length;
            var total = qsa('#logst tbody tr').length;
            if ((total > 0 && done > 0) || tries >= maxTries) {
                clearInterval(timer);
            }
        }, delayMs);
    }

    function watchTableMutations() {
        var tbody = qs('#logst tbody');
        if (!tbody || tbody.__klObserverAttached) return;
        tbody.__klObserverAttached = true;

        var observer = new MutationObserver(function () {
            enhanceAllRows();
        });

        observer.observe(tbody, { childList: true, subtree: true });
    }

    /* ══════════════════════════════════════════
       Barre de filtres rapides
       (utilise l'API DataTables exposée globalement
        par Koha via $.fn.DataTable / window.DataTable)
    ══════════════════════════════════════════ */
    function getDT() {
        /* Koha expose DataTables via jQuery – on y accède via l'objet jQuery
           global qui reste disponible même si on n'écrit pas de code jQuery */
        if (window.jQuery && window.jQuery.fn.dataTable &&
            window.jQuery.fn.dataTable.isDataTable('#logst')) {
            return window.jQuery('#logst').DataTable();
        }
        return null;
    }

    function buildToolbar() {
        if (qs('#kl-toolbar')) return;
        var tb = el('div');
        tb.id = 'kl-toolbar';

        function addLabel(text) {
            tb.appendChild(el('span', 'kl-lbl', text));
        }
        function addSep() {
            tb.appendChild(el('span', 'kl-sep'));
        }

        /* — Modules — */
        addLabel('Module :');
        [
            { label: 'Tous',           val: '' },
            { label: 'Cron',           val: 'Tâches cron' },
            { label: 'Réservations',   val: 'Réservations' },
            { label: 'Circulation',    val: 'Circulation' },
            { label: 'Adhérents',      val: 'Adhérents' },
            { label: 'Catalogage',     val: 'Catalogage' },
            { label: 'Préf. système',  val: 'Préférences système' },
            { label: 'Acquisitions',   val: 'Acquisitions' },
        ].forEach(function (f) {
            var regex = f.val
                ? ('^' + f.val.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$')
                : '';
            var btn = el('button', 'kl-mf-btn', f.label);
            if (!f.val) btn.classList.add('kl-active');
            btn.addEventListener('click', function () {
                qsa('.kl-mf-btn', tb).forEach(function (b) { b.classList.remove('kl-active'); });
                btn.classList.add('kl-active');
                var dt = getDT();
                if (dt) dt.column(2).search(regex, true, false).draw();
            });
            tb.appendChild(btn);
        });

        addSep();

        /* — Actions — */
        addLabel('Action :');
        [
            { label: '＋ Ajouts',       val: '^(Ajouter|Créer)$' },
            { label: '✕ Suppressions',  val: '^Supprimer$' },
            { label: '✎ Modifications', val: '^Modifier$' },
        ].forEach(function (f) {
            var btn = el('button', 'kl-af-btn', f.label);
            btn.addEventListener('click', function () {
                var dt = getDT();
                if (!dt) return;
                if (btn.classList.contains('kl-active')) {
                    btn.classList.remove('kl-active');
                    dt.column(3).search('', true, false).draw();
                } else {
                    qsa('.kl-af-btn', tb).forEach(function (b) { b.classList.remove('kl-active'); });
                    btn.classList.add('kl-active');
                    dt.column(3).search(f.val, true, false).draw();
                }
            });
            tb.appendChild(btn);
        });

        addSep();

        /* — Masquer les cron — */
        addLabel('Affichage :');
        var cronHidden = false;
        var hideCron = el('button', '', 'Masquer cron');
        hideCron.addEventListener('click', function () {
            cronHidden = !cronHidden;
            hideCron.classList.toggle('kl-active', cronHidden);
            var dt = getDT();
            if (dt) dt.column(6).search(cronHidden ? '^(?!Tâche cron)' : '', true, false).draw();
        });
        tb.appendChild(hideCron);

        /* Insérer au-dessus du wrapper DataTables */
        var wrapper = qs('#logst_wrapper');
        if (wrapper) wrapper.parentNode.insertBefore(tb, wrapper);
    }

    /* ══════════════════════════════════════════
       Initialisation
    ══════════════════════════════════════════ */
    function init() {
        var table = qs('#logst');
        if (!table) return;

        function bindDT() {
            var dt = getDT();
            if (dt) {
                buildToolbar();
                enhanceAllRows();
                /* Écoute l'événement draw natif DataTables */
                if (window.jQuery) {
                    window.jQuery('#logst').on('draw.dt', enhanceAllRows);
                }
            } else {
                /* DataTables pas encore initialisé → attendre */
                if (window.jQuery) {
                    window.jQuery('#logst').one('init.dt', function () {
                        buildToolbar();
                        enhanceAllRows();
                        window.jQuery('#logst').on('draw.dt', enhanceAllRows);
                    });
                }
            }
        }

        /* Laisser Koha finir d'initialiser DataTables */
        setTimeout(bindDT, 150);

        /* Fallback : applique même si les events DataTables sont manqués */
        ensureEnhancementWithRetry(20, 300);
        setTimeout(watchTableMutations, 400);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

}());


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