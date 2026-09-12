(function (global) {
  "use strict";
  const KT = global.KohaTools = global.KohaTools || {};

  function isObject(v) {
    return v && typeof v === "object" && !Array.isArray(v);
  }

  function deepMerge(base, override) {
    if (Array.isArray(base) || Array.isArray(override)) {
      return override === undefined ? base : override;
    }
    if (isObject(base) && isObject(override)) {
      const out = { ...base };
      Object.keys(override).forEach(k => {
        out[k] = k in base ? deepMerge(base[k], override[k]) : override[k];
      });
      return out;
    }
    return override === undefined ? base : override;
  }

  KT.Config = {
    defaults: {},
    remote: {},
    effective: {},

    setDefaults(cfg) {
      this.defaults = cfg || {};
      this.rebuild();
    },

    setRemote(cfg) {
      this.remote = cfg || {};
      this.rebuild();
    },

    rebuild() {
      this.effective = deepMerge(this.defaults || {}, this.remote || {});
    },

    getCanonicalPersistent(moduleId, includeLocal = true) {
      const base = this.effective?.canonicalModules?.[moduleId] || {
        enabled: true, mode: "legacy", general: {}, features: {}, targeting: {}, appearance: {}, advanced: {}
      };
      let result = base;
      if (includeLocal && this.effective?.testing?.allowLocalOverrides !== false) {
        const local = KT.getLocalOverrides?.() || {};
        const override = local?.canonicalModules?.[moduleId];
        if (override) result = deepMerge(result, override);
      }
      return result;
    },

    getCanonical(moduleId) {
      let result = this.getCanonicalPersistent(moduleId, true);
      const life=String(result?.lifecycle?.status||"active").toLowerCase();
      if(result?.enabled===false||["disabled","retired","archived"].includes(life))return deepMerge(result,{enabled:false,mode:"off"});
      if (result?.nativeApplication === true) { const gate=KT.getService("prerequisites")?.status?.(moduleId); if(global.KohaTools?.deploymentMode==="fresh-install"&&gate&&!gate.ok)return deepMerge(result,{enabled:true,mode:"blocked",blockedByPrerequisites:gate.blocking}); return deepMerge(result,{enabled:true,mode:"live"}); }
      const production = KT.getService?.("production");
      if (production?.isSuppressed?.(moduleId)) return deepMerge(result,{enabled:false,mode:"off"});
      if (production?.isLive(moduleId)) return deepMerge(result,{enabled:true,mode:"live"});
      const canary = KT.getService?.("canary");
      if (canary?.shouldRunLive(moduleId)) return deepMerge(result,{enabled:true,mode:"live"});
      if(result?.mode==="live")result=deepMerge(result,{mode:"shadow"});
      return result;
    },

    getModule(moduleId) {
      const base = this.effective?.modules?.[moduleId] || {
        enabled: true, mode: "legacy", config: {}, appearance: {}
      };

      if (this.effective?.testing?.allowLocalOverrides !== false) {
        const local = KT.getLocalOverrides?.() || {};
        if (local[moduleId]) return deepMerge(base, local[moduleId]);
      }
      return base;
    },


    modeForManifestModule(moduleId) {
      const legacy = this.getModule(moduleId);
      const canonicalId = legacy?.config?.canonicalModule;
      if (canonicalId) {
        const canonical = this.getCanonical(canonicalId);
        const life=String(canonical?.lifecycle?.status||"active").toLowerCase();
        if (canonical.enabled === false || ["disabled","retired","archived"].includes(life)) return "off"; if(canonical.mode==="blocked") return "blocked";
        return canonical.mode || "legacy";
      }
      return this.mode(moduleId);
    },

    mode(moduleId) {
      const m = this.getModule(moduleId);
      if (m.enabled === false) return "off";
      return m.mode || "legacy";
    },

    isEnabled(moduleId) {
      return this.mode(moduleId) !== "off";
    },

    setCanonicalLocalOverride(moduleId, patch) {
      const all = KT.getLocalOverrides?.() || {};
      all.canonicalModules = all.canonicalModules || {};
      all.canonicalModules[moduleId] = deepMerge(all.canonicalModules[moduleId] || {}, patch || {});
      localStorage.setItem("KohaTools.localOverrides", JSON.stringify(all));
      return this.getCanonical(moduleId);
    },

    clearCanonicalLocalOverride(moduleId) {
      const all = KT.getLocalOverrides?.() || {};
      if (all.canonicalModules) {
        delete all.canonicalModules[moduleId];
        if (!Object.keys(all.canonicalModules).length) delete all.canonicalModules;
      }
      localStorage.setItem("KohaTools.localOverrides", JSON.stringify(all));
      return true;
    }
  };
})(window);