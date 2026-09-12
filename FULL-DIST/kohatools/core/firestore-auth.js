(function(global){"use strict";
const KT=global.KohaTools;if(!KT)return;
let loaded=null,currentUser=null;
function cfg(){return KT.Config?.effective?.remoteConfig||KT.Config?.defaults?.remoteConfig||{};}
async function load(){
  if(loaded)return loaded;
  loaded=(async()=>{
    const fs=KT.getService("firestore");
    if(!fs)throw new Error("firestore-service-missing");
    const base=await fs.load();
    const v=String(cfg()?.firestore?.sdkVersion||"12.18.0");
    const authMod=await import(`https://www.gstatic.com/firebasejs/${v}/firebase-auth.js`);
    const auth=authMod.getAuth(base.app);
    authMod.onAuthStateChanged(auth,u=>{currentUser=u||null;KT.emit?.("koha-tools:remote-auth-changed",{authenticated:!!u,uid:u?.uid||null});});
    currentUser=auth.currentUser||null;
    return {auth,authMod};
  })().catch(e=>{loaded=null;throw e});
  return loaded;
}
async function signIn(email,password){
  const {auth,authMod}=await load();
  const cred=await authMod.signInWithEmailAndPassword(auth,String(email||"").trim(),String(password||""));
  currentUser=cred.user||null;return {ok:true,uid:currentUser?.uid||null,email:currentUser?.email||null};
}
async function signOut(){const {auth,authMod}=await load();await authMod.signOut(auth);currentUser=null;return true;}
function user(){return currentUser;}
function isAuthenticated(){return !!currentUser;}
KT.registerService("firestore-auth",{load,signIn,signOut,user,isAuthenticated});
})(window);
