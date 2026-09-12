(function(global){
"use strict";
const KT=global.KohaTools=global.KohaTools||{};
const STORE="KohaTools.updateStatus.v1";
const IGNORE="KohaTools.ignoredRelease.v1";
let last=null;
function cfg(){return KT.Config?.effective?.updates||{}}
function boot(){return global.KohaToolsBootstrap||{}}
function root(){return String(boot().assetRoot||new URL("../",document.currentScript?.src||location.href).href).replace(/\/?$/,"/")}
function deriveManifestUrl(){
 const explicit=String(boot().updateManifestUrl||cfg().manifestUrl||"").trim();if(explicit)return explicit;
 try{const u=new URL(root());const m=u.pathname.match(/^(.*\/)(?:releases)\/[^/]+\/$/);if(m){u.pathname=m[1]+"latest.json";u.search="";u.hash="";return u.href}}catch(_){}
 return "";
}
function parse(v){const m=String(v||"").trim().replace(/^v/i,"").match(/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/);return m?{major:+m[1],minor:+m[2],patch:+m[3],pre:m[4]||""}:null}
function compare(a,b){const A=parse(a),B=parse(b);if(!A||!B)return String(a||"").localeCompare(String(b||""));for(const k of ["major","minor","patch"]){if(A[k]!==B[k])return A[k]>B[k]?1:-1}if(A.pre===B.pre)return 0;if(!A.pre)return 1;if(!B.pre)return -1;return A.pre.localeCompare(B.pre)}
function readStore(){try{return JSON.parse(localStorage.getItem(STORE)||"null")}catch(_){return null}}
function writeStore(v){try{localStorage.setItem(STORE,JSON.stringify(v))}catch(_){}return v}
function ignored(){try{return localStorage.getItem(IGNORE)||""}catch(_){return ""}}
function currentMode(){if(boot().distributionResolvedBy==="channel-loader")return "github-pages-channel";return /\/releases\/[^/]+\/$/.test(root())?"github-pages-pinned":"self-hosted"}
function channel(){return String(boot().distributionChannel||KT.getService("access-control")?.channel?.()||cfg().channel||"stable").toLowerCase()}
function normalizeRelease(manifest){const channel=channel();const value=manifest?.[channel]||manifest?.channels?.[channel]||manifest?.stable||null;if(typeof value==="string")return manifest?.releases?.[value]||{version:value};return value&&typeof value==="object"?value:null}
function kohaVersion(){return KT.getService("health")?.kohaVersion?.()||boot().kohaVersion||""}
function compatibility(rel){const kv=String(kohaVersion()||"");const branches=rel?.kohaCompatibility?.branches||rel?.koha?.branches||[];const tested=rel?.kohaCompatibility?.tested||rel?.koha?.tested||[];if(!kv)return {known:false,ok:null,label:"Version Koha non détectée"};const branch=kv.split(".").slice(0,2).join(".");const ok=!branches.length||branches.includes(branch)||tested.some(x=>String(x).startsWith(branch+"."));return {known:true,ok,label:ok?`Compatible avec Koha ${branch}`:`Koha ${branch} non déclaré compatible`}}
function status(){const cached=last||readStore()||{};const rel=cached.release||null;const activeChannel=channel();const available=!!(rel?.version&&compare(rel.version,KT.version)>0&&ignored()!==String(rel.version));return {...cached,currentVersion:KT.version,channel:activeChannel,manifestUrl:deriveManifestUrl(),installationMode:currentMode(),available,ignoredVersion:ignored(),compatibility:rel?compatibility(rel):null}}
async function check(options={}){const url=deriveManifestUrl();if(!url){last=writeStore({ok:false,configured:false,checkedAt:new Date().toISOString(),error:"update-manifest-not-configured"});return status()}
 const hours=Math.max(1,Number(cfg().checkIntervalHours||24));const prev=readStore();if(!options.force&&prev?.checkedAt&&Date.now()-Date.parse(prev.checkedAt)<hours*3600000){last=prev;return status()}
 try{const r=await fetch(url,{cache:"no-store",credentials:"omit",headers:{Accept:"application/json"}});if(!r.ok)throw new Error(`HTTP ${r.status}`);const manifest=await r.json();if(manifest?.schema&&manifest.schema!=="pimp-my-koha.release-index.v1")throw new Error("release-index-schema-unsupported");const release=normalizeRelease(manifest);if(!release?.version)throw new Error("release-version-missing");last=writeStore({ok:true,configured:true,checkedAt:new Date().toISOString(),manifestUrl:url,manifest,release});KT.emit?.("koha-tools:update-status",status());return status()}catch(e){last=writeStore({ok:false,configured:true,checkedAt:new Date().toISOString(),manifestUrl:url,error:String(e?.message||e),release:prev?.release||null,manifest:prev?.manifest||null});return status()}}
function ignore(version){try{localStorage.setItem(IGNORE,String(version||status().release?.version||""))}catch(_){}return status()}
function clearIgnored(){try{localStorage.removeItem(IGNORE)}catch(_){}return status()}
function releaseRoot(rel=status().release){return String(rel?.runtimeRoot||"").replace(/\/?$/,"/")}
function bootstrapSnippet(rel=status().release){const rr=releaseRoot(rel);if(!rr)return "";const b=boot(),lines=["window.KohaToolsBootstrap = Object.assign({}, window.KohaToolsBootstrap || {}, {",`  deploymentMode: ${JSON.stringify(b.deploymentMode||KT.deploymentMode||"fresh-install")},`, `  installationId: ${JSON.stringify(b.installationId||KT.Config?.effective?.installationId||"")},`, `  updateManifestUrl: ${JSON.stringify(deriveManifestUrl())}`];if(b.profileUrl)lines.push(`  ,profileUrl: ${JSON.stringify(b.profileUrl)}`);lines.push("});","(function(){","  var s=document.createElement(\"script\");",`  s.src=${JSON.stringify(rr+"bootstrap.js")};`,"  s.async=false;","  document.head.appendChild(s);","})();");return lines.join("\n")}
function downloadUrl(rel=status().release){return rel?.downloadUrl||rel?.archiveUrl||rel?.releasePage||""}
function impact(rel=status().release){const x=rel?.impact||{};const changed=[...(x.canonicalModules||[]),...(rel?.changedModules||[])];return {canonicalModules:[...new Set(changed)],coreFiles:x.coreFiles||[],prerequisites:x.prerequisites||[],configChanged:!!x.configChanged,previousVersion:x.previousVersion||""}}
function activeImpact(rel=status().release){const i=impact(rel);return i.canonicalModules.filter(id=>KT.Config?.getCanonicalPersistent?.(id,true)?.enabled!==false)}
function issuesUrl(rel=status().release){return rel?.issuesUrl||rel?.repository?.issuesUrl||""}
KT.registerService?.("updates",{init(){if(cfg().enabled===false)return;setTimeout(()=>check({force:false,passive:true}),1800)},status,check,compare,ignore,clearIgnored,bootstrapSnippet,downloadUrl,impact,activeImpact,issuesUrl,manifestUrl:deriveManifestUrl,releaseRoot,currentMode,channel});
})(window);
