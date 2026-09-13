(function(global){"use strict";
const KT=global.KohaTools;if(!KT)return;
let adapter=null;
const Gateway={
 setAdapter(a){adapter=a;return adapter},
 hasAdapter(){return !!adapter},
 async request(name,payload){
   if(!adapter||typeof adapter.request!=="function")throw new Error("KohaTools gateway adapter unavailable: "+name);
   return adapter.request(name,payload);
 },
 async getConfig(){return this.request("config:get",{})},
 async saveConfig(config){return this.request("config:save",{config})},
 async getContext(){return this.request("context:get",{})}
};
KT.registerService("gateway",Gateway);
})(window);