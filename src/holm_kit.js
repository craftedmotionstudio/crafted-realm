/* Crafted Realm character kit (owner direction 2026-09-25: "very close to 2004scape ... customize our characters just
 * like you can do in 2004scape"). One Blender rig carrying every part of the modular identity kit
 * (assets/models/holm_kit_v2.glb, built by tools/blender/build_holm_characters_v2.py), in 2004's structure (from the MIT
 * 2004scape server's design validation) with our own parts and colours:
 *   slots Hair, Jaw, Torso, Arms, Hands, Legs, Feet (body type B has no Jaw);
 *   colour channels hair, torso, legs, feet, skin (materials C_HAIR, C_TORSO, C_LEGS, C_FEET, C_SKIN).
 * A kit look is {body:'A'|'B', parts:{Hair:1,...}, colors:{hair:0,...}} (part indices 1-based as named
 * Kit_<body>_<Slot>_<nn>; colour = index into that channel's palette). apply(rig, look) shows exactly one part per slot
 * and paints the channels. Catalog: assets/models/holm_kit_v2_catalog.json; palettes: holm_kit_v2_palettes.json. */
var HolmKit=(function(){
 'use strict';
 var SLOTS=['Hair','Jaw','Torso','Arms','Hands','Legs','Feet'],CHANNELS=['hair','torso','legs','feet','skin'];
 var MAT={hair:'C_HAIR',torso:'C_TORSO',legs:'C_LEGS',feet:'C_FEET',skin:'C_SKIN'};
 var st={catalog:null,palettes:null,loading:null};
 function load(){if(st.loading)return st.loading;
  st.loading=Promise.all(['assets/models/holm_kit_v2_catalog.json','assets/models/holm_kit_v2_palettes.json'].map(function(u){return fetch(u,{cache:'no-cache'}).then(function(r){if(!r.ok)throw new Error(u+' '+r.status);return r.json()})}))
   .then(function(a){st.catalog=a[0];st.palettes=a[1];return true});return st.loading}
 function ready(){return !!(st.catalog&&st.palettes)}
 function options(body,slot){return (st.catalog&&st.catalog.bodies[body]&&st.catalog.bodies[body][slot])||[]}
 function palette(ch){return (st.palettes&&st.palettes.channels[ch]&&st.palettes.channels[ch].colors)||[]}
 function hasSlot(body,slot){return options(body,slot).length>0}
 // the default look of a body type: the kit's default outfit and default colours (nearest palette entries)
 function defaults(body){body=body==='B'?'B':'A';var parts={},colors={},def=st.palettes&&st.palettes.defaults&&st.palettes.defaults[body]||{};
  SLOTS.forEach(function(s){if(hasSlot(body,s))parts[s]=1});
  CHANNELS.forEach(function(c){var p=palette(c),i=p.indexOf(def[c]);colors[c]=i>=0?i:0});return {body:body,parts:parts,colors:colors}}
 function normalize(look){var d=defaults(look&&look.body);if(!look)return d;var out={body:d.body,parts:{},colors:{}};
  SLOTS.forEach(function(s){if(!hasSlot(out.body,s))return;var n=options(out.body,s).length,v=look.parts&&Number(look.parts[s]);out.parts[s]=v>=1&&v<=n?v:d.parts[s]});
  CHANNELS.forEach(function(c){var n=palette(c).length,v=look.colors&&Number(look.colors[c]);out.colors[c]=v>=0&&v<n?v:d.colors[c]});return out}
 function partName(body,slot,idx){return 'Kit_'+body+'_'+slot+'_'+(idx<10?'0':'')+idx}
 // show exactly the chosen part per slot (a glTF ships every part visible) and paint the five channels
 function apply(rig,look){if(!rig||!ready())return false;look=normalize(look);var want={};
  SLOTS.forEach(function(s){if(look.parts[s])want[partName(look.body,s,look.parts[s])]=true});
  rig.traverse(function(o){var n=o.name||'';var m=/^(Kit_[AB]_[A-Za-z]+_\d+)/.exec(n);if(!m)return;
   var own=(o.parent&&/^Kit_[AB]_[A-Za-z]+_\d+/.test(o.parent.name||''))?null:m[1];if(own)o.visible=!!want[own]});
  var done={};rig.traverse(function(o){if(!(o.isMesh||o.isSkinnedMesh))return;[].concat(o.material).forEach(function(q){if(!q||!q.name||done[q.uuid])return;
   CHANNELS.forEach(function(c){if(q.name.replace(/[._]\d+$/,'')===MAT[c]){var hex=palette(c)[look.colors[c]];if(hex){q.color.set(hex);q.needsUpdate=true;done[q.uuid]=true}}})})});
  return look}
 function label(body,slot,idx){var o=options(body,slot).filter(function(x){return x.index===idx})[0];return o?o.label:(slot+' '+idx)}
 return {load:load,ready:ready,SLOTS:SLOTS,CHANNELS:CHANNELS,options:options,palette:palette,hasSlot:hasSlot,defaults:defaults,normalize:normalize,apply:apply,label:label,partName:partName};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HolmKit;
