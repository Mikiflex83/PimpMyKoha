(function(global){"use strict";
const KT=global.KohaTools;if(!KT)return;

let manifest=null,defaults=null;
const RESULT_KEY="KohaTools.recipeResults.v1";
const RUN_KEY="KohaTools.recipeRun.v1";
const MANUAL_KEY="KohaTools.recipeManual.v1";

function parse(raw,fallback){try{return JSON.parse(raw||"")||fallback}catch(_){return fallback}}
function read(key,fallback){try{return parse(localStorage.getItem(key),fallback)}catch(_){return fallback}}
function write(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true}catch(_){return false}}
function pageName(){return String(location.pathname||"").split("/").filter(Boolean).pop()||""}
function wildcard(pattern){const s=String(pattern||"*").replace(/[.+?^${}()|[\]\\]/g,"\\$&").replace(/\*/g,".*");return new RegExp("^"+s+"$","i")}
function scopeAllows(scope){
  scope=scope||{};const page=pageName(),inc=scope.include||["*"],exc=scope.exclude||[];
  if(!inc.some(p=>wildcard(p).test(page)))return false;
  if(exc.some(p=>wildcard(p).test(page)))return false;
  const qs=new URLSearchParams(location.search);
  for(const [k,expected] of Object.entries(scope.matchQuery||{})){
    const actual=qs.get(k);
    if(Array.isArray(expected)){if(!expected.map(String).includes(String(actual)))return false}
    else if(expected===null){if(!qs.has(k))return false}
    else if(String(actual)!==String(expected))return false;
  }
  for(const sel of (scope.requireSelectors||[])){
    try{if(!document.querySelector(sel))return false}catch(_){return false}
  }
  return true;
}
function scopeKind(scope){
  scope=scope||{};const inc=scope.include||["*"];
  const wildcardOnly=inc.length===1&&inc[0]==="*";
  const constrainedQuery=Object.keys(scope.matchQuery||{}).length>0;
  const constrainedDom=(scope.requireSelectors||[]).length>0;
  return (!wildcardOnly||constrainedQuery||constrainedDom)?"page":"global";
}
function canonicalOf(m){return defaults?.modules?.[m.id]?.config?.canonicalModule||null}
function canonicalCfg(cid){return KT.Config?.getCanonical?.(cid)||defaults?.canonicalModules?.[cid]||{}}
function allMappings(cid){return (manifest?.modules||[]).filter(m=>canonicalOf(m)===cid)}
function isNativeApplication(cid){return defaults?.canonicalModules?.[cid]?.nativeApplication===true||allMappings(cid).some(m=>m.applicationModule===true)}
function isRecipeModule(cid){return defaults?.moduleUi?.modules?.[cid]?.reviewStatus==="pending-user"&&(!!defaults?.canonicalModules?.[cid]?.recipe||isNativeApplication(cid))}
function mappings(cid){return allMappings(cid).filter(m=>!!m.nextModule||!!m.legacyFile)}
function productionMappings(cid){return allMappings(cid).filter(m=>m.production20260911==="active"||m.production20260911==="production-addition")}
function uniqueCanonical(){
  return [...new Set((manifest?.modules||[]).map(canonicalOf).filter(Boolean))];
}
function relevant(opts={}){
  const onlyEligible=opts.onlyEligible===true,includeGlobal=opts.includeGlobal!==false;
  const rows=[];
  for(const cid of uniqueCanonical()){
    if(!isRecipeModule(cid))continue;
    const mapsAll=mappings(cid);if(!mapsAll.length)continue;
    const cfg=canonicalCfg(cid),canonicalScope=cfg?.general?.scope||null;
    if(canonicalScope&&!scopeAllows(canonicalScope))continue;
    const matchedMaps=mapsAll.filter(m=>{
      const ms=defaults?.modules?.[m.id]?.config?.scope||m.scope||null;
      return !ms||scopeAllows(ms);
    });
    if(!matchedMaps.length)continue;
    const scopes=matchedMaps.map(m=>defaults?.modules?.[m.id]?.config?.scope||m.scope||{include:["*"]});
    const kind=(canonicalScope&&scopeKind(canonicalScope)==="page")||scopes.some(s=>scopeKind(s)==="page")?"page":"global";
    if(kind==="global"&&!includeGlobal)continue;
    const eligibility=testability(cid);
    if(onlyEligible&&!eligibility.ok)continue;
    rows.push({
      canonicalId:cid,title:matchedMaps[0].title||cid,
      legacyFiles:matchedMaps.map(m=>m.legacyFile),
      nextModules:[...new Set(matchedMaps.map(m=>m.nextModule).filter(Boolean))],
      eligibility,risk:KT.getService("validation")?.risk(cid)||{level:"unknown",score:0,reasons:[]},
      validation:KT.getService("validation")?.get(cid)||{state:"untested"},
      production:matchedMaps.map(m=>m.production20260911||"unknown"),scope:canonicalScope||scopes[0],scopeKind:kind,
      matchedMappings:matchedMaps.map(m=>m.id)
    });
  }
  return rows;
}

const TARGET_ROUTES={
 "mainpage.pl":{direct:"/cgi-bin/koha/mainpage.pl"},
 "search.pl":{direct:"/cgi-bin/koha/catalogue/search.pl"},
 "detail.pl":{fallback:"/cgi-bin/koha/catalogue/search.pl",fallbackLabel:"Rechercher une notice à ouvrir"},
 "moredetail.pl":{fallback:"/cgi-bin/koha/catalogue/search.pl",fallbackLabel:"Rechercher une notice à ouvrir"},
 "issuehistory.pl":{fallback:"/cgi-bin/koha/catalogue/search.pl",fallbackLabel:"Rechercher une notice à ouvrir"},
 "catalogue.pl":{direct:"/cgi-bin/koha/catalogue/search.pl"},
 "itemsearch.pl":{direct:"/cgi-bin/koha/catalogue/itemsearch.pl"},
 "moremember.pl":{fallback:"/cgi-bin/koha/members/members-home.pl",fallbackLabel:"Rechercher un lecteur à ouvrir"},
 "readingrec.pl":{fallback:"/cgi-bin/koha/members/members-home.pl",fallbackLabel:"Rechercher un lecteur à ouvrir"},
 "memberhistory.pl":{fallback:"/cgi-bin/koha/members/members-home.pl",fallbackLabel:"Rechercher un lecteur puis ouvrir son historique"},
 "circulation-home.pl":{direct:"/cgi-bin/koha/circ/circulation-home.pl"},
 "circulation.pl":{fallback:"/cgi-bin/koha/circ/circulation-home.pl",fallbackLabel:"Choisir un lecteur pour le prêt"},
 "returns.pl":{direct:"/cgi-bin/koha/circ/returns.pl"},
 "memberentry.pl":{direct:"/cgi-bin/koha/members/memberentry.pl?op=add_form"},
 "waitingreserves.pl":{direct:"/cgi-bin/koha/circ/waitingreserves.pl"},
 "view_holdsqueue.pl":{direct:"/cgi-bin/koha/circ/view_holdsqueue.pl"},
 "request.pl":{fallback:"/cgi-bin/koha/catalogue/search.pl",fallbackLabel:"Rechercher une notice puis ouvrir Réserver"},
 "batchMod.pl":{direct:"/cgi-bin/koha/tools/batchMod.pl"},
 "batchMod-edit.pl":{fallback:"/cgi-bin/koha/tools/batchMod.pl",fallbackLabel:"Préparer une modification d’exemplaires par lot"},
 "addbiblio.pl":{direct:"/cgi-bin/koha/cataloguing/addbiblio.pl?op=addbiblio&frameworkcode="},
 "additem.pl":{fallback:"/cgi-bin/koha/cataloguing/addbooks.pl",fallbackLabel:"Rechercher une notice à exemplairiser"},
 "guided_reports.pl":{direct:"/cgi-bin/koha/reports/guided_reports.pl"},
 "claims.pl":{direct:"/cgi-bin/koha/serials/claims.pl"},
 "serials-home.pl":{direct:"/cgi-bin/koha/serials/serials-home.pl"},
 "serials.pl":{fallback:"/cgi-bin/koha/serials/serials-home.pl",fallbackLabel:"Ouvrir le module Périodiques"},
 "subscription-add.pl":{direct:"/cgi-bin/koha/serials/subscription-add.pl"},
 "subscription-detail.pl":{fallback:"/cgi-bin/koha/serials/serials-search.pl",fallbackLabel:"Rechercher un abonnement à ouvrir"},
 "serials-search.pl":{direct:"/cgi-bin/koha/serials/serials-search.pl"},
 "serials-edit.pl":{fallback:"/cgi-bin/koha/serials/serials-search.pl",fallbackLabel:"Rechercher un abonnement à ouvrir"},
 "suggestion.pl":{direct:"/cgi-bin/koha/suggestion/suggestion.pl"},
 "z3950_search.pl":{direct:"/cgi-bin/koha/cataloguing/z3950_search.pl"},
 "course-details.pl":{fallback:"/cgi-bin/koha/course_reserves/course-reserves.pl",fallbackLabel:"Ouvrir une réserve de cours"},
 "branchtransfers.pl":{direct:"/cgi-bin/koha/circ/branchtransfers.pl"},
 "preferences.pl":{direct:"/cgi-bin/koha/admin/preferences.pl"},
 "page.pl":{direct:"/cgi-bin/koha/tools/page.pl"}
};
function basenameFromUrl(url){try{return new URL(url,location.href).pathname.split("/").filter(Boolean).pop()||""}catch(_){return ""}}
function configuredRecipe(cid){
 const explicit=defaults?.canonicalModules?.[cid]?.recipe||canonicalCfg(cid)?.recipe||null;if(explicit)return explicit;
 if(!isNativeApplication(cid))return null;
 const title=defaults?.moduleUi?.modules?.[cid]?.title||allMappings(cid)[0]?.title||cid,host=KT.getService("module-host");
 return {revision:"native-application-v1",configContractVerifiedAtBuild:true,manualValidationRequired:true,targets:[{page:"__pimp_my_koha_app__",preferredUrl:host?.url?.(cid)||null,label:`Ouvrir ${title}`}],exerciseSteps:[{label:"Ouvrir l’outil et exercer sa fonction principale sur un cas réel."}],qualityChecks:[{label:"Vérifier que les libellés et actions sont compréhensibles pour l’utilisateur concerné."}]};
}
function realLinkForPage(page,query){
 const cur=pageName();if(page==="*"||page===cur){
   if(!query||Object.entries(query).every(([k,v])=>{const a=new URLSearchParams(location.search).get(k);return Array.isArray(v)?v.map(String).includes(String(a)):v===null?new URLSearchParams(location.search).has(k):String(a)===String(v)}))return location.href;
 }
 const links=[...document.querySelectorAll("a[href]")];
 for(const a of links){
   const href=a.getAttribute("href");if(!href)continue;
   let u;try{u=new URL(href,location.href)}catch(_){continue}
   if((u.pathname.split("/").filter(Boolean).pop()||"")!==page)continue;
   if(query&&!Object.entries(query).every(([k,v])=>{const z=u.searchParams.get(k);return Array.isArray(v)?v.map(String).includes(String(z)):v===null?u.searchParams.has(k):String(z)===String(v)}))continue;
   return u.href;
 }
 return null;
}
function targetLinks(cid){
 const rec=configuredRecipe(cid),targets=rec?.targets||[];const out=[];
 for(const t of targets){
   const page=String(t.page||"*");let href=realLinkForPage(page,t.query||null),direct=true,label=t.label||page;
   if(!href&&t.preferredUrl){href=new URL(t.preferredUrl,location.origin).href}
   if(!href){const rt=TARGET_ROUTES[page];if(rt?.direct){href=new URL(rt.direct,location.origin).href}else if(rt?.fallback){href=new URL(rt.fallback,location.origin).href;label=rt.fallbackLabel||label;direct=false}}
   if(href)out.push({page,label,href,direct,current:href===location.href,query:t.query||null});
   else out.push({page,label,href:null,direct:false,current:false,query:t.query||null});
 }
 const seen=new Set();return out.filter(x=>{const k=(x.href||"")+"|"+x.page;if(seen.has(k))return false;seen.add(k);return true});
}
function stableStringify(v){
 if(v===null||typeof v!=="object")return JSON.stringify(v);
 if(Array.isArray(v))return "["+v.map(stableStringify).join(",")+"]";
 return "{"+Object.keys(v).sort().map(k=>JSON.stringify(k)+":"+stableStringify(v[k])).join(",")+"}";
}
function tinyHash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0).toString(16).padStart(8,"0")}
function fingerprint(cid){
 const rec=configuredRecipe(cid)||{},cfg=canonicalCfg(cid)||{},clean=JSON.parse(JSON.stringify(cfg||{}));
 delete clean.mode;delete clean.lifecycle;delete clean.recipe;
 const boot=global.__KohaToolsProductionBootstrap?.modules?.[cid];
 const maps=mappings(cid).map(m=>({id:m.id,nextModule:m.nextModule||null,legacyFile:m.legacyFile||null}));
 return tinyHash(stableStringify({recipeRevision:rec.revision||null,mappingHash:boot?.mappingHash||null,maps,config:clean}));
}
function testability(cid){
 const gate=KT.getService("prerequisites")?.status?.(cid);
 if(gate&&!gate.ok)return {ok:false,mode:"unavailable",reason:"prerequisites-blocking",blocking:gate.blocking};
 if(KT.getService("access-control")?.moduleAllowed?.(cid)===false)return {ok:false,mode:"unavailable",reason:"access-denied"};
 if(isNativeApplication(cid))return {ok:true,mode:"direct",reason:"native-application-direct-test"};
 if(KT.getService("production")?.isLive?.(cid))return {ok:true,mode:"production",reason:"already-production"};
 const e=KT.getService("canary")?.eligible(cid)||{ok:false,reason:"canary-service-missing"};
 return {...e,mode:e.ok?"canary":"unavailable"};
}
function currentKohaVersion(){
 const supplied=KT.getService("platform")?.get?.()?.kohaVersion||document.documentElement.dataset.kohaVersion;if(supplied)return String(supplied);
 const zones=[document.querySelector("#footer"),document.querySelector("footer"),document.querySelector("#about")].filter(Boolean).map(x=>x.textContent||"").join(" ");
 const m=zones.match(/(?:Koha(?:\s+version)?|version\s+Koha)\s*[:\-]?\s*(\d{2}\.\d{2}(?:\.\d{1,2})?)/i);return m?m[1]:null;
}
function errDiagnostics(cid){
  const ids=new Set([cid,...mappings(cid).map(m=>m.id)]);
  return (KT.diagnostics||[]).filter(d=>ids.has(d.module)&&String(d.level).toLowerCase()==="error");
}
function testResult(cid,status,label,detail="",manual=false){
  return {canonicalId:cid,status,label,detail,manual,at:new Date().toISOString()};
}
function runtimeLoaded(cid){return !!KT.modules?.get?.(cid)||global.__KohaToolsCandidateTelemetry?.[cid]?.loadOk===true}
function textHeaders(sel){return [...document.querySelectorAll(sel)].map(x=>String(x.textContent||"").trim())}

const SPECIFIC_BEHAVIOR_IDS=new Set(["circulation-already-borrowed-alert", "circulation-disputes", "copy-patron-identifiers", "detail-fourth-cover", "external-links-share", "history-layout", "history-row-highlights", "history-table-headers", "holdings-responsive-labels", "holdsqueue-menu-visibility", "literary-prize-search-panel", "loan-duration-detail", "moredetail-layout", "patron-card-digits-highlight", "patron-contact-validation", "personal-lists-manager", "search-results-master", "shuttle-next-passage", "waitingreserves-age-phone"]);
function testBehaviorSpecific(cid){
  const cfg=canonicalCfg(cid);
  if(errDiagnostics(cid).length)return testResult(cid,"fail","Erreur JavaScript détectée",errDiagnostics(cid).slice(-3).map(x=>x.kind||x.message||"error").join(", "));
  if(!runtimeLoaded(cid))return testResult(cid,"fail","Candidate non initialisée","Le runtime canonique n'est pas enregistré.");

  if(cid==="history-table-headers"){
    const table=document.querySelector('table[data-enhanced="1"]');
    const labels=cfg?.labels||{};
    const hs=textHeaders("table th");
    if(!table)return testResult(cid,"fail","Table non traitée","Aucune table data-enhanced=1.");
    if(labels.expectedReturn&&!hs.includes(labels.expectedReturn))return testResult(cid,"fail","En-tête attendu absent",labels.expectedReturn);
    if(labels.actualReturn&&!hs.includes(labels.actualReturn))return testResult(cid,"fail","En-tête attendu absent",labels.actualReturn);
    return testResult(cid,"pass","En-têtes conformes",`${labels.expectedReturn||"Retour prévu"} / ${labels.actualReturn||"Retour effectif"}`);
  }
  if(cid==="holdings-responsive-labels"){
    const t=document.querySelector("#holdings_table");
    if(!t)return testResult(cid,"na","Table d'exemplaires absente");
    const rows=[...t.querySelectorAll("tbody tr")],bad=rows.filter(r=>r.dataset.enhanced!=="1");
    const first=[...t.querySelectorAll("tbody tr:first-child td")],withLabels=first.filter(td=>td.dataset.label!==undefined);
    if(t.dataset.styled!=="1")return testResult(cid,"fail","Table non marquée","data-styled différent de 1");
    if(bad.length)return testResult(cid,"fail","Lignes non traitées",`${bad.length}/${rows.length}`);
    if(first.length&&withLabels.length===0)return testResult(cid,"fail","Labels responsive absents");
    return testResult(cid,"pass","Table responsive conforme",`${rows.length} ligne(s) traitée(s)`);
  }
  if(cid==="moredetail-layout"){
    return document.querySelector("#custom-layout")
      ?testResult(cid,"pass","Mise en page reconstruite")
      :testResult(cid,"fail","Mise en page absente","#custom-layout introuvable");
  }
  if(cid==="detail-fourth-cover"){
    const src=document.querySelector("span.results_summary.electre,span.results_summary.electre-resume,#electre-resume");
    const acc=[...document.querySelectorAll(".accordion-header,.header")].some(x=>String(x.textContent||"").includes(cfg?.accordion?.title||"4ème de couverture"));
    if(!src&&!acc)return testResult(cid,"na","Pas de résumé Electre sur cette notice");
    return acc?testResult(cid,"pass","Accordéon 4ème de couverture présent"):testResult(cid,"fail","Accordéon absent");
  }
  if(cid==="external-links-share"){
    const sections=[...document.querySelectorAll(cfg?.sections?.selector||".liens_externes")];
    if(!sections.length)return testResult(cid,"na","Aucun bloc de liens externes");
    const bad=sections.filter(s=>!s.querySelector(cfg?.button?("."+cfg.button.className):".share-button")||!s.querySelector(cfg?.menu?("."+cfg.menu.className):".share-menu"));
    return bad.length?testResult(cid,"fail","Menu Partager incomplet",`${bad.length} section(s)`):testResult(cid,"pass","Menus Partager présents",`${sections.length} section(s)`);
  }
  if(cid==="history-row-highlights"){
    const t=document.querySelector(cfg?.table?.selector||"#table_readingrec");
    if(!t)return testResult(cid,"na","Table historique absente");
    const marker=cfg?.state?.tableMarkerAttribute||"data-highlighted";
    return t.getAttribute(marker)===String(cfg?.state?.tableMarkerValue??"1")
      ?testResult(cid,"pass","Historique mis en évidence")
      :testResult(cid,"fail","Historique non marqué");
  }
  if(cid==="history-layout"){
    const rows=[...document.querySelectorAll(cfg?.table?.rowSelector||"#table_issues tbody tr")];
    if(!rows.length)return testResult(cid,"na","Aucune ligne d'historique");
    const matched=document.querySelectorAll(".ih-issue-late,.ih-issue-early,.ih-no-issue").length;
    return matched?testResult(cid,"pass","Analyse historique appliquée",`${matched} cellule(s)`):testResult(cid,"na","Cas métier non rencontré","Aucune cellule de l’historique ne déclenche la règle sur les données présentes.");
  }
  if(cid==="shuttle-next-passage"){
    const t=document.querySelector(cfg?.table?.selector||"#holds-table");
    if(!t)return testResult(cid,"na","Table des réservations absente");
    const th=t.querySelector("th."+(cfg?.output?.headerClass||"prochaine-date-navette"));
    return th?testResult(cid,"pass","Colonne navette présente"):testResult(cid,"warn","Colonne navette non visible","Peut dépendre de l'onglet Réservations.",true);
  }
  if(cid==="waitingreserves-age-phone"){
    const rows=[...document.querySelectorAll(cfg?.dates?.rowSelector||"tbody tr")].filter(x=>x.querySelector(cfg?.dates?.cellSelector||"td[data-order]"));
    if(!rows.length)return testResult(cid,"na","Aucune réservation en attente sur cette vue");
    const spans=[...document.querySelectorAll(".kt-wr-age[data-kt-role]")],roles={waiting:0,placed:0,expiration:0};
    spans.forEach(x=>{if(Object.prototype.hasOwnProperty.call(roles,x.dataset.ktRole))roles[x.dataset.ktRole]++});
    const negative=spans.filter(x=>/^\s*-\d+/.test(x.textContent||""));
    const duplicated=rows.some(row=>[...row.querySelectorAll(".kt-wr-age[data-kt-role]")].some((x,i,a)=>a.findIndex(y=>y.dataset.ktRole===x.dataset.ktRole)!==i));
    const phones=[...document.querySelectorAll(cfg?.phone?.selector||".patron_phone")],markedPhones=phones.filter(x=>x.getAttribute(cfg?.phone?.markerAttribute||"data-kt-phone-formatted")==="1");
    if(negative.length)return testResult(cid,"fail","Une date affiche encore une valeur négative",`${negative.length} cellule(s)`);
    if(duplicated)return testResult(cid,"fail","Doublon détecté après redraw du tableau");
    if(!roles.waiting||!roles.placed||!roles.expiration)return testResult(cid,"fail","Colonnes de date incomplètement traitées",`attente ${roles.waiting} · demande ${roles.placed} · expiration ${roles.expiration}`);
    if(phones.length&&markedPhones.length!==phones.length)return testResult(cid,"warn","Dates correctes, téléphones à vérifier",`${markedPhones.length}/${phones.length} téléphone(s) traité(s)`,true);
    return testResult(cid,"pass","Dates de réservation contextualisées",`${rows.length} ligne(s) · expiration sans valeurs négatives · ${markedPhones.length} téléphone(s)`);
  }
  if(cid==="copy-patron-identifiers"){
    const targets=[
      ["#patron-username","username"],
      [".col-sm-12 h1","header"],
      ["label.circ_barcode","barcode"]
    ].filter(([s])=>document.querySelector(s));
    if(!targets.length)return testResult(cid,"na","Aucune cible de copie sur cette vue");
    const missing=targets.filter(([s,id])=>!String(document.querySelector(s)?.dataset?.kohaCopy||"").split(/\s+/).includes(id));
    return missing.length
      ?testResult(cid,"fail","Actions de copie incomplètement liées",missing.map(x=>x[1]).join(", "))
      :testResult(cid,"pass","Actions de copie liées",`${targets.length} cible(s)`);
  }
  if(cid==="circulation-disputes"){
    const btn=document.querySelector("#toolbar_addnewmessageLabel");
    if(!btn)return testResult(cid,"na","Bouton Nouveau message absent sur cette vue");
    const sel=document.querySelector("#gestion_litiges");
    if(sel)return sel.options.length>=16
      ?testResult(cid,"pass","Sélecteur de litiges présent",`${sel.options.length} option(s)`)
      :testResult(cid,"fail","Sélecteur de litiges incomplet",`${sel.options.length} option(s)`);
    return testResult(cid,"warn","Ouvrir « Nouveau message »","Le contrôle est injecté seulement après ouverture du formulaire.",true);
  }
  if(cid==="patron-card-digits-highlight"){
    const marked=document.querySelectorAll('[data-kt-last4="1"]').length;
    const hasTarget=[...document.querySelectorAll("div.patroninfo.is-not-staff h5,.circ_barcode,.col-sm-12 h1,h4")].some(x=>/\(\d+\)/.test(x.textContent||""));
    if(!hasTarget)return testResult(cid,"na","Aucun identifiant entre parenthèses");
    return marked?testResult(cid,"pass","4 derniers chiffres mis en évidence",`${marked} cible(s)`):testResult(cid,"fail","Mise en évidence absente");
  }
  if(cid==="literary-prize-search-panel"){
    return document.querySelector("#drac-search-prices")&&document.querySelector("#drac-toggle-btn")
      ?testResult(cid,"pass","Panneau Prix littéraires présent")
      :testResult(cid,"fail","Panneau Prix littéraires absent");
  }
  if(cid==="holdsqueue-menu-visibility"){
    const rule=cfg?.targets?.[0]||{};
    const links=[...document.querySelectorAll(rule.linkSelector||"li a")].filter(a=>String(a.href||"").includes(rule.hrefIncludes||"")&&String(a.textContent||"").includes(rule.textIncludes||""));
    if(!links.length)return testResult(cid,"pass","Lien indésirable absent");
    const visible=links.filter(a=>getComputedStyle(a.closest(rule.closestSelector||"li")).display!=="none");
    return visible.length?testResult(cid,"fail","Lien encore visible"):testResult(cid,"pass","Lien correctement masqué");
  }
  if(cid==="patron-contact-validation"){
    const trigger=document.querySelector("#patron_messages")?.textContent||"";
    if(!/La carte de l'adhérent a expiré|La carte de l'adhérent expire le/.test(trigger))return testResult(cid,"na","Alerte d'expiration absente sur ce lecteur");
    return document.querySelector("#verification-coordonnees")?testResult(cid,"pass","Contrôle coordonnées présent"):testResult(cid,"fail","Contrôle coordonnées absent");
  }
  if(cid==="loan-duration-detail"){
    const t=document.querySelector("#holdings_table");if(!t)return testResult(cid,"na","Table d'exemplaires absente");
    const spans=t.querySelectorAll(".vc-loan-days").length;
    return spans?testResult(cid,"pass","Durées de prêt affichées",`${spans} indicateur(s)`):testResult(cid,"warn","Aucune durée affichée","Peut être normal sans exemplaire prêté.",true);
  }

  if(cid==="circulation-already-borrowed-alert"){
    const oldText=String(cfg?.labels?.originalText||"L'adhérent a déjà emprunté ce titre");
    const newText=String(cfg?.labels?.replacementText||"Ce titre est déjà présent dans l'historique de prêt de cet adhérent");
    const body=String(document.body?.textContent||"");
    const headingWanted=String(cfg?.targets?.headingText||"Confirmer le prêt");
    const hasHeading=[...document.querySelectorAll(cfg?.targets?.headingSelector||"h3")].some(x=>String(x.textContent||"").includes(headingWanted));
    if(body.includes(oldText))return testResult(cid,"fail","Ancienne formulation encore visible",oldText);
    if(body.includes(newText))return testResult(cid,"pass","Message « déjà emprunté » correctement reformulé","Le mécanisme de confirmation Koha est conservé.");
    if(!hasHeading)return testResult(cid,"na","Aucun cas « déjà emprunté » à vérifier sur cette page","Déclenchez la confirmation avec un titre déjà présent dans l’historique du lecteur.");
    return testResult(cid,"warn","Confirmation présente, texte à contrôler","La formulation attendue n'a pas été détectée automatiquement.",true);
  }

  if(cid==="search-results-master"){
    const form=document.getElementById("bookbag_form");
    const rows=[...document.querySelectorAll('#bookbag_form tbody tr[id^="row"]')];
    if(!form||!rows.length)return testResult(cid,"na","Aucun résultat catalogue à vérifier","Lancez une recherche renvoyant au moins une notice.");
    const noticeCards=document.querySelectorAll(".kx-notice-card").length;
    const itemCards=document.querySelectorAll(".kxri-item").length;
    const duplicatedNative=!!document.querySelector(".kxri-item .bloc-exemplaire, .kxri-item .available_items_loop_items");
    const negativeDue=[...document.querySelectorAll(".kxri-quickstat,.kxri-date-age")].some(x=>/\b-\d+\s*j/i.test(String(x.textContent||"")));
    const filterBox=document.getElementById("kx-master-quick-filters");
    const collectionLinks=document.querySelectorAll('.kxri-collection a,.kx-native-ccode-fallback a').length;
    if(!noticeCards)return testResult(cid,"fail","Cartes notice absentes","Le rendu maître 129 n'a pas été initialisé.");
    if(duplicatedNative)return testResult(cid,"fail","Ancien rendu exemplaire imbriqué détecté","Un ancien script de présentation semble encore agir dans les cartes 129.");
    if(negativeDue)return testResult(cid,"fail","Durée négative détectée","Une ancienne présentation de date semble encore active.");
    const detail=`${noticeCards} notice(s) · ${itemCards} carte(s) exemplaire · ${collectionLinks} lien(s) collection · filtres ${filterBox?"présents":"absents"}`;
    return testResult(cid,itemCards?"pass":"na",itemCards?"Rendu maître 129 conforme":"Aucun exemplaire à exercer sur ce résultat",detail,false);
  }

  if(cid==="personal-lists-manager"){
    const panel=document.querySelector("#kx-temp-lists-panel");
    const bottom=document.querySelector("#bottomActionBar.kx-lists-bottom-bar,#bottomActionBar");
    if(!panel)return testResult(cid,"fail","Panneau Listes personnelles absent","#kx-temp-lists-panel introuvable");
    if(!bottom)return testResult(cid,"fail","Barre Listes absente","#bottomActionBar introuvable");
    const p=pageName();
    if(p==="search.pl"){
      const hasResults=!!document.querySelector("#bookbag_form tr[id^='row'],.bibliocol");
      const integrated=!!document.querySelector(".kx-temp-notice-btn,.kxri-item [data-kx-list],#sidebar5");
      if(hasResults&&!integrated)return testResult(cid,"fail","Intégration résultats absente","Des résultats sont présents mais aucun bouton de liste n’est détecté.");
    }
    if(p==="detail.pl"){
      const integrated=!!document.querySelector("#kx-temp-detail-notice-btn,.kx-temp-detail-item-btn,#sidebar5");
      if(!integrated)return testResult(cid,"fail","Intégration détail absente","Le panneau est présent mais aucun bouton notice/exemplaire attendu n’est détecté.");
    }
    return testResult(cid,"pass","Gestionnaire de listes initialisé","Panneau et barre d'accès détectés.");
  }

  return testAutomaticEvidence(cid);
}

function safeQuery(sel){try{return document.querySelector(sel)}catch(_){return null}}
function telemetry(cid){return KT.getHealthTelemetry?.(cid)||global.__KohaToolsCandidateTelemetry?.[cid]||{}}
function testAutomaticEvidence(cid){
 const rec=configuredRecipe(cid)||{},ev=rec.automaticEvidence||{},sels=Array.isArray(ev.selectorsAny)?ev.selectorsAny:[];
 const hits=sels.filter(s=>!!safeQuery(s));
 if(hits.length)return {...testResult(cid,"pass","Effet fonctionnel détecté",`Marqueur(s) propre(s) au module : ${hits.slice(0,3).join(", ")}`),proofLevel:"strong",evidenceState:"proven",proofType:"static-output-marker"};
 const t=telemetry(cid),cap=ev.capabilities||{};
 if(t.loadOk===false)return {...testResult(cid,"fail","Chargement candidate en échec",t.error||"Erreur de chargement"),proofLevel:"none",evidenceState:"broken"};
 if(Number(t.mutationCount||0)>0&&cap.domMutation){
   return {...testResult(cid,"pass","Modification DOM observée automatiquement",`${t.mutationCount} mutation(s) pendant l’initialisation (${t.addedNodes||0} ajout(s), ${t.attributeChanges||0} attribut(s)).`),proofLevel:"medium",evidenceState:"technical-ok",proofType:"candidate-dom-mutation"};
 }
 const steps=rec.exerciseSteps||rec.manualChecks||[];
 if((ev.events||[]).length||cap.clipboard||cap.opensWindow||cap.network){
   const hint=steps[0]?.label||steps[0]||"Déclencher l’action métier prévue puis relancer le contrôle.";
   return {...testResult(cid,"na","Action nécessaire pour obtenir une preuve",String(hint)),proofLevel:"none",evidenceState:"action-needed",proofType:"interaction"};
 }
 if(cap.domMutation){
   const hint=steps[0]?.label||steps[0]||"Ouvrir un cas contenant les données que ce module doit transformer puis relancer le contrôle.";
   return {...testResult(cid,"na","Cas métier non rencontré sur cette page",String(hint)),proofLevel:"none",evidenceState:"case-not-exercised",proofType:"conditional-dom"};
 }
 return {...testResult(cid,"na","Preuve fonctionnelle non déclenchée","La candidate est chargée sans erreur, mais l’absence d’erreur n’est pas considérée comme une preuve. Ouvre un cas cible puis relance le contrôle."),proofLevel:"none",evidenceState:"case-not-exercised",proofType:"no-proof"};
}
function mkCheck(id,status,label,detail="",blocking=true,meta={}){return {id,status,label,detail,blocking,...meta}}
function commonChecks(cid){
 const cfg=canonicalCfg(cid)||{},rec=configuredRecipe(cid)||{},checks=[];
 const scope=cfg?.general?.scope||{};
 checks.push(mkCheck("page-scope",scopeAllows(scope)?"pass":"fail",scopeAllows(scope)?"Page conforme au périmètre":"Page hors périmètre",pageName(),true));
 const rt=KT.modules?.get?.(cid),tele=telemetry(cid),candidateOk=!!rt||tele.loadOk===true;
 checks.push(mkCheck("candidate-loaded",candidateOk?"pass":"fail",candidateOk?"Module Pimp My Koha chargé":"Module Pimp My Koha absent",rt?`${cid} · module enregistré`:(tele.loadOk?`${cid} · nouvelle version chargée`:"Le module n’est pas chargé."),true));
 checks.push(mkCheck("configuration-loaded",cfg&&typeof cfg==="object"?"pass":"fail",cfg&&typeof cfg==="object"?"Configuration chargée":"Configuration indisponible",rec.configContractVerifiedAtBuild===true?"Le module utilise la configuration prévue par Pimp My Koha.":"Configuration à vérifier.",true));
 const req=scope.requireSelectors||[],missing=[];for(const sel of req){try{if(!document.querySelector(sel))missing.push(sel)}catch(_){missing.push(sel)}}
 checks.push(mkCheck("required-selectors",missing.length?"fail":"pass",missing.length?"Éléments Koha requis absents":"Éléments Koha requis présents",missing.join(", ")||`${req.length} sélecteur(s) obligatoire(s)`,true));
 const errs=errDiagnostics(cid);checks.push(mkCheck("diagnostics",errs.length?"fail":"pass",errs.length?"Erreur JavaScript détectée":"Aucune erreur JavaScript détectée",errs.slice(-3).map(x=>x.kind||x.message||"error").join(", "),true));
 const app=cfg.appearance||{},cssExpected=!!((app.injectDefaultCss!==false&&String(app.defaultCss||"").trim())||String(app.customCss||"").trim());
 if(cssExpected){const sid="kt-config-css-"+String(cid).replace(/[^a-z0-9_-]/gi,"-");checks.push(mkCheck("configured-css",document.getElementById(sid)?"pass":"fail",document.getElementById(sid)?"CSS configuré actif":"CSS configuré non injecté",sid,true))}
 else checks.push(mkCheck("configured-css","na","Aucun CSS configurable requis","",false));
 if(rt){const miss=[];if(typeof rt.init!=="function")miss.push("init");if(typeof rt.destroy!=="function")miss.push("destroy");if(typeof rt.onConfigChange!=="function")miss.push("onConfigChange");checks.push(mkCheck("lifecycle-contract",miss.length?"warn":"pass",miss.length?"Lifecycle partiel":"Lifecycle complet",miss.length?`Méthode(s) absente(s) : ${miss.join(", ")}`:"init / destroy / onConfigChange disponibles",false))}
 else if(tele.loadOk===true)checks.push(mkCheck("lifecycle-contract","na","Candidate directe sans runtime enregistré","Le chargement est observé par le loader ; la preuve fonctionnelle repose sur les marqueurs et contrôles métier.",false));
 else checks.push(mkCheck("lifecycle-contract","na","Lifecycle non contrôlable","Candidate absente",false));
 const tb=testability(cid);checks.push(mkCheck("runtime-contract",tb.ok?"pass":"warn",tb.ok?(tb.mode==="production"?"Version KohaTools déjà en service":"Test local autorisé"):"Test automatisé local indisponible",tb.ok?tb.mode:String(tb.reason||"indisponible"),false));
 return checks;
}
function testSpecific(cid){
 const rec=configuredRecipe(cid)||{},checks=commonChecks(cid);
 let b=SPECIFIC_BEHAVIOR_IDS.has(cid)?testBehaviorSpecific(cid):testAutomaticEvidence(cid);
 if(b?.status==="na"&&SPECIFIC_BEHAVIOR_IDS.has(cid)){
   const generic=testAutomaticEvidence(cid);
   if(generic.status==="pass")b=generic;
   else b={...b,proofLevel:b.proofLevel||"none",evidenceState:b.evidenceState||generic.evidenceState||"case-not-exercised"};
 }
 if(b?.status==="pass"&&!b.proofLevel)b={...b,proofLevel:"strong",evidenceState:"proven",proofType:"specific-behavior"};
 if(b?.status==="fail"&&!b.evidenceState)b={...b,proofLevel:"none",evidenceState:"broken"};
 checks.push(mkCheck("specific-behavior",b.status,b.label,b.detail||"",b.status==="fail",{proofLevel:b.proofLevel||null,evidenceState:b.evidenceState||null,proofType:b.proofType||null}));
 const blockingFail=checks.some(x=>x.status==="fail"&&x.blocking!==false),passCount=checks.filter(x=>x.status==="pass").length,autoCount=checks.filter(x=>x.status!=="na").length;
 const exerciseSteps=(rec.exerciseSteps||rec.manualChecks||[]).map(x=>typeof x==="string"?{label:x}:({...x}));
 const qualityChecks=(rec.qualityChecks||[]).map(x=>typeof x==="string"?{label:x}:({...x}));
 const proofLevel=b.proofLevel||"none",evidenceState=b.evidenceState||(b.status==="pass"?"proven":"case-not-exercised");
 const status=blockingFail?"fail":b.status==="pass"?"pass":"warn",humanRequired=rec.manualValidationRequired===true;
 const detail=blockingFail?"Une preuve automatique a échoué.":humanRequired?"Une vérification métier est demandée avant validation.":status==="pass"?`Preuve ${proofLevel==="strong"?"forte":"technique"} obtenue automatiquement.`:evidenceState==="action-needed"?"Une action métier est nécessaire pour exercer le comportement ; aucun contrôle visuel générique n’est demandé.":"Le cas nécessaire à la preuve n’est pas présent sur cette page.";
 return {canonicalId:cid,status,label:blockingFail?"Contrôle automatique en échec":humanRequired?"Vérification métier requise":`${passCount}/${autoCount} contrôles automatiques réussis`,detail,manual:false,humanRequired,at:new Date().toISOString(),checks,exerciseSteps,qualityChecks,manualChecks:[],targets:targetLinks(cid),recipeRevision:rec.revision||null,fingerprint:fingerprint(cid),kohaVersion:currentKohaVersion(),suiteVersion:KT.version,proofLevel,evidenceState,proofType:b.proofType||null};
}
function testOne(cid){return testSpecific(cid)}

async function prepareManual(cid){
 const rec=configuredRecipe(cid);if(!rec)return {ok:false,reason:"recipe-missing"};
 const tb=testability(cid),scope=canonicalCfg(cid)?.general?.scope||{};
 const checks=[mkCheck("page-scope",scopeAllows(scope)?"pass":"warn",scopeAllows(scope)?"Page conforme au périmètre":"Ouvre d’abord une page cible","",false),mkCheck("configuration-contract",rec.configContractVerifiedAtBuild===true?"pass":"warn",rec.configContractVerifiedAtBuild===true?"Contrat de configuration vérifié":"Contrat de configuration à vérifier","Audit statique de la candidate",false),mkCheck("automatic-test","warn","Test automatisé local indisponible",String(tb.reason||"non autorisé"),false)];
 const r={canonicalId:cid,status:"warn",label:"Recette guidée préparée",detail:"Le module ne peut pas encore être activé automatiquement ici. La procédure indique une action métier concrète ; aucun simple contrôle visuel générique n’est utilisé.",manual:true,manualOnly:true,at:new Date().toISOString(),checks,manualChecks:[],exerciseSteps:(rec.exerciseSteps||rec.manualChecks||[]).map(x=>typeof x==="string"?{label:x}:({...x})),qualityChecks:(rec.qualityChecks||[]).map(x=>typeof x==="string"?{label:x}:({...x})),targets:targetLinks(cid),recipeRevision:rec.revision||null,fingerprint:fingerprint(cid),kohaVersion:currentKohaVersion(),suiteVersion:KT.version};
 const W=KT.getService("testing-workspace"),pk=W?.pageKey?.()||location.pathname,cur=results(),others=(cur.results||[]).filter(x=>x.canonicalId!==cid),payload={version:2,url:location.href,page:pageName(),pageKey:pk,at:new Date().toISOString(),results:[...others,r]};
 write(RESULT_KEY,payload);await W?.saveResult?.(r,{pageKey:pk,url:location.href,page:pageName()});KT.emit("koha-tools:recipe-results",payload);return {ok:true,result:r};
}
function run(ids){
  const list=(ids&&ids.length?ids:relevant({onlyEligible:true}).map(x=>x.canonicalId));
  const results=list.map(testSpecific),W=KT.getService("testing-workspace");
  const payload={version:2,url:location.href,page:pageName(),pageKey:W?.pageKey?.()||location.pathname,at:new Date().toISOString(),results};
  write(RESULT_KEY,payload);W?.saveResults?.(payload);KT.emit("koha-tools:recipe-results",payload);return payload;
}
function results(){
 const W=KT.getService("testing-workspace"),pk=W?.pageKey?.()||location.pathname,local=read(RESULT_KEY,{version:1,results:[]});
 let samePage=false;
 try{samePage=local.pageKey?local.pageKey===pk:(local.url?new URL(local.url,location.href).pathname===location.pathname:false)}catch(_){}
 if(samePage&&(local.results||[]).length)return local;
 const shared=W?.currentPageResults?.()||[];
 return shared.length?{version:2,url:location.href,page:pageName(),pageKey:pk,at:shared.map(x=>x.at).sort().slice(-1)[0]||null,results:shared,source:"firestore"}:{version:1,pageKey:pk,results:[]};
}
function manual(){return read(MANUAL_KEY,{version:2,modules:{}})}
function setManualReview(id,status,notes=""){
 const allowed=["pass","issue","review"];if(!allowed.includes(status))return {ok:false,reason:"invalid-manual-status"};
 const m=manual();m.version=2;m.modules=m.modules||{};const W=KT.getService("testing-workspace"),pk=W?.pageKey?.()||location.pathname;
 const a={status,ok:status==="pass",notes:String(notes||""),at:new Date().toISOString(),pageKey:pk,fingerprint:fingerprint(id),recipeRevision:configuredRecipe(id)?.revision||null};m.modules[id]=a;write(MANUAL_KEY,m);W?.saveVisualApproval?.(id,a);return {ok:true,value:a};
}
function approveVisual(ids,notes="Vérification métier de la page conforme"){for(const id of ids)setManualReview(id,"pass",notes);return manual()}
function manualReview(id){
 const W=KT.getService("testing-workspace"),pk=W?.pageKey?.()||location.pathname,a=manual().modules?.[id],rec=configuredRecipe(id);
 if(a&&a.pageKey===pk&&(!rec||a.fingerprint===fingerprint(id)))return a;
 const x=W?.visualApproval?.(id,pk);if(x&&(!rec||x.fingerprint===fingerprint(id)))return x;return null;
}
function isManualApproved(id){return manualReview(id)?.status==="pass"||manualReview(id)?.ok===true}
function isResultCurrent(r){return !!r&&!!r.fingerprint&&r.fingerprint===fingerprint(r.canonicalId)&&(!r.recipeRevision||r.recipeRevision===configuredRecipe(r.canonicalId)?.revision)}
function finalStatus(r){
 if(!isResultCurrent(r))return "warn";
 const review=manualReview(r.canonicalId);if(review?.status==="issue")return "fail";if(review?.status==="review")return "warn";
 if(r.status==="fail")return "fail";
 if(r.manualOnly)return "warn";
 if(r.humanRequired===true)return isManualApproved(r.canonicalId)?"pass":"warn";
 return r.status;
}
function validatePassed(){
  const V=KT.getService("validation");const r=results();let count=0;
  for(const item of r.results||[]){
    if(isResultCurrent(item)&&finalStatus(item)==="pass"){
      V?.set(item.canonicalId,"validated",item.proofLevel==="strong"?"Recette automatique — preuve fonctionnelle forte":"Recette automatique — preuve technique",{fingerprint:item.fingerprint||fingerprint(item.canonicalId),recipeRevision:item.recipeRevision||configuredRecipe(item.canonicalId)?.revision||null,kohaVersion:item.kohaVersion||currentKohaVersion(),suiteVersion:KT.version,pageKey:KT.getService("testing-workspace")?.pageKey?.()||location.pathname});
      count++;
    }
  }
  return {ok:true,count};
}
function activateMany(ids){
  const C=KT.getService("canary"),activated=[],ready=[],production=[],direct=[],errors=[];
  for(const id of ids){
    const tb=testability(id);
    if(tb.ok&&tb.mode==="direct"){ready.push(id);direct.push(id);continue}
    if(tb.ok&&tb.mode==="production"){ready.push(id);production.push(id);continue}
    const r=C?.activate(id);
    if(r?.ok){activated.push(id);ready.push(id)} else errors.push({id,reason:r?.reason||tb.reason||"error"});
  }
  return {activated,ready,production,direct,errors};
}
function deactivateMany(ids){
  const C=KT.getService("canary");for(const id of ids||[])C?.deactivate(id);return true;
}
async function startQuick(ids){
  ids=(ids&&ids.length?ids:relevant({onlyEligible:true}).map(x=>x.canonicalId));
  const a=activateMany(ids);if(!a.ready.length)return {ok:false,reason:"no-testable-module",errors:a.errors};
  const runState={version:2,mode:"quick",url:location.href,ids:a.ready,canaryIds:a.activated,productionIds:a.production,errors:a.errors,phase:a.activated.length?"awaiting-reload":"testing-now",startedAt:new Date().toISOString()};
  runState.pageKey=KT.getService("testing-workspace")?.pageKey?.()||location.pathname;write(RUN_KEY,runState);await KT.getService("testing-workspace")?.saveRun?.(runState);
  if(!a.activated.length){const rr=run(a.ready);runState.phase="tested";runState.results=rr.results;runState.testedAt=new Date().toISOString();write(RUN_KEY,runState);await KT.getService("testing-workspace")?.saveRun?.(runState);return {ok:true,reloadRequired:false,results:rr.results,state:runState}}
  return {ok:true,reloadRequired:true,...runState};
}
async function persistSequentialResult(state,r){
 state.results.push(r);await KT.getService("testing-workspace")?.saveResult?.(r,{pageKey:KT.getService("testing-workspace")?.pageKey?.()||location.pathname,url:location.href,page:pageName()});
}
async function prepareSequentialStep(state){
 const C=KT.getService("canary");
 while(state.index<state.ids.length){
   const id=state.ids[state.index],tb=testability(id);
   if(!tb.ok){await persistSequentialResult(state,testResult(id,"fail","Test impossible",tb.reason||"indisponible"));state.index++;continue}
   if(tb.mode==="direct"||tb.mode==="production"){const r=testSpecific(id);await persistSequentialResult(state,r);state.index++;continue}
   const ar=C?.activate(id);
   if(!ar?.ok){await persistSequentialResult(state,testResult(id,"fail","Test local impossible",ar?.reason||"error"));state.index++;continue}
   state.phase="testing";write(RUN_KEY,state);await KT.getService("testing-workspace")?.saveRun?.(state);return {ok:true,reloadRequired:true,state};
 }
 const payload={version:2,url:location.href,page:pageName(),pageKey:KT.getService("testing-workspace")?.pageKey?.()||location.pathname,at:new Date().toISOString(),results:state.results};
 write(RESULT_KEY,payload);await KT.getService("testing-workspace")?.saveResults?.(payload);state.phase="done";state.doneAt=new Date().toISOString();write(RUN_KEY,state);await KT.getService("testing-workspace")?.saveRun?.(state);return {ok:true,reloadRequired:false,done:true,state,results:state.results};
}
async function startSequential(ids){
 ids=(ids&&ids.length?ids:relevant({onlyEligible:true}).map(x=>x.canonicalId));
 if(!ids.length)return {ok:false,reason:"no-eligible-module"};
 const state={version:2,mode:"sequential",url:location.href,ids,index:0,results:[],phase:"prepare",startedAt:new Date().toISOString(),pageKey:KT.getService("testing-workspace")?.pageKey?.()||location.pathname};
 write(RUN_KEY,state);await KT.getService("testing-workspace")?.saveRun?.(state);return prepareSequentialStep(state);
}
function currentRun(){return read(RUN_KEY,null)}
async function clearRun(){try{localStorage.removeItem(RUN_KEY);await KT.getService("testing-workspace")?.finishRun?.({phase:"cleared"});return true}catch(_){return false}}
function applyShared(sharedModules,sharedRun){
 const local=read(RESULT_KEY,{version:1,results:[]});
 if(!(local.results||[]).length){const W=KT.getService("testing-workspace"),rs=W?.currentPageResults?.()||[];if(rs.length)write(RESULT_KEY,{version:2,url:location.href,page:pageName(),pageKey:W?.pageKey?.(),at:new Date().toISOString(),results:rs,source:"firestore"})}
 const m=manual();m.modules=m.modules||{};let changed=false;
 for(const cid of Object.keys(sharedModules||{})){const a=KT.getService("testing-workspace")?.visualApproval?.(cid);if(a?.ok&&!m.modules[cid]){m.modules[cid]=a;changed=true}}
 if(changed)write(MANUAL_KEY,m);return {ok:true,sharedRun:sharedRun||null};
}
function sharedRun(){return KT.getService("testing-workspace")?.currentPageRun?.()||null}
async function takeOverSharedRun(){
 const sr=sharedRun();if(!sr||!["awaiting-reload","testing","activate","in-progress"].includes(String(sr.phase||"")))return {ok:false,reason:"no-shared-run"};
 const ids=(sr.ids||[]).filter(Boolean);if(!ids.length)return {ok:false,reason:"shared-run-empty"};
 if(sr.mode==="quick"){
   const a=activateMany(ids),st={...sr,ids:a.activated,errors:a.errors,phase:"awaiting-reload",takenOverAt:new Date().toISOString(),url:location.href};
   write(RUN_KEY,st);await KT.getService("testing-workspace")?.saveRun?.(st);return {ok:a.activated.length>0,reloadRequired:a.activated.length>0,state:st};
 }
 let index=Math.max(0,Number(sr.index)||0);if(index>=ids.length)return {ok:false,reason:"shared-run-complete"};
 const ar=KT.getService("canary")?.activate(ids[index]);if(!ar?.ok)return {ok:false,reason:ar?.reason||"activate-failed"};
 const st={...sr,ids,index,phase:"testing",takenOverAt:new Date().toISOString(),url:location.href};
 write(RUN_KEY,st);await KT.getService("testing-workspace")?.saveRun?.(st);return {ok:true,reloadRequired:true,state:st};
}

async function rollbackRecipe(){
  const r=currentRun(),ids=r?.ids?.length?r.ids:(results()?.results||[]).map(x=>x.canonicalId);
  deactivateMany(ids);await clearRun();return {ok:true,reloadRequired:true,ids};
}
async function resume(){
  const st=currentRun();if(!st)return null;
  if(st.url&&new URL(st.url,location.href).pathname!==location.pathname)return {paused:true,reason:"different-page",state:st};

  if(st.mode==="quick"&&st.phase==="awaiting-reload"){
    st.phase="tested";st.testedAt=new Date().toISOString();const rr=run(st.ids);st.results=rr.results;write(RUN_KEY,st);await KT.getService("testing-workspace")?.saveRun?.(st);
    return {done:true,mode:"quick",results:rr.results};
  }
  if(st.mode==="sequential"&&st.phase==="testing"){
    const id=st.ids[st.index],r=testSpecific(id);await persistSequentialResult(st,r);KT.getService("canary")?.deactivate(id);st.index++;
    const next=await prepareSequentialStep(st);if(next.reloadRequired)setTimeout(()=>location.reload(),250);return next.done?{done:true,finalReload:false,results:st.results}:{done:false,next:st.ids[st.index]};
  }
  if(st.mode==="sequential"&&st.phase==="done"){
    await clearRun();return {done:true,mode:"sequential",results:results().results||[]};
  }
  return {state:st};
}
function init(m,d){manifest=m;defaults=d;setTimeout(()=>resume(),900)}
KT.registerService("recipe",{init,relevant,run,prepareManual,results,manual,manualReview,setManualReview,approveVisual,isManualApproved,isResultCurrent,finalStatus,validatePassed,startQuick,startSequential,currentRun,sharedRun,takeOverSharedRun,rollbackRecipe,clearRun,resume,applyShared,scopeAllows,scopeKind,pageName,targetLinks,configuredRecipe,fingerprint,testability,testOne,currentKohaVersion,testAutomaticEvidence});
})(window);