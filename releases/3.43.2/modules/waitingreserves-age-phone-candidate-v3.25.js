(function(global){"use strict";
const KT=global.KohaTools;if(!KT||!KT.Config)return;
const ID="waitingreserves-age-phone",Scope=KT.getService&&KT.getService("scope");
let styleNode=null,raf=0,drawBound=false,roleMapCache=new WeakMap();
const inserted=new Set(),phoneSnapshots=new Map(),observedBodies=new Map();
function C(){return KT.Config.getCanonical(ID)}
function ready(fn){document.readyState==="loading"?document.addEventListener("DOMContentLoaded",fn,{once:true}):fn()}
function norm(v){return String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim()}
function dayNumber(raw){
  const m=String(raw||"").match(/^(\d{4})-(\d{2})-(\d{2})/);if(!m)return null;
  const y=+m[1],mo=+m[2],d=+m[3],ms=Date.UTC(y,mo-1,d);
  if(!Number.isFinite(ms))return null;
  const check=new Date(ms);if(check.getUTCFullYear()!==y||check.getUTCMonth()!==mo-1||check.getUTCDate()!==d)return null;
  return Math.floor(ms/86400000);
}
function todayNumber(){const n=new Date();return Math.floor(Date.UTC(n.getFullYear(),n.getMonth(),n.getDate())/86400000)}
function replaceTokens(tpl,vars){let s=String(tpl||"");for(const[k,v]of Object.entries(vars||{}))s=s.replace(new RegExp("\\{"+k+"\\}","g"),String(v));return s}
function injectCss(c){
  if(c.appearance?.injectDefaultCss===false)return;
  const id=c.appearance?.styleId||"kt-waitingreserves-smart-style";
  let s=document.getElementById(id);if(!s){s=document.createElement("style");s.id=id;document.head.appendChild(s);styleNode=s}
  s.textContent=(String(c.appearance?.defaultCss||"")+"\n"+String(c.appearance?.customCss||"")).replace(/\\n/g,"\n");
}
function directCells(row){return [...row.children].filter(x=>x.matches?.("th,td"))}
function headerCells(table){
  const rows=table?.tHead?.rows;if(!rows?.length)return[];
  return directCells(rows[rows.length-1]);
}
function roleDefs(c){return c.dates?.roles||{}}
function headerRole(cell,c){
  const raw=[cell?.dataset?.colname,cell?.id,cell?.getAttribute?.("data-colname"),cell?.textContent].filter(Boolean).join(" ");
  const n=norm(raw);if(!n)return null;
  for(const [role,def] of Object.entries(roleDefs(c))){
    for(const alias of def.aliases||[]){const a=norm(alias);if(a&&n.includes(a))return role}
  }
  return null;
}
function tableRoleMap(table,c){
  if(table&&roleMapCache.has(table))return roleMapCache.get(table);
  const map=new Map(),heads=headerCells(table);
  heads.forEach((h,i)=>{const r=headerRole(h,c);if(r&&!map.has(r))map.set(r,i)});
  if(table)roleMapCache.set(table,map);
  return map;
}
function fallbackRoleCells(row,c){
  const dateCells=directCells(row).filter(x=>x.matches?.(c.dates?.cellSelector||"td[data-order]")&&x.hasAttribute(c.dates?.dateAttribute||"data-order"));
  const out={};
  if(dateCells.length<Number(c.dates?.minDateCellsForFallback??3))return out;
  for(const [role,def] of Object.entries(roleDefs(c))){const pos=Number(def.fallbackDatePosition);if(Number.isInteger(pos)&&dateCells[pos])out[role]=dateCells[pos]}
  return out;
}
function rowRoleCells(row,c){
  const table=row.closest("table"),map=tableRoleMap(table,c),cells=directCells(row),out={};
  for(const [role,index] of map.entries()){const el=cells[index];if(el?.matches?.(c.dates?.cellSelector||"td[data-order]"))out[role]=el}
  const fb=fallbackRoleCells(row,c);for(const role of Object.keys(roleDefs(c)))if(!out[role]&&fb[role])out[role]=fb[role];
  return out;
}
function renderRole(role,daysSince,c){
  const def=roleDefs(c)[role]||{};
  if(role==="expiration"){
    const remaining=-daysSince,abs=Math.abs(remaining);
    if(remaining<0)return {text:replaceTokens(def.pastTemplate||"expirée depuis {days} j",{days:abs}),state:"expired"};
    if(remaining===0)return {text:def.todayTemplate||"expire aujourd’hui",state:"expired"};
    if(remaining===1)return {text:def.tomorrowTemplate||"demain",state:"soon"};
    return {text:replaceTokens(def.futureTemplate||"dans {days} j",{days:remaining}),state:remaining<=Number(def.soonWithinDays??2)?"soon":"normal"};
  }
  const safe=Math.max(0,daysSince);
  const zero=def.zeroTemplate||"aujourd’hui";
  const text=safe===0?zero:replaceTokens(def.template||"{days} j",{days:safe});
  const warn=Number.isFinite(Number(def.warningAfterDays))&&safe>Number(def.warningAfterDays);
  return {text,state:warn?"old":"normal"};
}
function processDateCell(cell,role,c){
  if(!cell)return false;const attr=c.dates?.dateAttribute||"data-order",raw=cell.getAttribute(attr),n=dayNumber(raw);if(n===null)return false;
  const marker=c.dates?.markerAttribute||"data-kt-waiting-date",value=String(c.dates?.markerValue??"1");
  const existing=cell.querySelector(`.${CSS.escape(c.dates?.outputClass||"kt-wr-age")}[data-kt-role="${CSS.escape(role)}"]`);
  if(existing){cell.setAttribute(marker,value);return true}
  const daysSince=todayNumber()-n,rendered=renderRole(role,daysSince,c),sp=document.createElement("span");
  sp.className=`${c.dates?.outputClass||"kt-wr-age"} kt-wr-${role} kt-wr-${rendered.state}`;
  sp.dataset.ktRole=role;sp.textContent=rendered.text;sp.title=(roleDefs(c)[role]?.title||"").replace(/\{date\}/g,raw).replace(/\{value\}/g,rendered.text);
  cell.appendChild(sp);cell.setAttribute(marker,value);cell.setAttribute(c.dates?.roleAttribute||"data-kt-date-role",role);inserted.add(sp);return true;
}
function processRow(row,c){
  const roles=rowRoleCells(row,c);let n=0;for(const role of Object.keys(roleDefs(c)))if(processDateCell(roles[role],role,c))n++;return n;
}
function formatPhone(el,c){
  const marker=c.phone?.markerAttribute||"data-kt-phone-formatted",value=String(c.phone?.markerValue??"1");
  if(el.getAttribute(marker)===value)return false;
  const original=el.textContent||"",clean=original.replace(/\D/g,"");
  if(clean.length===Number(c.phone?.digitsRequired??10)){
    let rx=null;try{rx=new RegExp(c.phone?.formatRegex||"(\\d{2})(\\d{2})(\\d{2})(\\d{2})(\\d{2})")}catch(_){}
    if(rx){if(!phoneSnapshots.has(el))phoneSnapshots.set(el,original);el.textContent=clean.replace(rx,c.phone?.replacement||"$1.$2.$3.$4.$5")}
  }else if(c.phone?.invalidPolicy==="digits-only"){
    if(!phoneSnapshots.has(el))phoneSnapshots.set(el,original);el.textContent=clean;
  }
  el.setAttribute(marker,value);return true;
}
function relevantRows(c){
  const sel=c.dates?.rowSelector||"tbody tr";return [...document.querySelectorAll(sel)].filter(r=>r.querySelector(c.dates?.cellSelector||"td[data-order]"));
}
function processAll(){
  const c=C();if(!c?.enabled||c.mode!=="live")return;
  injectCss(c);for(const row of relevantRows(c))processRow(row,c);
  if(c.phone?.enabled!==false)for(const el of document.querySelectorAll(c.phone?.selector||".patron_phone"))formatPhone(el,c);
  ensureObservers(c);
}
function schedule(){if(raf)return;raf=requestAnimationFrame(()=>{raf=0;processAll()})}
function ensureObservers(c){
  if(c.observers?.mutation===false)return;
  for(const body of document.querySelectorAll(c.observers?.tbodySelector||"tbody")){
    if(observedBodies.has(body))continue;
    const mo=new MutationObserver(schedule);mo.observe(body,{childList:true,subtree:true});observedBodies.set(body,mo);
  }
}
function bindDraw(c){
  if(drawBound||c.observers?.dataTablesDraw===false)return;
  const jq=global.jQuery;if(jq?.fn?.on){jq(document).on("draw.dt.ktWaitingReserves",schedule);drawBound=true}
}
function shadow(c){
  const rows=relevantRows(c),roles={waiting:0,placed:0,expiration:0},invalid=[];
  for(const row of rows){const m=rowRoleCells(row,c);for(const role of Object.keys(roles)){if(m[role])roles[role]++;else invalid.push(role)}}
  KT.record({module:ID,level:"info",kind:"shadow-smart-waitingreserves",rows:rows.length,roles,phones:document.querySelectorAll(c.phone?.selector||".patron_phone").length,unresolved:invalid.length});
}
function run(){
  const c=C();if(!c?.enabled||!["shadow","live"].includes(c.mode))return;if(Scope&&!Scope.match(c.general?.scope).ok)return;
  if(c.mode==="shadow")return shadow(c);processAll();bindDraw(c);
}
function destroy(){
  if(raf){cancelAnimationFrame(raf);raf=0}
  roleMapCache=new WeakMap();
  for(const mo of observedBodies.values())mo.disconnect();observedBodies.clear();
  if(drawBound&&global.jQuery){global.jQuery(document).off("draw.dt.ktWaitingReserves");drawBound=false}
  for(const sp of inserted)if(sp?.isConnected)sp.remove();inserted.clear();
  const c=C(),marker=c.dates?.markerAttribute||"data-kt-waiting-date",roleAttr=c.dates?.roleAttribute||"data-kt-date-role";
  document.querySelectorAll(`[${marker}]`).forEach(el=>{el.removeAttribute(marker);el.removeAttribute(roleAttr)});
  for(const [el,original] of phoneSnapshots){if(el?.isConnected)el.textContent=original}phoneSnapshots.clear();
  document.querySelectorAll(c.phone?.selector||".patron_phone").forEach(el=>el.removeAttribute(c.phone?.markerAttribute||"data-kt-phone-formatted"));
  if(styleNode?.isConnected)styleNode.remove();styleNode=null;
}
function init(){ready(run)}function onConfigChange(){destroy();run()}
const runtime={id:ID,init,destroy,onConfigChange};if(KT.initModule)KT.initModule(runtime);else init();
})(window);