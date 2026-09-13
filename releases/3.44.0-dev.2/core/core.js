(function (global) {
  "use strict";

  const KT = global.KohaTools = global.KohaTools || {};
  KT.version = "3.44.0-dev.2";
  KT.services = KT.services || {};
  KT.modules = KT.modules || new Map();
  KT.events = KT.events || new EventTarget();
  KT.diagnostics = KT.diagnostics || [];

  KT.registerService = function(name, api) {
    if (!name || !api) throw new Error("Service invalide");
    if (KT.services[name]) return KT.services[name];
    KT.services[name] = api;
    return api;
  };

  KT.getService = function(name) {
    return KT.services[name] || null;
  };

  KT.healthTelemetry = KT.healthTelemetry || {};

  KT.registerModule = function(meta) {
    if (!meta || !meta.id) throw new Error("Module sans id");
    const id=meta.id, telemetry=KT.healthTelemetry[id]=KT.healthTelemetry[id]||{registeredAt:new Date().toISOString(),initCalls:0,initErrors:0};
    if (typeof meta.init === "function" && !meta.init.__ktHealthWrapped) {
      const original=meta.init;
      const wrapped=function(...args){
        const started=performance.now();telemetry.initCalls=(telemetry.initCalls||0)+1;telemetry.lastInitAt=new Date().toISOString();
        try{
          const out=original.apply(this,args);
          telemetry.lastInitOk=true;telemetry.lastInitDurationMs=Math.round((performance.now()-started)*10)/10;
          if(out&&typeof out.then==="function")out.catch(e=>{telemetry.initErrors=(telemetry.initErrors||0)+1;telemetry.lastInitOk=false;telemetry.lastInitError=String(e?.message||e)});
          return out;
        }catch(e){telemetry.initErrors=(telemetry.initErrors||0)+1;telemetry.lastInitOk=false;telemetry.lastInitError=String(e?.message||e);throw e}
      };
      wrapped.__ktHealthWrapped=true;meta.init=wrapped;
    }
    KT.modules.set(id, meta);
    return meta;
  };
  KT.getHealthTelemetry = id => ({...(KT.healthTelemetry?.[id]||{}),...(global.__KohaToolsCandidateTelemetry?.[id]||{})});


  KT.initModule = function(idOrRuntime) {
    let m = null;
    if (idOrRuntime && typeof idOrRuntime === "object") {
      if (!idOrRuntime.id || typeof idOrRuntime.init !== "function") return false;
      m = idOrRuntime;
      KT.modules.set(m.id, m);
    } else {
      m = KT.modules.get(idOrRuntime);
    }
    if (!m || typeof m.init !== "function") return false;
    return m.init();
  };

  KT.destroyModule = function(id) {
    const m = KT.modules.get(id);
    if (!m || typeof m.destroy !== "function") return false;
    return m.destroy();
  };

  KT.notifyModuleConfigChange = function(id, nextConfig) {
    const m = KT.modules.get(id);
    if (!m || typeof m.onConfigChange !== "function") return {reloadRequired:true};
    return m.onConfigChange(nextConfig);
  };

  KT.emit = function(name, detail) {
    KT.events.dispatchEvent(new CustomEvent(name, { detail }));
  };

  KT.on = function(name, handler) {
    KT.events.addEventListener(name, handler);
    return () => KT.events.removeEventListener(name, handler);
  };

  KT.record = function(entry) {
    const max = KT.Config?.effective?.diagnostics?.retainEntries || 200;
    KT.diagnostics.push({
      at: new Date().toISOString(),
      ...entry
    });
    if (KT.diagnostics.length > max) KT.diagnostics.splice(0, KT.diagnostics.length - max);
    KT.emit("koha-tools:diagnostic", entry);
  };

  KT.getLocalOverrides = function() {
    try {
      return JSON.parse(localStorage.getItem("KohaTools.localOverrides") || "{}");
    } catch (_) {
      return {};
    }
  };

  KT.setLocalModuleMode = function(moduleId, mode) {
    if (!["legacy","shadow","live","off"].includes(mode)) throw new Error("Mode invalide");
    const all = KT.getLocalOverrides();
    all[moduleId] = { ...(all[moduleId] || {}), mode };
    localStorage.setItem("KohaTools.localOverrides", JSON.stringify(all));
  };

  KT.setLocalCanonicalMode = function(moduleId, mode) {
    if (!["legacy","shadow","live","off"].includes(mode)) throw new Error("Mode invalide");
    const all = KT.getLocalOverrides();
    all.canonicalModules = all.canonicalModules || {};
    all.canonicalModules[moduleId] = { ...(all.canonicalModules[moduleId] || {}), mode };
    localStorage.setItem("KohaTools.localOverrides", JSON.stringify(all));
  };

  KT.clearLocalOverrides = function() {
    localStorage.removeItem("KohaTools.localOverrides");
  };
})(window);