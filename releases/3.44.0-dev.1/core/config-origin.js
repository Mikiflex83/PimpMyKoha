(function(global){"use strict";
const KT=global.KohaTools;if(!KT)return;
function get(obj,path){return (Array.isArray(path)?path:String(path||"").split(".")).filter(x=>x!=="").reduce((v,k)=>v&&typeof v==="object"?v[k]:undefined,obj)}
function exists(obj,path){return get(obj,path)!==undefined}
function local(){return KT.getLocalOverrides?.()||{}}
function source(moduleId,path){
 const p=["canonicalModules",moduleId,...(Array.isArray(path)?path:String(path||"").split(".").filter(Boolean))];
 if(exists(local(),p))return {id:"local",label:"Personnalisé sur ce navigateur",tone:"warn"};
 if(exists(KT.Config?.remote,p))return {id:"shared",label:"Personnalisé pour l’installation",tone:"info"};
 if(exists(KT.profile,p))return {id:"profile",label:"Profil de l’installation",tone:"info"};
 if(exists(KT.productDefaults,p))return {id:"product",label:"Valeur Pimp My Koha",tone:"ok"};
 return {id:"computed",label:"Valeur calculée",tone:"muted"};
}
function valueAt(moduleId,path,origin){const pp=["canonicalModules",moduleId,...(Array.isArray(path)?path:String(path||"").split(".").filter(Boolean))];if(origin==="local")return get(local(),pp);if(origin==="shared")return get(KT.Config?.remote,pp);if(origin==="profile")return get(KT.profile,pp);return get(KT.productDefaults,pp)}
function summary(moduleId){const roots=[['local',local()],['shared',KT.Config?.remote||{}],['profile',KT.profile||{}],['product',KT.productDefaults||{}]];return roots.map(([id,obj])=>({id,present:!!get(obj,["canonicalModules",moduleId])}));}
KT.registerService("config-origin",{source,valueAt,summary});
})(window);
