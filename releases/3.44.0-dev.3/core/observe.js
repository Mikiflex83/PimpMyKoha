(function(global){
  "use strict";
  const KT=global.KohaTools;if(!KT)return;
  const observers=new Map();let created=0,peak=0;
  function observe(key,target,callback,options={childList:true,subtree:true}){
    if(!target||typeof callback!=="function")return null;
    if(key&&observers.has(key))return observers.get(key);
    const mo=new MutationObserver((mutations,observer)=>callback(mutations,observer));mo.observe(target,options);created++;
    if(key)observers.set(key,mo);peak=Math.max(peak,observers.size);return mo;
  }
  function disconnect(key){const mo=observers.get(key);if(mo){mo.disconnect();observers.delete(key);return true}return false}
  function disconnectAll(){observers.forEach(mo=>mo.disconnect());observers.clear()}
  function status(){return {active:observers.size,peak,created,keys:[...observers.keys()]}}
  KT.registerService("observe",{observe,disconnect,disconnectAll,status});
})(window);