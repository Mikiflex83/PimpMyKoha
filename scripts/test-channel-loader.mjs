import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source=fs.readFileSync('install/channel-loader.js','utf8');
const index={
  schema:'pimp-my-koha.release-index.v1',
  channels:{stable:'3.43.2',canary:'3.44.0-canary.1',dev:'3.44.0-dev.1'},
  releases:{
    '3.43.2':{version:'3.43.2',runtimeRoot:'https://example.test/releases/3.43.2/'},
    '3.44.0-canary.1':{version:'3.44.0-canary.1',runtimeRoot:'https://example.test/releases/3.44.0-canary.1/'},
    '3.44.0-dev.1':{version:'3.44.0-dev.1',runtimeRoot:'https://example.test/releases/3.44.0-dev.1/'}
  }
};

async function run({username,channel,adminUsers=[],developerUsers=[],published=index}){
  const loaded=[];
  const userNode={dataset:{loggedinusername:username},getAttribute:k=>k==='data-loggedinusername'?username:null,textContent:username};
  const document={
    readyState:'complete',documentElement:{dataset:{}},
    querySelector:()=>userNode,
    createElement:()=>({async:true,onload:null,onerror:null,src:''}),
    head:{appendChild(el){loaded.push(el.src);queueMicrotask(()=>el.onload?.())}},
    addEventListener(){}
  };
  const context={console,URL,queueMicrotask,setTimeout,clearTimeout,document,location:{href:'https://koha.test/cgi-bin/koha/mainpage.pl'},fetch:async()=>({ok:true,json:async()=>published}),PimpMyKohaChannelBootstrap:{manifestUrl:'https://example.test/latest.json',channel,stableVersion:'3.43.2',installationId:'sandbox',adminUsers,developerUsers}};
  context.window=context;
  vm.runInNewContext(source,context,{filename:'channel-loader.js'});
  await new Promise(r=>setTimeout(r,5));
  return {resolution:context.__PimpMyKohaChannelResolution,bootstrap:context.KohaToolsBootstrap,loaded,error:document.documentElement.dataset.pimpMyKohaChannelError};
}

let r=await run({username:'alice',channel:'dev',developerUsers:['alice']});
assert.equal(r.resolution.selected,'dev');
assert.equal(r.resolution.version,'3.44.0-dev.1');
assert.equal(r.bootstrap.distributionChannel,'dev');
assert.match(r.loaded[0],/3\.44\.0-dev\.1\/bootstrap\.js$/);

r=await run({username:'bob',channel:'dev',developerUsers:['alice']});
assert.equal(r.resolution.selected,'stable');
assert.equal(r.resolution.reason,'unauthorized');
assert.equal(r.resolution.version,'3.43.2');

r=await run({username:'admin',channel:'canary',adminUsers:['admin']});
assert.equal(r.resolution.selected,'canary');
assert.equal(r.resolution.version,'3.44.0-canary.1');

const noDev=structuredClone(index);delete noDev.channels.dev;delete noDev.releases['3.44.0-dev.1'];
r=await run({username:'alice',channel:'dev',developerUsers:['alice'],published:noDev});
assert.equal(r.resolution.selected,'stable');
assert.equal(r.resolution.reason,'channel-unpublished');

console.log('PASS channel-loader: dev autorisé, fallback non autorisé, canary admin, fallback canal non publié');
