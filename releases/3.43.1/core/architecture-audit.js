(function(global){"use strict";const KT=global.KohaTools;if(!KT)return;
function report(){
 const required=["platform","storage","gateway","config","scope","targets","ui","assets","actions","clipboard","table","date"];
 const services=required.map(name=>({name,available:!!KT.getService?.(name)}));
 const platform=KT.getService?.("platform")?.get?.()||{};
 return {
   contract:"KohaTools.host.v1",
   hostMode:platform.mode||"unknown",
   services,
   pass:services.every(x=>x.available),
   pluginConversionRequiredNow:false,
   boundaryReady:services.every(x=>x.available)
 };
}
KT.registerService("architecture-audit",{report});
})(window);