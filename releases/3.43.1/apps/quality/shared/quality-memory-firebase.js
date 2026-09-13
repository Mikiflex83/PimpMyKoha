/*
 * KohaQualityMemory — client Firebase indépendant des modules Qualité Koha
 * Version 1.5.1 — Firebase Web SDK / Cloud Firestore / Auth anonyme
 *
 * RGPD / minimisation par conception
 * - Aucune donnée métier Koha n'est envoyée à Firebase.
 * - Aucun identifiant lecteur / notice / exemplaire / réservation / prêt / litige / transfert.
 * - Aucun nom, email, téléphone, adresse, code-barres, titre, auteur ou note libre.
 * - Les feedbacks ne contiennent que des catégories abstraites prédéfinies.
 * - Les UID Firebase ne sont utilisés que comme clé technique d'autorisation du poste.
 */
(function(){
'use strict';
if(window.KohaQualityMemory && window.KohaQualityMemory.VERSION>='1.5.0') return;

const VERSION='1.5.1';
const SDK_VERSION='12.18.0';
const CONFIG_KEY_PREFIX='kt_quality_firebase_config_v3_';
const CACHE_PREFIX='kt_quality_rules_cache_v3_';
const SETTINGS_PREFIX='kt_quality_settings_cache_v3_';
const QUEUE_KEY_PREFIX='kt_quality_feedback_queue_v3_';
const MAX_QUEUE=500;
const MAX_FLUSH_PER_CONNECT=50;
const CACHE_TTL_MS=30*60*1000;
const ACCESS_CACHE_TTL_MS=60*60*1000;
const PENDING_ACCESS_CACHE_TTL_MS=5*60*1000;
const ACCESS_CACHE_PREFIX='kt_quality_access_v2_';
const PATTERN_SEEN_PREFIX='kt_quality_pattern_seen_v2_';
const QUALITY_MODULE_ALIASES={authorities:'quality-authorities',reservations:'quality-reservations',loans:'quality-loans',transfers:'quality-transfers',items:'quality-items',biblios:'quality-biblios',serials:'quality-serials',patrons:'quality-patrons',rulelab:'quality-rule-lab','rule-lab':'quality-rule-lab',center:'quality-center'};
function canonicalQualityModule(v){const raw=String(v||'').trim();if(!raw)return 'quality-center';if(/^quality-/.test(raw))return raw;return QUALITY_MODULE_ALIASES[raw]||`quality-${raw}`;}
function currentModuleId(hint){
  if(hint)return canonicalQualityModule(hint);
  const route=window.KohaTools?.getService?.('module-host')?.currentRoute?.()||window.__KohaToolsCurrentModuleId||'';
  return /^quality-/.test(String(route))?String(route):'quality-center';
}
function cleanModuleId(v){return String(v||'quality-center').replace(/[^A-Za-z0-9_.-]+/g,'_').slice(0,120)||'quality-center'}
function currentProject(){return String(state.config?.projectId||'unconfigured')}
function effectiveAppName(cfg,moduleId){
  const compat=cfg?.legacyAuthCompatibility;
  if(compat&&compat.enabled!==false&&String(compat.projectId||'')===String(cfg?.projectId||'')&&String(compat.appName||'').trim())return String(compat.appName).trim();
  return String(cfg?.appName||`KohaToolsQuality_${cleanModuleId(moduleId)}`);
}
function authCompatibilityMode(cfg,moduleId){const effective=effectiveAppName(cfg,moduleId);return effective!==String(cfg?.appName||'')?'legacy-preserved':'independent';}
function ns(){return `${cleanModuleId(state.moduleId||currentModuleId())}__${cleanModuleId(currentProject())}`}
function budget(op,n=1){try{window.KohaTools?.getService?.('firebase-budget')?.record?.(currentProject(),op,n,{kind:'firestore',moduleId:state.moduleId||currentModuleId()})}catch(_){}}
const ALLOWED_DECISIONS=new Set(['anomaly','normal','watch','ignore']);
const INVARIANT_RULES=new Set(['RES-001','RES-002','RES-003','ITEM-002','ITEM-003','ITEM-007','ITEM-023','BIB-003','BIB-013','SER-011','SER-012','PAT-005','PAT-011']);

// Union volontairement limitée des dimensions abstraites autorisées dans Firebase.
const SAFE_CONTEXT_KEYS=new Set([
  'primary_rule','severity','status','state','age_bucket','last_update_bucket','overdue_bucket','last_activity_bucket',
  'renewals_bucket','unseen_renewals_bucket','item_level','expired','suspended','cancellation_requested','pickup_library_id',
  'availability_bucket','patron_expired','has_return_claim','claim_age_bucket','item_lost','item_damaged','item_withdrawn',
  'item_not_for_loan','home_library_id','holding_library_id','from_library_id','to_library_id','route_bucket','reason_code',
  'transfer_age_bucket','field_block','issue_code','authority_type','record_type','item_type_id','collection_code','location',
  'public_code','sub_location','module_state','decision_scope','has_hold','has_transfer','checkout_state','claim_state',
  'activity_bucket','due_state','renewal_state','physical_state','route_from','route_to','waiting_state','processing_state','has_external_pivot',
  'transfer_state','holding_mismatch','last_seen_bucket','last_checkout_bucket','duplicate_state','duplicate_confidence','has_items',
  'format_block','identifier_state','framework_code','ghost_state','link_state','library_id','subscription_closed','subscription_state',
  'expected_state','claims_bucket','serial_status','category_code','expiry_bucket','contact_state','has_checkouts','has_debt','has_guarantees',
  'account_state','url_state','anomaly_group','data_state','periodicity_code','has_orders','has_subscription','has_serials','value_state','field_code',
  'nature','certainty','priority','rule_scope','policy_state','queue_state'
]);
const FORBIDDEN_KEY_RE=/(^|_)(patron|borrower|member|user|reader|name|firstname|surname|email|mail|phone|tel|address|street|card|barcode|title|author|note|comment|biblio|item_id|hold_id|checkout_id|issue_id|claim_id|transfer_id|authid|record_id|subscription_id|serial_id|order_id|suggestion_id|account_line_id|guarantee_id|date_of_birth|dateofbirth|dob)(_|$)/i;
const TOKEN_RE=/^[A-Za-z0-9_.:+-]{0,96}$/;

const state={status:'idle',error:null,uid:null,approved:false,role:'pending',config:null,moduleId:null,app:null,auth:null,db:null,modules:null,listeners:new Set(),lastConnectedAt:null};
function clone(v){return v==null?v:JSON.parse(JSON.stringify(v))}
function safeGet(k){try{return localStorage.getItem(k)}catch(_){return null}}
function safeSet(k,v){try{localStorage.setItem(k,v);return true}catch(_){return false}}
function safeRemove(k){try{localStorage.removeItem(k);return true}catch(_){return false}}
function notify(){const s=getStatus();for(const fn of state.listeners){try{fn(s)}catch(_){}}}
function setState(p){Object.assign(state,p);notify()}
function getStatus(){const moduleId=state.moduleId||currentModuleId(),cfg=state.config;return {version:VERSION,sdkVersion:String(cfg?.sdkVersion||SDK_VERSION),status:state.status,error:state.error?String(state.error.message||state.error):null,uid:state.uid,approved:state.approved,role:state.role,lastConnectedAt:state.lastConnectedAt,configured:!!cfg,moduleId,projectId:cfg?.projectId||null,appName:cfg?effectiveAppName(cfg,moduleId):null,authCompatibility:cfg?authCompatibilityMode(cfg,moduleId):null,privacyMode:'strict'}}
function onStatus(fn){if(typeof fn!=='function')return()=>{};state.listeners.add(fn);try{fn(getStatus())}catch(_){}return()=>state.listeners.delete(fn)}

function normalizeConfig(input,moduleId=currentModuleId()){
  let cfg=input;
  if(typeof cfg==='string'){
    const text=cfg.trim().replace(/^const\s+firebaseConfig\s*=\s*/,'').replace(/;\s*$/,'');
    try{cfg=JSON.parse(text)}catch(_){try{cfg=(new Function(`return (${text})`))()}catch(e){throw new Error('Configuration Firebase invalide.')}}
  }
  if(!cfg||typeof cfg!=='object')throw new Error('Configuration Firebase absente.');
  const helper=window.KohaTools?.getService?.('firebase-module'),cur=helper?.currentInstallation?.()||'',host=helper?.currentHost?.()||'';
  const out={...cfg,kind:'firestore',sdkVersion:String(cfg.sdkVersion||SDK_VERSION),appName:String(cfg.appName||`KohaToolsQuality_${cleanModuleId(moduleId)}`),databaseId:String(cfg.databaseId||'(default)')};
  if(!out.installationId&&cur)out.installationId=cur;
  if(!Array.isArray(out.allowedHosts)&&host)out.allowedHosts=[host];
  const problem=helper?.problem?.(moduleId,out);
  if(problem)throw new Error(problem);
  return out;
}
function configKey(moduleId){return CONFIG_KEY_PREFIX+cleanModuleId(moduleId)}
function saveConfig(input,moduleId=currentModuleId()){const cfg=normalizeConfig(input,moduleId);safeSet(configKey(moduleId),JSON.stringify(cfg));if(state.moduleId===moduleId||!state.moduleId){state.config=cfg;state.moduleId=moduleId;}return clone(cfg)}
function loadConfig(moduleId=currentModuleId()){
  if(state.config&&state.moduleId===moduleId)return clone(state.config);
  const raw=safeGet(configKey(moduleId));
  if(raw){try{const cfg=normalizeConfig(JSON.parse(raw),moduleId);state.config=cfg;state.moduleId=moduleId;return clone(cfg)}catch(_){}}
  const canonical=window.KohaTools?.Config?.getCanonical?.(moduleId)?.firebase;
  const cfg=normalizeConfig(canonical,moduleId);state.config=cfg;state.moduleId=moduleId;return clone(cfg);
}
function clearConfig(moduleId=currentModuleId()){safeRemove(configKey(moduleId));if(state.moduleId===moduleId){state.config=null;setState({status:'idle',approved:false,role:'pending',uid:null,error:null,db:null,auth:null,app:null})}}

async function loadSdk(){if(state.modules)return state.modules;const base=`https://www.gstatic.com/firebasejs/${String(state.config?.sdkVersion||SDK_VERSION)}`;const [app,auth,firestore]=await Promise.all([import(`${base}/firebase-app.js`),import(`${base}/firebase-auth.js`),import(`${base}/firebase-firestore.js`)]);state.modules={app,auth,firestore};return state.modules}
async function connect(moduleHint){
  const moduleId=currentModuleId(moduleHint);
  const previous=state.config?[state.moduleId,state.config.projectId,state.config.appId,state.config.databaseId,state.config.appName].join('|'):'';
  let cfg;
  try{cfg=loadConfig(moduleId)}catch(error){setState({status:'error',approved:false,error,moduleId,config:null});return getStatus()}
  const effectiveName=effectiveAppName(cfg,moduleId),signature=[moduleId,cfg.projectId,cfg.appId,cfg.databaseId,effectiveName].join('|');
  if(previous&&previous!==signature)setState({status:'idle',approved:false,role:'pending',uid:null,error:null,app:null,auth:null,db:null});
  state.config=cfg;state.moduleId=moduleId;
  if(state.approved&&state.db&&state.uid)return getStatus();
  if(state.status==='loading')return getStatus();setState({status:'loading',error:null});
  try{
    const m=await loadSdk();const publicCfg=window.KohaTools?.getService?.('firebase-module')?.publicConfig?.(moduleId,cfg,{throwOnError:true});
    const appName=effectiveName;let app=m.app.getApps().find(x=>x.name===appName);
    if(app){const cur=app.options||{},same=['apiKey','authDomain','projectId','appId'].every(k=>String(cur[k]||'')===String(publicCfg[k]||''));if(!same){try{await m.app.deleteApp(app)}catch(_){}app=null}}
    if(!app)app=m.app.initializeApp(publicCfg,appName);
    const auth=m.auth.getAuth(app);try{await m.auth.setPersistence(auth,m.auth.browserLocalPersistence)}catch(_){}
    let user=auth.currentUser;if(!user){const cred=await m.auth.signInAnonymously(auth);user=cred.user}
    const db=cfg.databaseId&&cfg.databaseId!=='(default)'?m.firestore.getFirestore(app,cfg.databaseId):m.firestore.getFirestore(app);state.app=app;state.auth=auth;state.db=db;state.uid=user.uid;
    const accessRef=m.firestore.doc(db,'quality_access_requests',user.uid);let accessData=null;
    const accessCacheKey=ACCESS_CACHE_PREFIX+cleanModuleId(cfg.projectId)+'__'+user.uid;try{const cached=JSON.parse(safeGet(accessCacheKey)||'null');const ttl=cached?.data?.approved===true?ACCESS_CACHE_TTL_MS:PENDING_ACCESS_CACHE_TTL_MS;if(cached&&Date.now()-Number(cached.at||0)<ttl)accessData=cached.data||null}catch(_){}
    if(!accessData){
      let access;try{access=await m.firestore.getDoc(accessRef);budget('reads',1)}catch(e){throw new Error('Firestore refuse la lecture. Vérifier les règles Qualité Koha de ce module.')}
      if(!access.exists()){await m.firestore.setDoc(accessRef,{approved:false,role:'pending',created_at:m.firestore.serverTimestamp(),client_version:VERSION});budget('writes',1);accessData={approved:false,role:'pending'}}else accessData=access.data()||{};
      safeSet(accessCacheKey,JSON.stringify({at:Date.now(),data:{approved:accessData.approved===true,role:accessData.role||'pending'}}));
    }
    const data=accessData||{},approved=data.approved===true,role=approved&&data.role==='admin'?'admin':(approved?'member':'pending');
    setState({status:approved?'approved':'pending',approved,role,uid:user.uid,error:null,lastConnectedAt:Date.now()});if(approved)await flushFeedbackQueue().catch(()=>{});return getStatus();
  }catch(error){setState({status:'error',approved:false,error});return getStatus()}
}

function requireApproved(){if(!state.db||!state.modules||!state.approved)throw new Error('Mémoire Firebase non approuvée pour ce poste.')}
function requireAdmin(){requireApproved();if(state.role!=='admin')throw new Error('Cette action nécessite le rôle admin.')}
function cleanId(v,f='x'){const s=String(v||f).replace(/[^A-Za-z0-9_.-]+/g,'_').replace(/^_+|_+$/g,'').slice(0,120);return s||f}
function safeToken(v){if(v===null||v===undefined)return null;if(typeof v==='boolean')return v;if(typeof v==='number')return Number.isFinite(v)?v:null;const s=String(v).slice(0,96);return TOKEN_RE.test(s)?s:'blocked'}
function sanitizeContext(context){
  const out={};let n=0;
  for(const [k,v] of Object.entries(context||{})){
    if(n>=24)break;if(!SAFE_CONTEXT_KEYS.has(k)||FORBIDDEN_KEY_RE.test(k))continue;
    if(v&&typeof v==='object')continue;out[k]=safeToken(v);n++;
  }
  return out;
}
function sanitizeSettings(data){const out={};let n=0;for(const [k,v] of Object.entries(data||{})){if(n>=60)break;if(FORBIDDEN_KEY_RE.test(k))continue;if(!/^[A-Za-z0-9_.-]{1,60}$/.test(k))continue;if(typeof v==='boolean')out[k]=v;else if(typeof v==='number'&&Number.isFinite(v))out[k]=v;else if(typeof v==='string'&&v.length<=5000&&!/@|\b\d{10,}\b/.test(v))out[k]=v;n++}return out}
function stableStringify(obj){return Object.keys(obj||{}).sort().map(k=>`${k}=${JSON.stringify(obj[k])}`).join('|')}
function hashText(text){let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0).toString(36)}
function patternKey(context){return hashText(stableStringify(sanitizeContext(context)))}
function dayToken(){return new Date().toISOString().slice(0,10)}
function isInvariantRule(id){return INVARIANT_RULES.has(String(id||'').split('_')[0])}
function privacyCheck(payload){const raw=JSON.stringify(payload||{});const reasons=[];if(/@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/.test(raw))reasons.push('email');if(/\b\d{10,}\b/.test(raw))reasons.push('long_numeric_identifier');for(const k of Object.keys(payload?.context||{}))if(FORBIDDEN_KEY_RE.test(k))reasons.push(`forbidden_key:${k}`);return {ok:reasons.length===0,reasons}}

function cacheRules(mod,rules){safeSet(CACHE_PREFIX+ns()+'__'+cleanId(mod),JSON.stringify({updatedAt:Date.now(),rules}))}
function cachedRulesRecord(mod){const raw=safeGet(CACHE_PREFIX+ns()+'__'+cleanId(mod));if(!raw)return null;try{return JSON.parse(raw)}catch(_){return null}}
function cachedRules(mod){return cachedRulesRecord(mod)?.rules||[]}
async function getRules(module,{force=false}={}){const mod=cleanId(module,'unknown'),cached=cachedRulesRecord(mod);if(!force&&cached&&Date.now()-Number(cached.updatedAt||0)<CACHE_TTL_MS)return cached.rules||[];if(!state.approved){await connect();if(!state.approved)return cachedRules(mod)}try{requireApproved();const m=state.modules.firestore,q=m.query(m.collection(state.db,'quality_rules'),m.where('module','==',mod)),snap=await m.getDocs(q),rules=[];budget('reads',snap.size);snap.forEach(d=>{const x={id:d.id,...d.data()};if(x.enabled!==false)rules.push(x)});rules.sort((a,b)=>String(a.id).localeCompare(String(b.id),'fr'));cacheRules(mod,rules);return rules}catch(e){if(force)throw e;return cachedRules(mod)}}
function cacheSettings(mod,data){safeSet(SETTINGS_PREFIX+ns()+'__'+cleanId(mod),JSON.stringify({updatedAt:Date.now(),data}))}
function cachedSettingsRecord(mod){const raw=safeGet(SETTINGS_PREFIX+ns()+'__'+cleanId(mod));if(!raw)return null;try{return JSON.parse(raw)}catch(_){return null}}
function cachedSettings(mod){return cachedSettingsRecord(mod)?.data||{}}
async function getSettings(module,{force=false}={}){const mod=cleanId(module,'unknown'),cached=cachedSettingsRecord(mod);if(!force&&cached&&Date.now()-Number(cached.updatedAt||0)<CACHE_TTL_MS)return cached.data||{};if(!state.approved){await connect();if(!state.approved)return cachedSettings(mod)}try{requireApproved();const m=state.modules.firestore,snap=await m.getDoc(m.doc(state.db,'quality_settings',mod));budget('reads',1);const data=snap.exists()?snap.data():{};delete data.updated_at;delete data.module;cacheSettings(mod,data);return clone(data)}catch(_){return cachedSettings(mod)}}
async function saveSettings(module,data){requireAdmin();const mod=cleanId(module,'unknown'),m=state.modules.firestore,clean=sanitizeSettings(data);await m.setDoc(m.doc(state.db,'quality_settings',mod),{...clean,module:mod,updated_at:m.serverTimestamp()},{merge:true});budget('writes',1);cacheSettings(mod,{...cachedSettings(mod),...clean});return true}

function queueKey(){return QUEUE_KEY_PREFIX+ns()}
function loadQueue(){const raw=safeGet(queueKey());if(!raw)return [];try{return JSON.parse(raw)||[]}catch(_){return []}}
function saveQueue(q){safeSet(queueKey(),JSON.stringify(q.slice(-MAX_QUEUE)))}
function prepareFeedback(payload){const module=cleanId(payload.module,'unknown'),ruleId=cleanId(payload.ruleId||'pattern','pattern'),decision=ALLOWED_DECISIONS.has(payload.decision)?payload.decision:'watch',context=sanitizeContext(payload.context||{});return {module,ruleId,decision,context,patternKey:patternKey(context)}}
function enqueueFeedback(payload){const q=loadQueue(),clean=prepareFeedback(payload);q.push(clean);saveQueue(q);return q.length}
async function writeFeedback(payload){requireApproved();const m=state.modules.firestore,p=prepareFeedback(payload),id=cleanId(`${p.module}__${p.ruleId}__${p.patternKey}`,'feedback'),day=dayToken();const data={module:p.module,rule_id:p.ruleId,pattern_key:p.patternKey,total:m.increment(1),[`count_${p.decision}`]:m.increment(1),last_seen_at:m.serverTimestamp(),last_decision:p.decision,last_context:p.context,day_tokens:{[day]:true}};await m.setDoc(m.doc(state.db,'quality_feedback',id),data,{merge:true});budget('writes',1);return {id,patternKey:p.patternKey,dayToken:day}}
async function submitFeedback(payload){if(!payload||!payload.module)throw new Error('Module manquant.');if(!ALLOWED_DECISIONS.has(payload.decision))throw new Error('Décision invalide.');const check=privacyCheck(payload);if(!check.ok)throw new Error(`Blocage RGPD : ${check.reasons.join(', ')}`);if(!state.approved){await connect();if(!state.approved){enqueueFeedback(payload);return {queued:true,status:getStatus()}}}try{return await writeFeedback(payload)}catch(error){enqueueFeedback(payload);return {queued:true,error:String(error.message||error)}}}
async function flushFeedbackQueue(){if(!state.approved)return {sent:0,remaining:loadQueue().length};const q=loadQueue(),send=q.slice(0,MAX_FLUSH_PER_CONNECT),keep=q.slice(MAX_FLUSH_PER_CONNECT);let sent=0;for(const item of send){try{await writeFeedback(item);sent++}catch(_){keep.push(item)}}saveQueue(keep);return {sent,remaining:keep.length}}
async function observePattern(payload){if(!payload?.module)throw new Error('Module manquant.');const context=sanitizeContext(payload.context||{});if(!Object.keys(context).length)return {skipped:true,reason:'empty_safe_context'};const module=cleanId(payload.module,'unknown'),pkey=patternKey(context),seenKey=PATTERN_SEEN_PREFIX+ns()+'__'+module+'__'+pkey,day=dayToken();if(safeGet(seenKey)===day)return {skipped:true,reason:'already_observed_today',patternKey:pkey};if(!state.approved){await connect();if(!state.approved)return {skipped:true}}requireApproved();const m=state.modules.firestore,id=cleanId(`${module}__${pkey}`);await m.setDoc(m.doc(state.db,'quality_patterns',id),{module,pattern_key:pkey,occurrences:m.increment(Math.max(1,Number(payload.count)||1)),last_seen_at:m.serverTimestamp(),sample_context:context},{merge:true});budget('writes',1);safeSet(seenKey,day);return {id,patternKey:pkey}}
async function proposeRule(candidate){requireApproved();const m=state.modules.firestore,module=cleanId(candidate.module,'unknown'),code=cleanId(candidate.code||candidate.ruleId||'candidate'),sourceRule=cleanId(candidate.sourceRule||candidate.ruleId||code),id=cleanId(`${module}__${code}`),conditions=sanitizeContext(candidate.conditions||{});if(isInvariantRule(sourceRule))throw new Error('Une règle système invariante ne peut pas être neutralisée ou remplacée par apprentissage.');const docData={module,code,source_rule:sourceRule,level:String(candidate.level||'C').slice(0,8),conditions,proposed_action:cleanId(candidate.proposedAction||'review','review'),sample_count:Math.max(0,Number(candidate.sampleCount)||0),day_count:Math.max(0,Number(candidate.dayCount)||0),status:'candidate',proposed_at:m.serverTimestamp()};await m.setDoc(m.doc(state.db,'quality_rule_candidates',id),docData,{merge:true});budget('writes',1);return id}
async function getCandidates(module){requireApproved();const m=state.modules.firestore,mod=cleanId(module,'unknown'),q=m.query(m.collection(state.db,'quality_rule_candidates'),m.where('module','==',mod),m.limit(500)),snap=await m.getDocs(q),out=[];budget('reads',snap.size);snap.forEach(d=>out.push({id:d.id,...d.data()}));return out}
async function saveRule(rule){requireAdmin();const m=state.modules.firestore,module=cleanId(rule.module,'unknown'),code=cleanId(rule.code||rule.id||`${module}_${Date.now()}`);if(isInvariantRule(rule.sourceRule||code))throw new Error('Promotion refusée : cette règle système est invariante.');const id=cleanId(rule.id||code),data={module,code,source_rule:cleanId(rule.sourceRule||code),enabled:rule.enabled!==false,level:String(rule.level||'B').slice(0,8),severity:cleanId(rule.severity||'review'),conditions:sanitizeContext(rule.conditions||{}),exceptions:sanitizeContext(rule.exceptions||{}),action:cleanId(rule.action||'review'),version:Math.max(1,Number(rule.version)||1),updated_at:m.serverTimestamp()};await m.setDoc(m.doc(state.db,'quality_rules',id),data,{merge:true});budget('writes',1);const historyId=cleanId(`${id}__${Date.now()}`);await m.setDoc(m.doc(state.db,'quality_history',historyId),{...data,rule_id:id,archived_at:m.serverTimestamp()});budget('writes',1);return id}
async function aggregateFeedback(module){requireApproved();const m=state.modules.firestore,mod=cleanId(module,'unknown'),q=m.query(m.collection(state.db,'quality_feedback'),m.where('module','==',mod),m.limit(1000)),snap=await m.getDocs(q),rows=[];budget('reads',snap.size);snap.forEach(d=>{const x={id:d.id,...d.data()};x.day_count=Object.keys(x.day_tokens||{}).length;delete x.day_tokens;rows.push(x)});return rows}

window.KohaQualityMemory={VERSION,SDK_VERSION,getStatus,onStatus,saveConfig,loadConfig,clearConfig,connect,getRules,getSettings,saveSettings,submitFeedback,flushFeedbackQueue,observePattern,proposeRule,getCandidates,saveRule,aggregateFeedback,cachedRules,cachedSettings,patternKey,sanitizeContext,privacyCheck,isInvariantRule,SAFE_CONTEXT_KEYS:[...SAFE_CONTEXT_KEYS]};
// Alias temporaire pour les anciennes intégrations ; aucun module V3.43.1 ne l’utilise.
window.DracQualityMemory=window.KohaQualityMemory;
})();
