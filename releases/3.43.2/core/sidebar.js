(function(global){"use strict";
const KT=global.KohaTools;if(!KT)return;
const registry=new Map();
const escCss=v=>(global.CSS&&typeof global.CSS.escape==="function")?global.CSS.escape(String(v)):String(v).replace(/["\\]/g,"\\$&");

function findContainer(selectors){
  for(const s of selectors||[]){const el=document.querySelector(s);if(el)return el;}
  return null;
}
function ensureGroup(host,name,cfg){
  let group=host.querySelector(`[data-kt-sidebar-group="${escCss(name)}"]`);
  if(!group){
    group=document.createElement("div");
    group.className=cfg.appearance?.groupClass||"kt-sidebar-actions";
    group.dataset.ktSidebarGroup=name;
    host.appendChild(group);
  }
  return group;
}
function render(){
  const cfg=KT.Config.getCanonical("sidebar-actions")||{};
  const host=findContainer(cfg.targets?.containers);
  if(!host)return {ok:false,reason:"host-not-found"};
  const items=[...registry.values()].filter(x=>x.enabled!==false).sort((a,b)=>(a.order||100)-(b.order||100));
  const groups=new Map();
  for(const spec of items){
    const gname=spec.group||"default";
    if(!groups.has(gname))groups.set(gname,ensureGroup(host,gname,cfg));
    const group=groups.get(gname);
    let a=group.querySelector(`[data-kt-sidebar-action="${escCss(spec.id)}"]`);
    if(!a){
      a=document.createElement("a");
      a.dataset.ktSidebarAction=spec.id;
      a.className=cfg.appearance?.itemClass||"kt-sidebar-action";
      group.appendChild(a);
    }
    a.href=spec.href||"#";
    a.innerHTML="";
    if(spec.icon){
      const i=document.createElement("i");i.className=spec.icon;i.setAttribute("aria-hidden","true");a.appendChild(i);
      a.appendChild(document.createTextNode(" "));
    }
    a.appendChild(document.createTextNode(spec.label||spec.id));
    if(spec.title)a.title=spec.title;
    if(spec.onClick && a.dataset.ktClickBound!=="1"){
      a.dataset.ktClickBound="1";
      a.addEventListener("click",function(event){
        const current=registry.get(spec.id);
        if(current?.onClick) current.onClick(event);
      });
    }
  }
  if(cfg.features?.hideEmptyGroups!==false){
    host.querySelectorAll("[data-kt-sidebar-group]").forEach(g=>{g.hidden=!g.children.length;});
  }
  return {ok:true,count:items.length};
}
function register(spec){
  if(!spec?.id)return false;
  registry.set(spec.id,{...spec});
  render();
  KT.emit("koha-tools:sidebar-change",{type:"register",id:spec.id});
  return true;
}
function unregister(id){
  registry.delete(id);
  document.querySelector(`[data-kt-sidebar-action="${escCss(id)}"]`)?.remove();
  KT.emit("koha-tools:sidebar-change",{type:"unregister",id});
}
function list(){return [...registry.values()].map(x=>({...x}));}
KT.registerService("sidebar",{register,unregister,list,render,findContainer});
})(window);