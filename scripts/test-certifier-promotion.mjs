import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {execFileSync} from "node:child_process";

const repo=process.cwd(),root=path.join(repo,"FULL-DIST/kohatools");
const manifest=JSON.parse(fs.readFileSync(path.join(root,"config/manifest.json"),"utf8"));
const defaults=JSON.parse(fs.readFileSync(path.join(root,"config/product-defaults.json"),"utf8"));
const canonicalOf=m=>defaults?.modules?.[m.id]?.config?.canonicalModule||m.canonicalModule||null;
const approved=new Set(["exact-snapshot","approved-current-reference-v10","native-canonical"]);
const groups=new Map();for(const m of manifest.modules||[]){const cid=canonicalOf(m);if(!cid)continue;if(!groups.has(cid))groups.set(cid,[]);groups.get(cid).push(m)}
const found=[...groups].find(([cid,maps])=>defaults.canonicalModules?.[cid]?.recipe&&maps.every(m=>m.nextModule&&approved.has(m.sourceStatus||"")&&m.canaryCapable===true&&fs.existsSync(path.join(root,m.nextModule))));
assert.ok(found,"Aucun module certifiable disponible pour le test");
const [cid,maps]=found,tmp=fs.mkdtempSync(path.join(os.tmpdir(),"pmk-certifier-"));
try{
 const targetRoot=path.join(tmp,"FULL-DIST/kohatools");fs.mkdirSync(path.join(targetRoot,"config"),{recursive:true});
 fs.copyFileSync(path.join(root,"config/manifest.json"),path.join(targetRoot,"config/manifest.json"));
 fs.copyFileSync(path.join(root,"config/product-defaults.json"),path.join(targetRoot,"config/product-defaults.json"));
 for(const m of maps){const src=path.join(root,m.nextModule),dst=path.join(targetRoot,m.nextModule);fs.mkdirSync(path.dirname(dst),{recursive:true});fs.copyFileSync(src,dst)}
 const fp="validation-test-fingerprint",cfgfp="configuration-test-fingerprint";
 const validation={schema:"KohaTools.management.v2",validation:{schema:"KohaTools.validation.v1",data:{version:1,modules:{[cid]:{state:"validated",fingerprint:fp,recipeRevision:"test"}}}},configuration:{schema:"KohaTools.certification-config.v1",canonicalModules:{[cid]:{fingerprint:cfgfp,validatedState:{state:"validated",fingerprint:fp},productDefaultCandidate:{appearance:{__certifierTest:"promoted"}},installationSpecific:{installation:{__certifierTest:"must-not-promote"}}}}}};
 const vf=path.join(tmp,"validation.json");fs.writeFileSync(vf,JSON.stringify(validation,null,2));
 execFileSync(process.execPath,[path.join(repo,"scripts/certify-fresh-install.mjs"),`--canonical=${cid}`,`--validation-file=${vf}`],{cwd:tmp,stdio:"pipe"});
 const afterManifest=JSON.parse(fs.readFileSync(path.join(targetRoot,"config/manifest.json"),"utf8")),afterDefaults=JSON.parse(fs.readFileSync(path.join(targetRoot,"config/product-defaults.json"),"utf8"));
 const afterMaps=(afterManifest.modules||[]).filter(m=>(afterDefaults?.modules?.[m.id]?.config?.canonicalModule||m.canonicalModule)===cid);
 assert.ok(afterMaps.length&&afterMaps.every(m=>m?.freshInstall?.certified===true&&m?.freshInstall?.supported===true&&m?.freshInstall?.requiresLegacy===false));
 assert.equal(afterDefaults.canonicalModules[cid].appearance.__certifierTest,"promoted");
 assert.notEqual(afterDefaults.canonicalModules[cid].installation?.__certifierTest,"must-not-promote");
 assert.equal(afterDefaults.moduleUi.modules[cid].configurationFingerprint,cfgfp);
 console.log(`PASS certifier safe config promotion: ${cid}`);
} finally {fs.rmSync(tmp,{recursive:true,force:true})}
