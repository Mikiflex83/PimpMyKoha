(function(global){
  "use strict";
  const KT = global.KohaTools;
  if (!KT) return;

  const norm = s => String(s || "").replace(/\s+/g, " ").trim();

  const Table = {
    headers(table) {
      return [...table.querySelectorAll("thead th")];
    },

    headerDescriptors(table) {
      return this.headers(table).map((th, index) => ({
        index,
        text: norm(th.textContent),
        colname: norm(th.getAttribute("data-colname"))
      }));
    },

    findCandidate(options = {}) {
      const {
        selector = "table",
        minHeaders = 0,
        headerRegex = null
      } = options;
      return [...document.querySelectorAll(selector)].find(table => {
        const headers = this.headerDescriptors(table);
        if (headers.length < minHeaders) return false;
        if (!headerRegex) return true;
        const haystack = headers.map(h => h.text.toLowerCase()).join(" ");
        return headerRegex.test(haystack);
      }) || null;
    },

    planRename(table, changes) {
      const before = this.headerDescriptors(table);
      const after = before.map(x => ({...x}));
      Object.entries(changes || {}).forEach(([idx, value]) => {
        const i = Number(idx);
        if (after[i]) after[i].text = value;
      });
      return { before, after };
    },

    applyRename(table, changes) {
      Object.entries(changes || {}).forEach(([idx, value]) => {
        const th = this.headers(table)[Number(idx)];
        if (th && norm(th.textContent) !== value) th.textContent = value;
      });
    },

    buildLabels(table) {
      return this.headerDescriptors(table).map(h => h.colname || h.text);
    },

    expectedRowLabels(row, labels) {
      const out = [];
      let headerIndex = 0;
      [...row.querySelectorAll("td")].forEach((cell, cellIndex) => {
        while (headerIndex < labels.length && !labels[headerIndex]) headerIndex++;
        const colspan = Number(cell.getAttribute("colspan") || 1);
        out.push({
          cellIndex,
          expected: labels[headerIndex] || "",
          actual: cell.getAttribute("data-label") || ""
        });
        headerIndex += colspan;
      });
      return out;
    }
  };

  KT.registerService("table", Table);
})(window);