(function(global){"use strict";const KT=global.KohaTools;if(!KT)return;
const svc=()=>KT.getService("validation");
function summary(){
 const rows=svc()?.allReadiness?.()||[];
 const ready=rows.filter(x=>x.ready),blocked=rows.filter(x=>!x.ready);
 return {
   total:rows.length,
   ready:ready.length,
   blocked:blocked.length,
   blockers:blocked.reduce((a,x)=>{for(const b of x.blockers)a[b]=(a[b]||0)+1;return a;},{})
 };
}
KT.registerService("retirement-report",{summary,rows:()=>svc()?.allReadiness?.()||[]});
})(window);