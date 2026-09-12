(function(global){"use strict";
const KT=global.KohaTools;if(!KT)return;
const CID="home-layout-manager";
function clone(v){return v==null?v:JSON.parse(JSON.stringify(v));}
function cfg(){return clone(KT.Config?.getCanonicalPersistent?.(CID,true)?.homeLayout||{});}
function isHomeDescriptor(d){return d&&(d.displayMode==="home-widget"||d.displayMode==="hybrid");}
function descriptors(){const host=KT.getService("module-host");return (host?.list?.()||[]).filter(isHomeDescriptor);}
function defaultOrder(items=descriptors()){
 return [...items].sort((a,b)=>{
   const ao=Number.isFinite(Number(a.homeOrder))?Number(a.homeOrder):9999;
   const bo=Number.isFinite(Number(b.homeOrder))?Number(b.homeOrder):9999;
   return ao-bo||String(a.title||a.id).localeCompare(String(b.title||b.id),"fr");
 }).map(x=>x.id);
}
function normalize(layout=cfg(),items=descriptors()){
 const ids=items.map(x=>x.id),valid=new Set(ids),seen=new Set(),order=[];
 for(const id of Array.isArray(layout?.order)?layout.order:[]){if(valid.has(id)&&!seen.has(id)){seen.add(id);order.push(id)}}
 for(const id of defaultOrder(items)){if(!seen.has(id)){seen.add(id);order.push(id)}}
 const hidden=[...new Set((Array.isArray(layout?.hidden)?layout.hidden:[]).filter(id=>valid.has(id)))];
 return {order,hidden,adoptLegacy:layout?.adoptLegacy!==false};
}
function isVisible(id,layout=cfg(),items=descriptors()){return !normalize(layout,items).hidden.includes(id);}
function ordered(items=descriptors(),layout=cfg()){
 const n=normalize(layout,items),rank=new Map(n.order.map((id,i)=>[id,i]));
 return [...items].sort((a,b)=>(rank.get(a.id)??99999)-(rank.get(b.id)??99999));
}
function apply(){const host=KT.getService("module-host");return host?.applyHomeLayout?.()??false;}
function status(){const items=descriptors(),layout=normalize(cfg(),items);return {moduleId:CID,layout,defaultOrder:defaultOrder(items),items:items.map(x=>({id:x.id,title:x.title,displayMode:x.displayMode,homeOrder:x.homeOrder??null}))};}
KT.registerService("home-layout",{moduleId:CID,config:cfg,normalize,descriptors,defaultOrder,isVisible,ordered,apply,status});
})(window);
