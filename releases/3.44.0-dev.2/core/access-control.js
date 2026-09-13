(function(global){
"use strict";
const KT=global.KohaTools;if(!KT)return;
const LEVELS={staff:0,manager:1,admin:2,developer:3};
let defaults={};
const lower=v=>String(v??"").trim().toLowerCase();
const list=v=>Array.isArray(v)?v.map(lower).filter(Boolean):[];
const KOHA_CAPABILITY_SELECTORS={
 circulate:'#toplevelmenu a[href*="/circ/circulation-home.pl"]',
 borrowers:'#toplevelmenu a[href*="/members/members-home.pl"]',
 catalogue:'#catalog-search-dropdown',
 editcatalogue:'a[href*="/cataloguing/cataloging-home.pl"]',
 acquisition:'a[href*="/acqui/acqui-home.pl"]',
 serials:'a[href*="/serials/serials-home.pl"]',
 reports:'a[href*="/reports/reports-home.pl"]',
 suggestions:'a[href*="/suggestion/suggestion.pl"]',
 tools:'a[href*="/tools/tools-home.pl"]',
 parameters:'a[href*="/admin/admin-home.pl"]'
};
function isSuperlibrarian(){
 const el=document.querySelector('.loggedinusername[data-is-superlibrarian]');
 return !!(el&&(el.dataset?.isSuperlibrarian==='is_superlibrarian'||el.classList?.contains?.('is_superlibrarian')));
}
function hasKohaCapability(name){
 const cap=lower(name);if(!cap)return false;if(isSuperlibrarian())return true;if(cap==='superlibrarian')return false;
 const selector=KOHA_CAPABILITY_SELECTORS[cap];return selector?!!document.querySelector(selector):false;
}

function boot(){return global.KohaToolsBootstrap||{}}
function config(){return KT.Config?.effective?.accessControl||KT.Config?.defaults?.accessControl||defaults?.accessControl||{}}
function currentUser(){
 const sel=config()?.usernameSelector||".loggedinusername[data-loggedinusername],.loggedinusername";
 const el=document.querySelector(sel);
 return lower(el?.dataset?.loggedinusername||el?.getAttribute?.("data-loggedinusername")||el?.textContent||"");
}
function roleUsers(role){
 const c=config(),b=boot().access||{};
 const bootKey={manager:"managerUsers",admin:"adminUsers",developer:"developerUsers"}[role];
 const fromBoot=list(bootKey?b[bootKey]:[]);if(fromBoot.length)return fromBoot;
 const fromCfg=list(c?.roles?.[role]?.allowedUsernames);if(fromCfg.length)return fromCfg;
 if(role==="admin"){
   const legacy=list(KT.Config?.effective?.adminUi?.allowedUsernames||defaults?.adminUi?.allowedUsernames);if(legacy.length)return legacy;
 }
 return [];
}
function deniedUsers(){return list(config()?.deniedUsernames)}
function role(){
 const u=currentUser();if(!u||deniedUsers().includes(u))return "staff";
 if(roleUsers("developer").includes(u))return "developer";
 if(roleUsers("admin").includes(u))return "admin";
 if(roleUsers("manager").includes(u))return "manager";
 const explicitRoleUsers=[...roleUsers("manager"),...roleUsers("admin"),...roleUsers("developer")];
 if(config()?.compatibility?.allowLegacyOpenAdmin===true && explicitRoleUsers.length===0){
   const legacy=list(KT.Config?.effective?.adminUi?.allowedUsernames||defaults?.adminUi?.allowedUsernames);
   if(!legacy.length||legacy.includes(u))return "admin";
 }
 return "staff";
}
function can(required="staff"){const have=LEVELS[role()]??0,need=LEVELS[lower(required)]??0;return have>=need}
function requestedChannel(){return lower(boot().distributionChannel||boot().channel||KT.Config?.effective?.updates?.channel||"stable")||"stable"}
function allowedChannel(channel=requestedChannel()){
 const ch=lower(channel)||"stable";if(ch==="stable")return true;
 if(ch==="canary")return can(config()?.channels?.canary?.minimumRole||"admin");
 if(ch==="dev")return can(config()?.channels?.dev?.minimumRole||"developer");
 return false;
}
function channel(){const requested=requestedChannel();return allowedChannel(requested)?requested:"stable"}
function modulePolicy(canonicalId){return KT.Config?.getCanonicalPersistent?.(canonicalId,true)?.access||defaults?.canonicalModules?.[canonicalId]?.access||{}}
function moduleAllowed(canonicalId){
 if(!canonicalId)return true;
 const p=modulePolicy(canonicalId),u=currentUser();
 const denied=list(p.deniedUsernames);if(u&&denied.includes(u))return false;
 const allowed=list(p.allowedUsernames);if(allowed.length)return !!u&&allowed.includes(u);
 const audience=lower(p.audience||"staff");
 if(!can(audience in LEVELS?audience:"staff"))return false;
 const all=list(p.kohaAll);if(all.length&&!all.every(hasKohaCapability))return false;
 const any=list(p.kohaAny);if(any.length&&!any.some(hasKohaCapability))return false;
 return true;
}
function snapshot(){return {username:currentUser(),role:role(),superlibrarian:isSuperlibrarian(),requestedChannel:requestedChannel(),effectiveChannel:channel(),channelAllowed:allowedChannel(requestedChannel()),roles:{manager:roleUsers("manager"),admin:roleUsers("admin"),developer:roleUsers("developer")},kohaCapabilities:Object.fromEntries(Object.keys(KOHA_CAPABILITY_SELECTORS).map(k=>[k,hasKohaCapability(k)]))}}
function init(d){defaults=d||{};const s=snapshot();document.documentElement.dataset.kohaToolsRole=s.role;document.documentElement.dataset.kohaToolsChannel=s.effectiveChannel;KT.emit?.("koha-tools:access-ready",s);return s}
KT.registerService("access-control",{init,currentUser,role,can,roleUsers,requestedChannel,allowedChannel,channel,moduleAllowed,modulePolicy,snapshot,isSuperlibrarian,hasKohaCapability,kohaCapabilitySelectors:{...KOHA_CAPABILITY_SELECTORS}});
})(window);
