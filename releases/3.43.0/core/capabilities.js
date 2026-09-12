(function(global){
  "use strict";
  const KT=global.KohaTools;
  if(!KT) return;

  const providers=new Map();

  function register(name,provider,meta={}){
    if(!name||!provider) return false;
    const list=providers.get(name)||[];
    list.push({provider,meta});
    providers.set(name,list);
    KT.emit("koha-tools:capability-added",{name,meta});
    return true;
  }

  function get(name,predicate){
    const list=providers.get(name)||[];
    const selected=typeof predicate==="function" ? list.find(x=>predicate(x.meta,x.provider)) : list[0];
    return selected?.provider || null;
  }

  function has(name){ return (providers.get(name)||[]).length>0; }
  function list(){ return [...providers.entries()].map(([name,items])=>({name,count:items.length,meta:items.map(x=>x.meta)})); }

  KT.registerService("capabilities",{register,get,has,list});
})(window);