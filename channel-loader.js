(function(global){
"use strict";
if(global.__PimpMyKohaChannelLoaderStarted)return;global.__PimpMyKohaChannelLoaderStarted=true;
const CFG=global.PimpMyKohaChannelBootstrap||{};
const lower=v=>String(v??"").trim().toLowerCase();
const list=v=>Array.isArray(v)?v.map(lower).filter(Boolean):[];
function user(){const e=document.querySelector(CFG.usernameSelector||".loggedinusername[data-loggedinusername],.loggedinusername");return lower(e?.dataset?.loggedinusername||e?.getAttribute?.("data-loggedinusername")||e?.textContent||"")}
function requested(){return ["stable","canary","dev"].includes(lower(CFG.channel))?lower(CFG.channel):"stable"}
function allowed(ch,u){if(ch==="stable")return true;if(ch==="dev")return !!u&&list(CFG.developerUsers).includes(u);if(ch==="canary")return !!u&&(list(CFG.developerUsers).includes(u)||list(CFG.adminUsers).includes(u));return false}
function baseFromManifest(url){const u=new URL(url,location.href);u.pathname=u.pathname.replace(/[^/]+$/,'');u.search='';u.hash='';return u.href}
function releaseFrom(index,ch,version){
 if(version){const r=index?.releases?.[version];if(r)return r;return {version,runtimeRoot:`${baseFromManifest(CFG.manifestUrl)}releases/${encodeURIComponent(version)}/`}}
 const direct=index?.[ch];if(direct&&typeof direct==="object")return direct;
 const v=index?.channels?.[ch];return v?(index?.releases?.[v]||null):null;
}
function script(url){return new Promise((ok,ko)=>{const s=document.createElement("script");s.src=url;s.async=false;s.onload=ok;s.onerror=()=>ko(new Error(`bootstrap-load-failed:${url}`));document.head.appendChild(s)})}
async function start(){
 const manifestUrl=String(CFG.manifestUrl||"").trim();if(!manifestUrl)throw new Error("manifestUrl-required");
 const u=user(),want=requested(),chosen=allowed(want,u)?want:"stable";
 const r=await fetch(manifestUrl,{cache:"no-store",credentials:"omit",headers:{Accept:"application/json"}});if(!r.ok)throw new Error(`release-index-http-${r.status}`);const index=await r.json();
 let selected=chosen;
 let pinned=selected==="stable"?String(CFG.stableVersion||CFG.version||"").trim():String(CFG[`${selected}Version`]||"").trim();
 let rel=releaseFrom(index,selected,pinned);
 if(!rel?.version&&selected!=="stable"){selected="stable";pinned=String(CFG.stableVersion||CFG.version||"").trim();rel=releaseFrom(index,"stable",pinned)}
 if(!rel?.version)throw new Error(`release-missing:${selected}`);
 const runtimeRoot=String(rel.runtimeRoot||`${baseFromManifest(manifestUrl)}releases/${encodeURIComponent(rel.version)}/`).replace(/\/?$/,"/");
 global.KohaToolsBootstrap=Object.assign({},CFG.runtime||{},global.KohaToolsBootstrap||{}, {
   deploymentMode:CFG.deploymentMode||global.KohaToolsBootstrap?.deploymentMode||"fresh-install",
   installationId:CFG.installationId||global.KohaToolsBootstrap?.installationId||"",
   profileUrl:CFG.profileUrl||global.KohaToolsBootstrap?.profileUrl||"",
   updateManifestUrl:manifestUrl,
   assetRoot:runtimeRoot,
   distributionChannel:selected,
   requestedDistributionChannel:want,
   distributionResolvedBy:"channel-loader",
   access:Object.assign({},global.KohaToolsBootstrap?.access||{}, {adminUsers:list(CFG.adminUsers),developerUsers:list(CFG.developerUsers),managerUsers:list(CFG.managerUsers)})
 });
 global.__PimpMyKohaChannelResolution={username:u,requested:want,selected,version:rel.version,fallback:want!==selected,reason:want!==chosen?"unauthorized":(chosen!==selected?"channel-unpublished":""),at:new Date().toISOString()};
 await script(runtimeRoot+"bootstrap.js");
}
function ready(fn){if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",fn,{once:true});else queueMicrotask(fn)}
ready(()=>start().catch(e=>{console.error("Pimp My Koha channel loader",e);document.documentElement.dataset.pimpMyKohaChannelError=String(e?.message||e)}));
})(window);
