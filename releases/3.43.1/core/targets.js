(function(global){
  "use strict";
  const KT = global.KohaTools;
  if (!KT) return;

  function normalize(value) {
    let s = String(value || "").trim().toLowerCase();
    try { s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); } catch (_) {}
    s = s.replace(/[^\p{L}\p{N}_-]+/gu, " ").replace(/\s+/g, " ").trim();
    return s;
  }

  function uniq(arr) {
    return [...new Set((arr || []).filter(Boolean))];
  }

  function langValues(map, languages) {
    const out = [];
    for (const lang of languages || []) {
      if (Array.isArray(map?.[lang])) out.push(...map[lang]);
    }
    // Include any custom languages not in global list, after preferred languages.
    Object.keys(map || {}).forEach(lang => {
      if (!(languages || []).includes(lang) && Array.isArray(map[lang])) out.push(...map[lang]);
    });
    return uniq(out);
  }

  function scoreColumn(header, rule, languages) {
    const technical = normalize(header.colname);
    const text = normalize(header.text);

    for (const name of rule.technicalNames || []) {
      if (technical && technical === normalize(name)) {
        return {score:1.0, matchedBy:"technicalName", matchedValue:name};
      }
    }

    for (const alias of langValues(rule.aliases, languages)) {
      if (text && text === normalize(alias)) {
        return {score:0.92, matchedBy:"aliasExact", matchedValue:alias};
      }
    }

    const keywordGroups = [];
    for (const lang of languages || []) {
      if (Array.isArray(rule.keywords?.[lang])) keywordGroups.push(...rule.keywords[lang]);
    }
    Object.keys(rule.keywords || {}).forEach(lang => {
      if (!(languages || []).includes(lang) && Array.isArray(rule.keywords[lang])) {
        keywordGroups.push(...rule.keywords[lang]);
      }
    });

    for (const group of keywordGroups) {
      const words = (Array.isArray(group) ? group : [group]).map(normalize).filter(Boolean);
      if (words.length && words.every(w => text.includes(w))) {
        return {score:0.80, matchedBy:"keywords", matchedValue:group};
      }
    }

    return {score:0, matchedBy:null, matchedValue:null};
  }

  const Targets = {
    normalize,

    resolveColumn(table, rule, options = {}) {
      const Table = KT.getService("table");
      if (!Table || !table) return {found:false, reason:"no-table", confidence:0};

      const languages = options.languages || KT.Config?.effective?.targeting?.languages || ["fr","en"];
      const minGlobal = KT.Config?.effective?.targeting?.minimumConfidence ?? 0.75;
      const min = rule.minimumConfidence ?? minGlobal;
      const headers = Table.headerDescriptors(table);

      const scored = headers.map(h => ({...h, ...scoreColumn(h, rule, languages)}))
        .filter(x => x.score > 0)
        .sort((a,b) => b.score - a.score);

      if (scored.length) {
        const best = scored[0];
        const tied = scored.filter(x => x.score === best.score);
        if (tied.length > 1) {
          return {
            found:false, reason:"ambiguous", confidence:best.score,
            candidates:tied.map(x => ({index:x.index,text:x.text,colname:x.colname,score:x.score,matchedBy:x.matchedBy}))
          };
        }
        if (best.score >= min) {
          return {
            found:true, index:best.index, confidence:best.score,
            matchedBy:best.matchedBy, matchedValue:best.matchedValue,
            text:best.text, colname:best.colname
          };
        }
      }

      const allowFallback = KT.Config?.effective?.targeting?.allowIndexFallback !== false;
      if (allowFallback && Number.isInteger(rule.fallbackIndex) && headers[rule.fallbackIndex]) {
        const confidence = 0.60;
        if (confidence >= min) {
          const h = headers[rule.fallbackIndex];
          return {
            found:true,index:rule.fallbackIndex,confidence,
            matchedBy:"fallbackIndex",matchedValue:rule.fallbackIndex,
            text:h.text,colname:h.colname
          };
        }
        return {
          found:false, reason:"fallback-below-threshold", confidence,
          fallbackIndex:rule.fallbackIndex
        };
      }

      return {found:false, reason:"not-found", confidence:scored[0]?.score || 0};
    },

    resolveTable(rule) {
      const Table = KT.getService("table");
      if (!Table) return {found:false,reason:"table-service-missing",confidence:0};

      for (const selector of rule.selectors || []) {
        const el = document.querySelector(selector);
        if (el) return {found:true, element:el, confidence:1.0, matchedBy:"selector", matchedValue:selector};
      }

      const aliases = rule.signature?.aliases || {};
      const languages = KT.Config?.effective?.targeting?.languages || ["fr","en"];
      const terms = langValues(aliases, languages).map(normalize);
      const minimumMatches = rule.signature?.minimumMatches ?? 1;

      for (const table of document.querySelectorAll("table")) {
        const headers = Table.headerDescriptors(table);
        if (headers.length < (rule.minHeaders || 0)) continue;
        const hay = normalize(headers.map(h => h.text).join(" "));
        const matches = terms.filter(t => t && hay.includes(t));
        if (matches.length >= minimumMatches) {
          return {found:true, element:table, confidence:0.82, matchedBy:"headerSignature", matchedValue:matches};
        }
      }

      return {found:false, reason:"not-found", confidence:0};
    }
  };

  KT.registerService("targets", Targets);
})(window);