(function(){"use strict";
const KT=window.KohaTools;if(!KT||!KT.Config)return;const MODULE_ID='item-editing-assistant',CFG=KT.Config.getCanonical(MODULE_ID),Scope=KT.getService&&KT.getService("scope");
if(!CFG||!CFG.enabled||!["shadow","live"].includes(CFG.mode))return;if(Scope&&!Scope.match(CFG.general&&CFG.general.scope).ok)return;
const runtime={id:MODULE_ID,sourceFiles:['110-exemplaire-helper.js'],parity:"exact-legacy",init:function(){if(window["__KT_PARITY_"+MODULE_ID])return;window["__KT_PARITY_"+MODULE_ID]=true;
(function () {
    // --- Restriction : ne s'exécute que sur additem.pl ou batchMod.pl ---
    if (!/\/cgi-bin\/koha\/cataloguing\/additem\.pl/i.test(location.pathname) &&
        !/\/cgi-bin\/koha\/tools\/batchMod\.pl/i.test(location.pathname)) {
        return;
    }
    const firebaseConfig = CFG?.firebase || {};
    const PANEL_ID = "koha_items_assistant_panel";
    const CACHE_KEY = "koha_items_assistant_last";
    const PRESETS_KEY = "koha_items_assistant_presets";
    const PANEL_STATE_KEY = "koha_items_assistant_panel_state";
    const PANEL_POSITION_KEY = "koha_items_assistant_panel_position";
    const FIREBASE_PRESETS_COLLECTION = "koha_items_assistant_presets";
    const MAX_PRESETS = Math.max(1, Number(CFG?.limits?.maxPresets ?? 20));
    const CLEAR_CHECKBOX_KEY = "koha_items_assistant_clear_flags";
    let firebaseDb = null;
    const budget = (op,n=1) => { try { window.KohaTools?.getService?.("firebase-budget")?.record?.(firebaseConfig.projectId,op,n,{kind:"firestore"}); } catch (_) {} };
    let collection = null;
    let doc = null;
    let getDocs = null;
    let getDoc = null;
    let setDoc = null;
    let deleteDoc = null;
    let serverTimestamp = null;
    let firebaseInitPromise = null;
    const waitForBody = () => new Promise(resolve => {
        if (document.body)
            return resolve();
        const t = setInterval(() => {
            if (document.body) {
                clearInterval(t);
                resolve();
            }
        }, 100);
    });
    const norm = s => (s || "")
        .toString()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
    const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[char]);
    const getJSON = (key, fallback) => {
        try {
            const v = JSON.parse(localStorage.getItem(key) || "null");
            return v === null ? fallback : v;
        }
        catch (e) {
            return fallback;
        }
    };
    const setJSON = (key, value) => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        }
        catch (e) { }
    };
    const ensureStyle = () => {
        if (document.getElementById("koha_items_assistant_style"))
            return;
        const s = document.createElement("style");
        s.id = "koha_items_assistant_style";
        s.textContent = `
        #${PANEL_ID}{
            position:fixed;z-index:999999;
            background:#ffffff;border:1px solid #dfe6df;border-radius:14px;
            box-shadow:0 14px 42px rgba(24,39,27,.16),0 3px 10px rgba(20,20,40,.07);
            width:420px;font:12.5px/1.35 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
            color:#1f2430;overflow:hidden;user-select:none;
        }
        #${PANEL_ID} *{box-sizing:border-box;user-select:text}
        #${PANEL_ID}.collapsed .body{display:none}
        #${PANEL_ID} .head{
            display:flex;justify-content:space-between;align-items:center;gap:8px;
            padding:11px 12px;cursor:move;font-weight:700;font-size:13px;
            background:linear-gradient(135deg,#3f8340 0%,#438d43 100%);color:#fff;
            letter-spacing:.2px;border-bottom:1px solid rgba(0,0,0,.08);
        }
        #${PANEL_ID} .head .title{display:flex;align-items:center;gap:8px;font-size:13.5px}
        #${PANEL_ID} .head .subtitle{
            display:inline-block;font-size:10.5px;font-weight:500;color:rgba(255,255,255,.94);
            margin-left:22px;margin-top:3px;letter-spacing:0;
            background:rgba(255,255,255,.12);padding:1px 6px;border-radius:999px;
        }
        #${PANEL_ID} .head .subtitle:empty{display:none}
        #${PANEL_ID} .head-btns{display:flex;gap:4px}
        #${PANEL_ID} .head-btns button{
            background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.08);color:#fff;width:24px;height:24px;
            border-radius:7px;cursor:pointer;font-size:13px;line-height:1;
            display:flex;align-items:center;justify-content:center;transition:background .15s,border-color .15s;
        }
        #${PANEL_ID} .head-btns button:hover{background:rgba(255,255,255,.30);border-color:rgba(255,255,255,.18)}
        #${PANEL_ID} .body{
            padding:10px 12px 12px;max-height:78vh;overflow-y:auto;overflow-x:hidden;
            background:linear-gradient(180deg,#ffffff 0%,#fbfcfb 100%);
            scrollbar-width:thin;scrollbar-color:#cfd8d0 transparent;
        }
        #${PANEL_ID} .body > *,#${PANEL_ID} .actions,#${PANEL_ID} .preset-list,#${PANEL_ID} .preset-controls{max-width:100%;min-width:0}
        #${PANEL_ID} .row{
            margin:0 0 5px;
            display:flex;
            align-items:center;
            gap:8px;
            flex-wrap:nowrap;
        }
        #${PANEL_ID} .row label{
            font-weight:700;color:#566258;font-size:10.5px;
            text-transform:uppercase;letter-spacing:.42px;
            white-space:nowrap;
            flex:0 0 110px;
            min-width:80px;
        }
        #${PANEL_ID} .row .combo-wrap{
            position:relative;
            flex:1 1 auto;
            min-width:0;
        }
        #${PANEL_ID} .clear-checkbox{
            display:flex;
            align-items:center;
            gap:5px;
            font-size:10px;
            color:#7b837c;
            cursor:pointer;
            padding:0 3px;
            white-space:nowrap;
            flex:0 0 64px;
            justify-content:flex-end;
            box-sizing:border-box;
        }
        #${PANEL_ID} .row .clear-checkbox input[type="checkbox"]{
            margin:0;
            cursor:pointer;
            width:13px;
            height:13px;
            flex-shrink:0;
            accent-color:#408540;
        }
        #${PANEL_ID} .combo-wrap{position:relative;flex:1 1 auto;min-width:0}
        #${PANEL_ID} .combo-input{
            width:100%;padding:5.5px 34px 5.5px 8px;border:1.3px solid #d7dfd8;border-radius:8px;
            font:inherit;background:#fff;transition:border-color .15s,background .15s,box-shadow .15s;
            font-size:12px;color:#1f2430;box-shadow:0 1px 1px rgba(20,35,22,.02);
        }
        #${PANEL_ID} .combo-input::placeholder{
            color:#87908a;
            opacity:1;
        }
        #${PANEL_ID} .combo-input:hover:not(:disabled){border-color:#c4cec5}
        #${PANEL_ID} .combo-input:focus{
            outline:none;border-color:#4b924c;background:#fff;
            box-shadow:0 0 0 2px rgba(64,133,64,.12);
        }
        #${PANEL_ID} .combo-input:disabled{background:#f0f2f0;color:#9aa1a0;cursor:not-allowed}
        #${PANEL_ID} select.combo-input:has(option:checked:not([value=""])),
        #${PANEL_ID} input.combo-input:not(:placeholder-shown){
            background:#fbfefb;border-color:#c8d8c9;
        }
        #${PANEL_ID} .combo-clear{
            position:absolute;right:7px;top:50%;transform:translateY(-50%);
            border:none;background:transparent;color:#8f9891;cursor:pointer;font-size:14px;
            width:23px;height:23px;border-radius:999px;display:flex;align-items:center;justify-content:center;
            opacity:.38;transition:opacity .15s,background .15s,color .15s;
        }
        #${PANEL_ID} .combo-wrap:hover .combo-clear,#${PANEL_ID} .combo-clear:focus{opacity:.85}
        #${PANEL_ID} .combo-clear:hover{background:#eef1ee;color:#4d5850;opacity:1}
        #${PANEL_ID} .combo-menu{
            position:absolute;left:0;right:0;top:calc(100% + 4px);background:#fff;
            border:1px solid #dbe0e8;border-radius:9px;box-shadow:0 8px 24px rgba(20,20,40,.16);
            max-height:180px;overflow-y:auto;z-index:10;display:none;
        }
        #${PANEL_ID} .combo-item{padding:5px 10px;cursor:pointer;font-size:12px;display:flex;flex-direction:column;gap:2px}
        #${PANEL_ID} .combo-item:hover,#${PANEL_ID} .combo-item.active{background:#e9f5ea;color:#408540}
        #${PANEL_ID} .combo-item-label{font-size:12px;color:#1f2430}
        #${PANEL_ID} .combo-empty{padding:6px 10px;color:#9aa1b3;font-style:italic}
        #${PANEL_ID} .actions{
            display:flex;gap:6px;margin-top:9px;padding-top:9px;flex-wrap:wrap;
            border-top:1px solid #e8ece8;
        }
        #${PANEL_ID} .actions button{
            flex:1 1 0;padding:6.5px 7px;cursor:pointer;font:inherit;font-weight:700;border-radius:8px;
            border:1px solid transparent;transition:filter .15s,background .15s,border-color .15s,box-shadow .15s,transform .08s;
            font-size:11.5px;min-width:0;max-width:100%;white-space:normal;line-height:1.15;text-align:center;
            min-height:38px;display:flex;align-items:center;justify-content:center;
        }
        #${PANEL_ID} .actions button:active{transform:translateY(1px)}
        #${PANEL_ID} .btn-primary{
            background:#408540;color:#fff;border-color:#397a39;
            box-shadow:0 2px 5px rgba(64,133,64,.20);
        }
        #${PANEL_ID} .btn-primary:hover{filter:brightness(1.06);box-shadow:0 3px 7px rgba(64,133,64,.24)}
        #${PANEL_ID} .btn-secondary{background:#eef7ef;color:#347336;border-color:#d8ead9}
        #${PANEL_ID} .btn-secondary:hover{background:#e4f2e5;border-color:#c8e1ca}
        #${PANEL_ID} .btn-ghost{background:#f5f6f5;color:#646d66;border-color:#e8ebe8}
        #${PANEL_ID} .btn-ghost:hover{background:#ecefec;border-color:#dce1dc}
        #${PANEL_ID} .btn-copy{background:#edf5fa;color:#246f9b;border-color:#d9e9f3}
        #${PANEL_ID} .btn-copy:hover{background:#dfedf6;border-color:#c8deeb}
        #${PANEL_ID} .status{
            font-size:10.5px;color:#536056;margin-top:7px;white-space:pre-wrap;line-height:1.45;
            background:#f7f9f7;border-radius:8px;padding:7px 9px;border:1px solid #e5eae5;
            border-left:3px solid #a9baa9;max-height:100px;overflow-y:auto;
        }
        #${PANEL_ID} .status:empty{display:none}
        #${PANEL_ID} .divider{border:none;border-top:1px solid #e3e8e3;margin:10px 0 8px}
        #${PANEL_ID} .presets-title{
            font-weight:800;font-size:10.5px;text-transform:uppercase;letter-spacing:.55px;
            color:#566258;margin-bottom:5px;display:flex;justify-content:space-between;align-items:center;
        }
        #${PANEL_ID} .presets-count{
            color:#7d887f;font-weight:700;text-transform:none;letter-spacing:0;
            background:#eef2ee;border:1px solid #e2e7e2;border-radius:999px;padding:1px 6px;
        }
        #${PANEL_ID} .presets-actions{display:flex;justify-content:space-between;align-items:center;gap:6px;margin-bottom:6px}
        #${PANEL_ID} .presets-actions .note-presets{font-size:10px;color:#7a837c;flex:1;}
        #${PANEL_ID} .btn-small{padding:4px 8px;font-size:10.5px;border-radius:7px;}
        #${PANEL_ID} .preset-controls{
            padding:7px 7px 1px;margin-bottom:6px;display:none;
            background:#f7f9f7;border:1px solid #e8ece8;border-radius:8px;
        }
        #${PANEL_ID} .preset-controls.open{display:block}
        #${PANEL_ID} .preset-controls .row{margin:0 0 7px;min-width:0}
        #${PANEL_ID} .preset-controls .row > div{flex:1 1 auto;min-width:0;max-width:100%}
        #${PANEL_ID} .preset-list{display:flex;flex-direction:column;gap:5px;max-height:132px;overflow-y:auto;padding-right:2px}
        #${PANEL_ID} .preset-item{
            display:flex;align-items:center;gap:6px;background:#fff;border:1px solid #e3e8e3;
            border-radius:8px;padding:6px 7px;cursor:pointer;transition:background .15s,border-color .15s,box-shadow .15s;
        }
        #${PANEL_ID} .preset-item:hover{
            background:#f7fcf7;border-color:#bed8c0;box-shadow:0 1px 3px rgba(64,133,64,.07);
        }
        #${PANEL_ID} .preset-text{flex:1;min-width:0;font-size:11px;color:#1f2430;line-height:1.25}
        #${PANEL_ID} .preset-text b{
            display:block;color:#397c3b;font-size:11.5px;font-weight:800;margin-bottom:2px;
            white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
        }
        #${PANEL_ID} .preset-fields{
            display:block;color:#737d75;font-size:10px;line-height:1.3;
            white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
        }
        #${PANEL_ID} .preset-del{
            border:none;background:transparent;color:#b0b8b1;cursor:pointer;font-size:13px;
            width:20px;height:20px;border-radius:6px;flex-shrink:0;display:flex;align-items:center;justify-content:center;
        }
        #${PANEL_ID} .preset-del:hover{background:#ffe8e8;color:#d9473f}
        #${PANEL_ID} .preset-empty{color:#919991;font-style:italic;font-size:10.5px;padding:5px 2px}
        #${PANEL_ID} .field-modified {
            border-color:#2a7a2a !important;
            background:#eaf6ea !important;
            box-shadow:0 0 0 2px rgba(42,122,42,.20) !important;
            transition:all .3s;
        }
        #${PANEL_ID} .field-modified-highlight {
            animation:flash-green 1.5s ease 3;
        }
        @keyframes flash-green {
            0%,100%{background:#eaf6ea;border-color:#2a7a2a}
            50%{background:#d2edd3;border-color:#1b5e1b}
        }
        #${PANEL_ID} .row .combo-input.text-input{
            background:#fff;border-color:#d7dfd8;
        }
        #${PANEL_ID} .row .combo-input.text-input:focus{
            background:#fff;border-color:#4b924c;
        }
        /* Styles uniques pour les modaux de l'assistant - complètement isolés de Koha */
        #${PANEL_ID}_modal_backdrop {
            position:fixed;
            inset:0;
            background:rgba(2,6,23,.72);
            z-index:2147483646;
            display:flex;
            align-items:center;
            justify-content:center;
            padding:24px;
            box-sizing:border-box;
            font-family:Arial,Helvetica,sans-serif;
            pointer-events:auto;
        }
        #${PANEL_ID}_modal_content {
            background:white;
            padding:22px;
            border-radius:15px;
            box-shadow:0 24px 70px rgba(0,0,0,.35);
            z-index:2147483647;
            max-width:min(92vw,560px);
            max-height:min(84vh,760px);
            overflow-y:auto;
            width:100%;
            box-sizing:border-box;
            border:1px solid #dfe6df;
            isolation:isolate;
            transform:translateZ(0);
        }
        #${PANEL_ID}_modal_content h3 {
            margin:0 0 10px;
            color:#26332a;
            font-size:16px;
        }
        #${PANEL_ID}_modal_content ul {
            list-style:none;
            padding:0;
            margin:12px 0;
            border:1px solid #edf0ed;border-radius:9px;overflow:hidden;
        }
        #${PANEL_ID}_modal_content ul li {
            padding:7px 9px;
            border-bottom:1px solid #f0f2f0;
            font-size:12.5px;
            background:#fff;
        }
        #${PANEL_ID}_modal_content ul li:last-child{border-bottom:none}
        #${PANEL_ID}_modal_content ul li strong {
            color:#408540;
        }
        #${PANEL_ID}_modal_content .modal-actions {
            display:flex;
            gap:8px;
            margin-top:15px;
            justify-content:flex-end;
        }
        #${PANEL_ID}_modal_content .modal-actions button {
            padding:8px 18px;
            border-radius:8px;
            border:1px solid #dbe0e8;
            cursor:pointer;
            font-weight:700;
            font-size:12.5px;
        }
        #${PANEL_ID}_modal_content .modal-actions .btn-confirm {
            background:#408540;
            color:white;
            border-color:#397a39;
            box-shadow:0 2px 5px rgba(64,133,64,.16);
        }
        #${PANEL_ID}_modal_content .modal-actions .btn-confirm:hover {
            filter:brightness(1.06);
        }
        #${PANEL_ID}_modal_content .modal-actions .btn-cancel {
            background:#f4f6f4;
            color:#5a665d;
            border-color:#e3e7e3;
        }
        #${PANEL_ID}_modal_content .modal-actions .btn-cancel:hover {
            background:#ebefeb;
        }
        #${PANEL_ID}_modal_content .modal-note {
            font-size:11px;
            color:#69736b;
            margin-top:10px;
            padding:8px 9px;
            background:#f7f9f7;
            border:1px solid #e7ebe7;
            border-radius:7px;
        }
        #${PANEL_ID}_modal_content .preset-name-input {
            width:100%;
            padding:8px 11px;
            border:1.3px solid #d7dfd8;
            border-radius:8px;
            font-size:13px;
            margin:8px 0;
        }
        #${PANEL_ID}_modal_content .preset-name-input:focus {
            outline:none;
            border-color:#4b924c;
            box-shadow:0 0 0 2px rgba(64,133,64,.12);
        }
`;
        document.head.appendChild(s);
    };
    // --- Mapping des champs 995 vers leurs sélecteurs et labels ---
    const FIELD_MAPPING = {
        b: { selector: 'select[name="items.homebranch"]', label: 'Site Prop.', type: 'select' },
        c: { selector: 'select[name="items.holdingbranch"]', label: 'Site actuel', type: 'select' },
        s: { selector: 'select[name="items.enumchron"]', label: 'Etage', type: 'select' },
        e: { selector: 'select[name="items.location"]', label: 'Localisation', type: 'select' },
        j: { selector: 'select[name="items.copynumber"]', label: 'Sous local.', type: 'select' },
        k: { selector: 'input[name="items.itemcallnumber"]', label: 'Cote', type: 'input' },
        f: { selector: 'input[name="items.barcode"]', label: 'Code barre', type: 'input' },
        r: { selector: 'select[name="items.itype"]', label: 'Type doc.', type: 'select' },
        '3': { selector: 'select[name="items.ccode"]', label: 'Collection', type: 'select' },
        q: { selector: 'select[name="items.more_subfields_xml_q"]', label: 'Public', type: 'select' },
        o: { selector: 'select[name="items.notforloan"]', label: 'Statut', type: 'select' },
        '2': { selector: 'select[name="items.itemlost"]', label: 'Motif exclu', type: 'select' },
        t: { selector: 'select[name="items.more_subfields_xml_t"]', label: 'Achat/don', type: 'select' },
        A: { selector: 'input[name="items.more_subfields_xml_A"]', label: 'Fournisseur', type: 'input' },
        p: { selector: 'input[name="items.replacementprice"]', label: 'Prix', type: 'input' },
        '5': { selector: 'input[name="items.dateaccessioned"]', label: 'Date création', type: 'input' },
        m: { selector: 'input[name="items.datelastseen"]', label: 'Vu le', type: 'input' },
        n: { selector: 'input[name="items.onloan"]', label: 'Retour prévu', type: 'input' },
        u: { selector: 'input[name="items.itemnotes_nonpublic"]', label: 'Note interne', type: 'input' },
        w: { selector: 'input[name="items.uri"]', label: 'Article', type: 'input' },
        v: { selector: 'input[name="items.more_subfields_xml_v"]', label: 'N° revue', type: 'input' },
        x: { selector: 'input[name="items.itemnotes"]', label: 'Note OPAC', type: 'input' },
        y: { selector: 'select[name="items.more_subfields_xml_y"]', label: 'Déjà rech.', type: 'select' },
        z: { selector: 'input[name="items.issues"]', label: 'Nb prêts', type: 'input' },
        Z: { selector: 'input[name="items.datelastborrowed"]', label: 'Dernier empr.', type: 'input' }
    };
    // --- Liste blanche : seuls les champs réellement présents dans le panneau peuvent être manipulés ---
    const EDITABLE_FIELDS = Array.isArray(CFG?.fields?.editable) && CFG.fields.editable.length ? CFG.fields.editable.slice() : ['b', 'c', 's', 'e', 'j', 'k', 'f', 'r', '3', 'q', 'o', '2', 't', 'A', 'p', 'u', 'x'];
    // --- Champs à exclure de la fonction "copier au plus nombreux" ---
    const EXCLUDED_FIELDS_FOR_COPY = Array.isArray(CFG?.fields?.excludedFromCopy) ? CFG.fields.excludedFromCopy.slice() : ['f', 'm', 'n', 'z', 'Z', '5'];
    // --- Détermine le code de champ correspondant à une colonne du tableau ---
    const getMappingCodeForSource = (source, allowText = true) => {
        if (!source)
            return null;
        const columnName = source.dataset?.colname || source.getAttribute?.('data-colname') || '';
        const sourceText = source.textContent?.trim() || '';
        const normalizedColumnName = norm(columnName);
        const normalizedText = norm(sourceText);
        for (const [code, mapping] of Object.entries(FIELD_MAPPING)) {
            if (!EDITABLE_FIELDS.includes(code) || EXCLUDED_FIELDS_FOR_COPY.includes(code))
                continue;
            const selector = mapping.selector || '';
            const fieldName = (selector.match(/items\.([a-z0-9_]+)/i)?.[1] || '').toLowerCase();
            const normalizedFieldName = norm(fieldName);
            const normalizedLabel = norm(mapping.label || '');
            if (normalizedColumnName && (normalizedColumnName === norm(code) ||
                normalizedColumnName === normalizedFieldName)) {
                return code;
            }
            if (allowText && normalizedText && (normalizedText === normalizedLabel ||
                normalizedText === normalizedFieldName)) {
                return code;
            }
        }
        return null;
    };
    // --- Récupère toutes les valeurs d'un exemplaire depuis le tableau ---
    const getItemValuesFromTableRow = (row) => {
        const values = {};
        const cells = row.querySelectorAll('td');
        const headers = Array.from(document.querySelectorAll('#itemst thead th'));
        cells.forEach((cell, index) => {
            const header = headers[index] || null;
            const text = cell.textContent.trim();
            if (!text || text === '&nbsp;' || text === '')
                return;
            if (cell.querySelector('input[type="checkbox"]') || cell.querySelector('.btn-group'))
                return;
            const code = getMappingCodeForSource(header, true) || getMappingCodeForSource(cell, false);
            if (code) {
                values[code] = text;
                (function () { })('[koha-items-assistant] mapped cell', { code, text, headerText: header?.textContent?.trim() || '', cellText: cell.textContent.trim() });
            }
        });
        return values;
    };
    // --- Récupère tous les exemplaires existants depuis le tableau ---
    const getExistingItems = () => {
        const table = document.querySelector('#itemst');
        if (!table) {
            return [];
        }
        const rows = table.querySelectorAll('tbody tr');
        const items = [];
        rows.forEach(row => {
            const values = getItemValuesFromTableRow(row);
            if (Object.keys(values).length > 0) {
                items.push(values);
            }
        });
        return items;
    };
    // --- Calcule les valeurs réellement majoritaires pour chaque champ (sauf exclus) ---
    const computeMostCommonValues = (items) => {
        const result = {};
        const fieldCounts = {};
        for (const item of items) {
            for (const [code, value] of Object.entries(item)) {
                if (!EDITABLE_FIELDS.includes(code))
                    continue;
                if (EXCLUDED_FIELDS_FOR_COPY.includes(code))
                    continue;
                if (!value || value.trim() === '')
                    continue;
                if (!fieldCounts[code])
                    fieldCounts[code] = {};
                const key = value.trim();
                fieldCounts[code][key] = (fieldCounts[code][key] || 0) + 1;
            }
        }
        for (const [code, counts] of Object.entries(fieldCounts)) {
            let maxCount = 0;
            let bestValue = '';
            let tied = false;
            for (const [value, count] of Object.entries(counts)) {
                if (count > maxCount) {
                    maxCount = count;
                    bestValue = value;
                    tied = false;
                }
                else if (count === maxCount) {
                    tied = true;
                }
            }
            // En production, on ne copie que lorsqu'une valeur domine réellement l'ensemble des exemplaires.
            if (bestValue && !tied && maxCount >= 2 && maxCount > (items.length / 2)) {
                result[code] = bestValue;
            }
        }
        return result;
    };
    // --- Récupère un champ DOM par son code ---
    const getFieldElement = (code) => {
        const mapping = FIELD_MAPPING[code];
        if (!mapping)
            return null;
        const fieldName = ((mapping.selector || '').match(/items\.([a-z0-9_]+)/i)?.[1] || '').toLowerCase();
        const candidateSelectors = [];
        if (mapping.selector)
            candidateSelectors.push(mapping.selector);
        if (fieldName) {
            candidateSelectors.push(`select[name="items.${fieldName}"]`, `input[name="items.${fieldName}"]`, `select[name="${fieldName}"]`, `input[name="${fieldName}"]`, `select[name="items[${fieldName}]"]`, `input[name="items[${fieldName}]"]`);
        }
        for (const selector of [...new Set(candidateSelectors)]) {
            const matches = Array.from(document.querySelectorAll(selector))
                .filter(el => el && !el.disabled && el.type !== 'hidden');
            if (matches.length === 1)
                return matches[0];
            if (matches.length > 1) {
                const visibleMatches = matches.filter(el => el.offsetParent !== null || el.getClientRects().length > 0);
                if (visibleMatches.length === 1)
                    return visibleMatches[0];
            }
        }
        return null;
    };
    const findFieldElementWithRetry = async (code, attempt = 0, maxAttempts = 8) => {
        const el = getFieldElement(code);
        if (el || attempt >= maxAttempts)
            return el;
        await new Promise(resolve => setTimeout(resolve, 180));
        return findFieldElementWithRetry(code, attempt + 1, maxAttempts);
    };
    // --- Récupère la valeur texte d'un champ DOM ---
    const getFieldValue = (el) => {
        if (!el)
            return '';
        if (el.tagName === 'SELECT') {
            return el.value || '';
        }
        return el.value || '';
    };
    const getFieldType = (el, mappingType = 'input') => {
        if (!el)
            return mappingType;
        if (el.tagName === 'SELECT')
            return 'select';
        return 'input';
    };
    const isFieldMandatory = (el) => {
        if (!el || !el.closest)
            return false;
        const row = el.closest('.subfield_line');
        if (!row)
            return false;
        const mandatoryInput = row.querySelector('input[name="mandatory"]');
        return !!mandatoryInput && mandatoryInput.value === '1';
    };
    const hasPageClearControl = (el) => {
        if (!el || el.disabled)
            return false;
        if (el.tagName === 'INPUT') {
            return !el.readOnly;
        }
        if (el.tagName === 'SELECT') {
            for (let i = 0; i < el.options.length; i++) {
                if (el.options[i].value === '')
                    return true;
            }
            if (el.id) {
                const container = document.getElementById(`select2-${el.id}-container`);
                if (container) {
                    const select2Root = container.closest('.select2-container');
                    if (select2Root && select2Root.querySelector('.select2-selection__clear')) {
                        return true;
                    }
                }
            }
            return false;
        }
        return false;
    };
    // --- Vérifie si un champ peut être vidé : non vide et non obligatoire ---
    const canClearField = (el) => {
        return !isFieldMandatory(el) && hasPageClearControl(el);
    };
    const resolveSelectOptionValue = (selectEl, targetValue) => {
        if (!selectEl || selectEl.tagName !== 'SELECT')
            return null;
        const options = Array.from(selectEl.options || []);
        const normalizedTarget = norm(targetValue || "");
        const exactMatch = options.find(opt => norm(opt.value) === normalizedTarget || norm(opt.textContent) === normalizedTarget);
        return exactMatch ? exactMatch.value : null;
    };
    // --- Définit la valeur d'un champ DOM ---
    const setFieldValue = (el, value, clearIfEmpty = false) => {
        if (!el)
            return false;
        const normalizeTarget = (v) => norm(v || "");
        const finalizeValue = (targetValue) => {
            if (!targetValue && targetValue !== '')
                return false;
            let resolvedValue = targetValue;
            if (el.tagName === 'SELECT') {
                const options = Array.from(el.options || []);
                const exactMatch = options.find(opt => normalizeTarget(opt.value) === normalizeTarget(targetValue) || normalizeTarget(opt.textContent) === normalizeTarget(targetValue));
                if (exactMatch) {
                    resolvedValue = exactMatch.value;
                    options.forEach(opt => opt.selected = false);
                    exactMatch.selected = true;
                    el.value = resolvedValue;
                }
                else {
                    const fallbackValue = resolveSelectOptionValue(el, targetValue);
                    if (fallbackValue !== null) {
                        resolvedValue = fallbackValue;
                        options.forEach(opt => opt.selected = false);
                        const fallbackOption = options.find(opt => opt.value === resolvedValue);
                        if (fallbackOption) {
                            fallbackOption.selected = true;
                            el.value = resolvedValue;
                        }
                    }
                    else {
                        return false;
                    }
                }
            }
            else {
                el.value = targetValue;
            }
            if (window.jQuery) {
                try {
                    const $el = window.jQuery(el);
                    if (typeof $el.select2 === 'function') {
                        $el.val(resolvedValue);
                        $el.trigger('change');
                        $el.trigger('select2:select');
                        $el.trigger('change.select2');
                    }
                    $el.trigger('input');
                    $el.trigger('change');
                }
                catch (e) { }
            }
            try {
                const select2Container = document.getElementById(`select2-${el.id}-container`);
                if (select2Container && el.tagName === 'SELECT') {
                    const selectedOption = Array.from(el.options).find(opt => opt.selected);
                    const rendered = select2Container.querySelector('.select2-selection__rendered');
                    if (rendered && selectedOption) {
                        rendered.textContent = selectedOption.textContent.trim();
                    }
                }
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
                el.dispatchEvent(new Event('blur', { bubbles: true }));
            }
            catch (e) { }
            triggerNativeAndJQuery(el);
            return true;
        };
        if (clearIfEmpty && (!value || value.trim() === '')) {
            if (el.tagName === 'SELECT') {
                for (let i = 0; i < el.options.length; i++) {
                    if (el.options[i].value === '') {
                        return finalizeValue('');
                    }
                }
                return false;
            }
            return finalizeValue('');
        }
        if (!value || value.trim() === '')
            return false;
        let cleanValue = value.trim();
        if (el.name && el.name.includes('replacementprice')) {
            cleanValue = cleanValue.replace(/,/g, '.');
        }
        if (el.tagName === 'SELECT') {
            const resolvedValue = resolveSelectOptionValue(el, cleanValue);
            if (resolvedValue !== null) {
                return finalizeValue(resolvedValue);
            }
            return false;
        }
        return finalizeValue(cleanValue);
    };
    // --- Trigger des événements pour mettre à jour Select2 ---
    const triggerNativeAndJQuery = (element) => {
        if (!element)
            return;
        const dispatch = () => {
            element.dispatchEvent(new Event("input", { bubbles: true }));
            element.dispatchEvent(new Event("change", { bubbles: true }));
            if (window.jQuery) {
                try {
                    const $el = window.jQuery(element);
                    $el.trigger("input");
                    $el.trigger("change");
                    if ($el.data("select2")) {
                        $el.trigger("change.select2");
                    }
                }
                catch (e) { }
            }
        };
        dispatch();
        setTimeout(dispatch, 40);
        try {
            element.focus();
            element.blur();
        }
        catch (e) { }
    };
    // --- Récupère toutes les options d'un select pour les combos ---
    const getSelectOptions = (selectEl) => {
        if (!selectEl)
            return [];
        const options = [];
        for (let i = 0; i < selectEl.options.length; i++) {
            const opt = selectEl.options[i];
            options.push({ value: opt.value, label: opt.textContent.trim() });
        }
        return options;
    };
    // --- Composant de champ dans le panneau ---
    const makeCombo = (row, placeholder, options = [], isInput = false, showClearCheckbox = true) => {
        const code = row.dataset.row;
        const canClear = showClearCheckbox;
        const hasOptions = Array.isArray(options) && options.length > 0;
        const normalOptions = hasOptions ? options.map(o => ({ ...o })) : [];
        const selectHasEmpty = normalOptions.some(o => o.value === '');
        if (selectHasEmpty) {
            normalOptions.forEach(o => {
                if (o.value === '' && (!o.label || o.label.trim() === '')) {
                    o.label = placeholder;
                }
            });
        }
        row.innerHTML = `

            <div class="combo-wrap">

                ${isInput ? `

                    <input type="text" class="combo-input text-input" placeholder="${placeholder}" autocomplete="off">

                ` : `

                    <select class="combo-input">

                        ${!selectHasEmpty ? `<option value="">${placeholder}</option>` : ''}

                        ${normalOptions.map(o => `<option value="${escapeHTML(o.value)}">${escapeHTML(o.label)}</option>`).join('')}

                    </select>

                `}

                <button type="button" class="combo-clear" tabindex="-1" title="Vider le champ du modal">×</button>

            </div>

            ${canClear ? `

                <label class="clear-checkbox" title="Cocher pour vider le champ lors de l'application">

                    <input type="checkbox" class="clear-checkbox-input" data-code="${code}">

                    <span>Vider</span>

                </label>

            ` : ''}

        `;
        const input = row.querySelector(".combo-input");
        const clearBtn = row.querySelector(".combo-clear");
        const clearCheckbox = row.querySelector(".clear-checkbox-input");
        let value = "";
        let onChangeCb = () => { };
        const updateSelectValue = (newValue, silent) => {
            if (!input)
                return;
            const options = Array.from(input.options || []);
            const normalizedNewValue = norm(newValue || "");
            const match = options.find(opt => norm(opt.value) === normalizedNewValue || norm(opt.textContent) === normalizedNewValue);
            if (match) {
                input.value = match.value;
                value = match.value;
            }
            else {
                const fallback = options.find(opt => norm(opt.value) === "" && normalizedNewValue === "");
                if (fallback) {
                    input.value = fallback.value;
                    value = fallback.value;
                }
                else {
                    input.value = input.value || '';
                    const currentOption = input.options[input.selectedIndex];
                    value = currentOption ? currentOption.value : '';
                }
            }
            if (!silent)
                onChangeCb(value);
        };
        if (isInput) {
            input.addEventListener("input", () => {
                value = input.value;
                onChangeCb(value);
            });
            input.addEventListener("keydown", e => {
                if (e.key === "Escape") {
                    input.blur();
                }
            });
        }
        else {
            input.addEventListener("change", () => {
                const selectedOption = input.options[input.selectedIndex];
                value = selectedOption ? selectedOption.value : '';
                onChangeCb(value);
            });
        }
        if (clearBtn) {
            clearBtn.addEventListener("click", () => {
                if (input.disabled)
                    return;
                value = "";
                if (input.tagName === 'SELECT') {
                    input.value = '';
                }
                else {
                    input.value = "";
                }
                onChangeCb(value);
                input.focus();
            });
        }
        return {
            setItems(newItems) {
                if (input && input.tagName === 'SELECT') {
                    const existingValue = input.value;
                    const dynamicOptions = Array.isArray(newItems) ? newItems.map(o => ({ ...o })) : [];
                    const hasEmpty = dynamicOptions.some(o => o.value === '');
                    if (hasEmpty) {
                        dynamicOptions.forEach(o => {
                            if (o.value === '' && (!o.label || o.label.trim() === '')) {
                                o.label = placeholder;
                            }
                        });
                    }
                    input.innerHTML = `${!hasEmpty ? `<option value="">${placeholder}</option>` : ''}` +
                        dynamicOptions.map(o => `<option value="${escapeHTML(o.value)}">${escapeHTML(o.label)}</option>`).join('');
                    if (existingValue) {
                        const option = Array.from(input.options).find(opt => opt.value === existingValue);
                        if (option)
                            input.value = existingValue;
                    }
                }
            },
            setValue(label, silent) {
                value = label || "";
                if (input.tagName === 'SELECT') {
                    updateSelectValue(value, silent);
                }
                else {
                    input.value = value;
                    if (!silent)
                        onChangeCb(value);
                }
            },
            getValue() { return value; },
            onChange(fn) { onChangeCb = fn; },
            setDisabled(state) {
                if (input) {
                    input.disabled = !!state;
                    if (input.tagName === 'INPUT') {
                        input.placeholder = state ? '—' : placeholder;
                    }
                }
            },
            focus() { if (input)
                input.focus(); },
            getClearFlag() { return clearCheckbox ? clearCheckbox.checked : false; },
            setClearFlag(checked) { if (clearCheckbox)
                clearCheckbox.checked = checked; }
        };
    };
    // --- Fonction principale de création du panneau ---
    const createPanel = () => {
        if (document.getElementById(PANEL_ID))
            return;
        ensureStyle();
        const savedPanelState = getJSON(PANEL_STATE_KEY, { collapsed: true });
        const savedPosition = getJSON(PANEL_POSITION_KEY, { left: null, top: 70, right: 20 });
        const root = document.createElement("div");
        root.id = PANEL_ID;
        if (savedPanelState.collapsed)
            root.classList.add("collapsed");
        if (savedPosition.left !== null) {
            root.style.left = savedPosition.left + 'px';
            root.style.top = savedPosition.top + 'px';
            root.style.right = 'auto';
        }
        else {
            root.style.top = savedPosition.top + 'px';
            root.style.right = savedPosition.right + 'px';
        }
        root.innerHTML = `
            <div class="head">
                <span>
                    <span class="title">Assistance exemplaires</span>
                    <span class="subtitle" id="koha_items_current_list"></span>
                </span>
                <div class="head-btns">
                    <button type="button" data-act="collapse" title="Réduire">–</button>
                </div>
            </div>
            <div class="body">
                <div class="row" data-row="b"><label>Site Prop.</label></div>
                <div class="row" data-row="c"><label>Site actuel</label></div>
                <div class="row" data-row="s"><label>Etage</label></div>
                <div class="row" data-row="e"><label>Localisation</label></div>
                <div class="row" data-row="j"><label>Sous local.</label></div>
                <div class="row" data-row="k"><label>Cote</label></div>
                <div class="row" data-row="f"><label>Code barre</label></div>
                <div class="row" data-row="r"><label>Type doc.</label></div>
                <div class="row" data-row="3"><label>Collection</label></div>
                <div class="row" data-row="q"><label>Public</label></div>
                <div class="row" data-row="o"><label>Statut</label></div>
                <div class="row" data-row="2"><label>Motif exclu</label></div>
                <div class="row" data-row="t"><label>Achat/don</label></div>
                <div class="row" data-row="A"><label>Fournisseur</label></div>
                <div class="row" data-row="p"><label>Prix</label></div>
                <div class="row" data-row="u"><label>Note interne</label></div>
                <div class="row" data-row="x"><label>Note OPAC</label></div>
                <div class="actions">
                    <button type="button" class="btn-primary" data-act="apply">Appliquer</button>
                    <button type="button" class="btn-ghost" data-act="clearAll">Vider</button>
                    <button type="button" class="btn-copy" data-act="copyFromOthers">Copier au + nombreux</button>
                    <button type="button" class="btn-secondary" data-act="save">Mémoriser</button>
                </div>
                <div class="status" id="koha_items_status"></div>
                <hr class="divider">
                <div class="presets-title">
                    <span>Mémorisations</span>
                    <span class="presets-count" id="koha_items_presets_count"></span>
                </div>
                <div class="presets-actions">
                    <span class="note-presets">Sélectionnez une liste ou créez-en une.</span>
                    <div style="display:flex;gap:6px;align-items:center">
                        <button type="button" class="btn-secondary btn-small" data-act="togglePresetControls">Options</button>
                    </div>
                </div>
                <div class="preset-controls" id="koha_items_preset_controls">
                    <div class="row" data-row="ownerSelect"><label>Liste nominative</label>
                        <select class="combo-input" data-owner-select style="width:100%"></select>
                    </div>
                    <div class="row" data-row="owner"><label>Créer une liste</label>
                        <div style="display:flex;gap:8px;align-items:center">
                            <input type="text" class="combo-input" data-owner-input placeholder="Nom Prénom (requis)">
                            <button type="button" class="btn-secondary btn-small" data-act="createList">Créer liste</button>
                        </div>
                    </div>
                </div>
                <div class="preset-list" id="koha_items_presets"></div>
            </div>
`;
        document.body.appendChild(root);
        // --- Sauvegarde de la position du panneau ---
        const savePosition = () => {
            const rect = root.getBoundingClientRect();
            const position = {
                left: Math.round(rect.left),
                top: Math.round(rect.top),
                right: null
            };
            if (root.style.right && root.style.right !== 'auto') {
                position.right = parseInt(root.style.right) || 20;
                position.left = null;
            }
            setJSON(PANEL_POSITION_KEY, position);
        };
        // --- Drag du panneau avec sauvegarde de position ---
        (() => {
            const head = root.querySelector(".head");
            let dragging = false, offX = 0, offY = 0;
            head.addEventListener("mousedown", e => {
                if (e.target.closest(".head-btns"))
                    return;
                dragging = true;
                const r = root.getBoundingClientRect();
                offX = e.clientX - r.left;
                offY = e.clientY - r.top;
                root.style.right = "auto";
            });
            document.addEventListener("mousemove", e => {
                if (!dragging)
                    return;
                root.style.left = `${e.clientX - offX}px`;
                root.style.top = `${e.clientY - offY}px`;
            });
            document.addEventListener("mouseup", () => {
                if (dragging) {
                    savePosition();
                    dragging = false;
                }
            });
        })();
        const status = root.querySelector("#koha_items_status");
        const presetsList = root.querySelector("#koha_items_presets");
        const presetsCount = root.querySelector("#koha_items_presets_count");
        // --- Création des combos pour chaque champ ---
        const combos = {};
        for (const code of EDITABLE_FIELDS) {
            const mapping = FIELD_MAPPING[code];
            const row = root.querySelector(`[data-row="${code}"]`);
            if (!row)
                continue;
            const fieldEl = getFieldElement(code);
            let options = [];
            const fieldType = getFieldType(fieldEl, mapping.type);
            const isInput = fieldType === 'input';
            const canClear = fieldEl ? canClearField(fieldEl) : false;
            if (fieldEl && fieldType === 'select') {
                options = getSelectOptions(fieldEl);
            }
            const placeholder = isInput ? mapping.label : `Rechercher ${mapping.label}…`;
            const combo = makeCombo(row, placeholder, options, isInput, canClear);
            combos[code] = combo;
        }
        // --- État des valeurs ---
        const state = {};
        for (const code of EDITABLE_FIELDS) {
            state[code] = "";
        }
        // --- Mise à jour des combos avec les valeurs de la page ---
        const refreshFromPage = () => {
            for (const code of EDITABLE_FIELDS) {
                const el = getFieldElement(code);
                const value = el ? getFieldValue(el) : '';
                state[code] = value;
                const combo = combos[code];
                if (combo)
                    combo.setValue(value, true);
            }
        };
        const clearAllModalFields = () => {
            for (const code of Object.keys(combos)) {
                const combo = combos[code];
                if (!combo)
                    continue;
                state[code] = "";
                combo.setValue("", true);
                const row = root.querySelector(`[data-row="${code}"]`);
                const clearCheckbox = row ? row.querySelector('.clear-checkbox-input') : null;
                if (clearCheckbox)
                    clearCheckbox.checked = false;
            }
            status.textContent = "✅ Tous les champs du modal ont été vidés.";
        };
        // --- Initialisation depuis la page ---
        refreshFromPage();
        // --- Fonction d'application des valeurs ---
        const applyValues = async () => {
            const changes = [];
            let modifiedCount = 0;
            const modifiedFields = [];
            const skippedFields = [];
            for (const code of EDITABLE_FIELDS) {
                const value = state[code];
                const combo = combos[code];
                const clearIfEmpty = combo ? combo.getClearFlag() : false;
                const hasSelectedValue = !!value && value.trim() !== '';
                const el = await findFieldElementWithRetry(code);
                if (!el) {
                    if (hasSelectedValue || clearIfEmpty)
                        skippedFields.push(FIELD_MAPPING[code]?.label || code);
                    (function () { })('[koha-items-assistant] apply field not found', { code, label: FIELD_MAPPING[code]?.label, targetValue: value });
                    continue;
                }
                const currentValue = getFieldValue(el);
                (function () { })('[koha-items-assistant] apply field', { code, label: FIELD_MAPPING[code]?.label, found: !!el, currentValue, targetValue: value, clearIfEmpty, hasSelectedValue });
                // Si la checkbox "Vider" est cochée, on ne vide que si aucun choix n'a été fait dans le panneau.
                if (clearIfEmpty && canClearField(el) && !hasSelectedValue) {
                    if (currentValue !== '') {
                        const success = setFieldValue(el, '', true);
                        if (success) {
                            changes.push(`${FIELD_MAPPING[code].label}: "${currentValue}" → (vidé)`);
                            modifiedCount++;
                            modifiedFields.push(el);
                        }
                    }
                    continue;
                }
                // Si la valeur est non vide et différente, on modifie
                if (hasSelectedValue && currentValue !== value) {
                    const success = setFieldValue(el, value, false);
                    if (success) {
                        let displayValue = value;
                        if (el.name && el.name.includes('replacementprice')) {
                            displayValue = value.replace(/,/g, '.');
                        }
                        changes.push(`${FIELD_MAPPING[code].label}: "${currentValue}" → "${displayValue}"`);
                        modifiedCount++;
                        modifiedFields.push(el);
                    }
                }
                await new Promise(resolve => setTimeout(resolve, 20));
            }
            modifiedFields.forEach(el => {
                el.classList.add('field-modified', 'field-modified-highlight');
                setTimeout(() => {
                    el.classList.remove('field-modified-highlight');
                }, 4500);
            });
            if (modifiedCount > 0) {
                status.textContent = `✅ ${modifiedCount} champ(s) mis à jour :\n${changes.join('\n')}` +
                    (skippedFields.length ? `\n⚠️ Champ(s) introuvable(s), non modifié(s) : ${skippedFields.join(', ')}` : '');
            }
            else if (skippedFields.length) {
                status.textContent = `⚠️ Aucun champ modifié. Champ(s) introuvable(s) : ${skippedFields.join(', ')}`;
            }
            else {
                status.textContent = "Aucun champ modifié (valeurs déjà présentes ou identiques).";
            }
        };
        // --- Fonction "Copier au plus nombreux" ---
        const copyFromOthers = () => {
            const items = getExistingItems();
            (function () { })('[koha-items-assistant] copyFromOthers items', items);
            if (items.length === 0) {
                status.textContent = "❌ Aucun exemplaire existant trouvé dans le tableau.";
                return;
            }
            const mostCommon = computeMostCommonValues(items);
            (function () { })('[koha-items-assistant] copyFromOthers mostCommon', mostCommon);
            const fieldsFound = Object.keys(mostCommon);
            if (fieldsFound.length === 0) {
                status.textContent = "❌ Aucune donnée commune significative trouvée parmi les exemplaires.";
                return;
            }
            const modal = document.createElement('div');
            modal.className = `${PANEL_ID}_modal_backdrop`;
            modal.id = `${PANEL_ID}_modal_backdrop`;
            modal.setAttribute('role', 'dialog');
            modal.setAttribute('aria-modal', 'true');
            modal.setAttribute('aria-label', 'Confirmation de copie');
            modal.style.position = 'fixed';
            modal.style.inset = '0';
            modal.style.display = 'flex';
            modal.style.alignItems = 'center';
            modal.style.justifyContent = 'center';
            modal.style.background = 'rgba(2, 6, 23, 0.72)';
            modal.style.zIndex = '2147483646';
            modal.style.pointerEvents = 'auto';
            modal.style.padding = '24px';
            modal.style.boxSizing = 'border-box';
            const modalContent = document.createElement('div');
            modalContent.className = `${PANEL_ID}_modal_content`;
            modalContent.id = `${PANEL_ID}_modal_content`;
            modalContent.setAttribute('role', 'document');
            modalContent.style.width = '100%';
            modalContent.style.maxWidth = '560px';
            modalContent.style.maxHeight = '84vh';
            modalContent.style.boxShadow = '0 24px 70px rgba(0, 0, 0, 0.35)';
            modalContent.style.border = '1px solid #dfe3ea';
            modalContent.style.position = 'relative';
            modalContent.style.isolation = 'isolate';
            modalContent.style.transform = 'translateZ(0)';
            modalContent.style.boxSizing = 'border-box';
            modalContent.innerHTML = `

                <h3>📋 Confirmer la copie depuis les exemplaires existants</h3>

                <p style="color:#475069;font-size:13px;margin:0 0 10px;">

                    Les valeurs suivantes seront préparées dans le panneau. Vous pourrez ensuite les transférer dans Koha avec le bouton Appliquer du panneau :

                </p>

                <ul>

                    ${fieldsFound.map(code => {
                const label = FIELD_MAPPING[code]?.label || code;
                let value = mostCommon[code];
                if (code === 'p') {
                    value = value.replace(/,/g, '.');
                }
                return `<li>

                            <strong>${label}</strong> →

                            <span style="color:#408540;font-weight:600;">"${escapeHTML(value)}"</span>

                        </li>`;
            }).join('')}

                </ul>

                <div class="modal-note">

                    ⚠️ Les champs suivants restent exclus de cette copie : ${EXCLUDED_FIELDS_FOR_COPY.join(', ')}

                </div>

                <div class="modal-actions">

                    <button class="btn-cancel" data-act="modalCancel">Annuler</button>

                    <button class="btn-confirm" data-act="modalConfirm">Préparer</button>

                </div>

            `;
            modal.appendChild(modalContent);
            document.body.appendChild(modal);
            modalContent.querySelector('[data-act="modalCancel"]').addEventListener('click', () => {
                modal.remove();
                status.textContent = "Copie annulée.";
            });
            modalContent.querySelector('[data-act="modalConfirm"]').addEventListener('click', () => {
                for (const code of EDITABLE_FIELDS) {
                    const row = root.querySelector(`[data-row="${code}"]`);
                    const clearCheckbox = row ? row.querySelector('.clear-checkbox-input') : null;
                    if (clearCheckbox)
                        clearCheckbox.checked = false;
                }
                for (const [code, value] of Object.entries(mostCommon)) {
                    let cleanValue = value;
                    if (code === 'p') {
                        cleanValue = value.replace(/,/g, '.');
                    }
                    state[code] = cleanValue;
                    const combo = combos[code];
                    if (combo)
                        combo.setValue(cleanValue, true);
                }
                modal.remove();
                status.textContent = "✅ Valeurs préparées. Utilisez le bouton Appliquer du panneau pour les transférer dans Koha.";
            });
        };
        // --- Gestion des mémorisations avec nom ---
        const ownerInput = root.querySelector('[data-owner-input]');
        const ownerSelect = root.querySelector('[data-owner-select]');
        const createListBtn = root.querySelector('[data-act="createList"]');
        const currentListLabel = root.querySelector('#koha_items_current_list');
        let currentOwnerId = "";
        let currentOwnerName = "";
        let firebaseOwnerPresets = [];
        const savedOwnerId = getJSON('koha_items_assistant_selected_owner', '');
        if (savedOwnerId) {
            currentOwnerId = savedOwnerId;
        }
        const ownerIdFromName = name => norm(name).replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
        const renderOwnerOptions = owners => {
            ownerSelect.innerHTML = `<option value="">Sélectionnez votre nom...</option>` +
                (owners || []).map(o => `<option value="${escapeHTML(o.id)}">${escapeHTML(o.ownerName)}</option>`).join("");
            if (currentOwnerId) {
                ownerSelect.value = currentOwnerId;
            }
        };
        const renderPresets = () => {
            const presets = currentOwnerId ? firebaseOwnerPresets : getJSON(PRESETS_KEY, []);
            presetsCount.textContent = `${presets.length}/${MAX_PRESETS}`;
            if (!presets.length) {
                presetsList.innerHTML = `<div class="preset-empty">Aucune mémorisation pour l'instant.</div>`;
                return;
            }
            presetsList.innerHTML = presets.map((p, i) => {
                const name = p.presetName || `Mémorisation ${i + 1}`;
                const fields = Object.entries(p)
                    .filter(([k]) => EDITABLE_FIELDS.includes(k))
                    .map(([k, v]) => {
                    let val = v;
                    if (k === 'p') {
                        val = v.replace(/,/g, '.');
                    }
                    return `${FIELD_MAPPING[k]?.label || k}: ${val}`;
                })
                    .join(' | ');
                return `

                    <div class="preset-item" data-idx="${i}">

                        <span class="preset-text"><b>${escapeHTML(name)}</b><span class="preset-fields">${escapeHTML(fields)}</span></span>

                        <button type="button" class="preset-del" data-del="${i}" title="Supprimer">×</button>

                    </div>

                `;
            }).join("");
        };
        const loadOwnersFromFirebase = async () => {
            if (!firebaseDb && !(await ensureFirebase())) return;
            try {
                status.textContent = "Chargement des listes nominatives...";
                const snapshots = await getDocs(collection(firebaseDb, FIREBASE_PRESETS_COLLECTION));
                budget("reads", snapshots.size);
                const owners = snapshots.docs.map(doc => ({ id: doc.id, ownerName: doc.data().ownerName || doc.id }));
                renderOwnerOptions(owners);
                status.textContent = `Listes nominatives chargées (${owners.length}).`;
                return owners;
            }
            catch (e) {
                status.textContent = "Erreur lors du chargement des listes Firebase.";
                return [];
            }
        };
        const updateCurrentListHeader = () => {
            currentListLabel.textContent = currentOwnerName ? `Liste de : ${currentOwnerName}` : "";
        };
        const loadOwnerPresetsFromFirebase = async (ownerId) => {
            if (!firebaseDb && !(await ensureFirebase())) return;
            if (!ownerId) {
                currentOwnerId = "";
                currentOwnerName = "";
                firebaseOwnerPresets = [];
                setJSON('koha_items_assistant_selected_owner', '');
                renderPresets();
                updateCurrentListHeader();
                return;
            }
            try {
                status.textContent = "Chargement des mémorisations...";
                const ownerDoc = await getDoc(doc(firebaseDb, FIREBASE_PRESETS_COLLECTION, ownerId));
                budget("reads", 1);
                if (!ownerDoc.exists()) {
                    firebaseOwnerPresets = [];
                    currentOwnerId = ownerId;
                    currentOwnerName = ownerInput.value.trim() || ownerId;
                }
                else {
                    currentOwnerId = ownerId;
                    currentOwnerName = ownerDoc.data().ownerName || ownerId;
                    firebaseOwnerPresets = ownerDoc.data().presets || [];
                }
                setJSON('koha_items_assistant_selected_owner', currentOwnerId);
                ownerInput.value = currentOwnerName;
                renderPresets();
                updateCurrentListHeader();
                status.textContent = `Mémorisations pour ${currentOwnerName} chargées (${firebaseOwnerPresets.length}).`;
            }
            catch (e) {
                status.textContent = "Erreur lors de la lecture des mémorisations Firebase.";
            }
        };
        const savePresetToFirebase = async () => {
            if (!firebaseDb && !(await ensureFirebase())) { status.textContent='Firebase non disponible.'; return; }
            let ownerName = ownerInput.value.trim();
            if (!ownerName && currentOwnerId) {
                ownerName = currentOwnerName;
            }
            if (!ownerName) {
                status.textContent = "Entrez votre nom et prénom avant de mémoriser.";
                return;
            }
            if (!firebaseDb) {
                status.textContent = "Firebase non disponible.";
                return;
            }
            const ownerId = ownerIdFromName(ownerName);
            if (!ownerId) {
                status.textContent = "Nom invalide pour la mémorisation.";
                return;
            }
            const presetData = {};
            let hasData = false;
            for (const code of EDITABLE_FIELDS) {
                const val = state[code];
                if (val && val.trim() !== '') {
                    let cleanVal = val;
                    if (code === 'p') {
                        cleanVal = val.replace(/,/g, '.');
                    }
                    presetData[code] = cleanVal;
                    hasData = true;
                }
            }
            if (!hasData) {
                status.textContent = "Rien à mémoriser : au moins un champ doit être rempli.";
                return;
            }
            const modal = document.createElement('div');
            modal.className = `${PANEL_ID}_modal_backdrop`;
            modal.id = `${PANEL_ID}_modal_backdrop`;
            modal.style.position = 'fixed';
            modal.style.inset = '0';
            modal.style.display = 'flex';
            modal.style.alignItems = 'center';
            modal.style.justifyContent = 'center';
            modal.style.background = 'rgba(2, 6, 23, 0.72)';
            modal.style.zIndex = '2147483646';
            modal.style.padding = '24px';
            modal.style.boxSizing = 'border-box';
            const modalContent = document.createElement('div');
            modalContent.className = `${PANEL_ID}_modal_content`;
            modalContent.id = `${PANEL_ID}_modal_content`;
            modalContent.style.width = '100%';
            modalContent.style.maxWidth = '560px';
            modalContent.style.maxHeight = '84vh';
            modalContent.style.boxSizing = 'border-box';
            modalContent.style.position = 'relative';
            modalContent.style.isolation = 'isolate';
            modalContent.style.transform = 'translateZ(0)';
            modalContent.innerHTML = `

                <h3>💾 Nommer la mémorisation</h3>

                <p style="color:#475069;font-size:13px;">Donnez un nom à cette mémorisation pour la retrouver facilement :</p>

                <input type="text" class="preset-name-input" id="presetNameInput" placeholder="Ex: Livre jeunesse, BD, DVD..." value="Mémorisation ${firebaseOwnerPresets.length + 1}">

                <div class="modal-actions">

                    <button class="btn-cancel" data-act="modalCancel">Annuler</button>

                    <button class="btn-confirm" data-act="modalConfirm">Enregistrer</button>

                </div>

            `;
            modal.appendChild(modalContent);
            document.body.appendChild(modal);
            const nameInput = modalContent.querySelector('#presetNameInput');
            nameInput.focus();
            nameInput.select();
            modalContent.querySelector('[data-act="modalCancel"]').addEventListener('click', () => {
                modal.remove();
                status.textContent = "Mémorisation annulée.";
            });
            modalContent.querySelector('[data-act="modalConfirm"]').addEventListener('click', async () => {
                const presetName = nameInput.value.trim() || `Mémorisation ${firebaseOwnerPresets.length + 1}`;
                modal.remove();
                try {
                    status.textContent = "Enregistrement en cours...";
                    const ownerRef = doc(firebaseDb, FIREBASE_PRESETS_COLLECTION, ownerId);
                    const ownerDoc = await getDoc(ownerRef);
                    const existing = ownerDoc.exists() ? ownerDoc.data().presets || [] : [];
                    const dupIdx = existing.findIndex(p => p.presetName === presetName);
                    if (dupIdx !== -1) {
                        if (!confirm(`Une mémorisation nommée "${presetName}" existe déjà. Voulez-vous la remplacer ?`)) {
                            status.textContent = "Mémorisation annulée.";
                            return;
                        }
                        existing.splice(dupIdx, 1);
                    }
                    existing.unshift({ ...presetData, presetName, createdAt: new Date().toISOString() });
                    while (existing.length > MAX_PRESETS)
                        existing.pop();
                    await setDoc(ownerRef, { ownerName, presets: existing, updatedAt: serverTimestamp() }, { merge: true });
                    currentOwnerId = ownerId;
                    currentOwnerName = ownerName;
                    firebaseOwnerPresets = existing;
                    setJSON('koha_items_assistant_selected_owner', currentOwnerId);
                    await loadOwnersFromFirebase();
                    ownerSelect.value = ownerId;
                    renderPresets();
                    updateCurrentListHeader();
                    status.textContent = `✅ Mémorisation "${presetName}" enregistrée pour ${ownerName}.`;
                }
                catch (e) {
                    (function () { })("Firebase save error:", e);
                    status.textContent = `Erreur lors de l'enregistrement Firebase : ${e.message || e}`;
                }
            });
        };
        const deleteFirebasePreset = async (index) => {
            if (!firebaseDb && !(await ensureFirebase())) { status.textContent='Firebase non disponible.'; return; }
            if (!firebaseDb || !currentOwnerId)
                return;
            const presetName = firebaseOwnerPresets[index]?.presetName || `Mémorisation ${index + 1}`;
            if (!confirm(`Supprimer "${presetName}" ?`))
                return;
            try {
                const ownerRef = doc(firebaseDb, FIREBASE_PRESETS_COLLECTION, currentOwnerId);
                const newPresets = [...firebaseOwnerPresets];
                newPresets.splice(index, 1);
                if (!newPresets.length) {
                    const confirmed = window.confirm("La liste nominative est désormais vide. Voulez-vous supprimer la liste elle-même ?");
                    if (!confirmed) {
                        status.textContent = "Suppression annulée. La liste nominative reste active.";
                        return;
                    }
                    await deleteDoc(ownerRef);
                    currentOwnerId = "";
                    currentOwnerName = "";
                    ownerSelect.value = "";
                    ownerInput.value = "";
                    firebaseOwnerPresets = [];
                    setJSON('koha_items_assistant_selected_owner', '');
                    await loadOwnersFromFirebase();
                    renderPresets();
                    updateCurrentListHeader();
                    status.textContent = "Liste vide supprimée.";
                    return;
                }
                firebaseOwnerPresets = newPresets;
                await setDoc(ownerRef, { presets: firebaseOwnerPresets, updatedAt: serverTimestamp() }, { merge: true });
                renderPresets();
                status.textContent = `✅ Mémorisation "${presetName}" supprimée.`;
            }
            catch (e) {
                status.textContent = "Erreur lors de la suppression Firebase.";
            }
        };
        ownerSelect.addEventListener("change", () => {
            loadOwnerPresetsFromFirebase(ownerSelect.value);
        });
        createListBtn.addEventListener("click", async () => {
            if (!firebaseDb && !(await ensureFirebase())) { status.textContent='Firebase non disponible.'; return; }
            const name = ownerInput.value.trim();
            if (!name) {
                status.textContent = "Entrez un nom complet pour créer la liste.";
                ownerInput.focus();
                return;
            }
            if (!firebaseDb) {
                status.textContent = "Firebase non disponible.";
                return;
            }
            const ownerId = ownerIdFromName(name);
            if (!ownerId) {
                status.textContent = "Nom invalide pour la liste.";
                ownerInput.focus();
                return;
            }
            try {
                status.textContent = "Création de la liste en cours...";
                const ownerRef = doc(firebaseDb, FIREBASE_PRESETS_COLLECTION, ownerId);
                const ownerDoc = await getDoc(ownerRef);
                const existing = ownerDoc.exists() ? ownerDoc.data().presets || [] : [];
                await setDoc(ownerRef, { ownerName: name, presets: existing, updatedAt: serverTimestamp() }, { merge: true });
                currentOwnerId = ownerId;
                currentOwnerName = name;
                setJSON('koha_items_assistant_selected_owner', currentOwnerId);
                await loadOwnersFromFirebase();
                ownerSelect.value = ownerId;
                await loadOwnerPresetsFromFirebase(ownerId);
                status.textContent = `✅ Liste "${name}" créée et sélectionnée.`;
            }
            catch (e) {
                (function () { })("Firebase create list error:", e);
                status.textContent = `Erreur lors de la création de la liste : ${e.message || e}`;
            }
        });
        const presetControls = root.querySelector('#koha_items_preset_controls');
        const togglePresetControlsBtn = root.querySelector('[data-act="togglePresetControls"]');
        const updatePresetControlsLabel = () => {
            const open = presetControls.classList.contains('open');
            togglePresetControlsBtn.textContent = open ? 'Masquer' : 'Options';
        };
        togglePresetControlsBtn.addEventListener('click', () => {
            presetControls.classList.toggle('open');
            updatePresetControlsLabel();
            setJSON('koha_items_assistant_preset_controls_open', presetControls.classList.contains('open'));
        });
        const savedControlsOpen = getJSON('koha_items_assistant_preset_controls_open', false);
        if (savedControlsOpen) {
            presetControls.classList.add('open');
            updatePresetControlsLabel();
        }
        updatePresetControlsLabel();
        ownerSelect.addEventListener('focus', () => { loadOwnersFromFirebase(); }, { passive:true });
        ownerInput.addEventListener('focus', () => { if (!ownerSelect.options.length || ownerSelect.options.length <= 1) loadOwnersFromFirebase(); }, { passive:true });
        togglePresetControlsBtn.addEventListener('click', () => {
            loadOwnersFromFirebase();
            if (savedOwnerId && !firebaseOwnerPresets.length) loadOwnerPresetsFromFirebase(savedOwnerId);
        });
        presetsList.addEventListener("click", e => {
            const delBtn = e.target.closest("[data-del]");
            if (delBtn) {
                const index = +delBtn.dataset.del;
                if (currentOwnerId) {
                    deleteFirebasePreset(index);
                }
                else {
                    const presets = getJSON(PRESETS_KEY, []);
                    presets.splice(index, 1);
                    setJSON(PRESETS_KEY, presets);
                    renderPresets();
                }
                return;
            }
            const item = e.target.closest(".preset-item");
            if (!item)
                return;
            const presets = currentOwnerId ? firebaseOwnerPresets : getJSON(PRESETS_KEY, []);
            const p = presets[+item.dataset.idx];
            if (!p)
                return;
            // Un preset remplace intégralement le précédent dans le panneau : pas de fuite d'état.
            for (const code of EDITABLE_FIELDS) {
                state[code] = "";
                const combo = combos[code];
                if (combo)
                    combo.setValue("", true);
                const row = root.querySelector(`[data-row="${code}"]`);
                const clearCheckbox = row ? row.querySelector('.clear-checkbox-input') : null;
                if (clearCheckbox)
                    clearCheckbox.checked = false;
            }
            for (const code of EDITABLE_FIELDS) {
                if (p[code] !== undefined) {
                    let val = p[code];
                    if (code === 'p') {
                        val = val.replace(/,/g, '.');
                    }
                    state[code] = val;
                    const combo = combos[code];
                    if (combo)
                        combo.setValue(val, true);
                }
            }
            status.textContent = `✅ Mémorisation "${p.presetName || ''}" chargée. Cliquez sur "Appliquer" pour l'utiliser.`;
        });
        renderPresets();
        // --- Définition des événements pour les combos ---
        for (const code of EDITABLE_FIELDS) {
            const combo = combos[code];
            if (combo) {
                combo.onChange(val => {
                    state[code] = val;
                });
            }
        }
        // --- Boutons d'action ---
        root.querySelector('[data-act="apply"]').addEventListener('click', () => { applyValues(); });
        root.querySelector('[data-act="clearAll"]').addEventListener('click', clearAllModalFields);
        root.querySelector('[data-act="copyFromOthers"]').addEventListener('click', copyFromOthers);
        root.querySelector('[data-act="save"]').addEventListener('click', savePresetToFirebase);
        const collapseBtn = root.querySelector('[data-act="collapse"]');
        if (collapseBtn) {
            collapseBtn.textContent = savedPanelState.collapsed ? '+' : '–';
            collapseBtn.addEventListener("click", () => {
                root.classList.toggle("collapsed");
                const isCollapsed = root.classList.contains("collapsed");
                collapseBtn.textContent = isCollapsed ? '+' : '–';
                setJSON(PANEL_STATE_KEY, { collapsed: isCollapsed });
                savePosition();
            });
        }
        window.addEventListener('beforeunload', () => {
            savePosition();
        });
        // --- Rafraîchir périodiquement les options des selects ---
        setInterval(() => {
            for (const code of EDITABLE_FIELDS) {
                const el = getFieldElement(code);
                if (el && el.tagName === 'SELECT') {
                    const options = getSelectOptions(el);
                    const combo = combos[code];
                    if (combo) {
                        combo.setItems(options);
                    }
                }
            }
        }, 5000);
    };
    async function ensureFirebase() {
        if (firebaseDb) return true;
        if (firebaseInitPromise) return firebaseInitPromise;
        firebaseInitPromise = (async () => {
            try {
                const fb = KT.getService && KT.getService('firebase-module');
                const meta = fb?.require?.(MODULE_ID, firebaseConfig);
                const publicCfg = fb?.publicConfig?.(MODULE_ID, meta, { throwOnError: true });
                const base = `https://www.gstatic.com/firebasejs/${meta?.sdkVersion || '11.5.0'}`;
                const appMod = await import(base + "/firebase-app.js");
                const firebaseFirestore = await import(base + "/firebase-firestore.js");
                const { getFirestore } = firebaseFirestore;
                collection = firebaseFirestore.collection; doc = firebaseFirestore.doc; getDocs = firebaseFirestore.getDocs; getDoc = firebaseFirestore.getDoc;
                setDoc = firebaseFirestore.setDoc; deleteDoc = firebaseFirestore.deleteDoc; serverTimestamp = firebaseFirestore.serverTimestamp;
                const appName = meta?.appName || 'KohaToolsItemPresets';
                const app = appMod.getApps().find(a => a.name === appName) || appMod.initializeApp(publicCfg, appName);
                firebaseDb = meta?.databaseId && meta.databaseId !== '(default)' ? getFirestore(app, meta.databaseId) : getFirestore(app);
                window.dispatchEvent(new CustomEvent('koha-items-assistant-firebase-ready'));
                return true;
            } catch (_) { firebaseDb = null; return false; }
            finally { firebaseInitPromise = null; }
        })();
        return firebaseInitPromise;
    }
    // --- Boot UI (Firebase chargé uniquement à la demande) ---
    const boot = async () => {
        await waitForBody();
        ensureStyle();
        // Le coeur de l'assistant ne dépend pas de Firebase.
        // Les mémorisations nominatives activent Firebase seulement quand l'utilisateur ouvre/emploie leurs contrôles.
        setTimeout(createPanel, 500);
    };
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", boot);
    }
    else {
        boot();
    }
})();

},destroy:function(){return false;},onConfigChange:function(){return {reloadRequired:true};}};
KT.registerModule(runtime);if(CFG.mode==="shadow"){KT.record({module:MODULE_ID,level:"info",kind:"shadow-exact-parity-sealed",sources:runtime.sourceFiles});return;}runtime.init();
})();