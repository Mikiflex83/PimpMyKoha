(function(){"use strict";
const KT=window.KohaTools;if(!KT||!KT.Config)return;
const MODULE_ID='loan-history-timeline',CFG=KT.Config.getCanonical(MODULE_ID),Scope=KT.getService&&KT.getService("scope");
if(!CFG||!CFG.enabled||!["shadow","live"].includes(CFG.mode))return;
if(Scope&&!Scope.match(CFG.general&&CFG.general.scope).ok)return;
const runtime={
 id:MODULE_ID,
 description:'Timeline des mouvements/prêts d’une notice ou d’un lecteur avec filtre, zoom et plage Tout.',
 sourceFiles:['128-timeline-historiques-pret.js'],
 parity:"exact-legacy",
 reloadRequiredOnConfigChange:true,
 init:function(){
   if(window["__KT_PARITY_"+MODULE_ID])return;
   window["__KT_PARITY_"+MODULE_ID]=true;
   
/* ===== EXACT LEGACY SOURCE: 128-timeline-historiques-pret.js ===== */
/******************************************************************/
/*Timeline retravaillées historiques de pret*/
/********************************************************************/

(() => {
    "use strict";

    function getKohaSerialQueue() {
        if (window.DracKohaSerialQueue) return window.DracKohaSerialQueue;
        let tail = Promise.resolve();
        let lastEnd = 0;
        const MIN_GAP = 300;

        const run = (task) => {
            const job = tail.catch(() => {}).then(async () => {
                const wait = Math.max(0, MIN_GAP - (Date.now() - lastEnd));
                if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
                try {
                    return await task();
                } finally {
                    lastEnd = Date.now();
                }
            });
            tail = job.catch(() => {});
            return job;
        };

        const fetchSerial = (url, options) => run(() => fetch(url, options));
        window.DracKohaSerialQueue = { run, fetch: fetchSerial, get pending() { return tail; } };
        return window.DracKohaSerialQueue;
    }

    const KOHA_QUEUE = getKohaSerialQueue();

    // ID du rapport SQL "Historique transferts par notice" fourni avec ce pack.
    // Mettre 0 pour désactiver uniquement les transferts historiques.
    const TRANSFER_REPORT_ID = 0;


    /*
     * ============================================================
     * KOHA 25.11 - LIEU DE RETOUR + TIMELINE DE CIRCULATION
     * ============================================================
     *
     * Pages :
     * - /cgi-bin/koha/members/readingrec.pl
     * - /cgi-bin/koha/catalogue/issuehistory.pl
     *
     * Principes :
     * - aucune colonne ajoutée ;
     * - ajoute le lieu de retour dans la cellule de retour ;
     * - ajoute une timeline moderne et réversible ;
     * - masque uniquement la timeline native de issuehistory.pl ;
     * - garde intégralement les tableaux Koha ;
     * - continue à fonctionner si l'enrichissement API échoue.
     * ============================================================
     */

    const PATH = window.location.pathname;
    const IS_READER = PATH === "/cgi-bin/koha/members/readingrec.pl";
    const IS_BIBLIO = PATH === "/cgi-bin/koha/catalogue/issuehistory.pl";

    if (!IS_READER && !IS_BIBLIO) return;
    if (window.__kohaCirculationTimelineLoaded) return;
    window.__kohaCirculationTimelineLoaded = true;

const CONFIG = {
    defaultRange: "auto",
    maxReaderRows: 120,
    minTrackWidth: 760,
    debug: false
};
    const log = (...args) => CONFIG.debug && (function(){})("[Circulation timeline]", ...args);

    /* ============================================================
     * STYLE
     * ============================================================ */

    const style = document.createElement("style");
    style.textContent = `
        .koha-return-library {
            margin-top: 4px;
            font-size: .88em;
            line-height: 1.3;
            color: #4d5965;
        }
        .koha-return-library strong {
            color: #245f86;
            font-weight: 650;
        }
        .koha-return-library::before {
            content: "↳ ";
            color: #6b7785;
        }

        .krt-panel {
            margin: 18px 0;
            border: 1px solid #d6dde3;
            border-radius: 10px;
            background: #fff;
            box-shadow: 0 1px 3px rgba(0,0,0,.06);
            overflow: hidden;
        }
        .krt-header {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 16px;
            padding: 14px 16px 12px;
            border-bottom: 1px solid #e6eaee;
            background: #f8fafb;
        }
        .krt-title-wrap {
            min-width: 0;
        }
        .krt-title {
            margin: 0;
            font-size: 1.12rem;
            font-weight: 700;
            color: #27313a;
        }
        .krt-subtitle {
            margin-top: 3px;
            color: #6b7785;
            font-size: .88rem;
        }
        .krt-collapse {
            flex: 0 0 auto;
            border: 1px solid #cfd7df;
            border-radius: 6px;
            background: #fff;
            color: #384653;
            padding: 5px 9px;
            cursor: pointer;
            font-size: .85rem;
        }
        .krt-body[hidden] {
            display: none !important;
        }

        .krt-summary {
            display: grid;
            grid-template-columns: repeat(4, minmax(120px, 1fr));
            gap: 8px;
            padding: 12px 16px 4px;
        }
        .krt-card {
            border: 1px solid #e3e8ed;
            border-radius: 8px;
            background: #fff;
            padding: 9px 11px;
            min-width: 0;
        }
        .krt-card-value {
            display: block;
            color: #263542;
            font-size: 1.18rem;
            line-height: 1.1;
            font-weight: 750;
        }
        .krt-card-label {
            display: block;
            margin-top: 3px;
            color: #73808c;
            font-size: .78rem;
            line-height: 1.2;
        }

        .krt-toolbar {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            justify-content: space-between;
            gap: 8px 14px;
            padding: 10px 16px 12px;
        }
        .krt-filter {
            display: flex;
            align-items: center;
            gap: 6px;
            flex: 1 1 280px;
            max-width: 460px;
        }
        .krt-filter-input {
            width: 100%;
            min-width: 180px;
            border: 1px solid #cfd7df;
            border-radius: 6px;
            background: #fff;
            color: #263542;
            padding: 6px 9px;
            font-size: .84rem;
        }
        .krt-filter-input:focus {
            outline: 2px solid rgba(36,95,134,.18);
            border-color: #245f86;
        }
        .krt-filter-clear {
            flex: 0 0 auto;
            border: 1px solid #cfd7df;
            border-radius: 6px;
            background: #fff;
            color: #53616d;
            padding: 5px 8px;
            cursor: pointer;
            font-size: .82rem;
        }
        .krt-filter-clear:hover {
            background: #f3f6f8;
        }
        .krt-toolbar-right {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            justify-content: flex-end;
            gap: 8px 14px;
        }
        .krt-range-buttons {
            display: flex;
            flex-wrap: wrap;
            gap: 5px;
        }
        .krt-range-button {
            border: 1px solid #cfd7df;
            border-radius: 6px;
            background: #fff;
            color: #34424f;
            padding: 5px 9px;
            cursor: pointer;
            font-size: .82rem;
        }
        .krt-range-button:hover {
            background: #f3f6f8;
        }
        .krt-range-button.is-active {
            border-color: #245f86;
            background: #245f86;
            color: #fff;
        }
        .krt-legend {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            color: #66737f;
            font-size: .78rem;
        }
        .krt-legend-item {
            white-space: nowrap;
        }
        .krt-legend-dot,
        .krt-legend-line {
            display: inline-block;
            vertical-align: middle;
            margin-right: 4px;
        }
        .krt-legend-dot {
            width: 9px;
            height: 9px;
            border-radius: 50%;
            background: #2f78a8;
        }
        .krt-legend-line {
            width: 19px;
            height: 4px;
            border-radius: 3px;
            background: #2f78a8;
        }
        .krt-legend-line.is-active {
            background: repeating-linear-gradient(90deg,#2f78a8 0 6px,transparent 6px 10px);
        }
        .krt-legend-line.is-cross {
            background: #b26a16;
        }

        .krt-scroll {
            overflow-x: auto;
            padding: 0 16px 14px;
        }
        .krt-chart {
            min-width: 980px;
        }
        .krt-axis,
        .krt-row {
            display: grid;
            grid-template-columns: 220px minmax(${CONFIG.minTrackWidth}px, 1fr);
        }
        .krt-axis {
            position: sticky;
            top: 0;
            z-index: 4;
            background: #fff;
            border-top: 1px solid #edf0f2;
            border-bottom: 1px solid #dfe5ea;
        }
        .krt-axis-label {
            padding: 10px 10px 8px 2px;
            color: #65727e;
            font-size: .76rem;
            font-weight: 650;
        }
        .krt-axis-track {
            position: relative;
            height: 38px;
        }
        .krt-tick {
            position: absolute;
            top: 0;
            bottom: 0;
            width: 1px;
            background: #e3e8ec;
        }
        .krt-tick-label {
            position: absolute;
            top: 8px;
            transform: translateX(-50%);
            white-space: nowrap;
            color: #66737f;
            font-size: .72rem;
        }
        .krt-tick-label.is-first {
            transform: none;
        }
        .krt-tick-label.is-last {
            transform: translateX(-100%);
        }

        .krt-row {
            min-height: 54px;
            border-bottom: 1px solid #eef1f4;
        }
        .krt-row:last-child {
            border-bottom: 0;
        }
        .krt-row-label {
            padding: 8px 12px 7px 2px;
            min-width: 0;
        }
        .krt-row-main {
            display: block;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            font-size: .84rem;
            font-weight: 650;
            color: #263542;
        }
        .krt-row-sub {
            display: block;
            margin-top: 2px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            font-size: .72rem;
            color: #74818c;
        }
        .krt-track {
            position: relative;
            min-height: 54px;
            background-image: linear-gradient(to bottom, transparent 26px, #f1f3f5 27px, transparent 28px);
        }
        .krt-grid-line {
            position: absolute;
            top: 0;
            bottom: 0;
            width: 1px;
            background: #f0f2f4;
            pointer-events: none;
        }

        .krt-event {
            position: absolute;
            top: 17px;
            height: 20px;
            min-width: 4px;
            cursor: help;
        }
        .krt-event-line {
            position: absolute;
            left: 0;
            right: 0;
            top: 8px;
            height: 5px;
            border-radius: 4px;
            background: #2f78a8;
            opacity: .88;
        }
        .krt-event.is-cross .krt-event-line {
            background: #b26a16;
        }
        .krt-event.is-current .krt-event-line {
            background: repeating-linear-gradient(90deg,#2f78a8 0 8px,transparent 8px 12px);
        }
        .krt-event-start,
        .krt-event-end {
            position: absolute;
            top: 4px;
            width: 12px;
            height: 12px;
            border: 2px solid #fff;
            border-radius: 50%;
            background: #2f78a8;
            box-shadow: 0 0 0 1px #2f78a8;
        }
        .krt-event.is-cross .krt-event-end {
            background: #b26a16;
            box-shadow: 0 0 0 1px #b26a16;
        }
        .krt-event-start {
            left: -5px;
        }
        .krt-event-end {
            right: -5px;
        }
        .krt-event.is-current .krt-event-end {
            width: 0;
            height: 0;
            top: 2px;
            right: -3px;
            border-radius: 0;
            border-top: 8px solid transparent;
            border-bottom: 8px solid transparent;
            border-left: 10px solid #2f78a8;
            border-right: 0;
            background: transparent;
            box-shadow: none;
        }
        .krt-renewal {
            position: absolute;
            top: -7px;
            transform: translateX(-50%);
            color: #6b4f9d;
            font-size: .82rem;
            font-weight: 800;
            line-height: 1;
        }
        .krt-event-site {
            position: absolute;
            top: 20px;
            white-space: nowrap;
            font-size: .67rem;
            color: #66737f;
        }
        .krt-event-site.is-start {
            left: -4px;
        }
        .krt-event-site.is-end {
            right: -4px;
            text-align: right;
        }
        .krt-event-warning {
            position: absolute;
            top: -8px;
            right: -8px;
            font-size: .72rem;
            line-height: 1;
        }

        .krt-empty,
        .krt-limit-note {
            padding: 14px 16px;
            color: #6a7681;
            font-size: .84rem;
        }
        .krt-limit-note {
            padding-top: 6px;
            border-top: 1px solid #edf0f2;
            background: #fafbfc;
        }

        .krt-tooltip {
            position: fixed;
            z-index: 99999;
            max-width: 330px;
            pointer-events: none;
            border: 1px solid rgba(20,32,42,.15);
            border-radius: 7px;
            background: rgba(30,39,47,.96);
            color: #fff;
            padding: 8px 10px;
            box-shadow: 0 5px 18px rgba(0,0,0,.22);
            font-size: .76rem;
            line-height: 1.45;
            white-space: pre-line;
        }
        .krt-tooltip[hidden] {
            display: none !important;
        }


        .krt-point {
            position: absolute;
            top: 7px;
            width: 14px;
            height: 14px;
            transform: translateX(-50%);
            border: 2px solid #fff;
            border-radius: 50%;
            box-shadow: 0 0 0 1px currentColor;
            cursor: help;
            z-index: 3;
        }
        .krt-point.is-acquisition { color:#568132; background:#568132; }
        .krt-point.is-transfer { color:#4b78a0; background:#4b78a0; border-radius:3px; transform:translateX(-50%) rotate(45deg); }
        .krt-point.is-seen { color:#7a6597; background:#7a6597; }
        .krt-point.is-cancelled { color:#a24e47; background:#a24e47; }

        @media (max-width: 900px) {
            .krt-summary {
                grid-template-columns: repeat(2, minmax(120px, 1fr));
            }
            .krt-header {
                align-items: center;
            }
        }
    `;
    document.head.appendChild(style);

    /* ============================================================
     * UTILITAIRES
     * ============================================================ */

    function normalizeText(value) {
        return String(value || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/\s+/g, " ")
            .trim()
            .toLowerCase();
    }

    function parseKohaDate(value) {
        if (!value) return null;
        const raw = String(value).trim();
        if (!raw || raw === "checked out") return null;

        if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(raw)) {
            const [datePart, timePart] = raw.split(" ");
            const [y, m, d] = datePart.split("-").map(Number);
            const [hh, mm, ss] = timePart.split(":").map(Number);
            return new Date(y, m - 1, d, hh, mm, ss);
        }

        if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(raw)) {
            const [datePart, timePart] = raw.split(" ");
            const [y, m, d] = datePart.split("-").map(Number);
            const [hh, mm] = timePart.split(":").map(Number);
            return new Date(y, m - 1, d, hh, mm, 0);
        }

        const parsed = new Date(raw);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    function dateMs(value) {
        const d = value instanceof Date ? value : parseKohaDate(value);
        return d ? d.getTime() : null;
    }

    function formatDateTime(date) {
        if (!date) return "—";
        return new Intl.DateTimeFormat("fr-FR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }).format(date);
    }

    function formatAxisDate(date, rangeKey) {
        if (!date) return "";
        if (rangeKey === "6m" || rangeKey === "1y") {
            return new Intl.DateTimeFormat("fr-FR", {
                month: "short",
                year: "2-digit"
            }).format(date).replace(".", "");
        }
        return new Intl.DateTimeFormat("fr-FR", {
            month: "short",
            year: "numeric"
        }).format(date).replace(".", "");
    }

    function daysBetween(start, end) {
        if (!start || !end) return null;
        return Math.max(0, Math.round((end.getTime() - start.getTime()) / 86400000));
    }

    function getColumnIndex(table, possibleNames) {
        const expected = possibleNames.map(normalizeText);
        const headers = Array.from(table.querySelectorAll("thead tr:first-child th"));
        return headers.findIndex((th) => {
            const title = th.querySelector(".dt-column-title")?.textContent || th.textContent || "";
            const normalized = normalizeText(title);
            return expected.some((name) => normalized === name || normalized.includes(name));
        });
    }

    function getItemnumber(row) {
        const link = row.querySelector('a[href*="itemnumber="]');
        if (!link) return null;
        try {
            const url = new URL(link.getAttribute("href"), window.location.origin);
            return url.searchParams.get("itemnumber");
        } catch (_) {
            return null;
        }
    }

    function cleanSiteText(value) {
        return String(value || "").replace(/\s+/g, " ").trim();
    }

    function createEl(tag, className, text) {
        const el = document.createElement(tag);
        if (className) el.className = className;
        if (text !== undefined && text !== null) el.textContent = text;
        return el;
    }

    /* ============================================================
     * LECTURE DU TABLEAU KOHA
     * ============================================================ */

    function getBiblioPageTitle() {
        if (!IS_BIBLIO) return "";

        const candidates = [
            document.querySelector("#catalogue_detail_biblio h1"),
            document.querySelector("main h1"),
            document.querySelector("#main_intranet-main h1"),
            document.querySelector("h1")
        ];

        for (const node of candidates) {
            const value = cleanSiteText(node?.textContent || "");
            if (value) return value;
        }

        return "";
    }

    async function waitForKohaTable(selector, timeoutMs = 15000) {
        const started = Date.now();

        return new Promise((resolve) => {
            const findReadyTable = () => {
                const table = document.querySelector(selector);
                if (!table) return null;

                const rows = table.querySelectorAll("tbody tr");
                const usable = Array.from(rows).some((tr) => tr.cells && tr.cells.length > 1);

                return usable ? table : null;
            };

            const readyNow = findReadyTable();
            if (readyNow) {
                resolve(readyNow);
                return;
            }

            const observer = new MutationObserver(() => {
                const ready = findReadyTable();
                if (ready) {
                    observer.disconnect();
                    resolve(ready);
                    return;
                }

                if (Date.now() - started >= timeoutMs) {
                    observer.disconnect();
                    resolve(document.querySelector(selector));
                }
            });

            observer.observe(document.documentElement, {
                childList: true,
                subtree: true
            });

            window.setTimeout(() => {
                observer.disconnect();
                resolve(findReadyTable() || document.querySelector(selector));
            }, timeoutMs);
        });
    }

    function parseTable(table) {
        const columns = {
            title: IS_READER ? getColumnIndex(table, ["Titre"]) : -1,
            barcode: getColumnIndex(table, ["Code à barres", "Code a barres"]),
            checkoutSite: getColumnIndex(table, ["Emprunté à", "Emprunte a"]),
            checkoutDate: getColumnIndex(table, ["Emprunté le", "Emprunte le"]),
            returnDate: getColumnIndex(table, IS_READER ? ["Rendu le"] : ["Retour effectif"]),
            renewals: IS_READER
                ? getColumnIndex(table, ["Nombre de renouvellements"])
                : getColumnIndex(table, ["Renouvelé", "Renouvele"])
        };

        if (columns.barcode < 0 || columns.checkoutDate < 0 || columns.returnDate < 0) {
            (function(){})("[Circulation timeline] Colonnes indispensables introuvables", columns);
            return [];
        }

        const rows = [];
        const biblioPageTitle = getBiblioPageTitle();

        table.querySelectorAll("tbody tr").forEach((tr, index) => {
            const cells = tr.cells;
            if (!cells || !cells[columns.barcode] || !cells[columns.checkoutDate] || !cells[columns.returnDate]) return;

            const checkoutCell = cells[columns.checkoutDate];
            const returnCell = cells[columns.returnDate];
            const start = parseKohaDate(checkoutCell.dataset.order || checkoutCell.textContent);
            if (!start) return;

            const returnRaw = returnCell.dataset.order || "";
            const end = parseKohaDate(returnRaw);
            const current = !end;
            const itemId = getItemnumber(tr);
            const barcode = cleanSiteText(cells[columns.barcode].textContent) || itemId || `Ligne ${index + 1}`;
            const title = IS_READER
                ? cleanSiteText(cells[columns.title]?.querySelector(".biblio-title")?.textContent || cells[columns.title]?.textContent)
                : biblioPageTitle;
            const checkoutSite = columns.checkoutSite >= 0 ? cleanSiteText(cells[columns.checkoutSite]?.textContent) : "";
            const renewalsRaw = columns.renewals >= 0 ? cleanSiteText(cells[columns.renewals]?.textContent) : "";
            const renewalsCount = /^\d+$/.test(renewalsRaw) ? Number(renewalsRaw) : (/^oui\b/i.test(renewalsRaw) ? 1 : 0);

            rows.push({
                rowElement: tr,
                returnCell,
                itemId: itemId ? String(itemId) : null,
                barcode,
                title,
                checkoutSite,
                checkoutSiteCode: null,
                returnSite: "",
                returnSiteCode: null,
                start,
                end,
                current,
                renewalsCount,
                lastRenewedDate: null,
                apiCheckout: null
            });
        });

        return rows;
    }

    /* ============================================================
     * API KOHA - ENRICHISSEMENT FACULTATIF
     * ============================================================ */

    async function fetchJson(url, options = {}) {
        const response = await KOHA_QUEUE.fetch(url, {
            method: "GET",
            credentials: "same-origin",
            headers: {
                Accept: "application/json",
                ...(options.headers || {})
            }
        });

        if (!response.ok) {
            let details = "";
            try { details = await response.text(); } catch (_) { /* noop */ }
            const error = new Error(`API Koha ${response.status} ${response.statusText}\nURL : ${url}\nRéponse : ${details}`);
            error.status = response.status;
            throw error;
        }
        return { response, data: await response.json() };
    }

    async function fetchPaged(baseUrl) {
        const out = [];
        const perPage = 100;
        let page = 1;

        while (page <= 100) {
            const url = new URL(baseUrl, window.location.origin);
            url.searchParams.set("_page", String(page));
            url.searchParams.set("_per_page", String(perPage));

            const { response, data } = await fetchJson(url.toString());
            if (!Array.isArray(data)) break;
            out.push(...data);

            const total = Number(response.headers.get("X-Total-Count") || 0);
            if (total && out.length >= total) break;
            if (data.length < perPage) break;
            page += 1;
        }

        return out;
    }

    async function loadLibraries() {
        // Pas de pagination ici : certaines installations sont plus strictes
        // sur les paramètres de /public/libraries.
        const { data } = await fetchJson("/api/v1/public/libraries");
        if (!Array.isArray(data)) return { byCode: new Map(), byName: new Map() };

        const byCode = new Map();
        const byName = new Map();
        data.forEach((library) => {
            if (!library?.library_id) return;
            const code = String(library.library_id);
            const name = library.name || code;
            byCode.set(code, name);
            byName.set(normalizeText(name), code);
            byName.set(normalizeText(code), code);
        });
        return { byCode, byName };
    }

    async function loadHistoricalCheckouts() {
        const params = new URLSearchParams(window.location.search);

        if (IS_BIBLIO) {
            const biblioId = params.get("biblionumber");
            if (!biblioId) return [];
            return fetchPaged(`/api/v1/biblios/${encodeURIComponent(biblioId)}/checkouts?checked_in=true`);
        }

        const patronId = params.get("borrowernumber");
        if (!patronId) return [];

        // Forme documentée par Koha. Certaines installations peuvent être
        // plus strictes sur le parsing des paramètres ; en cas de 400,
        // on retente avec le filtre q JSON, sans casser la timeline.
        try {
            return await fetchPaged(`/api/v1/checkouts?patron_id=${encodeURIComponent(patronId)}&checked_in=true`);
        } catch (error) {
            if (error?.status !== 400) throw error;

            const fallback = new URL("/api/v1/checkouts", window.location.origin);
            fallback.searchParams.set("checked_in", "true");
            fallback.searchParams.set("q", JSON.stringify({ patron_id: Number(patronId) }));
            return fetchPaged(fallback.toString());
        }
    }

    function matchCheckout(row, candidates) {
        if (!row.itemId || !candidates.length) return null;
        const startMs = row.start.getTime();
        const endMs = row.end?.getTime() ?? null;

        const sameItem = candidates.filter((c) => String(c.item_id) === row.itemId);
        if (!sameItem.length) return null;

        const score = (checkout) => {
            const apiStart = dateMs(checkout.checkout_date);
            const apiEnd = dateMs(checkout.checkin_date);
            let value = 0;
            if (apiStart !== null) value += Math.min(Math.abs(apiStart - startMs), 86400000) / 1000;
            else value += 1000000;
            if (endMs !== null && apiEnd !== null) value += Math.min(Math.abs(apiEnd - endMs), 86400000) / 1000;
            else if (endMs !== null) value += 1000000;
            return value;
        };

        return sameItem
            .map((checkout) => ({ checkout, score: score(checkout) }))
            .sort((a, b) => a.score - b.score)[0]?.checkout || null;
    }

    function enrichRows(rows, checkouts, libraries) {
        rows.forEach((row) => {
            if (row.checkoutSite) {
                row.checkoutSiteCode = libraries.byName.get(normalizeText(row.checkoutSite)) || null;
            }

            const checkout = matchCheckout(row, checkouts);
            if (!checkout) return;

            row.apiCheckout = checkout;
            row.returnSiteCode = checkout.checkin_library_id ? String(checkout.checkin_library_id) : null;
            row.returnSite = row.returnSiteCode
                ? (libraries.byCode.get(row.returnSiteCode) || row.returnSiteCode)
                : "";

            if (!row.checkoutSiteCode && checkout.library_id) {
                row.checkoutSiteCode = String(checkout.library_id);
            }
            if (!row.checkoutSite && row.checkoutSiteCode) {
                row.checkoutSite = libraries.byCode.get(row.checkoutSiteCode) || row.checkoutSiteCode;
            }

            const apiRenewals = Number(checkout.renewals_count);
            if (Number.isFinite(apiRenewals)) row.renewalsCount = apiRenewals;
            row.lastRenewedDate = parseKohaDate(checkout.last_renewed_date);
        });
    }


    async function loadBiblioItems() {
        if (!IS_BIBLIO) return [];
        const biblioId = new URLSearchParams(window.location.search).get("biblionumber");
        if (!biblioId) return [];
        return fetchPaged(`/api/v1/public/biblios/${encodeURIComponent(biblioId)}/items`);
    }

    async function loadBiblioTransfers() {
        if (!IS_BIBLIO || !TRANSFER_REPORT_ID) return [];
        const biblioId = new URLSearchParams(window.location.search).get("biblionumber");
        if (!biblioId) return [];

        const all = [];
        let cursor = 0;
        let lots = 0;

        while (lots < 200) {
            lots += 1;
            const url = new URL("/cgi-bin/koha/svc/report", window.location.origin);
            url.searchParams.set("id", String(TRANSFER_REPORT_ID));
            url.searchParams.set("annotated", "1");
            url.searchParams.append("param_names", "Biblionumber");
            url.searchParams.append("sql_params", String(biblioId));
            url.searchParams.append("param_names", "Après ID");
            url.searchParams.append("sql_params", String(cursor));

            const { data } = await fetchJson(url.toString());
            if (!Array.isArray(data) || !data.length) break;
            all.push(...data);

            const last = Number(
                data[data.length - 1].Transfer_ID ??
                data[data.length - 1].transfer_id ??
                0
            );
            if (!Number.isFinite(last) || last <= cursor) break;
            cursor = last;
            if (data.length < 500) break;
        }

        return all;
    }

    function itemValue(item, ...keys) {
        for (const key of keys) {
            if (item && item[key] !== undefined && item[key] !== null && item[key] !== "") {
                return item[key];
            }
        }
        return null;
    }

    function buildLifeByItem(items, transfers, libraries) {
        const map = new Map();

        (items || []).forEach((item) => {
            const itemId = String(itemValue(item, "item_id", "itemnumber") || "");
            if (!itemId) return;

            const acquisition = parseKohaDate(itemValue(item, "acquisition_date", "dateaccessioned"));
            const lastSeen = parseKohaDate(itemValue(item, "last_seen_date", "datelastseen"));
            const homeCode = itemValue(item, "home_library_id", "homebranch");
            const holdingCode = itemValue(item, "holding_library_id", "holdingbranch");

            map.set(itemId, {
                acquisition,
                lastSeen,
                homeCode: homeCode ? String(homeCode) : "",
                holdingCode: holdingCode ? String(holdingCode) : "",
                points: []
            });
        });

        (transfers || []).forEach((t) => {
            const itemId = String(t.Item_ID ?? t.item_id ?? t.itemnumber ?? "");
            if (!itemId) return;
            if (!map.has(itemId)) map.set(itemId, { acquisition:null, lastSeen:null, homeCode:"", holdingCode:"", points:[] });
            const target = map.get(itemId);
            const from = String(t.From_Site ?? t.from_site ?? t.frombranch ?? "");
            const to = String(t.To_Site ?? t.to_site ?? t.tobranch ?? "");
            const route = [from, to].filter(Boolean).map(code => libraries.byCode.get(code) || code).join(" → ");
            const reason = String(t.Raison ?? t.reason ?? "");
            const cancelledReason = String(t.Raison_annulation ?? t.cancellation_reason ?? "");

            const add = (dateValue, type, label, extra = "") => {
                const date = parseKohaDate(dateValue);
                if (!date) return;
                target.points.push({ date, type, label, site:route, extra });
            };

            add(t.Demande_le ?? t.daterequested, "transfer", "Transfert demandé", reason);
            add(t.Envoye_le ?? t.datesent, "transfer", "Transfert envoyé", reason);
            add(t.Arrive_le ?? t.datearrived, "transfer", "Transfert arrivé", reason);
            add(t.Annule_le ?? t.datecancelled, "cancelled", "Transfert annulé", cancelledReason || reason);
        });

        map.forEach((life) => {
            if (life.acquisition) {
                const site = life.homeCode ? (libraries.byCode.get(life.homeCode) || life.homeCode) : "";
                life.points.push({ date:life.acquisition, type:"acquisition", label:"Acquisition / entrée dans Koha", site, extra:"" });
            }
            if (life.lastSeen) {
                const code = life.holdingCode || life.homeCode;
                const site = code ? (libraries.byCode.get(code) || code) : "";
                life.points.push({ date:life.lastSeen, type:"seen", label:"Vu / scanné pour la dernière fois", site, extra:"" });
            }
            life.points.sort((a,b) => a.date - b.date);
        });

        return map;
    }

    /* ============================================================
     * LIEU DE RETOUR DANS LA CELLULE EXISTANTE
     * ============================================================ */

    function annotateReturnCells(rows) {
        rows.forEach((row) => {
            row.returnCell?.querySelectorAll(".koha-return-library").forEach((el) => el.remove());
            if (!row.end || !row.returnSite) return;

            const info = createEl("div", "koha-return-library");
            const label = document.createTextNode("Lieu de retour : ");
            const strong = createEl("strong", null, row.returnSite);
            info.title = row.returnSiteCode ? `Code site : ${row.returnSiteCode}` : "";
            info.append(label, strong);
            row.returnCell.appendChild(info);
        });
    }

    /* ============================================================
     * TIMELINE - DONNÉES
     * ============================================================ */

    function isCrossSite(row) {
        if (!row.end || !row.returnSite) return false;
        if (row.checkoutSiteCode && row.returnSiteCode) {
            return row.checkoutSiteCode !== row.returnSiteCode;
        }
        return normalizeText(row.checkoutSite) !== normalizeText(row.returnSite);
    }

    function computeRange(rangeKey, rows) {
        const now = new Date();
        let start;

        if (rangeKey === "6m") {
            start = new Date(now);
            start.setMonth(start.getMonth() - 6);
        } else if (rangeKey === "1y") {
            start = new Date(now);
            start.setFullYear(start.getFullYear() - 1);
        } else if (rangeKey === "3y") {
            start = new Date(now);
            start.setFullYear(start.getFullYear() - 3);
        } else {
            let earliest = rows.reduce((min, row) => Math.min(min, row.start.getTime()), now.getTime());
            if (IS_BIBLIO && window.__krtLifeByItem) {
                window.__krtLifeByItem.forEach((life) => {
                    (life.points || []).forEach((point) => {
                        earliest = Math.min(earliest, point.date.getTime());
                    });
                });
            }
            start = new Date(earliest);
            start.setDate(start.getDate() - 7);
        }

        const end = new Date(now);
        end.setDate(end.getDate() + 2);
        return { start, end };
    }

    function rowIntersects(row, range) {
        const rowEnd = row.end || new Date();
        return row.start <= range.end && rowEnd >= range.start;
    }

    function positionPct(date, range) {
        const total = range.end.getTime() - range.start.getTime();
        if (total <= 0) return 0;
        return Math.max(0, Math.min(100, ((date.getTime() - range.start.getTime()) / total) * 100));
    }

    function makeTicks(range, count = 6) {
        const ticks = [];
        const total = range.end.getTime() - range.start.getTime();
        for (let i = 0; i <= count; i += 1) {
            ticks.push(new Date(range.start.getTime() + (total * i / count)));
        }
        return ticks;
    }

    function groupRowsForTimeline(rows, range) {
        const visible = rows.filter((row) => rowIntersects(row, range));

        if (IS_BIBLIO) {
            const map = new Map();
            visible.forEach((row) => {
                const key = row.itemId || row.barcode;
                if (!map.has(key)) {
                    map.set(key, {
                        key,
                        main: row.barcode,
                        sub: row.itemId ? `Exemplaire ${row.itemId}` : "",
                        events: [],
                        points: window.__krtLifeByItem?.get(String(row.itemId || ""))?.points || []
                    });
                }
                map.get(key).events.push(row);
            });
            return Array.from(map.values())
                .sort((a, b) => a.main.localeCompare(b.main, "fr", { numeric: true }));
        }

        return visible
            .sort((a, b) => b.start - a.start)
            .slice(0, CONFIG.maxReaderRows)
            .map((row, index) => ({
                key: `${row.itemId || row.barcode}-${row.start.getTime()}-${index}`,
                main: row.title || row.barcode,
                sub: row.title ? row.barcode : (row.itemId ? `Exemplaire ${row.itemId}` : ""),
                events: [row],
                points: []
            }));
    }

    function buildTooltip(row, libraries) {
        const lines = [];
        lines.push(`${row.current ? "Prêt en cours" : "Prêt terminé"}`);
        lines.push(`Prêt : ${formatDateTime(row.start)}`);
        if (row.checkoutSite) lines.push(`Site de prêt : ${row.checkoutSite}`);

        if (row.end) {
            lines.push(`Retour : ${formatDateTime(row.end)}`);
            if (row.returnSite) lines.push(`Site de retour : ${row.returnSite}`);
            const duration = daysBetween(row.start, row.end);
            if (duration !== null) lines.push(`Durée : ${duration} jour${duration > 1 ? "s" : ""}`);
        } else {
            lines.push("Retour : en cours");
        }

        if (row.renewalsCount > 0) {
            lines.push(`Renouvellement${row.renewalsCount > 1 ? "s" : ""} : ${row.renewalsCount}`);
        }
        if (row.lastRenewedDate) {
            lines.push(`Dernier renouvellement : ${formatDateTime(row.lastRenewedDate)}`);
        }
        if (isCrossSite(row)) lines.push("⚠ Retour dans un autre site");

        return lines.join("\n");
    }

    /* ============================================================
     * TIMELINE - RENDU
     * ============================================================ */

    function buildSummary(rows) {
        const distinctItems = new Set(rows.map((r) => r.itemId || r.barcode)).size;
        const completed = rows.filter((r) => r.end).length;
        const current = rows.filter((r) => r.current).length;
        const cross = rows.filter(isCrossSite).length;
        const hasReturnSiteData = rows.some((r) => Boolean(r.returnSite));
        const crossValue = hasReturnSiteData ? cross : "—";

        if (IS_BIBLIO) {
            return [
                [distinctItems, "exemplaire(s)"],
                [rows.length, "prêt(s) affiché(s)"],
                [current, "prêt(s) en cours"],
                [crossValue, "retour(s) inter-sites"]
            ];
        }

        return [
            [rows.length, "prêt(s) dans l'historique"],
            [distinctItems, "exemplaire(s) différent(s)"],
            [current, "prêt(s) en cours"],
            [crossValue, "retour(s) inter-sites"]
        ];
    }

    function createTimelinePanel(rows) {
        if (!rows.length) return null;

        const panel = createEl("section", "krt-panel");
        panel.id = IS_READER ? "krt-reader-timeline" : "krt-biblio-timeline";

        const header = createEl("div", "krt-header");
        const titleWrap = createEl("div", "krt-title-wrap");
        titleWrap.append(
            createEl("h3", "krt-title", IS_READER ? "Parcours des prêts du lecteur" : "Parcours des exemplaires"),
            createEl("div", "krt-subtitle", IS_READER
                ? "Une ligne par prêt : site de prêt, durée, retour et circulation inter-sites."
                : "Une ligne par exemplaire : acquisition, prêts, retours, transferts et dernière activité connue sur une même échelle temporelle.")
        );
        const collapse = createEl("button", "krt-collapse", "Masquer");
        collapse.type = "button";
        header.append(titleWrap, collapse);

        const body = createEl("div", "krt-body");

        const summary = createEl("div", "krt-summary");
        buildSummary(rows).forEach(([value, label]) => {
            const card = createEl("div", "krt-card");
            card.append(
                createEl("span", "krt-card-value", String(value)),
                createEl("span", "krt-card-label", label)
            );
            summary.appendChild(card);
        });

        const toolbar = createEl("div", "krt-toolbar");

        const filter = createEl("div", "krt-filter");
        const filterInput = createEl("input", "krt-filter-input");
        filterInput.type = "search";
        filterInput.placeholder = "Filtrer par titre ou code-barres…";
        filterInput.autocomplete = "off";
        filterInput.setAttribute("aria-label", "Filtrer la timeline par titre ou code-barres");

        const filterClear = createEl("button", "krt-filter-clear", "Effacer");
        filterClear.type = "button";
        filterClear.hidden = true;
        filter.append(filterInput, filterClear);

        const toolbarRight = createEl("div", "krt-toolbar-right");
        const rangeButtons = createEl("div", "krt-range-buttons");
        const ranges = [
            ["6m", "6 mois"],
            ["1y", "1 an"],
            ["3y", "3 ans"],
            ["all", "Tout"]
        ];
        ranges.forEach(([key, label]) => {
            const button = createEl("button", "krt-range-button", label);
            button.type = "button";
            button.dataset.range = key;
            if (key === CONFIG.defaultRange) button.classList.add("is-active");
            rangeButtons.appendChild(button);
        });

        const legend = createEl("div", "krt-legend");
        legend.innerHTML = `
            <span class="krt-legend-item"><span class="krt-legend-line"></span>prêt terminé</span>
            <span class="krt-legend-item"><span class="krt-legend-line is-active"></span>prêt en cours</span>
            <span class="krt-legend-item"><span class="krt-legend-line is-cross"></span>retour inter-sites</span>
            <span class="krt-legend-item">↻ renouvellement</span>
            ${IS_BIBLIO ? `
            <span class="krt-legend-item"><span class="krt-legend-dot" style="background:#568132"></span>acquisition</span>
            <span class="krt-legend-item"><span class="krt-legend-dot" style="background:#4b78a0"></span>transfert</span>
            <span class="krt-legend-item"><span class="krt-legend-dot" style="background:#7a6597"></span>vu la dernière fois</span>` : ""}
        `;

        toolbarRight.append(rangeButtons, legend);
        toolbar.append(filter, toolbarRight);

        const scroll = createEl("div", "krt-scroll");
        const chart = createEl("div", "krt-chart");
        scroll.appendChild(chart);

        const tooltip = createEl("div", "krt-tooltip");
        tooltip.hidden = true;
        document.body.appendChild(tooltip);

        body.append(summary, toolbar, scroll);
        panel.append(header, body);

        function hideTooltip() {
            tooltip.hidden = true;
        }

        function showTooltip(event, text) {
            tooltip.textContent = text;
            tooltip.hidden = false;
            moveTooltip(event);
        }

        function moveTooltip(event) {
            if (tooltip.hidden) return;
            const margin = 14;
            const rect = tooltip.getBoundingClientRect();
            let x = event.clientX + 14;
            let y = event.clientY + 14;
            if (x + rect.width > window.innerWidth - margin) x = event.clientX - rect.width - 14;
            if (y + rect.height > window.innerHeight - margin) y = event.clientY - rect.height - 14;
            tooltip.style.left = `${Math.max(margin, x)}px`;
            tooltip.style.top = `${Math.max(margin, y)}px`;
        }

        let currentRangeKey = CONFIG.defaultRange;

        function rowMatchesFilter(row, query) {
            if (!query) return true;

            const haystack = normalizeText([
                row.title,
                row.barcode,
                row.itemId,
                row.checkoutSite,
                row.checkoutSiteCode,
                row.returnSite,
                row.returnSiteCode
            ].filter(Boolean).join(" "));

            return haystack.includes(query);
        }

        function refreshSummary(filteredRows) {
            summary.replaceChildren();

            buildSummary(filteredRows).forEach(([value, label]) => {
                const card = createEl("div", "krt-card");
                card.append(
                    createEl("span", "krt-card-value", String(value)),
                    createEl("span", "krt-card-label", label)
                );
                summary.appendChild(card);
            });
        }

        function render(rangeKey = currentRangeKey) {
            currentRangeKey = rangeKey;
            chart.replaceChildren();

            const query = normalizeText(filterInput.value);
            const filteredRows = rows.filter((row) => rowMatchesFilter(row, query));
            filterClear.hidden = !query;

            refreshSummary(filteredRows);

            const rangeBase = filteredRows.length ? filteredRows : rows;
            const range = computeRange(rangeKey, rangeBase);
            const groups = groupRowsForTimeline(filteredRows, range);
            const ticks = makeTicks(range, 6);

            const axis = createEl("div", "krt-axis");
            axis.appendChild(createEl("div", "krt-axis-label", IS_READER ? "Document" : "Exemplaire"));
            const axisTrack = createEl("div", "krt-axis-track");
            ticks.forEach((tick, index) => {
                const pct = positionPct(tick, range);
                const line = createEl("div", "krt-tick");
                line.style.left = `${pct}%`;
                axisTrack.appendChild(line);

                const label = createEl("div", "krt-tick-label", formatAxisDate(tick, rangeKey));
                label.style.left = `${pct}%`;
                if (index === 0) label.classList.add("is-first");
                if (index === ticks.length - 1) label.classList.add("is-last");
                axisTrack.appendChild(label);
            });
            axis.appendChild(axisTrack);
            chart.appendChild(axis);

            if (!groups.length) {
                chart.appendChild(createEl("div", "krt-empty", query ? "Aucun prêt ne correspond à ce titre ou code-barres sur cette période." : "Aucun prêt sur cette période."));
                return;
            }

            groups.forEach((group) => {
                const rowEl = createEl("div", "krt-row");
                const label = createEl("div", "krt-row-label");
                label.append(
                    createEl("span", "krt-row-main", group.main),
                    createEl("span", "krt-row-sub", group.sub)
                );

                const track = createEl("div", "krt-track");
                ticks.forEach((tick) => {
                    const grid = createEl("div", "krt-grid-line");
                    grid.style.left = `${positionPct(tick, range)}%`;
                    track.appendChild(grid);
                });

                group.events.forEach((loan) => {
                    const visualStart = loan.start < range.start ? range.start : loan.start;
                    const rawEnd = loan.end || new Date();
                    const visualEnd = rawEnd > range.end ? range.end : rawEnd;
                    const left = positionPct(visualStart, range);
                    const right = positionPct(visualEnd, range);
                    const width = Math.max(0.55, right - left);

                    const event = createEl("div", "krt-event");
                    event.style.left = `${left}%`;
                    event.style.width = `${width}%`;
                    if (loan.current) event.classList.add("is-current");
                    if (isCrossSite(loan)) event.classList.add("is-cross");

                    event.append(
                        createEl("span", "krt-event-line"),
                        createEl("span", "krt-event-start"),
                        createEl("span", "krt-event-end")
                    );

                    const siteStart = loan.checkoutSiteCode || loan.checkoutSite;
                    const siteEnd = loan.returnSiteCode || loan.returnSite;
                    if (siteStart) event.appendChild(createEl("span", "krt-event-site is-start", siteStart));
                    if (siteEnd && !loan.current && width >= 4) event.appendChild(createEl("span", "krt-event-site is-end", siteEnd));

                    if (loan.lastRenewedDate && loan.lastRenewedDate >= visualStart && loan.lastRenewedDate <= visualEnd) {
                        const renewal = createEl("span", "krt-renewal", loan.renewalsCount > 1 ? `↻${loan.renewalsCount}` : "↻");
                        const renewPctGlobal = positionPct(loan.lastRenewedDate, range);
                        const renewPctLocal = width > 0 ? ((renewPctGlobal - left) / width) * 100 : 50;
                        renewal.style.left = `${Math.max(0, Math.min(100, renewPctLocal))}%`;
                        event.appendChild(renewal);
                    } else if (loan.renewalsCount > 0) {
                        const renewal = createEl("span", "krt-renewal", `↻${loan.renewalsCount}`);
                        renewal.style.left = "50%";
                        event.appendChild(renewal);
                    }

                    if (isCrossSite(loan)) {
                        event.appendChild(createEl("span", "krt-event-warning", "⚠"));
                    }

                    const tooltipText = buildTooltip(loan);
                    event.setAttribute("aria-label", tooltipText.replace(/\n/g, ". "));
                    event.tabIndex = 0;
                    event.addEventListener("mouseenter", (e) => showTooltip(e, tooltipText));
                    event.addEventListener("mousemove", moveTooltip);
                    event.addEventListener("mouseleave", hideTooltip);
                    event.addEventListener("focus", (e) => {
                        const rect = event.getBoundingClientRect();
                        showTooltip({ clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 }, tooltipText);
                    });
                    event.addEventListener("blur", hideTooltip);

                    track.appendChild(event);
                });

                if (IS_BIBLIO && Array.isArray(group.points)) {
                    group.points.forEach((point) => {
                        if (point.date < range.start || point.date > range.end) return;
                        const marker = createEl("span", `krt-point is-${point.type}`);
                        marker.style.left = `${positionPct(point.date, range)}%`;
                        const text = [
                            point.label,
                            `Date : ${formatDateTime(point.date)}`,
                            point.site ? `Site : ${point.site}` : "",
                            point.extra ? `Motif : ${point.extra}` : ""
                        ].filter(Boolean).join("\n");
                        marker.tabIndex = 0;
                        marker.setAttribute("aria-label", text.replace(/\n/g, ". "));
                        marker.addEventListener("mouseenter", (e) => showTooltip(e, text));
                        marker.addEventListener("mousemove", moveTooltip);
                        marker.addEventListener("mouseleave", hideTooltip);
                        marker.addEventListener("focus", (e) => {
                            const rect = marker.getBoundingClientRect();
                            showTooltip({ clientX: rect.left, clientY: rect.top }, text);
                        });
                        marker.addEventListener("blur", hideTooltip);
                        track.appendChild(marker);
                    });
                }

                rowEl.append(label, track);
                chart.appendChild(rowEl);
            });

            if (IS_READER) {
                const totalVisible = filteredRows.filter((row) => rowIntersects(row, range)).length;
                if (totalVisible > CONFIG.maxReaderRows) {
                    chart.appendChild(createEl(
                        "div",
                        "krt-limit-note",
                        `Pour préserver la lisibilité, les ${CONFIG.maxReaderRows} prêts les plus récents de cette période sont affichés sur la timeline (${totalVisible} au total). Le tableau Koha reste complet.`
                    ));
                }
            }
        }

        rangeButtons.addEventListener("click", (event) => {
            const button = event.target.closest(".krt-range-button");
            if (!button) return;
            rangeButtons.querySelectorAll(".krt-range-button").forEach((b) => b.classList.remove("is-active"));
            button.classList.add("is-active");
            render(button.dataset.range);
        });

        filterInput.addEventListener("input", () => {
            render(currentRangeKey);
        });

        filterClear.addEventListener("click", () => {
            filterInput.value = "";
            filterInput.focus();
            render(currentRangeKey);
        });

        collapse.addEventListener("click", () => {
            body.hidden = !body.hidden;
            collapse.textContent = body.hidden ? "Afficher" : "Masquer";
        });

        // Lien profond depuis detail.pl :
        // ?krt_barcode=...&krt_itemnumber=...#krt-biblio-timeline
        if (IS_BIBLIO) {
            const deepParams = new URLSearchParams(window.location.search);
            const requestedBarcode = cleanSiteText(deepParams.get("krt_barcode") || "");
            const requestedItem = cleanSiteText(deepParams.get("krt_itemnumber") || "");

            if (requestedBarcode || requestedItem) {
                // Le filtre visible reste le code-barres lorsque disponible.
                filterInput.value = requestedBarcode || requestedItem;
            }
        }

        render(CONFIG.defaultRange);

        if (IS_BIBLIO) {
            const deepParams = new URLSearchParams(window.location.search);
            const hasDeepFilter = Boolean(
                cleanSiteText(deepParams.get("krt_barcode") || "") ||
                cleanSiteText(deepParams.get("krt_itemnumber") || "")
            );

            if (hasDeepFilter || window.location.hash === "#krt-biblio-timeline") {
                window.setTimeout(() => {
                    panel.scrollIntoView({ behavior: "smooth", block: "start" });
                    if (hasDeepFilter) {
                        filterInput.focus({ preventScroll: true });
                    }
                }, 120);
            }
        }

        return panel;
    }

    function insertTimeline(panel, table) {
        if (!panel) return false;

        if (IS_BIBLIO) {
            const nativeTimeline = document.querySelector(".searchresults .timeline-container-wrapper");
            if (nativeTimeline) {
                nativeTimeline.dataset.krtNativeHidden = "1";
                nativeTimeline.style.display = "none";
                nativeTimeline.parentNode.insertBefore(panel, nativeTimeline);
                return true;
            }
        }

        const wrapper = table.closest(".dt-container") || table.closest(".page-section") || table;
        wrapper.insertAdjacentElement("afterend", panel);
        return true;
    }

    /* ============================================================
     * INITIALISATION
     * ============================================================ */

    async function init() {
        const tableSelector = IS_READER ? "#table_readingrec" : "#table_issues";
        const table = await waitForKohaTable(tableSelector, 15000);

        if (!table) {
            (function(){})("[Circulation timeline] Tableau Koha introuvable après attente :", tableSelector);
            return;
        }

        let rows = parseTable(table);

        // Certains DataTables Koha finissent leur premier draw juste après
        // l'apparition du tableau. On fait une seconde tentative courte
        // avant d'abandonner.
        if (!rows.length) {
            await new Promise((resolve) => window.setTimeout(resolve, 700));
            rows = parseTable(table);
        }

        if (!rows.length) {
            (function(){})("[Circulation timeline] Aucun prêt exploitable dans le tableau après attente.");
            return;
        }

        let libraries = { byCode: new Map(), byName: new Map() };
        try {
            libraries = await loadLibraries();
            log("Bibliothèques chargées", libraries.byCode.size);
        } catch (error) {
            (function(){})("[Circulation timeline] Noms des bibliothèques indisponibles ; la timeline reste active.", error);
        }

        // On peut déjà résoudre le code du site de prêt depuis le nom affiché dans le tableau.
        rows.forEach((row) => {
            row.checkoutSiteCode = libraries.byName.get(normalizeText(row.checkoutSite)) || null;
        });

        try {
            const checkouts = await loadHistoricalCheckouts();
            enrichRows(rows, checkouts, libraries);
            log("Prêts historiques API chargés", checkouts.length);
        } catch (error) {
            // Important : l'API enrichit, mais ne conditionne plus l'existence de la timeline.
            (function(){})("[Circulation timeline] Enrichissement API indisponible ; affichage construit depuis le tableau Koha.", error);
        }

        if (IS_BIBLIO) {
            try {
                const items = await loadBiblioItems();
                const transfers = await loadBiblioTransfers();
                window.__krtLifeByItem = buildLifeByItem(items, transfers, libraries);
                log("Vie complète notice chargée", window.__krtLifeByItem.size, "exemplaires", transfers.length, "transferts");
            } catch (error) {
                (function(){})("[Circulation timeline] Vie complète notice partiellement indisponible.", error);
                window.__krtLifeByItem = new Map();
            }
        }

        annotateReturnCells(rows);

        const panel = createTimelinePanel(rows);
        insertTimeline(panel, table);

        // DataTables peut redessiner les cellules ; on réinjecte uniquement l'info de retour.
        if (window.jQuery && window.jQuery.fn && window.jQuery.fn.dataTable) {
            window.jQuery(table)
                .off("draw.dt.kohaCirculationTimeline")
                .on("draw.dt.kohaCirculationTimeline", () => {
                    window.setTimeout(() => annotateReturnCells(rows), 0);
                });
        }

        (function(){})(
            `[Circulation timeline] Module actif sur ${IS_READER ? "l'historique lecteur" : "l'historique notice"} : ${rows.length} prêt(s).`
        );
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
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