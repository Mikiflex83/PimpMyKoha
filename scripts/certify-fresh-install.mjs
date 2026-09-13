#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const arg=name=>(process.argv.find(x=>x.startsWith("--"+name+"="))||"").split("=").slice(1).join("=");
const cid=arg("canonical");
const validationFile=arg("validation-file");
const promoteConfig=(arg("promote-config")||"safe").toLowerCase();
if(!cid||!validationFile){console.error("Usage: node scripts/certify-fresh-install.mjs --canonical=<id> --validation-file=<export.json> [--promote-config=safe|none]");process.exit(2)}
if(!["safe","none"].includes(promoteConfig)){console.error("Refus: --promote-config doit valoir safe ou none");process.exit(2)}
const root=path.resolve("FULL-DIST/kohatools");
const manifestPath=path.join(root,"config/manifest.json"),defaultsPath=path.join(root,"config/product-defaults.json");
const manifest=JSON.parse(fs.readFileSync(manifestPath,"utf8")),defaults=JSON.parse(fs.readFileSync(defaultsPath,"utf8"));
const payload=JSON.parse(fs.readFileSync(validationFile,"utf8"));
const modules=payload?.validation?.data?.modules||payload?.data?.modules||payload?.modules||{};
const validation=modules[cid];
if(!validation||validation.state!=="validated"||!validation.fingerprint){console.error("Refus: validation certifiée avec empreinte absente pour "+cid);process.exit(1)}
const configBundle=payload?.configuration;
if(configBundle?.schema!=="KohaTools.certification-config.v1"){console.error("Refus: le fichier de validation ne contient pas le snapshot de configuration 3.44");process.exit(1)}
const validatedConfig=configBundle?.canonicalModules?.[cid];
if(!validatedConfig?.fingerprint){console.error("Refus: snapshot de configuration absent pour "+cid);process.exit(1)}
if(validatedConfig?.validatedState?.state!=="validated"||validatedConfig?.validatedState?.fingerprint!==validation.fingerprint){console.error("Refus: la configuration exportée ne correspond pas à la validation courante de "+cid);process.exit(1)}
const canonicalOf=m=>defaults?.modules?.[m.id]?.config?.canonicalModule||m.canonicalModule||null;
const maps=(manifest.modules||[]).filter(m=>canonicalOf(m)===cid);
if(!maps.length){console.error("Refus: aucun mapping manifeste pour "+cid);process.exit(1)}
const cfg=defaults.canonicalModules?.[cid];
if(!cfg?.recipe){console.error("Refus: recette absente pour "+cid);process.exit(1)}
const approved=new Set(["exact-snapshot","approved-current-reference-v10","native-canonical"]);
for(const m of maps){
 if(!m.nextModule||!fs.existsSync(path.join(root,m.nextModule))){console.error("Refus: candidate absente "+m.id);process.exit(1)}
 if(!approved.has(m.sourceStatus||"")){console.error("Refus: provenance source non certifiée "+m.id+" ("+(m.sourceStatus||"absent")+")");process.exit(1)}
 if(m.canaryCapable!==true){console.error("Refus: Canary non autorisé "+m.id);process.exit(1)}
}
function isObject(v){return v&&typeof v==="object"&&!Array.isArray(v)}
function deepMerge(base,patch){if(Array.isArray(patch))return patch.slice();if(isObject(base)&&isObject(patch)){const out={...base};for(const [k,v] of Object.entries(patch))out[k]=k in out?deepMerge(out[k],v):v;return out}return patch===undefined?base:patch}
let promotedConfig=false;
if(promoteConfig==="safe"){
 const candidate=validatedConfig.productDefaultCandidate||{};
 if(isObject(candidate)&&Object.keys(candidate).length){defaults.canonicalModules[cid]=deepMerge(defaults.canonicalModules[cid]||{},candidate);promotedConfig=true}
}
const now=new Date().toISOString();
for(const m of maps){
 m.freshInstall={...(m.freshInstall||{}),supported:true,certified:true,certification:"stable",requiresLegacy:false,hiddenByDefault:false,reason:"certified-independent-module",certifiedAt:now,validationFingerprint:validation.fingerprint,configurationFingerprint:validatedConfig.fingerprint,recipeRevision:validation.recipeRevision||null};
 m.legacyStillRequired=false;
 m.migrationStatus="fresh-install-certified";
 const dm=defaults.modules?.[m.id];
 if(dm){dm.general=dm.general||{};dm.general.legacyStillRequired=false;dm.advanced=dm.advanced||{};dm.advanced.allowLegacyFallback=false}
}
defaults.moduleUi=defaults.moduleUi||{};defaults.moduleUi.modules=defaults.moduleUi.modules||{};defaults.moduleUi.modules[cid]=defaults.moduleUi.modules[cid]||{};
defaults.moduleUi.modules[cid].reviewStatus="certified-stable";
defaults.moduleUi.modules[cid].reviewBadge="STABLE · CERTIFIÉ";
defaults.moduleUi.modules[cid].certifiedAt=now;
defaults.moduleUi.modules[cid].validationFingerprint=validation.fingerprint;
defaults.moduleUi.modules[cid].configurationFingerprint=validatedConfig.fingerprint;
fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+"\n");
fs.writeFileSync(defaultsPath,JSON.stringify(defaults,null,2)+"\n");
const ignored=Object.keys(validatedConfig.installationSpecific||{}).length;
console.log("CERTIFIED "+cid+" ("+maps.length+" mapping(s)) — config produit "+(promotedConfig?"promue":"inchangée")+" ; réglages installation ignorés: "+ignored+". Lancer le CI complet avant publication.");
