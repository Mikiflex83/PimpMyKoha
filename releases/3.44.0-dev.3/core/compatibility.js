(function(global){"use strict";
const KT=global.KohaTools;if(!KT)return;let manifest=null,defaults=null;
function mappings(cid){return (manifest?.modules||[]).filter(m=>defaults?.modules?.[m.id]?.config?.canonicalModule===cid)}
function uniq(xs){return [...new Set((xs||[]).filter(Boolean).map(String))]}
function strategy(cid){
 const cfg=KT.Config?.getCanonicalPersistent?.(cid,true)||defaults?.canonicalModules?.[cid]||{},ms=mappings(cid),selectors=[],endpoints=[];
 for(const m of ms){const d=defaults?.modules?.[m.id]||{},a=d.advanced||{},s=d.general?.scope||{};selectors.push(...(a.selectorsDetected||[]),...(s.requireSelectors||[]));endpoints.push(...(a.endpointsDetected||[]))}
 const native=cfg.nativeApplication===true||ms.some(m=>m.applicationModule===true),sel=uniq(selectors),ep=uniq(endpoints),usesApi=ep.length>0,usesDom=sel.length>0;
 const techniques=[...(usesApi?["koha-api"]:[]),...(usesDom?["dom-technique"]:[]),...(native?["application-native"]:[])];
 const risk=usesDom?"high":usesApi||native?"medium":"low";
 return {canonicalId:cid,native,usesApi,usesDom,selectors:sel,endpoints:ep,techniques,risk,order:["koha-api","dom-technique-stable","fallback","désactivation-propre"],declared:false,label:techniques.length?techniques.join(" + "):"intégration légère"};
}
function affectedAfterKohaUpdate(cid){const c=KT.Config?.getCanonicalPersistent?.(cid,true)||{};if(c.enabled===false)return false;const s=strategy(cid);return s.usesDom||s.usesApi||s.native}
function init(m,d){manifest=m;defaults=d}
KT.registerService("compatibility",{init,strategy,affectedAfterKohaUpdate});
})(window);
