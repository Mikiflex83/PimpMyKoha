(function(global){"use strict";
const KT=global.KohaTools;if(!KT)return;
if(global.__KohaToolsLateReadyCompatInstalled)return;
global.__KohaToolsLateReadyCompatInstalled=true;

const nativeDocAdd=document.addEventListener.bind(document);
const nativeWinAdd=global.addEventListener.bind(global);

function invokeLate(target,listener,type){
  if(!listener)return;
  setTimeout(function(){
    try{
      const ev=new Event(type);
      if(typeof listener==="function")listener.call(target,ev);
      else if(typeof listener.handleEvent==="function")listener.handleEvent(ev);
    }catch(e){
      KT.record({module:"late-ready-compat",level:"error",kind:"late-ready-listener-error",message:String(e?.message||e)});
    }
  },0);
}

document.addEventListener=function(type,listener,options){
  if(global.__KohaToolsLoadingCandidate===true && type==="DOMContentLoaded" && document.readyState!=="loading"){
    invokeLate(document,listener,type);
    KT.record({module:"late-ready-compat",level:"info",kind:"DOMContentLoaded-replayed"});
    return;
  }
  return nativeDocAdd(type,listener,options);
};

global.addEventListener=function(type,listener,options){
  if(global.__KohaToolsLoadingCandidate===true && type==="load" && document.readyState==="complete"){
    invokeLate(global,listener,type);
    KT.record({module:"late-ready-compat",level:"info",kind:"window-load-replayed"});
    return;
  }
  return nativeWinAdd(type,listener,options);
};

KT.registerService("late-ready-compat",{
  installed:true,
  status:function(){return {installed:true,readyState:document.readyState};}
});
})(window);