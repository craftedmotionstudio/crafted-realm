/* Read-only, opt-in Studio export loading. This verifies byte identity and
 * deterministic arrival data, not visual acceptance or the full GLB semantic gate.
 * Browser order: HolmArrivalPackage and its dependencies before this file.
 * files[path] is an owned Uint8Array; pass its .buffer to GLTFLoader.parse. */
var HolmArrivalExportLoader=(function(){
 'use strict';
 var Package=typeof module!=='undefined'&&module.exports?require('./holm_arrival_package'):HolmArrivalPackage;
 var roles={'holm-overhaul-terrain-source-v1':'terrainSource','holm-overhaul-terrain-bundle-v1':'terrain','holm-overhaul-arrival-layout-v1':'layout','holm-guide-house-collision-envelopes-v1':'envelopes','holm-arrival-dock-study-v1':'dock','holm-arrival-provisions-placement-v1':'provisionsPlacement','crafted-realms-local-prop-v1':'provisionsManifest','holm-arrival-landscape-study-v1':'landscapePlacement','holm-arrival-landscape-measure-v1':'landscapeMeasurement'};
 function need(ok,message){if(!ok)throw Error('[HolmArrivalExportLoader] '+message)}
 function canonical(v){if(v===null||typeof v!=='object')return JSON.stringify(v);if(Array.isArray(v))return '['+v.map(canonical).join(',')+']';return '{'+Object.keys(v).sort().map(function(k){return JSON.stringify(k)+':'+canonical(v[k])}).join(',')+'}'}
 function safe(p){return typeof p==='string'&&/^[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)+$/.test(p)&&p.split('/').every(function(s){return s!=='.'&&s!=='..'&&!s.endsWith('.')&&!/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(s)})}
 function keys(v,expected){return v&&Object.keys(v).sort().join(',')===expected}
 function aborted(signal){if(signal&&signal.aborted){var e=Error('Arrival export load aborted');e.name='AbortError';throw e}}
 async function load(options){
  var o=options||{},signal=o.signal;aborted(signal);
  need(typeof o.exportId==='string'&&/^[0-9a-f]{16}$/.test(o.exportId),'invalid exportId');
  need(typeof o.baseUrl==='string'&&!/[\\%?#]/.test(o.baseUrl),'explicit normalized baseUrl required');
  var locationUrl=typeof location!=='undefined'?location.href:undefined;
  var base=new URL(o.baseUrl,locationUrl);
  need(o.baseUrl===base.href||o.baseUrl===base.pathname,'non-normalized baseUrl');
  need(/^https?:$/.test(base.protocol)&&!base.username&&!base.password,'HTTP workspace URL required');
  if(locationUrl)need(base.origin===new URL(locationUrl).origin,'cross-origin export forbidden');
  var match=base.pathname.match(/^\/\.studio-workspaces\/([a-z0-9][a-z0-9-]*)\/exports\/$/);
  need(match,'baseUrl must name a workspace exports directory');
  var fetcher=o.fetch||(typeof fetch==='function'?fetch.bind(globalThis):null),subtle=o.subtle||(typeof crypto!=='undefined'?crypto.subtle:null);
  need(typeof fetcher==='function'&&subtle&&typeof subtle.digest==='function','fetch and SHA256 subtle required');
  var root=base.href+o.exportId+'/',decoder=new TextDecoder('utf-8',{fatal:true});
  async function digest(bytes){var h=new Uint8Array(await subtle.digest('SHA-256',bytes));aborted(signal);return Array.from(h).map(function(n){return n.toString(16).padStart(2,'0')}).join('')}
  async function read(relative){
   aborted(signal);var url=root+relative,response=await fetcher(url,{cache:'no-store',redirect:'error',credentials:'same-origin',signal:signal});aborted(signal);
   need(response&&response.ok,'fetch failed '+relative);
   need(!response.redirected&&(!response.url||response.url===url),'redirected export response');
   var bytes=new Uint8Array(await response.arrayBuffer());aborted(signal);return bytes;
  }
  var manifest=JSON.parse(decoder.decode(await read('manifest.json')));
  need(keys(manifest,'exportId,files,schema,version,workspaceId')&&manifest.schema==='crafted-realm-studio-export-v1'&&manifest.version===1&&manifest.workspaceId===match[1]&&manifest.exportId===o.exportId,'manifest identity mismatch');
  need(Array.isArray(manifest.files)&&([10,14].indexOf(manifest.files.length)>=0||manifest.files.length>=25),'self-contained ten-file, fourteen-file or scenery (25+ file) export required; no live fallback');
  var rows=Object.create(null),folded=new Set();
  manifest.files.forEach(function(r){
   need(keys(r,'baseHash,bytes,hash,path')&&safe(r.path),'unsafe manifest file path or shape');
   need(!folded.has(r.path.toLowerCase()),'duplicate/case-aliased manifest path');folded.add(r.path.toLowerCase());
   need(/^[0-9a-f]{64}$/.test(r.hash)&&(r.baseHash===null||/^[0-9a-f]{64}$/.test(r.baseHash))&&Number.isSafeInteger(r.bytes)&&r.bytes>0,'invalid file hash/byte declaration');rows[r.path]=r;
  });
  var identity={schema:manifest.schema,version:manifest.version,workspaceId:manifest.workspaceId,files:manifest.files};
  need((await digest(new TextEncoder().encode(canonical(identity)))).slice(0,16)===o.exportId,'manifest export hash mismatch');
  var files=Object.create(null),documents=Object.create(null),sourceRoles=Object.create(null),pkg=null,packagePath=null;
  // Sequential reads bound memory/network pressure and stop immediately on failure.
  for(var row of manifest.files){
   var bytes=await read('files/'+row.path);
   need(bytes.byteLength===row.bytes,'byte length mismatch '+row.path);
   need(await digest(bytes)===row.hash,'SHA256 mismatch '+row.path);files[row.path]=bytes;
   if(row.path.endsWith('.json')){
    var doc=JSON.parse(decoder.decode(bytes));
    if(doc.schema==='crafted-realm-holm-arrival-package-v1'){need(!pkg,'duplicate arrival package');pkg=doc;packagePath=row.path}
    else {var role=roles[doc.schema];need(role&&!documents[role],'unknown/duplicate source schema '+row.path);documents[role]=doc;sourceRoles[role]={path:row.path,sha256:row.hash}}
   }else need(/\.(glb|blend)$/.test(row.path),'unexpected export file type');
  }
  var scenic=manifest.files.length>=25,extended=manifest.files.length>=14;
  need(pkg&&pkg.version===1&&Array.isArray(pkg.sources)&&pkg.sources.length===(scenic?manifest.files.length-1:extended?13:9),'package dependencies must match complete export');
  var seen=new Set();
  pkg.sources.forEach(function(s){need(keys(s,'path,sha256')&&safe(s.path)&&s.path!==packagePath&&!seen.has(s.path.toLowerCase()),'invalid package source path');seen.add(s.path.toLowerCase());need(rows[s.path]&&rows[s.path].hash===s.sha256,'package source hash mismatch '+s.path)});
  need(Object.keys(documents).length===(scenic?9:extended?7:5),'source roles must match export');
  need(Array.isArray(pkg.objects)&&(scenic?pkg.objects.length>=20:pkg.objects.length===(extended?3:2)),'arrival assets must match export');
  var uniqueAssets={};pkg.objects.forEach(function(obj){need(obj&&obj.asset,'missing object asset');var a=obj.asset;need(!uniqueAssets[a.id]||canonical(uniqueAssets[a.id])===canonical(a),'conflicting shared asset');uniqueAssets[a.id]=a});
  var input={provider:pkg.provider,sources:sourceRoles,assets:Object.keys(uniqueAssets).map(function(k){return uniqueAssets[k]})};
  Object.keys(documents).forEach(function(role){input[role]=documents[role]});
  var rebuilt=Package.compile(input);aborted(signal);
  need(canonical(rebuilt)===canonical(pkg),'compiled arrival package differs from source reconstruction');
  if(extended){
   var Provisions=typeof module!=='undefined'&&module.exports?require('./holm_arrival_provisions'):HolmArrivalProvisions;
   var augmented=Provisions.compile({layout:documents.layout,envelopes:documents.envelopes,terrain:documents.terrain,dock:documents.dock,placement:documents.provisionsPlacement,manifest:documents.provisionsManifest});
   documents.layout=augmented.layout;documents.envelopes=augmented.envelopes;
  }
  if(scenic){
   var Scenery=typeof module!=='undefined'&&module.exports?require('./holm_arrival_scenery'):HolmArrivalScenery;
   documents.envelopes=Scenery.compile({layout:documents.layout,envelopes:documents.envelopes,terrain:documents.terrain,placement:documents.landscapePlacement,measurement:documents.landscapeMeasurement}).envelopes;
  }
  return {package:pkg,documents:documents,files:files};
 }
 return {load:load};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HolmArrivalExportLoader;
