import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
const version=process.argv[2]||'';const out=process.argv[3]||'/tmp/release-impact.json';
const run=(...args)=>spawnSync('git',args,{encoding:'utf8',maxBuffer:20*1024*1024});
const tags=run('tag','--sort=-v:refname').stdout.split(/\r?\n/).filter(Boolean).filter(t=>/^v?\d+\.\d+\.\d+$/.test(t)).filter(t=>t!==`v${version}`&&t!==version);
const previous=tags[0]||'';
const currentDefaults=JSON.parse(fs.readFileSync('FULL-DIST/kohatools/config/product-defaults.json','utf8'));
let oldDefaults={canonicalModules:{}};if(previous){const r=run('show',`${previous}:FULL-DIST/kohatools/config/product-defaults.json`);if(r.status===0)try{oldDefaults=JSON.parse(r.stdout)}catch{}}
const stable=v=>Array.isArray(v)?'['+v.map(stable).join(',')+']':v&&typeof v==='object'?'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+stable(v[k])).join(',')+'}':JSON.stringify(v);
const now=currentDefaults.canonicalModules||{},old=oldDefaults.canonicalModules||{};const ids=new Set([...Object.keys(now),...Object.keys(old)]);const configChangedModules=[...ids].filter(id=>stable(now[id]??null)!==stable(old[id]??null));
let changedFiles=[];if(previous){const r=run('diff','--name-only',previous,'HEAD','--','FULL-DIST/kohatools');if(r.status===0)changedFiles=r.stdout.split(/\r?\n/).filter(Boolean)}
const rel=p=>`FULL-DIST/kohatools/${String(p||'').replace(/^\/+/, '')}`;const changedSet=new Set(changedFiles);
// Do not flag a métier module as functionally changed for release-only cache/auth metadata.
// The complete changedFiles list still records those byte changes for traceability.
const normalizeReleaseNoise=s=>String(s||'')
 .replace(/([?&]ktv=)\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?/g,'$1<SUITE>')
 .replace(/(clientVersion\s*:\s*['"])\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?(['"])/g,'$1<SUITE>$2');
const materiallyChanged=path=>{
 if(!changedSet.has(path))return false;
 if(!previous)return true;
 const old=run('show',`${previous}:${path}`);
 if(old.status!==0)return true;
 let current='';try{current=fs.readFileSync(path,'utf8')}catch{return true}
 return normalizeReleaseNoise(old.stdout)!==normalizeReleaseNoise(current);
};
const currentManifest=JSON.parse(fs.readFileSync('FULL-DIST/kohatools/config/manifest.json','utf8'));const sourceChanged=new Set();
for(const m of currentManifest.modules||[]){const cid=currentDefaults.modules?.[m.id]?.config?.canonicalModule;if(cid&&m.nextModule&&materiallyChanged(rel(m.nextModule)))sourceChanged.add(cid)}
for(const [cid,cfg] of Object.entries(now)){const src=cfg?.application?.source;if(src&&materiallyChanged(rel(src)))sourceChanged.add(cid);for(const pr of cfg?.prerequisites||[]){for(const k of ['copySource','rulesSource','indexSource','workerSource'])if(pr?.[k]&&materiallyChanged(rel(pr[k])))sourceChanged.add(cid)}}
const canonicalModules=[...new Set([...configChangedModules,...sourceChanged])].sort();
const coreFiles=changedFiles.filter(x=>x.includes('/core/')||x.endsWith('/loader.js')||x.endsWith('/bootstrap.js')||x.includes('/admin/'));
const prerequisites=changedFiles.filter(x=>x.includes('/prerequisites/'));
const impact={schema:'pimp-my-koha.release-impact.v1',version,previousVersion:previous.replace(/^v/,''),canonicalModules,configChangedModules:configChangedModules.sort(),sourceChangedModules:[...sourceChanged].sort(),coreFiles,prerequisites,configChanged:changedFiles.some(x=>x.includes('/config/')),changedFiles};
fs.writeFileSync(out,JSON.stringify(impact,null,2)+'\n');console.log(JSON.stringify(impact,null,2));
