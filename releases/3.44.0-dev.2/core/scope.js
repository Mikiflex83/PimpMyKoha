(function(global){
  "use strict";
  const KT = global.KohaTools;
  if (!KT) return;

  function basename(pathname) {
    return String(pathname || "").split("/").filter(Boolean).pop() || "";
  }

  function wildcardToRegex(pattern) {
    const esc = String(pattern).replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
    return new RegExp("^" + esc + "$", "i");
  }

  function matchesAny(page, patterns) {
    if (!patterns || !patterns.length) return true;
    return patterns.some(p => wildcardToRegex(p).test(page));
  }

  function queryMatches(rule) {
    if (!rule || typeof rule !== "object") return true;
    const qs = new URLSearchParams(location.search);
    return Object.entries(rule).every(([key, expected]) => {
      const actual = qs.get(key);
      if (Array.isArray(expected)) return expected.map(String).includes(String(actual));
      if (expected === null) return qs.has(key);
      return String(actual) === String(expected);
    });
  }

  const Scope = {
    currentPage() {
      return basename(location.pathname);
    },

    match(scope) {
      scope = scope || {};
      const page = this.currentPage();
      const include = scope.include || ["*"];
      const exclude = scope.exclude || [];
      if (!matchesAny(page, include)) return {ok:false, reason:"not-included", page};
      if (exclude.length && matchesAny(page, exclude)) return {ok:false, reason:"excluded", page};
      if (!queryMatches(scope.matchQuery)) return {ok:false, reason:"query-mismatch", page};
      const selectors = scope.requireSelectors || [];
      if (selectors.length && !selectors.every(sel => document.querySelector(sel))) return {ok:false, reason:"required-selector-missing", page};
      return {ok:true, page};
    },

    requiredSelectorsPresent(scope) {
      const selectors = scope?.requireSelectors || [];
      return selectors.every(sel => document.querySelector(sel));
    }
  };

  KT.registerService("scope", Scope);
})(window);