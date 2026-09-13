(function(){"use strict";
const KT=window.KohaTools;if(!KT||!KT.Config)return;const MODULE_ID='cataloging-domain-assistant',CFG=KT.Config.getCanonical(MODULE_ID),Scope=KT.getService&&KT.getService("scope");
if(!CFG||!CFG.enabled||!["shadow","live"].includes(CFG.mode))return;if(Scope&&!Scope.match(CFG.general&&CFG.general.scope).ok)return;
const runtime={id:MODULE_ID,sourceFiles:['109-helper-domaine.js'],parity:"exact-legacy",init:function(){if(window["__KT_PARITY_"+MODULE_ID])return;window["__KT_PARITY_"+MODULE_ID]=true;
(function () {
  // --- Restriction : ne s'exécute que sur la page addbiblio.pl ---
  if (!/\/cgi-bin\/koha\/cataloguing\/addbiblio\.pl/i.test(location.pathname)) {
    return;
  }

  const firebaseConfig = CFG?.firebase || {};

  const PANEL_ID = "koha099_picker_panel";
  const CACHE_KEY = "koha099_picker_v3_last";
  const PRESETS_KEY = "koha099_picker_v3_presets";
  const PANEL_STATE_KEY = "koha099_picker_v3_panel_state";
  const SELECTED_LIST_KEY = "koha099_picker_v3_selected_list";
  const FIREBASE_PRESETS_COLLECTION = "koha099_named_presets";
  const MAX_PRESETS = Math.max(1, Number(CFG?.limits?.maxPresets ?? 20));

  let firebaseDb = null;
  let firebaseInitPromise = null;
  let ownersLoaded = false;
  const OWNERS_CACHE_KEY = `KohaTools.domainPresets.owners.v2.${String(firebaseConfig.projectId||'unconfigured')}`;
  const OWNERS_CACHE_TTL = 30 * 60 * 1000;
  const budget = (op,n=1) => { try { window.KohaTools?.getService?.("firebase-budget")?.record?.(firebaseConfig.projectId,op,n,{kind:"firestore"}); } catch (_) {} };
  let collection = null;
  let doc = null;
  let getDocs = null;
  let getDoc = null;
  let setDoc = null;
  let deleteDoc = null;
  let serverTimestamp = null;
  let runTransaction = null;

  const waitForBody = () => new Promise(resolve => {
    if (document.body) return resolve();

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

  const escapeHTML = value => (value ?? "")
    .toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

  const escapeAttr = escapeHTML;

  const getJSON = (key, fallback) => {
    try {
      const v = JSON.parse(localStorage.getItem(key) || "null");
      return v === null ? fallback : v;
    } catch (e) {
      return fallback;
    }
  };

  const setJSON = (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {}
  };

  const ensureStyle = () => {
    if (document.getElementById("koha099_picker_style")) return;

    const s = document.createElement("style");
    s.id = "koha099_picker_style";

    s.textContent = `
#${PANEL_ID}{
  position:fixed;top:70px;right:20px;z-index:999999;
  background:#ffffff;border:1px solid #dfe6df;border-radius:14px;
  box-shadow:0 14px 42px rgba(24,39,27,.16),0 3px 10px rgba(20,20,40,.07);
  width:360px;font:12.5px/1.35 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
  color:#1f2430;overflow:hidden;user-select:none;
}

#${PANEL_ID} *{
  box-sizing:border-box;
  user-select:text;
}

#${PANEL_ID}.collapsed .body{
  display:none;
}

#${PANEL_ID} .head{
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap:8px;
  padding:11px 12px;
  cursor:move;
  font-weight:700;
  font-size:13px;
  background:linear-gradient(135deg,#3f8340 0%,#438d43 100%);
  color:#fff;
  letter-spacing:.2px;
  border-bottom:1px solid rgba(0,0,0,.08);
}

#${PANEL_ID} .head .title{
  display:flex;
  align-items:center;
  font-size:13.5px;
}

#${PANEL_ID} .head .subtitle{
  display:inline-block;
  font-size:10.5px;
  font-weight:500;
  color:rgba(255,255,255,.94);
  margin-top:3px;
  letter-spacing:0;
  background:rgba(255,255,255,.12);
  padding:1px 6px;
  border-radius:999px;
}

#${PANEL_ID} .head .subtitle:empty{
  display:none;
}

#${PANEL_ID} .head-btns{
  display:flex;
  gap:4px;
}

#${PANEL_ID} .head-btns button{
  background:rgba(255,255,255,.16);
  border:1px solid rgba(255,255,255,.08);
  color:#fff;
  width:24px;
  height:24px;
  border-radius:7px;
  cursor:pointer;
  font-size:13px;
  line-height:1;
  display:flex;
  align-items:center;
  justify-content:center;
  transition:background .15s,border-color .15s;
}

#${PANEL_ID} .head-btns button:hover{
  background:rgba(255,255,255,.30);
  border-color:rgba(255,255,255,.18);
}

#${PANEL_ID} .body{
  padding:12px;
  max-height:78vh;
  overflow-y:auto;
  overflow-x:hidden;
  background:#fff;
}

#${PANEL_ID} .row{
  margin:0 0 8px;
  min-width:0;
}

#${PANEL_ID} .row label{
  display:block;
  font-weight:700;
  margin-bottom:3px;
  color:#566258;
  font-size:10.5px;
  text-transform:uppercase;
  letter-spacing:.45px;
}

#${PANEL_ID} .combo-wrap{
  position:relative;
  min-width:0;
}

#${PANEL_ID} .combo-input{
  width:100%;
  min-width:0;
  max-width:100%;
  padding:7px 28px 7px 9px;
  border:1px solid #dce4dc;
  border-radius:8px;
  font:inherit;
  color:#253027;
  background:#f8faf8;
  transition:border-color .15s,background .15s,box-shadow .15s;
}

#${PANEL_ID} .combo-input:hover:not(:disabled){
  border-color:#cbd8cc;
}

#${PANEL_ID} .combo-input:focus{
  outline:none;
  border-color:#79a97b;
  background:#fff;
  box-shadow:0 0 0 2px rgba(64,133,64,.10);
}

#${PANEL_ID} .combo-input:disabled{
  background:#f0f2f0;
  border-color:#e3e7e3;
  color:#9aa29b;
  cursor:not-allowed;
}

#${PANEL_ID} .combo-input.non-authorized{
  border-color:#d59a1f!important;
  background:#fff8ea!important;
  color:#8a4b00!important;
  box-shadow:0 0 0 2px rgba(213,154,31,.08)!important;
}

#${PANEL_ID} .combo-clear{
  position:absolute;
  right:6px;
  top:50%;
  transform:translateY(-50%);
  border:none;
  background:transparent;
  color:#a8b0a9;
  cursor:pointer;
  font-size:14px;
  width:20px;
  height:20px;
  border-radius:6px;
  display:flex;
  align-items:center;
  justify-content:center;
  opacity:.62;
  transition:opacity .15s,background .15s,color .15s;
}

#${PANEL_ID} .combo-wrap:hover .combo-clear,
#${PANEL_ID} .combo-clear:focus{
  opacity:1;
}

#${PANEL_ID} .combo-clear:hover{
  background:#e9eeea;
  color:#4f5a51;
}

#${PANEL_ID} .combo-menu{
  position:absolute;
  left:0;
  right:0;
  top:calc(100% + 4px);
  background:#fff;
  border:1px solid #dfe6df;
  border-radius:9px;
  box-shadow:0 9px 24px rgba(24,39,27,.14);
  max-height:180px;
  overflow-y:auto;
  overflow-x:hidden;
  z-index:10;
  display:none;
}

#${PANEL_ID} .combo-item{
  padding:6px 10px;
  cursor:pointer;
  font-size:12px;
  display:flex;
  flex-direction:column;
  gap:2px;
  border-bottom:1px solid #f1f3f1;
}

#${PANEL_ID} .combo-item:last-child{
  border-bottom:none;
}

#${PANEL_ID} .combo-item:hover,
#${PANEL_ID} .combo-item.active{
  background:#edf6ee;
  color:#347336;
}

#${PANEL_ID} .combo-item-label{
  font-size:12px;
  color:#253027;
  font-weight:600;
}

#${PANEL_ID} .combo-item-context{
  font-size:10px;
  color:#788079;
}

#${PANEL_ID} .combo-item-note{
  font-size:10px;
  color:#a66500;
  font-style:italic;
  margin-top:2px;
}

#${PANEL_ID} .combo-empty{
  padding:7px 10px;
  color:#929a93;
  font-style:italic;
  font-size:11px;
}

#${PANEL_ID} .actions{
  display:flex;
  gap:6px;
  margin-top:9px;
  padding-top:9px;
  border-top:1px solid #e8ece8;
}

#${PANEL_ID} .actions button{
  flex:1 1 0;
  min-width:0;
  min-height:36px;
  padding:6px 7px;
  cursor:pointer;
  font:inherit;
  font-weight:700;
  font-size:11.5px;
  line-height:1.15;
  text-align:center;
  border-radius:8px;
  border:1px solid transparent;
  display:flex;
  align-items:center;
  justify-content:center;
  white-space:normal;
  transition:filter .15s,background .15s,border-color .15s,box-shadow .15s,transform .08s;
}

#${PANEL_ID} .actions button:active{
  transform:translateY(1px);
}

#${PANEL_ID} .btn-primary{
  background:#408540;
  color:#fff;
  border-color:#397a39;
  box-shadow:0 2px 5px rgba(64,133,64,.18);
}

#${PANEL_ID} .btn-primary:hover{
  filter:brightness(1.06);
  box-shadow:0 3px 7px rgba(64,133,64,.22);
}

#${PANEL_ID} .btn-secondary{
  background:#eef7ef;
  color:#347336;
  border-color:#d8ead9;
}

#${PANEL_ID} .btn-secondary:hover{
  background:#e4f2e5;
  border-color:#c8e1ca;
}

#${PANEL_ID} .btn-ghost{
  background:#f5f6f5;
  color:#646d66;
  border-color:#e8ebe8;
}

#${PANEL_ID} .btn-ghost:hover{
  background:#ecefec;
  border-color:#dce1dc;
}

#${PANEL_ID} .status{
  font-size:10.5px;
  color:#536056;
  margin-top:7px;
  white-space:pre-wrap;
  line-height:1.45;
  background:#f7f9f7;
  border-radius:8px;
  padding:7px 9px;
  border:1px solid #e5eae5;
  border-left:3px solid #a9baa9;
  max-height:100px;
  overflow-y:auto;
  overflow-x:hidden;
}

#${PANEL_ID} .status:empty{
  display:none;
}

#${PANEL_ID} .divider{
  border:none;
  border-top:1px solid #e3e8e3;
  margin:10px 0 8px;
}

#${PANEL_ID} .presets-title{
  font-weight:800;
  font-size:10.5px;
  text-transform:uppercase;
  letter-spacing:.55px;
  color:#566258;
  margin-bottom:5px;
  display:flex;
  justify-content:space-between;
  align-items:center;
}

#${PANEL_ID} .presets-count{
  color:#7d887f;
  font-weight:700;
  text-transform:none;
  letter-spacing:0;
  background:#eef2ee;
  border:1px solid #e2e7e2;
  border-radius:999px;
  padding:1px 6px;
}

#${PANEL_ID} .presets-actions{
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap:6px;
  margin-bottom:6px;
}

#${PANEL_ID} .presets-actions .note-presets{
  font-size:10px;
  color:#7a837c;
  flex:1;
  line-height:1.35;
}

#${PANEL_ID} .btn-small{
  padding:4px 8px;
  font-size:10.5px;
  border-radius:7px;
}

#${PANEL_ID} .preset-controls{
  padding:7px 7px 1px;
  margin-bottom:6px;
  display:none;
  background:#f7f9f7;
  border:1px solid #e8ece8;
  border-radius:8px;
}

#${PANEL_ID} .preset-controls.open{
  display:block;
}

#${PANEL_ID} .preset-controls .row{
  margin:0 0 7px;
  min-width:0;
}

#${PANEL_ID} .preset-controls .row > div{
  min-width:0;
  max-width:100%;
}

#${PANEL_ID} .preset-list{
  display:flex;
  flex-direction:column;
  gap:5px;
  max-height:132px;
  overflow-y:auto;
  overflow-x:hidden;
  padding-right:2px;
}

#${PANEL_ID} .preset-item{
  display:flex;
  align-items:center;
  gap:6px;
  min-width:0;
  background:#fff;
  border:1px solid #e3e8e3;
  border-radius:8px;
  padding:6px 7px;
  cursor:pointer;
  transition:background .15s,border-color .15s,box-shadow .15s;
}

#${PANEL_ID} .preset-item:hover{
  background:#f7fcf7;
  border-color:#bed8c0;
  box-shadow:0 1px 3px rgba(64,133,64,.07);
}

#${PANEL_ID} .preset-text{
  flex:1;
  min-width:0;
  font-size:10.5px;
  color:#667067;
  line-height:1.35;
  overflow-wrap:anywhere;
}

#${PANEL_ID} .preset-text b{
  color:#397c3b;
  font-weight:800;
}

#${PANEL_ID} .preset-del{
  border:none;
  background:transparent;
  color:#b0b8b1;
  cursor:pointer;
  font-size:13px;
  width:20px;
  height:20px;
  border-radius:6px;
  flex-shrink:0;
  display:flex;
  align-items:center;
  justify-content:center;
}

#${PANEL_ID} .preset-del:hover{
  background:#ffe8e8;
  color:#d9473f;
}

#${PANEL_ID} .preset-empty{
  color:#919991;
  font-style:italic;
  font-size:10.5px;
  padding:5px 2px;
}
`;

    document.head.appendChild(s);
  };

  const parseLevel = name => {
    const s = norm(name);

    if (/domaine\s*0?99\$?a/.test(s)) return "a";
    if (/sous[- ]domaine\s*0?99\$?b/.test(s)) return "b";
    if (/th[eè]me\s*0?99\$?e/.test(s)) return "e";
    if (/sujet\s*0?99\$?f/.test(s)) return "f";

    if (
      /(?:forme\s*\/\s*genre|genre(?:\s+litt[eè]raire)?)(?:\s*608\$?a)?/.test(s)
    ) {
      return "g";
    }

    if (/sujet\s*615\$?a/.test(s)) return "s";

    return "";
  };

  const cleanLabel = s => {
    const txt = (s || "").trim();

    if (!txt) return "";

    const m = txt.match(
      /^(.*?)\s*\((?:Sous[- ]?domaine|Domaine|Th[eè]me(?:s)?|Sujet|Forme\s*\/\s*Genre|Genre(?:\s+litt[eè]raire)?)[^)]*\)/i
    );

    if (m) return m[1].trim();

    return txt
      .replace(/\s*\(\d+\)\s*$/, "")
      .trim();
  };

  const extractPathKey = node => {
    const p = (node.parentPath || node.path || node.parent || "").trim();
    return norm(p);
  };

  // Reproduit la logique d'attachement de buildTree() :
  // un noeud supprimé, ou un noeud dont la chaîne de parents n'est plus
  // rattachée à la racine, ne doit pas être utilisé par les listes 099.
  const getTreeParentPath = node => {
    if (!node) return "";

    if (typeof node.parentPath === "string") {
      return node.parentPath.trim();
    }

    if (typeof node.parent === "string") {
      return node.parent.trim();
    }

    return "";
  };

  const getTreeNodeName = node =>
    (node?.name || node?.label || "")
      .toString()
      .trim();

  const getTreeFullPath = node => {
    const name = getTreeNodeName(node);
    const parentPath = getTreeParentPath(node);

    return parentPath
      ? `${parentPath}/${name}`
      : name;
  };

  const buildActiveTreeContext = rows => {
    // 1. Exclure les documents explicitement supprimés.
    const activeRows = (rows || []).filter(row => !row.deleted);

    // 2. Reconstituer le même index de chemins que buildTree().
    const byPath = new Map();

    activeRows.forEach(row => {
      const fullPath = getTreeFullPath(row);

      if (fullPath) {
        byPath.set(fullPath, row);
      }
    });

    // 3. Ne conserver que les noeuds réellement atteignables depuis la racine.
    // Cela élimine aussi les descendants/orphelins d'un ancien noeud supprimé.
    const reachablePaths = new Set();

    activeRows.forEach(row => {
      if (getTreeParentPath(row) === "") {
        const fullPath = getTreeFullPath(row);

        if (fullPath) {
          reachablePaths.add(fullPath);
        }
      }
    });

    let changed = true;
    let guard = 0;

    while (changed && guard++ < activeRows.length + 2) {
      changed = false;

      activeRows.forEach(row => {
        const fullPath = getTreeFullPath(row);

        if (!fullPath || reachablePaths.has(fullPath)) {
          return;
        }

        const parentPath = getTreeParentPath(row);

        if (
          parentPath &&
          reachablePaths.has(parentPath) &&
          byPath.has(parentPath)
        ) {
          reachablePaths.add(fullPath);
          changed = true;
        }
      });
    }

    const reachableRows = activeRows.filter(row =>
      reachablePaths.has(getTreeFullPath(row))
    );

    return {
      allRows: rows || [],
      rows: reachableRows,
      byPath,
      reachablePaths,
      excludedDeleted: (rows || []).length - activeRows.length,
      excludedOrphans: activeRows.length - reachableRows.length
    };
  };

  const findAncestorByLevel = (node, wantedLevel, treeCtx) => {
    let parentPath = getTreeParentPath(node);
    let guard = 0;

    while (parentPath && guard++ < 100) {
      if (!treeCtx.reachablePaths.has(parentPath)) {
        return null;
      }

      const parent = treeCtx.byPath.get(parentPath);

      if (!parent) {
        return null;
      }

      if (parseLevel(getTreeNodeName(parent)) === wantedLevel) {
        return parent;
      }

      parentPath = getTreeParentPath(parent);
    }

    return null;
  };

  const getAncestorLabelKeys = (node, treeCtx) => {
    const keys = [];

    let parentPath = getTreeParentPath(node);
    let guard = 0;

    while (parentPath && guard++ < 100) {
      if (!treeCtx.reachablePaths.has(parentPath)) {
        break;
      }

      const parent = treeCtx.byPath.get(parentPath);

      if (!parent) {
        break;
      }

      const label = cleanLabel(getTreeNodeName(parent));

      if (label) {
        keys.push(norm(label));
      }

      parentPath = getTreeParentPath(parent);
    }

    return keys;
  };

  const buildIndex = rows => {
    const treeCtx = buildActiveTreeContext(rows);

    rows = treeCtx.rows;

    const idx = {
      a: [],
      bByA: new Map(),
      eByAB: new Map(),
      fByABE: new Map(),
      g: [],
      s: []
    };

    // ============================================================
    // Domaine 099$a
    // ============================================================

    for (const r of rows) {
      const level = parseLevel(getTreeNodeName(r));

      if (level !== "a") continue;

      const label = cleanLabel(getTreeNodeName(r));

      if (!label) continue;

      idx.a.push({
        label,
        raw: r,
        key: norm(label),
        ancestorKeys: getAncestorLabelKeys(r, treeCtx)
      });
    }

    idx.a = [
      ...new Map(
        idx.a.map(x => [x.key, x])
      ).values()
    ].sort((x, y) =>
      x.label.localeCompare(y.label, "fr")
    );

    // ============================================================
    // Sous-domaine 099$b
    // ============================================================

    for (const r of rows) {
      if (parseLevel(getTreeNodeName(r)) !== "b") {
        continue;
      }

      const label = cleanLabel(getTreeNodeName(r));

      if (!label) continue;

      const aRow = findAncestorByLevel(r, "a", treeCtx);

      if (!aRow) continue;

      const aKey = norm(
        cleanLabel(
          getTreeNodeName(aRow)
        )
      );

      const a = idx.a.find(x =>
        x.key === aKey
      );

      if (!a) continue;

      if (!idx.bByA.has(a.key)) {
        idx.bByA.set(a.key, []);
      }

      idx.bByA.get(a.key).push({
        label,
        raw: r,
        key: norm(label),
        aKey: a.key,
        ancestorKeys: getAncestorLabelKeys(r, treeCtx)
      });
    }

    for (const [k, arr] of idx.bByA) {
      idx.bByA.set(
        k,
        [
          ...new Map(
            arr.map(x => [x.key, x])
          ).values()
        ].sort((x, y) =>
          x.label.localeCompare(y.label, "fr")
        )
      );
    }

    // ============================================================
    // Thème 099$e
    // ============================================================

    for (const r of rows) {
      if (parseLevel(getTreeNodeName(r)) !== "e") {
        continue;
      }

      const label = cleanLabel(getTreeNodeName(r));

      if (!label) continue;

      const aRow = findAncestorByLevel(r, "a", treeCtx);
      const bRow = findAncestorByLevel(r, "b", treeCtx);

      if (!aRow || !bRow) continue;

      const aKey = norm(
        cleanLabel(
          getTreeNodeName(aRow)
        )
      );

      const bKey = norm(
        cleanLabel(
          getTreeNodeName(bRow)
        )
      );

      const a = idx.a.find(x =>
        x.key === aKey
      );

      if (!a) continue;

      const b = (idx.bByA.get(a.key) || [])
        .find(x =>
          x.key === bKey
        );

      if (!b) continue;

      const abKey =
        `${a.key}|||${b.key}`;

      if (!idx.eByAB.has(abKey)) {
        idx.eByAB.set(abKey, []);
      }

      idx.eByAB.get(abKey).push({
        label,
        raw: r,
        key: norm(label),
        aKey: a.key,
        bKey: b.key,
        ancestorKeys: getAncestorLabelKeys(r, treeCtx)
      });
    }

    for (const [k, arr] of idx.eByAB) {
      idx.eByAB.set(
        k,
        [
          ...new Map(
            arr.map(x => [x.key, x])
          ).values()
        ].sort((x, y) =>
          x.label.localeCompare(y.label, "fr")
        )
      );
    }

    // ============================================================
    // Sujet 099$f
    // ============================================================

    for (const r of rows) {
      if (parseLevel(getTreeNodeName(r)) !== "f") {
        continue;
      }

      const label = cleanLabel(getTreeNodeName(r));

      if (!label) continue;

      const aRow = findAncestorByLevel(r, "a", treeCtx);
      const bRow = findAncestorByLevel(r, "b", treeCtx);
      const eRow = findAncestorByLevel(r, "e", treeCtx);

      if (!aRow || !bRow || !eRow) {
        continue;
      }

      const aKey = norm(
        cleanLabel(
          getTreeNodeName(aRow)
        )
      );

      const bKey = norm(
        cleanLabel(
          getTreeNodeName(bRow)
        )
      );

      const eKey = norm(
        cleanLabel(
          getTreeNodeName(eRow)
        )
      );

      const a = idx.a.find(x =>
        x.key === aKey
      );

      if (!a) continue;

      const b = (idx.bByA.get(a.key) || [])
        .find(x =>
          x.key === bKey
        );

      if (!b) continue;

      const e = (
        idx.eByAB.get(
          `${a.key}|||${b.key}`
        ) || []
      ).find(x =>
        x.key === eKey
      );

      if (!e) continue;

      const abeKey =
        `${a.key}|||${b.key}|||${e.key}`;

      if (!idx.fByABE.has(abeKey)) {
        idx.fByABE.set(abeKey, []);
      }

      idx.fByABE.get(abeKey).push({
        label,
        raw: r,
        key: norm(label),
        ancestorKeys: getAncestorLabelKeys(r, treeCtx)
      });
    }

    for (const [k, arr] of idx.fByABE) {
      idx.fByABE.set(
        k,
        [
          ...new Map(
            arr.map(x => [x.key, x])
          ).values()
        ].sort((x, y) =>
          x.label.localeCompare(y.label, "fr")
        )
      );
    }

    // ============================================================
    // Genre 608$a
    // ============================================================

    for (const r of rows) {
      if (parseLevel(getTreeNodeName(r)) !== "g") {
        continue;
      }

      const label = cleanLabel(getTreeNodeName(r));

      if (!label) continue;

      idx.g.push({
        label,
        raw: r,
        key: norm(label),
        ancestorKeys: getAncestorLabelKeys(r, treeCtx)
      });
    }

    idx.g = [
      ...new Map(
        idx.g.map(x => [
          `${x.key}|||${(x.ancestorKeys || []).join("|||")}`,
          x
        ])
      ).values()
    ].sort((x, y) =>
      x.label.localeCompare(y.label, "fr")
    );

    // ============================================================
    // Sujet 615$a
    // ============================================================

    for (const r of rows) {
      if (parseLevel(getTreeNodeName(r)) !== "s") {
        continue;
      }

      const label = cleanLabel(getTreeNodeName(r));

      if (!label) continue;

      idx.s.push({
        label,
        raw: r,
        key: norm(label),
        ancestorKeys: getAncestorLabelKeys(r, treeCtx)
      });
    }

    idx.s = [
      ...new Map(
        idx.s.map(x => [
          `${x.key}|||${(x.ancestorKeys || []).join("|||")}`,
          x
        ])
      ).values()
    ].sort((x, y) =>
      x.label.localeCompare(y.label, "fr")
    );

    // ============================================================
    // Diagnostic interne
    // ============================================================

    window.Koha099TreeDebug = {
      totalRows:
        treeCtx.excludedDeleted +
        treeCtx.excludedOrphans +
        rows.length,

      activeReachableRows: rows.length,

      excludedDeleted:
        treeCtx.excludedDeleted,

      excludedOrphans:
        treeCtx.excludedOrphans,

      find(text) {
        const needle = norm(text || "");

        return treeCtx.allRows
          .filter(r => {
            const hay =
              `${getTreeNodeName(r)} ${getTreeParentPath(r)}`;

            return norm(hay).includes(needle);
          })
          .map(r => ({
            id: r.id,
            name: getTreeNodeName(r),
            parentPath: getTreeParentPath(r),
            deleted: r.deleted,
            reachable:
              treeCtx.reachablePaths.has(
                getTreeFullPath(r)
              ),
            level:
              parseLevel(
                getTreeNodeName(r)
              )
          }));
      }
    };

    return idx;
  };

  // ============================================================
  // Recherche des champs Koha
  // ============================================================

  const findTagScopes = () =>
    [
      ...document.querySelectorAll(
        'li.tag.clearfix[id^="tag_099_"]'
      )
    ];

  const findFieldInScope = (scope, code) =>
    scope.querySelector(
      `select[name^="tag_099_subfield_${code}_"]`
    ) ||
    scope.querySelector(
      `input[name^="tag_099_subfield_${code}_"]`
    );

  const findFFieldInScope = scope => {
    const all = [
      ...scope.querySelectorAll(
        'select[name^="tag_099_subfield_f_"]'
      )
    ];

    if (!all.length) {
      return null;
    }

    return all.find(s => !s.value) || all[0];
  };

  const findFieldByLabel = labelText => {
    const normalized = norm(labelText);

    const label = Array
      .from(
        document.querySelectorAll(
          "label.labelsubfield"
        )
      )
      .find(el =>
        norm(el.textContent || "") === normalized
      );

    if (!label) {
      return null;
    }

    return (
      document.getElementById(
        label.getAttribute("for")
      ) || null
    );
  };

  const findGenreField = () =>
    findFieldByLabel(
      "Genre littéraire"
    );

  const findSubject615Field = () =>
    findFieldByLabel(
      "catégorie sujet"
    );

  // ============================================================
  // Correspondance avec les valeurs autorisées Koha
  // ============================================================

  const findOptionByLabel = (select, label) => {
    if (!select || !label || !select.options) {
      return null;
    }

    const target = norm(label);

    return [...select.options].find(option =>
      norm(option.textContent) === target ||
      norm(option.value) === target
    ) || null;
  };

  const triggerNativeAndJQuery = element => {
    if (!element) return;

    element.dispatchEvent(
      new Event(
        "input",
        { bubbles: true }
      )
    );

    element.dispatchEvent(
      new Event(
        "change",
        { bubbles: true }
      )
    );

    if (window.jQuery) {
      try {
        window.jQuery(element)
          .trigger("change");
      } catch (e) {}
    }
  };

  const setFieldByLabel = (field, label) => {
    if (!field) {
      return {
        ok: false,
        reason: "champ introuvable"
      };
    }

    if (field.tagName === "SELECT") {
      const opt =
        findOptionByLabel(
          field,
          label
        );

      if (!opt) {
        return {
          ok: false,
          reason:
            `aucune option ne correspond à "${label}"`
        };
      }

      field.value = opt.value;

      triggerNativeAndJQuery(field);

      return {
        ok: true,
        matched:
          opt.textContent.trim()
      };
    }

    if (
      field.tagName === "INPUT" ||
      field.tagName === "TEXTAREA"
    ) {
      field.value = label;

      triggerNativeAndJQuery(field);

      return {
        ok: true,
        matched: label
      };
    }

    return {
      ok: false,
      reason: "type de champ non supporté"
    };
  };

  const clearField = field => {
    if (!field) {
      return {
        ok: false,
        reason: "champ introuvable"
      };
    }

    if (field.tagName === "SELECT") {
      const emptyOpt = [...field.options].find(option =>
        option.value === ""
      );

      if (!emptyOpt) {
        return {
          ok: false,
          reason: "ce champ ne possède pas de valeur vide"
        };
      }

      field.value = "";
      triggerNativeAndJQuery(field);

      return { ok: true };
    }

    if (
      field.tagName === "INPUT" ||
      field.tagName === "TEXTAREA"
    ) {
      field.value = "";
      triggerNativeAndJQuery(field);

      return { ok: true };
    }

    return {
      ok: false,
      reason: "type de champ non supporté"
    };
  };

  // ============================================================
  // Combobox du panneau
  // ============================================================

  const makeCombo = (row, placeholder) => {
    row.innerHTML = `
      <div class="combo-wrap">
        <input
          type="text"
          class="combo-input"
          placeholder="${placeholder}"
          autocomplete="off"
        >
        <button
          type="button"
          class="combo-clear"
          tabindex="-1"
          title="Effacer"
        >×</button>
        <div class="combo-menu"></div>
      </div>
    `;

    const input =
      row.querySelector(".combo-input");

    const menu =
      row.querySelector(".combo-menu");

    const clearBtn =
      row.querySelector(".combo-clear");

    let items = [];
    let value = "";
    let onChangeCb = () => {};

    const renderMenu = filterText => {
      const f =
        norm(filterText || "");

      const filtered =
        f
          ? items.filter(it =>
              norm(it.label).includes(f)
            )
          : items;

      if (!items.length) {
        menu.innerHTML =
          `<div class="combo-empty">Aucune option disponible</div>`;
      } else if (!filtered.length) {
        menu.innerHTML =
          `<div class="combo-empty">Aucun résultat</div>`;
      } else {
        menu.innerHTML =
          filtered.map(it =>
            `<div class="combo-item" data-label="${escapeAttr(it.label)}">${renderComboItem(it)}</div>`
          ).join("");
      }

      menu.style.display = "block";
    };

    const refreshInputState = () => {
      /*
       * IMPORTANT :
       *
       * Une ancienne valeur présente dans la notice peut ne plus
       * exister dans l'arborescence active.
       *
       * On la signale visuellement dans le champ mais on ne la
       * réinjecte PAS dans la liste des choix.
       *
       * C'est notamment ce qui évite qu'une ancienne valeur comme
       * "Arts visuels" réapparaisse dans la liste des sous-domaines.
       */

      const hasValue =
        !!(value || "")
          .toString()
          .trim();

      const isAllowed =
        !hasValue ||
        items.some(it =>
          norm(it.label) ===
          norm(value)
        );

      const hasNonAuthorizedValue =
        hasValue &&
        !isAllowed;

      input.classList.toggle(
        "non-authorized",
        hasNonAuthorizedValue
      );

      if (hasNonAuthorizedValue) {
        input.title =
          "Valeur actuelle non autorisée / absente de l’arborescence";
      } else {
        input.title = "";
      }
    };

    const closeMenu = () => {
      menu.style.display = "none";
    };

    input.addEventListener(
      "focus",
      () => {
        if (!input.disabled) {
          renderMenu("");
        }
      }
    );

    input.addEventListener(
      "input",
      () => {
        renderMenu(input.value);
        refreshInputState();
      }
    );

    input.addEventListener(
      "keydown",
      e => {
        if (e.key === "Escape") {
          input.blur();
        }
      }
    );

    input.addEventListener(
      "blur",
      () => {
        setTimeout(() => {
          closeMenu();

          if (input.value !== value) {
            const match =
              items.find(it =>
                norm(it.label) ===
                norm(input.value)
              );

            if (match) {
              value = match.label;
              input.value =
                match.label;

              onChangeCb(value);
            } else if (
              input.value.trim() === ""
            ) {
              value = "";

              onChangeCb(value);
            } else {
              /*
               * L'utilisateur ne peut pas créer manuellement
               * une nouvelle valeur non autorisée.
               */
              input.value = value;
            }
          }
        }, 150);
      }
    );

    menu.addEventListener(
      "mousedown",
      e => {
        const item =
          e.target.closest(
            ".combo-item"
          );

        if (!item) {
          return;
        }

        e.preventDefault();

        value =
          item.dataset.label;

        input.value =
          value;

        closeMenu();
        refreshInputState();

        onChangeCb(value);
      }
    );

    clearBtn.addEventListener(
      "click",
      () => {
        if (input.disabled) {
          return;
        }

        value = "";
        input.value = "";

        refreshInputState();

        onChangeCb(value);

        input.focus();
      }
    );

    return {
      setItems(newItems) {
        items =
          newItems || [];

        refreshInputState();
      },

      setValue(label, silent) {
        value =
          label || "";

        input.value =
          value;

        refreshInputState();

        if (!silent) {
          onChangeCb(value);
        }
      },

      getValue() {
        return value;
      },

      onChange(fn) {
        onChangeCb = fn;
      },

      setDisabled(state) {
        input.disabled =
          !!state;

        input.placeholder =
          state
            ? "—"
            : placeholder;
      }
    };
  };

  const chainLabel = p =>
    `<b>${escapeHTML(p.a || "—")}</b> › ${escapeHTML(p.b || "—")} › ${escapeHTML(p.e || "—")} › ${escapeHTML(p.f || "—")} › ${escapeHTML(p.g || "—")} › ${escapeHTML(p.s || "—")}`;

  const renderComboItem = item => {
    const rawPathCandidates = [
      item.raw?.parentPath,
      item.raw?.path,
      item.raw?.parent,
      item.raw?.fullPath,
      item.raw?.fullpath,
      item.raw?.hierarchy
    ];

    const context =
      rawPathCandidates
        .filter(Boolean)
        .map(value =>
          value.toString()
        )
        .map(value =>
          value.split(/[\\/|>]/)
        )
        .flat()
        .map(part =>
          part
            .replace(
              /\s*\([^)]*\)\s*$/g,
              ""
            )
            .trim()
        )
        .filter(Boolean)
        .slice(-2)
        .join(" › ");

    const note =
      item.note
        ? `<div class="combo-item-note">${escapeHTML(item.note)}</div>`
        : "";

    if (!context) {
      return `
        <div class="combo-item-label">${escapeHTML(item.label)}</div>
        ${note}
      `;
    }

    return `
      <div class="combo-item-label">${escapeHTML(item.label)}</div>
      <div class="combo-item-context">${escapeHTML(context)}</div>
      ${note}
    `;
  };

  // ============================================================
  // Création du panneau
  // ============================================================

  const createPanel = rows => {
    if (
      document.getElementById(PANEL_ID)
    ) {
      return;
    }

    ensureStyle();

    const idx =
      buildIndex(rows);

    const savedPanelState =
      getJSON(
        PANEL_STATE_KEY,
        {
          collapsed: false
        }
      );

    const root =
      document.createElement("div");

    root.id =
      PANEL_ID;

    if (
      savedPanelState.collapsed
    ) {
      root.classList.add(
        "collapsed"
      );
    }

    root.innerHTML = `
      <div class="head">
        <span>
          <span class="title">Assistant catalogage</span>
          <span
            class="subtitle"
            id="koha099_current_list"
          ></span>
        </span>

        <div class="head-btns">
          <button
            type="button"
            data-act="collapse"
            title="Réduire"
          >–</button>
        </div>
      </div>

      <div class="body">

        <div
          class="row"
          data-row="scope"
          style="display:none"
        >
          <label>Champ 099 cible</label>
          <select
            class="combo-input"
            data-sel="scope"
            style="width:100%"
          ></select>
        </div>

        <div
          class="row"
          data-row="a"
        >
          <label>Domaine ($a)</label>
        </div>

        <div
          class="row"
          data-row="b"
        >
          <label>Sous-domaine ($b)</label>
        </div>

        <div
          class="row"
          data-row="e"
        >
          <label>Thème ($e)</label>
        </div>

        <div
          class="row"
          data-row="f"
        >
          <label>Sujet ($f)</label>
        </div>

        <div
          class="row"
          data-row="g"
        >
          <label>Genre littéraire (608$a)</label>
        </div>

        <div
          class="row"
          data-row="s"
        >
          <label>Sujet (615$a)</label>
        </div>

        <div class="actions">
          <button
            type="button"
            class="btn-primary"
            data-act="apply"
          >
            Appliquer
          </button>

          <button
            type="button"
            class="btn-secondary"
            data-act="save"
          >
            Mémoriser
          </button>

          <button
            type="button"
            class="btn-ghost"
            data-act="clear"
          >
            Vider
          </button>
        </div>

        <div
          class="status"
          id="koha099_status"
        ></div>

        <hr class="divider">

        <div class="presets-title">
          <span>Mémorisations</span>
          <span
            class="presets-count"
            id="koha099_presets_count"
          ></span>
        </div>

        <div class="presets-actions">
          <span class="note-presets">
            Les mémorisations sont listées ci-dessous.
            Ouvrez les options pour gérer les listes.
          </span>

          <div
            style="display:flex;gap:6px;align-items:center"
          >
            <button
              type="button"
              class="btn-secondary btn-small"
              data-act="togglePresetControls"
            >
              Options
            </button>
          </div>
        </div>

        <div
          class="preset-controls"
          id="koha099_preset_controls"
        >

          <div
            class="row"
            data-row="ownerSelect"
          >
            <label>Liste nominative</label>

            <select
              class="combo-input"
              data-owner-select
              style="width:100%"
            ></select>
          </div>

          <div
            class="row"
            data-row="owner"
          >
            <label>Créer une liste</label>

            <div
              style="display:flex;gap:8px;align-items:center"
            >
              <input
                type="text"
                class="combo-input"
                data-owner-input
                placeholder="Nom Prénom (requis)"
              >

              <button
                type="button"
                class="btn-secondary btn-small"
                data-act="createList"
              >
                Créer liste
              </button>
            </div>
          </div>

          <div
            class="row"
            style="font-size:11px;color:#6a6f7a;margin-bottom:8px;"
          >
            Sélectionnez une liste existante ou saisissez votre
            nom et prénom pour en créer une nouvelle avant de mémoriser.
          </div>

        </div>

        <div
          class="preset-list"
          id="koha099_presets"
        ></div>

      </div>
    `;

    document.body.appendChild(root);

    // ============================================================
    // Déplacement du panneau
    // ============================================================

    (() => {
      const head =
        root.querySelector(".head");

      let dragging = false;
      let offX = 0;
      let offY = 0;

      head.addEventListener(
        "mousedown",
        e => {
          if (
            e.target.closest(
              ".head-btns"
            )
          ) {
            return;
          }

          dragging = true;

          const r =
            root.getBoundingClientRect();

          offX =
            e.clientX - r.left;

          offY =
            e.clientY - r.top;

          root.style.right =
            "auto";
        }
      );

      document.addEventListener(
        "mousemove",
        e => {
          if (!dragging) {
            return;
          }

          root.style.left =
            `${e.clientX - offX}px`;

          root.style.top =
            `${e.clientY - offY}px`;
        }
      );

      document.addEventListener(
        "mouseup",
        () => {
          dragging = false;
        }
      );
    })();

    const scopeSel =
      root.querySelector(
        '[data-sel="scope"]'
      );

    const scopeRow =
      root.querySelector(
        '[data-row="scope"]'
      );

    const status =
      root.querySelector(
        "#koha099_status"
      );

    const presetsList =
      root.querySelector(
        "#koha099_presets"
      );

    const presetsCount =
      root.querySelector(
        "#koha099_presets_count"
      );

    const comboA =
      makeCombo(
        root.querySelector(
          '[data-row="a"]'
        ),
        "Rechercher un domaine…"
      );

    const comboB =
      makeCombo(
        root.querySelector(
          '[data-row="b"]'
        ),
        "Rechercher un sous-domaine…"
      );

    const comboE =
      makeCombo(
        root.querySelector(
          '[data-row="e"]'
        ),
        "Rechercher un thème…"
      );

    const comboF =
      makeCombo(
        root.querySelector(
          '[data-row="f"]'
        ),
        "Rechercher un sujet…"
      );

    const comboG =
      makeCombo(
        root.querySelector(
          '[data-row="g"]'
        ),
        "Rechercher un genre littéraire 608$a…"
      );

    const comboS =
      makeCombo(
        root.querySelector(
          '[data-row="s"]'
        ),
        "Rechercher un sujet 615$a…"
      );

    // ============================================================
    // Champs 099 disponibles sur la notice
    // ============================================================

    const refreshScopes = () => {
      const scopes =
        findTagScopes();

      const prevValue =
        scopeSel.value;

      scopeSel.innerHTML =
        scopes
          .map(
            (sc, i) =>
              `<option value="${i}">Champ 099 #${i + 1} (${escapeHTML(sc.id)})</option>`
          )
          .join("");

      scopeRow.style.display =
        scopes.length > 1
          ? ""
          : "none";

      if (
        prevValue !== "" &&
        scopes[+prevValue]
      ) {
        scopeSel.value =
          prevValue;
      }

      return scopes;
    };

    let scopes =
      refreshScopes();

    const state = {
      a: "",
      b: "",
      e: "",
      f: "",
      g: "",
      s: ""
    };

    const last =
      getJSON(
        CACHE_KEY,
        {}
      );

    const readCurrentFieldText = field => {
      if (!field) {
        return "";
      }

      if (
        field.tagName === "SELECT"
      ) {
        const selected =
          field.options[
            field.selectedIndex
          ];

        return selected
          ? (
              selected.textContent ||
              selected.value ||
              ""
            )
          : (
              field.value ||
              ""
            );
      }

      return field.value || "";
    };

    const readCurrentValues = (scopeOverride = null) => {
      const values = {
        a: "",
        b: "",
        e: "",
        f: "",
        g: "",
        s: ""
      };

      const scope =
        scopeOverride || findTagScopes()[0];

      if (scope) {
        const aField =
          findFieldInScope(
            scope,
            "a"
          );

        const bField =
          findFieldInScope(
            scope,
            "b"
          );

        const eField =
          findFieldInScope(
            scope,
            "e"
          );

        const fField =
          findFFieldInScope(
            scope
          );

        values.a =
          readCurrentFieldText(
            aField
          );

        values.b =
          readCurrentFieldText(
            bField
          );

        values.e =
          readCurrentFieldText(
            eField
          );

        values.f =
          readCurrentFieldText(
            fField
          );
      }

      const gField =
        findGenreField();

      const sField =
        findSubject615Field();

      values.g =
        readCurrentFieldText(
          gField
        );

      values.s =
        readCurrentFieldText(
          sField
        );

      return values;
    };

    const findMatchingLabel = (
      items,
      rawValue
    ) => {
      const value = (rawValue || "").toString().trim();

      if (!value) {
        return "";
      }

      const target = norm(value);
      const match = (items || []).find(item =>
        [item.label, item.raw?.name, item.raw?.label]
          .filter(Boolean)
          .some(candidate => norm(candidate) === target)
      );

      return match ? match.label : "";
    };

    const resolveCurrentValue = (
      code,
      rawValue
    ) => {
      if (!rawValue) {
        return "";
      }

      switch (code) {
        case "a":
          return (
            findMatchingLabel(
              idx.a,
              rawValue
            ) ||
            rawValue
          );

        case "b":
          return (
            findMatchingLabel(
              [
                ...idx.bByA.values()
              ].flat(),
              rawValue
            ) ||
            rawValue
          );

        case "e":
          return (
            findMatchingLabel(
              [
                ...idx.eByAB.values()
              ].flat(),
              rawValue
            ) ||
            rawValue
          );

        case "f":
          return (
            findMatchingLabel(
              [
                ...idx.fByABE.values()
              ].flat(),
              rawValue
            ) ||
            rawValue
          );

        case "g":
          return (
            findMatchingLabel(
              idx.g,
              rawValue
            ) ||
            rawValue
          );

        case "s":
          return (
            findMatchingLabel(
              idx.s,
              rawValue
            ) ||
            rawValue
          );

        default:
          return "";
      }
    };

    const resetPanelSelection = () => {
      state.a = "";
      state.b = "";
      state.e = "";
      state.f = "";
      state.g = "";
      state.s = "";

      comboA.setValue("", true);
      comboB.setValue("", true);
      comboE.setValue("", true);
      comboF.setValue("", true);
      comboG.setValue("", true);
      comboS.setValue("", true);
    };

    const initializeFromPageValues = (
      attempt = 0
    ) => {
      resetPanelSelection();

      const selectedScope =
        scopes[+scopeSel.value] || scopes[0] || null;

      const currentValues =
        readCurrentValues(selectedScope);

      const hasAnyPageValue =
        Object
          .values(currentValues)
          .some(v =>
            (v || "")
              .toString()
              .trim()
          );

      if (
        !hasAnyPageValue &&
        attempt < 6
      ) {
        setTimeout(
          () =>
            initializeFromPageValues(
              attempt + 1
            ),
          120
        );

        return;
      }

      state.a =
        resolveCurrentValue(
          "a",
          currentValues.a
        ) || "";

      state.b =
        resolveCurrentValue(
          "b",
          currentValues.b
        ) || "";

      state.e =
        resolveCurrentValue(
          "e",
          currentValues.e
        ) || "";

      state.f =
        resolveCurrentValue(
          "f",
          currentValues.f
        ) || "";

      state.g =
        resolveCurrentValue(
          "g",
          currentValues.g
        ) || "";

      state.s =
        resolveCurrentValue(
          "s",
          currentValues.s
        ) || "";

      comboA.setValue(
        state.a,
        true
      );

      comboB.setValue(
        state.b,
        true
      );

      comboE.setValue(
        state.e,
        true
      );

      comboF.setValue(
        state.f,
        true
      );

      comboG.setValue(
        state.g,
        true
      );

      comboS.setValue(
        state.s,
        true
      );

      rebuild();
    };

    // ============================================================
    // Navigation dans l'arborescence
    // ============================================================

    const getAItem = () =>
      idx.a.find(
        x =>
          x.label === state.a
      ) || null;

    const getBItem = a => {
      if (!a) {
        return null;
      }

      return (
        idx.bByA.get(
          a.key
        ) || []
      ).find(
        x =>
          x.label === state.b
      ) || null;
    };

    const getEItem = (
      a,
      b
    ) => {
      if (!a || !b) {
        return null;
      }

      return (
        idx.eByAB.get(
          `${a.key}|||${b.key}`
        ) || []
      ).find(
        x =>
          x.label === state.e
      ) || null;
    };

    const getFItem = (
      a,
      b,
      e
    ) => {
      if (!a || !b || !e) {
        return null;
      }

      return (
        idx.fByABE.get(
          `${a.key}|||${b.key}|||${e.key}`
        ) || []
      ).find(
        x =>
          x.label === state.f
      ) || null;
    };

    const getSelectionContext = () => {
      const a =
        getAItem();

      const b =
        getBItem(a);

      const e =
        getEItem(a, b);

      const f =
        getFItem(a, b, e);

      return {
        a,
        b,
        e,
        f
      };
    };

    const matchesSelectionContext = (
      item,
      context
    ) => {
      const labels = [
        context.a?.label,
        context.b?.label,
        context.e?.label,
        context.f?.label
      ].filter(Boolean);

      if (!labels.length) {
        return true;
      }

      /*
       * Avec le nouvel index, on utilise l'ascendance exacte
       * reconstruite depuis parentPath.
       */
      if (
        Array.isArray(
          item.ancestorKeys
        )
      ) {
        return labels.every(lbl =>
          item.ancestorKeys.includes(
            norm(lbl)
          )
        );
      }

      /*
       * Compatibilité avec d'anciennes données éventuelles.
       */
      const pathText = [
        item.raw?.parentPath,
        item.raw?.path,
        item.raw?.parent
      ].find(v => !!v) || "";

      return labels.every(lbl =>
        norm(pathText).includes(
          norm(lbl)
        )
      );
    };

    const filterBy099Context = (
      items,
      context
    ) =>
      items.filter(item =>
        matchesSelectionContext(
          item,
          context
        )
      );

    const isAllowedLabel = (items, label) => {
      if (!label) return true;
      const target = norm(label);
      return (items || []).some(item => norm(item.label) === target);
    };

    const getAllowedItemsForCode = code => {
      const a = getAItem();
      const b = getBItem(a);
      const e = getEItem(a, b);
      const f = getFItem(a, b, e);
      const context = getSelectionContext();
      const hasInvalid099Context =
        (!!state.a && !a) ||
        (!!state.b && !b) ||
        (!!state.e && !e) ||
        (!!state.f && !f);

      switch (code) {
        case "a":
          return idx.a;
        case "b":
          return a ? (idx.bByA.get(a.key) || []) : [];
        case "e":
          return a && b
            ? (idx.eByAB.get(`${a.key}|||${b.key}`) || [])
            : [];
        case "f":
          return a && b && e
            ? (idx.fByABE.get(`${a.key}|||${b.key}|||${e.key}`) || [])
            : [];
        case "g":
          return hasInvalid099Context
            ? []
            : filterBy099Context(idx.g, context);
        case "s":
          return hasInvalid099Context
            ? []
            : filterBy099Context(idx.s, context);
        default:
          return [];
      }
    };

    const updateStatus = () => {
      status.textContent =
        `Domaines disponibles : ${idx.a.length}, genres : ${idx.g.length}, sujets 615 : ${idx.s.length}\n` +
        `Sélection : ${state.a || "—"} / ${state.b || "—"} / ${state.e || "—"} / ${state.f || "—"} / ${state.g || "—"} / ${state.s || "—"}`;
    };

    /*
     * CORRECTION IMPORTANTE
     * =====================
     *
     * Avant, le script ajoutait la valeur actuellement présente dans
     * la notice dans la liste même si celle-ci n'existait plus dans
     * Firebase.
     *
     * Exemple :
     *
     *   Arts visuels
     *
     * pouvait donc être réintroduit comme choix dans le sous-domaine.
     *
     * Désormais la liste contient UNIQUEMENT les valeurs réellement
     * autorisées par l'arborescence active.
     *
     * Si une notice contient encore une ancienne valeur, le champ la
     * conserve visuellement et passe en orange, mais cette valeur
     * n'est pas proposée dans la liste.
     */
    const addNoteForNonAllowedValues = (
      items,
      currentValue,
      allowedItems
    ) => {
      return (items || []).map(it => ({
        ...it,
        note: undefined,
        isUnallowed: false
      }));
    };

    const rebuild = () => {
      // Domaine
      const aItemsWithNotes =
        addNoteForNonAllowedValues(
          idx.a,
          state.a,
          idx.a
        );

      comboA.setItems(
        aItemsWithNotes
      );

      const a =
        getAItem();

      // Sous-domaine
      const bList =
        a
          ? (
              idx.bByA.get(
                a.key
              ) || []
            )
          : [];

      const bItemsWithNotes =
        addNoteForNonAllowedValues(
          bList,
          state.b,
          bList
        );

      comboB.setItems(
        bItemsWithNotes
      );

      comboB.setDisabled(
        !a
      );

      const b =
        getBItem(a);

      // Thème
      const eList =
        a && b
          ? (
              idx.eByAB.get(
                `${a.key}|||${b.key}`
              ) || []
            )
          : [];

      const eItemsWithNotes =
        addNoteForNonAllowedValues(
          eList,
          state.e,
          eList
        );

      comboE.setItems(
        eItemsWithNotes
      );

      comboE.setDisabled(
        !(a && b)
      );

      const e =
        getEItem(
          a,
          b
        );

      // Sujet 099$f
      const fList =
        a && b && e
          ? (
              idx.fByABE.get(
                `${a.key}|||${b.key}|||${e.key}`
              ) || []
            )
          : [];

      const fItemsWithNotes =
        addNoteForNonAllowedValues(
          fList,
          state.f,
          fList
        );

      comboF.setItems(
        fItemsWithNotes
      );

      comboF.setDisabled(
        !(a && b && e)
      );

      // 608$a et 615$a
      const context =
        getSelectionContext();

      const gList =
        filterBy099Context(
          idx.g,
          context
        );

      const sList =
        filterBy099Context(
          idx.s,
          context
        );

      const gItemsWithNotes =
        addNoteForNonAllowedValues(
          gList,
          state.g,
          gList
        );

      const sItemsWithNotes =
        addNoteForNonAllowedValues(
          sList,
          state.s,
          sList
        );

      comboG.setItems(
        gItemsWithNotes
      );

      comboG.setDisabled(
        false
      );

      comboS.setItems(
        sItemsWithNotes
      );

      comboS.setDisabled(
        false
      );

      setJSON(
        CACHE_KEY,
        state
      );

      updateStatus();
    };

    comboA.onChange(val => {
      state.a = val;
      state.b = "";
      state.e = "";
      state.f = "";

      comboB.setValue("", true);
      comboE.setValue("", true);
      comboF.setValue("", true);

      rebuild();
    });

    comboB.onChange(val => {
      state.b = val;
      state.e = "";
      state.f = "";

      comboE.setValue("", true);
      comboF.setValue("", true);

      rebuild();
    });

    comboE.onChange(val => {
      state.e = val;
      state.f = "";

      comboF.setValue("", true);

      rebuild();
    });

    comboF.onChange(val => {
      state.f = val;
      rebuild();
    });

    comboG.onChange(val => {
      state.g = val;
      rebuild();
    });

    comboS.onChange(val => {
      state.s = val;
      rebuild();
    });

    initializeFromPageValues();

    scopeSel.addEventListener("change", () => {
      scopes = refreshScopes();
      initializeFromPageValues();
    });

    let scopeRefreshTimer = null;
    const scopeObserver = new MutationObserver(() => {
      clearTimeout(scopeRefreshTimer);
      scopeRefreshTimer = setTimeout(() => {
        const previousIds = scopes.map(scope => scope.id).join("|");
        const currentScopes = findTagScopes();
        const currentIds = currentScopes.map(scope => scope.id).join("|");

        if (previousIds !== currentIds) {
          scopes = refreshScopes();
          initializeFromPageValues();
        }
      }, 120);
    });

    const scopeObserverTarget =
      document.querySelector("#cat_addbiblio") ||
      document.querySelector('form[name="f"]') ||
      document.body;

    scopeObserver.observe(scopeObserverTarget, {
      childList: true,
      subtree: true
    });

    // ============================================================
    // Mémorisations
    // ============================================================

    const ownerInput =
      root.querySelector(
        "[data-owner-input]"
      );

    const ownerSelect =
      root.querySelector(
        "[data-owner-select]"
      );

    const createListBtn =
      root.querySelector(
        '[data-act="createList"]'
      );

    const currentListLabel =
      root.querySelector(
        "#koha099_current_list"
      );

    let currentOwnerId = "";
    let currentOwnerName = "";
    let firebaseOwnerPresets = [];

    const restoreSelectedList = () => {
      const saved =
        getJSON(
          SELECTED_LIST_KEY,
          null
        );

      if (
        saved &&
        saved.ownerId
      ) {
        return saved;
      }

      return null;
    };

    const saveSelectedList = (
      ownerId,
      ownerName
    ) => {
      setJSON(
        SELECTED_LIST_KEY,
        {
          ownerId,
          ownerName
        }
      );
    };

    const ownerIdFromName = name =>
      norm(name)
        .replace(/\s+/g, "_")
        .replace(
          /[^a-z0-9_]/g,
          ""
        );

    const renderOwnerOptions = owners => {
      ownerSelect.replaceChildren();

      const placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.textContent = "Sélectionnez votre nom...";
      ownerSelect.appendChild(placeholder);

      (owners || []).forEach(owner => {
        const option = document.createElement("option");
        option.value = owner.id || "";
        option.textContent = owner.ownerName || owner.id || "";
        ownerSelect.appendChild(option);
      });
    };

    const renderPresets = () => {
      const presets =
        currentOwnerId
          ? firebaseOwnerPresets
          : getJSON(
              PRESETS_KEY,
              []
            );

      presetsCount.textContent =
        `${presets.length}/${MAX_PRESETS}`;

      if (!presets.length) {
        presetsList.innerHTML =
          `<div class="preset-empty">Aucune mémorisation pour l'instant.</div>`;

        return;
      }

      presetsList.innerHTML =
        presets
          .map(
            (p, i) => `
              <div
                class="preset-item"
                data-idx="${i}"
              >
                <span class="preset-text">
                  ${chainLabel(p)}
                </span>

                <button
                  type="button"
                  class="preset-del"
                  data-del="${i}"
                  title="Supprimer"
                >×</button>
              </div>
            `
          )
          .join("");
    };

    const loadOwnersFromFirebase = async (force = false) => {
      if (!(await ensurePresetFirebase())) return [];

      try {
        status.textContent = "Chargement des listes nominatives...";
        let owners = null;
        if (!force) {
          try {
            const cached = JSON.parse(localStorage.getItem(OWNERS_CACHE_KEY) || "null");
            if (cached && Array.isArray(cached.owners) && Date.now() - Number(cached.at || 0) < OWNERS_CACHE_TTL) owners = cached.owners;
          } catch (_) {}
        }
        if (!owners) {
          const snapshots = await getDocs(collection(firebaseDb, FIREBASE_PRESETS_COLLECTION));
          budget("reads", snapshots.size);
          owners = snapshots.docs.map(doc => ({ id: doc.id, ownerName: doc.data().ownerName || doc.id }));
          try { localStorage.setItem(OWNERS_CACHE_KEY, JSON.stringify({ at: Date.now(), owners })); } catch (_) {}
        }
        ownersLoaded = true;

        renderOwnerOptions(
          owners
        );

        const savedList =
          restoreSelectedList();

        if (
          savedList &&
          owners.some(
            o =>
              o.id ===
              savedList.ownerId
          )
        ) {
          ownerSelect.value =
            savedList.ownerId;

          await loadOwnerPresetsFromFirebase(
            savedList.ownerId
          );

          status.textContent =
            `Liste "${savedList.ownerName}" restaurée.`;
        } else {
          status.textContent =
            `Listes nominatives chargées (${owners.length}).`;
        }

        return owners;
      } catch (e) {
        status.textContent =
          "Erreur lors du chargement des listes Firebase.";

        return [];
      }
    };

    const updateCurrentListHeader = () => {
      currentListLabel.textContent =
        currentOwnerName
          ? `Liste de : ${currentOwnerName}`
          : "";
    };

    const loadOwnerPresetsFromFirebase =
      async ownerId => {
        if (!firebaseDb) {
          return;
        }

        if (!ownerId) {
          currentOwnerId = "";
          currentOwnerName = "";
          firebaseOwnerPresets = [];

          renderPresets();
          updateCurrentListHeader();

          saveSelectedList(
            "",
            ""
          );

          return;
        }

        try {
          status.textContent =
            "Chargement des mémorisations...";

          const ownerDoc = await getDoc(doc(firebaseDb, FIREBASE_PRESETS_COLLECTION, ownerId));
          budget("reads", 1);

          if (!ownerDoc.exists()) {
            firebaseOwnerPresets = [];
            currentOwnerId = ownerId;
            currentOwnerName =
              ownerInput.value.trim() ||
              ownerId;
          } else {
            currentOwnerId = ownerId;

            currentOwnerName =
              ownerDoc.data().ownerName ||
              ownerId;

            firebaseOwnerPresets =
              ownerDoc.data().presets ||
              [];
          }

          ownerInput.value =
            currentOwnerName;

          renderPresets();
          updateCurrentListHeader();

          saveSelectedList(
            currentOwnerId,
            currentOwnerName
          );

          status.textContent =
            `Mémorisations pour ${currentOwnerName} chargées (${firebaseOwnerPresets.length}).`;
        } catch (e) {
          status.textContent =
            "Erreur lors de la lecture des mémorisations Firebase.";
        }
      };

    const savePresetToFirebase =
      async () => {
        let ownerName =
          ownerInput.value.trim();

        if (
          !ownerName &&
          currentOwnerId
        ) {
          ownerName =
            currentOwnerName;
        }

        if (!ownerName) {
          status.textContent =
            "Entrez votre nom et prénom avant de mémoriser.";

          return;
        }

        if (!firebaseDb) {
          status.textContent =
            "Firebase non disponible.";

          return;
        }

        const ownerId =
          ownerIdFromName(
            ownerName
          );

        if (!ownerId) {
          status.textContent =
            "Nom invalide pour la mémorisation.";

          return;
        }

        try {
          status.textContent =
            "Enregistrement en cours...";

          const ownerRef = doc(
            firebaseDb,
            FIREBASE_PRESETS_COLLECTION,
            ownerId
          );

          const newPreset = {
            a: state.a,
            b: state.b,
            e: state.e,
            f: state.f,
            g: state.g,
            s: state.s,
            createdAt: new Date().toISOString()
          };

          const updatedPresets = await runTransaction(
            firebaseDb,
            async transaction => {
              const ownerDoc = await transaction.get(ownerRef);
              const existing = ownerDoc.exists()
                ? [...(ownerDoc.data().presets || [])]
                : [];

              const dupIdx = existing.findIndex(p =>
                p.a === newPreset.a &&
                p.b === newPreset.b &&
                p.e === newPreset.e &&
                p.f === newPreset.f &&
                p.g === newPreset.g &&
                p.s === newPreset.s
              );

              if (dupIdx !== -1) {
                existing.splice(dupIdx, 1);
              }

              existing.unshift(newPreset);

              while (existing.length > MAX_PRESETS) {
                existing.pop();
              }

              transaction.set(
                ownerRef,
                {
                  ownerName,
                  presets: existing,
                  updatedAt: serverTimestamp()
                },
                { merge: true }
              );

              return existing;
            }
          );

          currentOwnerId = ownerId;
          currentOwnerName = ownerName;
          firebaseOwnerPresets = updatedPresets;

          await loadOwnersFromFirebase(true);
          ownerSelect.value = ownerId;
          renderPresets();
          updateCurrentListHeader();

          saveSelectedList(
            currentOwnerId,
            currentOwnerName
          );

          status.textContent =
            `Sélection enregistrée pour ${ownerName}.`;
        } catch (e) {

          status.textContent =
            `Erreur lors de l'enregistrement Firebase : ${e.message || e}`;
        }
      };

    const deleteFirebasePreset =
      async index => {
        if (!firebaseDb || !currentOwnerId) {
          return;
        }

        const targetPreset = firebaseOwnerPresets[index];
        if (!targetPreset) {
          return;
        }

        const locallyLastPreset = firebaseOwnerPresets.length === 1;
        let allowDeleteList = false;

        if (locallyLastPreset) {
          allowDeleteList = window.confirm(
            "La liste nominative est désormais vide. Voulez-vous supprimer la liste elle-même ?"
          );

          if (!allowDeleteList) {
            status.textContent =
              "Suppression annulée. La liste nominative reste active.";
            return;
          }
        }

        try {
          const ownerRef = doc(
            firebaseDb,
            FIREBASE_PRESETS_COLLECTION,
            currentOwnerId
          );

          const outcome = await runTransaction(
            firebaseDb,
            async transaction => {
              const ownerDoc = await transaction.get(ownerRef);

              if (!ownerDoc.exists()) {
                return { presets: [], deletedList: true };
              }

              const currentPresets = [
                ...(ownerDoc.data().presets || [])
              ];

              const samePreset = preset => {
                if (targetPreset.createdAt && preset.createdAt) {
                  return preset.createdAt === targetPreset.createdAt;
                }

                return (
                  preset.a === targetPreset.a &&
                  preset.b === targetPreset.b &&
                  preset.e === targetPreset.e &&
                  preset.f === targetPreset.f &&
                  preset.g === targetPreset.g &&
                  preset.s === targetPreset.s
                );
              };

              const currentIndex = currentPresets.findIndex(samePreset);

              if (currentIndex === -1) {
                return {
                  presets: currentPresets,
                  deletedList: false
                };
              }

              currentPresets.splice(currentIndex, 1);

              if (!currentPresets.length && allowDeleteList) {
                transaction.delete(ownerRef);
                return { presets: [], deletedList: true };
              }

              transaction.set(
                ownerRef,
                {
                  presets: currentPresets,
                  updatedAt: serverTimestamp()
                },
                { merge: true }
              );

              return {
                presets: currentPresets,
                deletedList: false
              };
            }
          );

          if (outcome.deletedList) {
            currentOwnerId = "";
            currentOwnerName = "";
            ownerSelect.value = "";
            ownerInput.value = "";
            firebaseOwnerPresets = [];

            await loadOwnersFromFirebase(true);
            renderPresets();
            updateCurrentListHeader();
            saveSelectedList("", "");

            status.textContent =
              "Liste vide supprimée.";
            return;
          }

          firebaseOwnerPresets = outcome.presets;
          renderPresets();

          status.textContent =
            `Mémorisation supprimée pour ${currentOwnerName}.`;
        } catch (e) {
          status.textContent =
            "Erreur lors de la suppression Firebase.";
        }
      };

    // ============================================================
    // Changement de liste nominative
    // ============================================================

    ownerSelect.addEventListener(
      "change",
      () => {
        const selectedId =
          ownerSelect.value;

        if (selectedId) {
          loadOwnerPresetsFromFirebase(
            selectedId
          );
        } else {
          currentOwnerId = "";
          currentOwnerName = "";

          firebaseOwnerPresets = [];

          renderPresets();
          updateCurrentListHeader();

          saveSelectedList(
            "",
            ""
          );

          status.textContent =
            "Aucune liste sélectionnée.";
        }
      }
    );

    // ============================================================
    // Création d'une liste nominative
    // ============================================================

    createListBtn.addEventListener(
      "click",
      async () => {
        const name =
          ownerInput.value.trim();

        if (!name) {
          status.textContent =
            "Entrez un nom complet pour créer la liste.";

          ownerInput.focus();

          return;
        }

        if (!firebaseDb) {
          status.textContent =
            "Firebase non disponible.";

          return;
        }

        const ownerId =
          ownerIdFromName(
            name
          );

        if (!ownerId) {
          status.textContent =
            "Nom invalide pour la liste.";

          ownerInput.focus();

          return;
        }

        try {
          status.textContent =
            "Création de la liste en cours...";

          const ownerRef = doc(
            firebaseDb,
            FIREBASE_PRESETS_COLLECTION,
            ownerId
          );

          await runTransaction(firebaseDb, async transaction => {
            const ownerDoc = await transaction.get(ownerRef);
            const existing = ownerDoc.exists()
              ? (ownerDoc.data().presets || [])
              : [];

            transaction.set(
              ownerRef,
              {
                ownerName: name,
                presets: existing,
                updatedAt: serverTimestamp()
              },
              { merge: true }
            );
          });

          currentOwnerId = ownerId;
          currentOwnerName = name;

          await loadOwnersFromFirebase(true);
          ownerSelect.value = ownerId;
          await loadOwnerPresetsFromFirebase(ownerId);

          saveSelectedList(
            currentOwnerId,
            currentOwnerName
          );

          status.textContent =
            `Liste "${name}" créée et sélectionnée.`;
        } catch (e) {

          status.textContent =
            `Erreur lors de la création de la liste : ${e.message || e}`;
        }
      }
    );

    // ============================================================
    // Options de mémorisation
    // ============================================================

    const presetControls =
      root.querySelector(
        "#koha099_preset_controls"
      );

    const togglePresetControlsBtn =
      root.querySelector(
        '[data-act="togglePresetControls"]'
      );

    const updatePresetControlsLabel =
      () => {
        const open =
          presetControls.classList.contains(
            "open"
          );

        togglePresetControlsBtn.textContent =
          open
            ? "Masquer"
            : "Options";
      };

    togglePresetControlsBtn.addEventListener(
      "click",
      () => {
        presetControls.classList.toggle("open");
        const nowOpen = presetControls.classList.contains("open");
        if (nowOpen && !ownersLoaded) loadOwnersFromFirebase(false);
        updatePresetControlsLabel();
      }
    );

    updatePresetControlsLabel();

    // ============================================================
    // Clic sur mémorisation
    // ============================================================

    presetsList.addEventListener(
      "click",
      e => {
        const delBtn =
          e.target.closest(
            "[data-del]"
          );

        if (delBtn) {
          const index =
            +delBtn.dataset.del;

          if (currentOwnerId) {
            deleteFirebasePreset(
              index
            );
          } else {
            const presets =
              getJSON(
                PRESETS_KEY,
                []
              );

            presets.splice(
              index,
              1
            );

            setJSON(
              PRESETS_KEY,
              presets
            );

            renderPresets();
          }

          return;
        }

        const item =
          e.target.closest(
            ".preset-item"
          );

        if (!item) {
          return;
        }

        const presets =
          currentOwnerId
            ? firebaseOwnerPresets
            : getJSON(
                PRESETS_KEY,
                []
              );

        const p =
          presets[
            +item.dataset.idx
          ];

        if (!p) {
          return;
        }

        state.a = p.a || "";
        state.b = p.b || "";
        state.e = p.e || "";
        state.f = p.f || "";
        state.g = p.g || "";
        state.s = p.s || "";

        comboA.setValue(
          state.a,
          true
        );

        comboB.setValue(
          state.b,
          true
        );

        comboE.setValue(
          state.e,
          true
        );

        comboF.setValue(
          state.f,
          true
        );

        comboG.setValue(
          state.g,
          true
        );

        comboS.setValue(
          state.s,
          true
        );

        rebuild();

        status.textContent =
          'Mémorisation chargée. Cliquez sur "Appliquer" pour l\'utiliser.';
      }
    );

    renderPresets();

    // ============================================================
    // Appliquer dans la notice
    // ============================================================

    const applyBtn =
      root.querySelector(
        '[data-act="apply"]'
      );

    if (applyBtn) {
      applyBtn.addEventListener(
        "click",
        () => {
          scopes =
            refreshScopes();

          const scope =
            scopes[
              +scopeSel.value
            ] ||
            scopes[0];

          if (!scope) {
            status.textContent =
              "Aucun champ 099 trouvé sur la page. Ajoutez d'abord le champ 099 dans la notice.";

            return;
          }

          const results = [];

          const zoneLabel = code =>
            code === "g"
              ? "608$a"
              : (
                  code === "s"
                    ? "615$a"
                    : "$" + code
                );

          const applyOne = (
            code,
            label
          ) => {
            let field;

            if (code === "f") {
              field =
                findFFieldInScope(
                  scope
                );
            } else if (code === "g") {
              field =
                findGenreField();
            } else if (code === "s") {
              field =
                findSubject615Field();
            } else {
              field =
                findFieldInScope(
                  scope,
                  code
                );
            }

            if (!field) {
              results.push(
                `${zoneLabel(code)} : ✘ champ introuvable sur la page`
              );

              return;
            }

            if (!label) {
              results.push(
                `${zoneLabel(code)} : inchangé`
              );

              return;
            }

            const allowedItems =
              getAllowedItemsForCode(code);

            if (!isAllowedLabel(allowedItems, label)) {
              results.push(
                `${zoneLabel(code)} : ✘ valeur absente de l’arborescence active`
              );

              return;
            }

            const r =
              setFieldByLabel(
                field,
                label
              );

            results.push(
              `${zoneLabel(code)} : ${
                r.ok
                  ? "✔ " + r.matched
                  : "✘ " + r.reason
              }`
            );
          };

          applyOne(
            "a",
            state.a
          );

          applyOne(
            "b",
            state.b
          );

          applyOne(
            "e",
            state.e
          );

          applyOne(
            "f",
            state.f
          );

          applyOne(
            "g",
            state.g
          );

          applyOne(
            "s",
            state.s
          );

          status.textContent =
            results.join("\n");
        }
      );
    }

    // ============================================================
    // Mémoriser
    // ============================================================

    const saveBtn =
      root.querySelector(
        '[data-act="save"]'
      );

    if (saveBtn) {
      saveBtn.addEventListener(
        "click",
        async () => {
          if (
            !state.a &&
            !state.b &&
            !state.e &&
            !state.f &&
            !state.g &&
            !state.s
          ) {
            status.textContent =
              "Rien à mémoriser : sélectionnez au moins un domaine ou un champ supplémentaire.";

            return;
          }

          const ownerName =
            ownerInput.value.trim();

          if (
            ownerName ||
            currentOwnerId
          ) {
            await savePresetToFirebase();

            return;
          }

          ownerInput.focus();

          status.textContent =
            "Aucune liste sélectionnée. Sélectionnez une liste existante ou saisissez votre nom et prénom pour en créer une nouvelle.";
        }
      );
    }

    const openCreateListModalBtn =
      root.querySelector(
        '[data-act="openCreateListModal"]'
      );

    if (openCreateListModalBtn) {
      openCreateListModalBtn.addEventListener(
        "click",
        () => {
          ownerInput.focus();

          status.textContent =
            "Saisissez votre nom complet dans le champ Nom complet pour créer une nouvelle liste.";
        }
      );
    }

    // ============================================================
    // Vider
    // ============================================================

    const clearBtn =
      root.querySelector(
        '[data-act="clear"]'
      );

    if (clearBtn) {
      clearBtn.addEventListener(
        "click",
        () => {
          state.a = "";
          state.b = "";
          state.e = "";
          state.f = "";
          state.g = "";
          state.s = "";

          comboA.setValue(
            "",
            true
          );

          comboB.setValue(
            "",
            true
          );

          comboE.setValue(
            "",
            true
          );

          comboF.setValue(
            "",
            true
          );

          comboG.setValue(
            "",
            true
          );

          comboS.setValue(
            "",
            true
          );

          rebuild();

          status.textContent =
            "Sélection du panneau vidée.";
        }
      );
    }

    // ============================================================
    // Réduire le panneau
    // ============================================================

    const collapseBtn =
      root.querySelector(
        '[data-act="collapse"]'
      );

    if (collapseBtn) {
      collapseBtn.addEventListener(
        "click",
        () => {
          root.classList.toggle(
            "collapsed"
          );

          setJSON(
            PANEL_STATE_KEY,
            {
              collapsed:
                root.classList.contains(
                  "collapsed"
                )
            }
          );
        }
      );
    }
  };

  // ============================================================
  // Firebase des mémorisations : chargé uniquement à la demande
  // ============================================================
  const ensurePresetFirebase = async () => {
    if (firebaseDb) return true;
    if (firebaseInitPromise) return firebaseInitPromise;
    firebaseInitPromise = (async () => {
      try {
        const fb = KT.getService && KT.getService('firebase-module');
        const meta = fb?.require?.(MODULE_ID, firebaseConfig);
        const publicCfg = fb?.publicConfig?.(MODULE_ID, meta, { throwOnError: true });
        const base = `https://www.gstatic.com/firebasejs/${meta?.sdkVersion || '11.5.0'}`;
        const { initializeApp, getApps } = await import(base + "/firebase-app.js");
        const firebaseFirestore = await import(base + "/firebase-firestore.js");
        const { getFirestore } = firebaseFirestore;
        collection = firebaseFirestore.collection; doc = firebaseFirestore.doc; getDocs = firebaseFirestore.getDocs; getDoc = firebaseFirestore.getDoc;
        setDoc = firebaseFirestore.setDoc; deleteDoc = firebaseFirestore.deleteDoc; serverTimestamp = firebaseFirestore.serverTimestamp; runTransaction = firebaseFirestore.runTransaction;
        const appName = meta?.appName || 'KohaToolsDomainPresets';
        const app = getApps().find(a => a.name === appName) || initializeApp(publicCfg, appName);
        firebaseDb = meta?.databaseId && meta.databaseId !== '(default)' ? getFirestore(app, meta.databaseId) : getFirestore(app);
        return true;
      } catch (_) { firebaseDb = null; return false; }
      finally { firebaseInitPromise = null; }
    })();
    return firebaseInitPromise;
  };

  const boot = async () => {
    await waitForBody();
    ensureStyle();
    try {
      const taxonomy = KT.getService && KT.getService("taxonomy");
      if (!taxonomy) throw new Error("Service arborescence KohaTools indisponible");
      const rows = await taxonomy.getRows(MODULE_ID,{firebase:firebaseConfig});
      createPanel(rows);
    } catch (_) {
      // L'assistant n'écrit rien dans Koha si l'arborescence n'est pas disponible.
    }
  };

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      boot
    );
  } else {
    boot();
  }
})();

},destroy:function(){return false;},onConfigChange:function(){return {reloadRequired:true};}};
KT.registerModule(runtime);if(CFG.mode==="shadow"){KT.record({module:MODULE_ID,level:"info",kind:"shadow-exact-parity-sealed",sources:runtime.sourceFiles});return;}runtime.init();
})();