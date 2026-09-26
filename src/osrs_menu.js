/* ============ OsrsMenu: the one old-school right-click menu (owner 2026-09-26) ============
 * "The right click functionality doesn't really work like OSRS." This is the single menu model every menu in the
 * game goes through: the world under the cursor (src/osrs_menu_world.js), the pack, worn equipment, the bank and
 * shops (src/osrs_menu_items.js). Our own implementation of the 2004 behaviour; no Jagex code, text or art.
 *
 *  - Providers contribute entries for an ENTITY (anything with a userData.kind under the cursor, or an item slot):
 *      {option, target, targetType:'npc'|'player'|'object'|'item'|'ground', level?, item?, fn, priority, examine?}
 *    `item` makes a use row: "Use <item> -> <target>". API: docs/rebuild/MENU_PROVIDERS.md.
 *  - Order (2004): every entity in the order the cursor meets them (top entity first; inside one entity the primary
 *    option first, then by priority), then ground rows (tile markers), then "Walk here", then one Examine per entity
 *    in the same entity order, then "Cancel" last. Left-click always runs exactly the top entry.
 *  - Colours: option verb white, NPC names yellow, object names cyan, item names orange, player names white; an
 *    attackable NPC or player carries "(level-N)" coloured by the level difference (green lower, yellow equal, red
 *    higher), as the old client did.
 *  - Look and behaviour: a "Choose Option" box whose top edge sits at the cursor, centred on it horizontally and
 *    clamped to the screen; the hovered row lights up; it closes when the mouse strays ~10 px outside it, on Escape,
 *    or on any click outside it; no animation.
 * The model half (sort, colours, text) is pure and runs in node (tools/test_osrs_menu.js). */
var OsrsMenu=(function(){
 'use strict';
 var COLOUR={verb:'#ffffff',npc:'#ffff00',object:'#00ffff',item:'#ff9040',player:'#ffffff',ground:'#ffffff',none:'#ffffff'};
 var BAND={entity:0,ground:1,walk:2,below:3,examine:4,cancel:5};
 var providers=[],hooks=[],seq=0;

 function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
 function plain(html){return String(html==null?'':html).replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/\s+/g,' ').trim()}
 // the old client's combat-level colour: mine against theirs (green: they are lower, red: they are higher)
 function levelColour(mine,theirs){
  var k=(+mine||0)-(+theirs||0);
  if(k<-9)return '#ff0000';if(k<-6)return '#ff3000';if(k<-3)return '#ff7000';if(k<0)return '#ffb000';
  if(k>9)return '#00ff00';if(k>6)return '#40ff00';if(k>3)return '#80ff00';if(k>0)return '#c0ff00';
  return '#ffff00';
 }
 function typeColour(t){return COLOUR[t]||COLOUR.object}
 function playerLevel(){try{return typeof Player!=='undefined'&&Player.combatLevel?Player.combatLevel():3}catch(e){return 3}}

 /* ---------------- providers ----------------
  * registerProvider({id, order?, kinds?:['npc',...]|'*', entries(entity, ctx) -> [entry], describe?(entity) -> {name,type,level,examine}})
  * registerGround({id, order?, entries(ctx) -> [entry]})   rows that belong to the tile itself (above Walk here)
  * registerHook(fn(entries, ctx) -> entries|void)          reorders after sorting (menu-entry swaps) */
 function byOrder(a,b){return (a.order||0)-(b.order||0)}
 function registerProvider(p){
  if(!p||!p.id||(typeof p.entries!=='function'&&typeof p.describe!=='function'))throw new Error('[OsrsMenu] a provider needs an id and entries() or describe()');
  unregister(p.id);p.kinds=p.kinds===undefined?'*':p.kinds;providers.push(p);providers.sort(byOrder);return p;
 }
 function registerGround(p){if(!p||!p.id||typeof p.entries!=='function')throw new Error('[OsrsMenu] a ground provider needs an id and entries()');p.ground=true;return registerProvider(p)}
 function unregister(id){for(var i=providers.length-1;i>=0;i--)if(providers[i].id===id)providers.splice(i,1)}
 function registerHook(fn){if(typeof fn==='function')hooks.push(fn)}
 function wants(p,entity){if(p.ground)return false;var k=p.kinds;if(k==='*'||!k)return true;return (Array.isArray(k)?k:[k]).indexOf(entity.kind)>=0}

 // an entity's identity (name, colour type, level, examine text): the first provider whose describe() answers
 function describe(entity,ctx){
  if(entity._desc)return entity._desc;
  var d=null;
  for(var i=0;i<providers.length&&!d;i++){var p=providers[i];if(!p.describe||!wants(p,entity))continue;try{d=p.describe(entity,ctx)||null}catch(e){console.error('[OsrsMenu] describe '+p.id,e)}}
  d=d||{};if(!d.name)d.name=entity.name||'';if(!d.type)d.type=entity.type||'object';
  entity._desc=d;return d;
 }

 function band(en){
  if(en.band&&BAND[en.band]!==undefined)return en.band;
  if(en.option==='Cancel')return 'cancel';
  if(en.option==='Walk here')return 'walk';
  if(en.examine||en.option==='Examine')return 'examine';
  if(en.below)return 'below';
  return 'entity';
 }
 function normalise(en,entityIndex){
  var o={};for(var k in en)o[k]=en[k];
  o.option=String(o.option||'');o.target=o.target==null?'':String(o.target);o.targetType=o.targetType||(o.target?'object':'none');
  o.priority=+o.priority||0;o.band=band(o);o.entityIndex=entityIndex===undefined?1e6:entityIndex;o.seq=seq++;
  return o;
 }
 // 2004 order: entities (top first; primary first inside each), tile rows, Walk here, below-walk rows, Examines, Cancel
 function sort(entries){
  return entries.slice().sort(function(a,b){
   var ba=BAND[a.band],bb=BAND[b.band];if(ba!==bb)return ba-bb;
   if(a.band==='entity'||a.band==='examine'||a.band==='below'){if(a.entityIndex!==b.entityIndex)return a.entityIndex-b.entityIndex}
   if(a.priority!==b.priority)return b.priority-a.priority;
   return a.seq-b.seq;
  });
 }
 // one row per option per entity (the first-registered wins); one Walk here and one Cancel
 function dedupe(entries){
  var seen={},out=[];
  entries.forEach(function(en){
   var key=en.band==='walk'||en.band==='cancel'?en.band:(en.entityIndex+'|'+en.option.toLowerCase()+'|'+(en.item||'')+'|'+en.target.toLowerCase());
   if(seen[key])return;seen[key]=true;out.push(en);
  });
  return out;
 }
 /* build(entities, ctx): the full sorted menu for these entities (topmost first).
  *   ctx.walk: fn for "Walk here" (null leaves the row out); ctx.cancel: fn for Cancel; ctx.use: item id in use-mode;
  *   ctx.useEntries(entity, desc) -> [entry] replaces an entity's rows in use-mode; ctx.noExamine: leave Examines out */
 function build(entities,ctx){
  ctx=ctx||{};entities=entities||[];var raw=[];
  entities.forEach(function(entity,i){
   var desc=describe(entity,ctx),got=[];
   if(ctx.use){
    if(typeof ctx.useEntries==='function'){try{got=ctx.useEntries(entity,desc)||[]}catch(e){console.error('[OsrsMenu] use rows',e)}}
   } else {
    providers.forEach(function(p){if(!p.entries||!wants(p,entity))return;
     try{var r=p.entries(entity,ctx,desc);if(r&&r.length)r.forEach(function(en){if(en)got.push(en)})}catch(e){console.error('[OsrsMenu] provider '+p.id,e)}});
    // every entity can be examined: the provider's own Examine, else the entity's examine text
    var hasExamine=got.some(function(en){return en.examine||en.option==='Examine'});
    if(!hasExamine&&desc.examine!==false&&!ctx.noExamine){
     var txt=desc.examine;
     // examine: a line of text, or a function that prints its own line (returning a string prints that instead)
     got.push({option:'Examine',target:desc.name,targetType:desc.type,examine:true,fn:function(){if(typeof txt!=='function'){examineChat(txt,desc.name);return}var r=txt();if(typeof r==='string')examineChat(r,desc.name)}});
    }
   }
   got.forEach(function(en){
    if(en.target===undefined){en.target=desc.name;if(!en.targetType)en.targetType=desc.type}
    // an NPC or player with a combat level carries "(level-N)" on every one of its rows, as in the old client
    if(en.level===undefined&&desc.level!==undefined&&en.target===desc.name)en.level=desc.level;
    if(ctx.noExamine&&(en.examine||en.option==='Examine'))return;
    raw.push(normalise(en,i));
   });
  });
  if(!ctx.use)providers.forEach(function(p){if(!p.ground)return;
   try{var r=p.entries(ctx);if(r&&r.length)r.forEach(function(en){if(en){var n=normalise(en,1e5);if(n.band==='entity')n.band='ground';raw.push(n)}})}catch(e){console.error('[OsrsMenu] ground '+p.id,e)}});
  if(ctx.walk!==null&&ctx.walk!==undefined)raw.push(normalise({option:'Walk here',fn:ctx.walk}));
  raw.push(normalise({option:'Cancel',fn:ctx.cancel||null}));
  var out=dedupe(sort(raw));
  hooks.forEach(function(h){try{var r=h(out,ctx,entities);if(Array.isArray(r))out=r}catch(e){console.error('[OsrsMenu] hook',e)}});
  return out;
 }
 function examineChat(txt,name){
  var t=txt||(name?('It\'s '+(/^[aeiou]/i.test(name)?'an ':'a ')+String(name).toLowerCase()+'.'):'Nothing interesting happens.');
  if(typeof UI!=='undefined'&&UI.chat)UI.chat(t,'plain');return t;
 }

 /* ---------------- text ---------------- */
 function span(text,colour,cls){return '<span class="'+cls+'" style="color:'+colour+'">'+esc(text)+'</span>'}
 function levelHtml(en){if(en.level===undefined||en.level===null||en.level==='')return '';var c=levelColour(playerLevel(),en.level);return ' '+span('(level-'+en.level+')',c,'om-lv')}
 // "Talk-to Guide Bram", "Attack Grubkin (level-1)", "Use Tinderbox -> Logs"
 function rowHtml(en){
  if(en.html&&!en.option)return en.html;   // a legacy {html, fn} row (Ctx.show callers)
  var h=span(en.option,COLOUR.verb,'om-v');
  if(en.item)h+=' '+span(en.item,COLOUR.item,'om-i')+' '+span('->',COLOUR.verb,'om-v');
  if(en.target)h+=' '+span(en.target,typeColour(en.targetType),'om-t om-'+(en.targetType||'object'))+levelHtml(en);
  return h;
 }
 function rowText(en){if(en.html&&!en.option)return plain(en.html);return plain(rowHtml(en))}
 // the top-left line: what a left click will do, and how many other options the right-click menu holds
 function moreCount(entries){return Math.max(0,(entries?entries.length:0)-2)}
 function hoverHtml(entries){
  if(!entries||!entries.length)return '';var top=entries[0];if(top.option==='Cancel')return '';
  var n=moreCount(entries);return rowHtml(top)+(n>0?'<span class="more" style="color:#fff"> / '+n+' more option'+(n>1?'s':'')+'</span>':'');
 }
 function hoverText(entries){return plain(hoverHtml(entries))}

 /* ---------------- the menu box (DOM) ---------------- */
 var view={open:false,entries:[],rect:null,swallowUntil:0,opened:0};
 function el(){return typeof document!=='undefined'?document.getElementById('ctx-menu'):null}
 function rowsEl(){return typeof document!=='undefined'?document.getElementById('ctx-rows'):null}
 // the last row run (by a menu pick or a left click): QA reads it (tools/qa_osrs_menu.js)
 var last=null;
 function record(en,via){last={text:rowText(en),option:en.option,target:en.target,via:via,at:Date.now()};return last}
 function run(en){
  hide();if(!en)return;record(en,'menu');
  try{if(typeof Sfx!=='undefined'&&Sfx.click&&en.option!=='Cancel')Sfx.click()}catch(e){}
  if(typeof en.fn==='function'){try{en.fn()}catch(e){console.error('[OsrsMenu] '+rowText(en),e)}}
 }
 // entries: model entries (or legacy {html, fn}); x/y: the cursor in client pixels
 function show(x,y,entries,opts){
  var m=el(),rows=rowsEl();if(!m||!rows)return false;opts=opts||{};
  rows.innerHTML='';m.classList.add('osrs-menu');
  entries.forEach(function(en,i){
   var r=document.createElement('div');r.className='ctx-row';r.innerHTML=rowHtml(en);r.setAttribute('data-row',i);
   r.addEventListener('mouseenter',function(){Array.prototype.forEach.call(rows.children,function(c){c.classList.toggle('om-hot',c===r)})});
   r.addEventListener('click',function(ev){if(ev){ev.stopPropagation();ev.preventDefault()}run(en)});
   rows.appendChild(r);
  });
  m.style.display='block';m.style.left='0px';m.style.top='0px';
  var w=m.offsetWidth,h=m.offsetHeight,W=typeof innerWidth!=='undefined'?innerWidth:1024,H=typeof innerHeight!=='undefined'?innerHeight:768;
  var left=Math.round(x-w/2),top=Math.round(y);
  left=Math.max(0,Math.min(left,W-w));top=Math.max(0,Math.min(top,H-h));
  m.style.left=left+'px';m.style.top=top+'px';
  view.open=true;view.entries=entries;view.rect={x:left,y:top,w:w,h:h};view.at={x:x,y:y};view.opened=Date.now();view.source=opts.source||'world';
  return true;
 }
 function hide(){var m=el();if(m){m.style.display='none';var rows=rowsEl();if(rows)Array.prototype.forEach.call(rows.children,function(c){c.classList.remove('om-hot')})}view.open=false;view.entries=[];view.rect=null}
 function isOpen(){return view.open}
 // ~10 px of slack round the box, as the old client allowed (a box pushed back inside the screen also keeps the
 // spot it was opened from, so the first nudge of the mouse does not close it)
 function strayed(x,y){var r=view.rect;if(!r)return true;var a=view.at||{x:r.x,y:r.y};
  var x0=Math.min(r.x,a.x),x1=Math.max(r.x+r.w,a.x),y0=Math.min(r.y,a.y),y1=Math.max(r.y+r.h,a.y);
  return x<x0-10||x>x1+10||y<y0-10||y>y1+10}
 function inside(target){var m=el();return !!(m&&target&&m.contains&&m.contains(target))}

 /* ---------------- use-mode: an item picked with "Use" waits for its target ----------------
  * Player.usingItem stays the one source of truth (the fishing, baking and kitchen handlers read it). */
 function using(){try{return typeof Player!=='undefined'&&Player.usingItem?Player.usingItem:null}catch(e){return null}}
 function itemName(id){try{return (typeof ITEMS!=='undefined'&&ITEMS[id]&&ITEMS[id].name)||id}catch(e){return id}}
 function startUse(id,slot){
  if(typeof Player==='undefined')return false;Player.usingItem=id;view.useSlot=slot===undefined?-1:slot;
  try{if(typeof UI!=='undefined'&&UI.refreshInv)UI.refreshInv()}catch(e){}
  return true;
 }
 function endUse(){
  if(typeof Player==='undefined'||!Player.usingItem)return false;Player.usingItem=null;view.useSlot=-1;
  try{if(typeof UI!=='undefined'&&UI.refreshInv)UI.refreshInv()}catch(e){}
  try{if(typeof UI!=='undefined'&&UI.action)UI.action(null)}catch(e){}
  return true;
 }

 /* ---------------- global behaviour: stray, Escape, click outside ---------------- */
 if(typeof document!=='undefined'&&typeof addEventListener==='function'){
  addEventListener('mousemove',function(e){if(view.open&&strayed(e.clientX,e.clientY))hide()},true);
  addEventListener('keydown',function(e){
   if(e.key!=='Escape')return;
   if(view.open){hide();e.stopImmediatePropagation();e.preventDefault();return}   // Escape closes the menu only (not the bank or shop under it)
   // an open window or chat box takes the Escape first (the game closes it); otherwise Escape puts the item in use away
   if(using()&&!windowOpen())endUse();
  },true);
  // a press outside the open menu only closes it: the same click never also walks or acts
  addEventListener('mousedown',function(e){
   if(!view.open||inside(e.target))return;
   hide();view.swallowUntil=Date.now()+400;
   if(e.button===0){e.stopPropagation();e.preventDefault()}
  },true);
  addEventListener('contextmenu',function(e){if(inside(e.target))e.preventDefault()},true);
 }
 function windowOpen(){
  if(typeof document==='undefined')return false;
  return Array.prototype.some.call(document.querySelectorAll('.modal'),function(m){return m.style.display&&m.style.display!=='none'&&m.offsetParent!==null});
 }
 function swallowing(){return Date.now()<view.swallowUntil}
 function swallowed(){view.swallowUntil=0}

 return {COLOUR:COLOUR,BAND:BAND,esc:esc,plain:plain,levelColour:levelColour,typeColour:typeColour,
  registerProvider:registerProvider,registerGround:registerGround,registerHook:registerHook,unregister:unregister,providers:function(){return providers.slice()},
  describe:describe,build:build,sort:sort,normalise:normalise,rowHtml:rowHtml,rowText:rowText,hoverHtml:hoverHtml,hoverText:hoverText,moreCount:moreCount,
  examineChat:examineChat,show:show,hide:hide,isOpen:isOpen,run:run,strayed:strayed,entries:function(){return view.entries.slice()},rect:function(){return view.rect},
  swallowing:swallowing,swallowed:swallowed,record:record,last:function(){return last},
  using:using,itemName:itemName,startUse:startUse,endUse:endUse,useSlot:function(){return view.useSlot===undefined?-1:view.useSlot}};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=OsrsMenu;
