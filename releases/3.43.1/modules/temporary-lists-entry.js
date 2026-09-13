(function(global){"use strict";
const KT=global.KohaTools;if(!KT)return;const id="temporary-lists-entry",cfg=KT.Config.getCanonical(id),S=KT.getService("scope"),SB=KT.getService("sidebar");
if(!cfg?.enabled||!["shadow","live"].includes(cfg.mode)||!S?.match(cfg.general?.scope).ok||!SB)return;
if(cfg.mode==="shadow")return KT.record({module:id,level:"info",kind:"shadow-registration",action:cfg.action,registrationOnly:cfg.advanced?.registrationOnly});
if(cfg.advanced?.registrationOnly)return;
SB.register({...cfg.action});KT.record({module:id,level:"info",kind:"live-registered"});
})(window);