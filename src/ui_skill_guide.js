/* ============================================================================
   UI_SKILL_GUIDE -- the old-school skill guide (owner 2026-09-27: "In the skills tab, clicking a skill should open
   a skill guide like old-school RuneScape's, showing what each level unlocks").

   Click or tap a stat cell -> a stone-framed window over the game view with the skill's categories down the side
   (Attack: Weapons / Tools / Places, Smithing: Smelting and one tab per metal, Magic: Combat / Utility / ...) and one
   row per unlock: level, picture, name. Rows you have reached are in full colour, rows above your level are dimmed,
   and planned content (SkillGuideData.PLANNED) is dimmed and marked "Coming later" whatever your level.
   The four skills that arrive in W4 (Crafting, Herblore, Agility, Runecrafting) are not in the stats grid yet; a
   "Coming later" line under the total opens their guides.

   The rows come from src/skill_guide_data.js (the game's own tables; tools/test_skill_guides.js keeps them honest).
   Pictures are the game's real item renders and sprites; an unlock with no picture yet keeps an empty slot (the
   gap is listed by the test), never a drawn glyph.

   The window is a plain DOM overlay: no pause, no per-frame work, built once per open. It closes on its X, on
   Escape, on a click in the game world (the click still walks, as in the old client) and on a second click on the
   same skill. Styling: assets/ui/skill_guide.css (its own file so the UI-scale work on holm-feel-2004 merges cleanly).
   ============================================================================ */
(function(){
'use strict';
if(window.SkillGuide)return;
var doc=document,CSS_HREF='assets/ui/skill_guide.css?v=h0f36d7c2';
var SPR_BASE='assets/icons/ui/v3/';
function sprV(){return (window.CRSprite&&window.CRSprite.v)||'?v=6'}
function $(id){return doc.getElementById(id)}
function el(tag,cls,text){var e=doc.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e}
function click(){try{if(typeof Sfx!=='undefined'&&Sfx.click)Sfx.click()}catch(e){}}
function ensureCss(){if($('cr-guide-css'))return;var l=doc.createElement('link');l.id='cr-guide-css';l.rel='stylesheet';l.href=CSS_HREF;(doc.head||doc.documentElement).appendChild(l)}
window.CRGuideCss=ensureCss;

var st={skill:null,tab:null,layer:null,win:null,fish:null,fetching:false,back:null};

/* ------------------------------------------------------------------------------------------ data */
function liveSkills(){try{return SKILLS}catch(e){return []}}
function lvl(s){try{if(liveSkills().indexOf(s)>=0&&typeof Player!=='undefined'&&Player.lvl)return Player.lvl(s)}catch(e){}return 1}
function fishRules(){
  try{var d=HolmFishing.data();if(d&&d.rules)return d.rules}catch(e){}
  if(st.fish)return st.fish;
  if(!st.fetching&&typeof fetch==='function'){st.fetching=true;
    fetch('docs/rebuild/holm-overhaul/island-fishing.json',{cache:'no-cache'}).then(function(r){return r.ok?r.json():null})
      .then(function(j){if(j&&j.rules){st.fish=j.rules;if(st.skill)render()}}).catch(function(){})}
  return null;
}
function guides(){return SkillGuideData.build(SkillGuideData.fromGlobals({FISHING:fishRules()}))}
function guideFor(skill){var g=guides();return g[skill]||null}

/* ---------------------------------------------------------------------------------------- pictures */
function iconNode(icon){
  var box=el('span','sg-ico');
  var src=null;
  if(icon&&icon.item)src=SkillGuideData.imagePath(icon.item);
  else if(icon&&icon.sprite)src=SPR_BASE+icon.sprite+'.png'+sprV();
  if(!src){box.classList.add('sg-noico');return box}
  var im=el('img',icon.sprite?'kit-spr':'');im.alt='';im.draggable=false;im.decoding='async';im.src=src;
  im.onerror=function(){this.remove();box.classList.add('sg-noico')};
  if(icon.sprite)im.onload=function(){if(this.naturalWidth&&this.naturalWidth<=18)this.classList.add('x2')};
  box.appendChild(im);return box;
}
function skillIcon(skill){return SPR_BASE+'skills/'+String(skill).toLowerCase()+'.png'+sprV()}

/* ------------------------------------------------------------------------------------------ window */
function build(){
  if(st.layer)return;
  ensureCss();
  var layer=el('div');layer.id='skill-guide-layer';layer.hidden=true;
  var win=el('section','sg-win');win.setAttribute('role','dialog');win.setAttribute('aria-labelledby','sg-title');
  var head=el('header','sg-head');
  var hi=el('img','kit-spr sg-hico');hi.alt='';hi.draggable=false;hi.onerror=function(){this.style.visibility='hidden'};
  var title=el('h2','sg-title');title.id='sg-title';
  var x=el('button','kit-x sg-x');x.type='button';x.setAttribute('aria-label','Close');x.setAttribute('data-tip','Close');
  x.innerHTML=window.CRSprite?window.CRSprite.html('close'):'<img class="kit-spr" src="'+SPR_BASE+'misc/close.png'+sprV()+'" alt="">';
  x.addEventListener('click',function(ev){ev.stopPropagation();click();close()});
  head.appendChild(hi);head.appendChild(title);head.appendChild(x);
  var body=el('div','sg-body');
  var tabs=el('nav','sg-tabs');tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Categories');
  var list=el('div','sg-list');list.setAttribute('role','tabpanel');list.tabIndex=0;
  body.appendChild(tabs);body.appendChild(list);
  var foot=el('footer','sg-foot');
  win.appendChild(head);win.appendChild(body);win.appendChild(foot);
  layer.appendChild(win);doc.body.appendChild(layer);
  st.layer=layer;st.win=win;
  tabs.addEventListener('keydown',function(e){
    if(e.key!=='ArrowDown'&&e.key!=='ArrowUp'&&e.key!=='ArrowLeft'&&e.key!=='ArrowRight')return;
    var bs=Array.prototype.slice.call(tabs.querySelectorAll('.sg-tab')),i=bs.indexOf(doc.activeElement);if(i<0)return;
    e.preventDefault();var n=bs[(i+((e.key==='ArrowDown'||e.key==='ArrowRight')?1:bs.length-1))%bs.length];n.focus();n.click();
  });
  // the window never lets a click fall through to the world behind it
  ['pointerdown','mousedown','click','contextmenu','wheel'].forEach(function(t){win.addEventListener(t,function(e){e.stopPropagation()})});
  win.addEventListener('contextmenu',function(e){e.preventDefault()});
}
function zoom(){
  // one step per 0.25 of the viewport over a 760x520 base: 1 on laptops and phones, 1.5 at 1538x900, 2 at 1920x1080;
  // never wider or taller than the room left of the side panel
  var W=innerWidth,H=innerHeight,narrow=W<=560,side=W>880?262:0;
  if(narrow)return 1;
  var z=Math.floor(Math.min(W/760,H/520)*4)/4;z=Math.max(1,Math.min(2,z));
  while(z>1&&(484*z>W-side-16||344*z>H-16))z-=0.25;
  return z;
}
function place(){
  if(!st.layer||st.layer.hidden)return;
  var W=innerWidth;st.layer.classList.toggle('sg-narrow',W<=560);st.layer.classList.toggle('sg-wide',W>880);
  st.win.style.setProperty('--sg-z',String(zoom()));
}
var raf=0;addEventListener('resize',function(){if(raf)return;raf=requestAnimationFrame(function(){raf=0;place()})});

function render(){
  if(!st.layer||!st.skill)return;
  var g=guideFor(st.skill);if(!g)return;
  var title=st.win.querySelector('.sg-title'),hi=st.win.querySelector('.sg-hico');
  title.textContent=st.skill+' guide';
  // every skill has its stat sprite, the four W4 skills too (Blender props, 2026-09-28); a missing file hides the slot, never a glyph
  hi.style.visibility='';hi.src=skillIcon(st.skill);
  var tabs=st.win.querySelector('.sg-tabs'),list=st.win.querySelector('.sg-list'),foot=st.win.querySelector('.sg-foot');
  if(!g.tabs.some(function(t){return t.id===st.tab}))st.tab=g.tabs.length?g.tabs[0].id:null;
  tabs.innerHTML='';
  st.win.classList.toggle('sg-onetab',g.tabs.length<2);
  g.tabs.forEach(function(t){
    var b=el('button','sg-tab'+(t.id===st.tab?' on':''),t.label);b.type='button';b.setAttribute('role','tab');
    b.setAttribute('aria-selected',t.id===st.tab?'true':'false');b.tabIndex=t.id===st.tab?0:-1;b.dataset.tab=t.id;
    if(t.rows.every(function(r){return r.planned}))b.classList.add('soon');
    b.addEventListener('click',function(){if(st.tab===t.id)return;click();var kept=doc.activeElement&&doc.activeElement.classList&&doc.activeElement.classList.contains('sg-tab');
      st.tab=t.id;render();list.scrollTop=0;if(kept){var o=tabs.querySelector('.sg-tab.on');if(o)try{o.focus({preventScroll:true})}catch(e){}}});
    tabs.appendChild(b);
  });
  showTab(tabs);
  var tab=g.tabs.filter(function(t){return t.id===st.tab})[0];
  list.innerHTML='';list.setAttribute('aria-label',st.skill+': '+(tab?tab.label:''));
  var frag=doc.createDocumentFragment();
  (tab?tab.rows:[]).forEach(function(r){
    var reached=!r.planned&&SkillGuideData.met(r,lvl);
    var d=el('div','sg-row'+(r.planned?' planned':reached?'':' locked'));d.setAttribute('role','listitem');
    d.appendChild(el('span','sg-lv',r.label));
    d.appendChild(iconNode(r.icon));
    var t=el('span','sg-txt');t.appendChild(el('span','sg-name',r.name));if(r.sub)t.appendChild(el('span','sg-sub',r.sub));d.appendChild(t);
    if(r.planned)d.appendChild(el('span','sg-soon','Coming later'));
    d.setAttribute('aria-label',(r.label?'Level '+r.label+': ':'')+r.name+(r.sub?', '+r.sub:'')+(r.planned?', coming later':reached?'':', locked'));
    frag.appendChild(d);
  });
  list.appendChild(frag);
  // the footer: your level and the next thing it opens (live rows only), or why a W4 skill is all "Coming later"
  foot.innerHTML='';
  if(g.live){
    var me=lvl(st.skill),next=null;
    g.tabs.forEach(function(t){t.rows.forEach(function(r){if(!r.planned&&r.level!=null&&r.level>me&&r.req.length&&r.req[0].skill===st.skill&&(!next||r.level<next.level))next=r})});
    var a=el('span','sg-me');a.appendChild(doc.createTextNode(st.skill+' level: '));a.appendChild(el('b',null,String(me)));foot.appendChild(a);
    var anyLive=g.tabs.some(function(t){return t.rows.some(function(r){return !r.planned})});
    foot.appendChild(el('span','sg-next',next?'Next: '+next.name+' at '+next.level:st.skill==='Hitpoints'?'Food heals whatever your level':anyLive?'Every live unlock reached':'Nothing needs '+st.skill+' yet'));
  }else foot.appendChild(el('span','sg-me','This skill arrives in a later update; everything here is planned.'));
}

/* keep the open category in view when the categories are one scrolling row (phones) */
function showTab(tabs){var on=tabs.querySelector('.sg-tab.on');if(!on||tabs.scrollWidth<=tabs.clientWidth)return;
  var l=on.offsetLeft,r=l+on.offsetWidth;if(l<tabs.scrollLeft)tabs.scrollLeft=Math.max(0,l-4);else if(r>tabs.scrollLeft+tabs.clientWidth)tabs.scrollLeft=r-tabs.clientWidth+4}

/* as in the old client, a conversation, the bank, a shop or the world map takes the screen: the guide steps aside */
function wrapClosers(){
  if(typeof UI==='undefined')return;
  ['dialogue','openBank','openShop','openWorldMap'].forEach(function(k){var f=UI[k];if(typeof f!=='function'||f.__guideClose)return;
    UI[k]=function(){try{close()}catch(e){}return f.apply(this,arguments)};UI[k].__guideClose=true});
}
function open(skill,tab){
  if(typeof SkillGuideData==='undefined')return false;
  var g=guideFor(skill);if(!g)return false;
  build();wrapClosers();
  if(st.skill!==skill)st.tab=tab||null;else if(tab)st.tab=tab;
  if(!st.skill){st.back=doc.activeElement;try{if(typeof Sfx!=='undefined'&&Sfx.windowOpen)Sfx.windowOpen()}catch(e){}}
  st.skill=skill;
  st.layer.hidden=false;place();render();
  st.win.querySelector('.sg-list').scrollTop=0;
  var on=st.win.querySelector('.sg-tab.on')||st.win.querySelector('.sg-x');try{on.focus({preventScroll:true})}catch(e){}
  markCells();
  return true;
}
function close(){
  if(!st.layer||st.layer.hidden)return false;
  st.layer.hidden=true;st.skill=null;markCells();try{if(typeof Sfx!=='undefined'&&Sfx.windowClose)Sfx.windowClose()}catch(e){}
  if(st.back&&st.back.isConnected)try{st.back.focus({preventScroll:true})}catch(e){}
  st.back=null;return true;
}
function isOpen(){return !!(st.layer&&!st.layer.hidden)}

/* --------------------------------------------------------------------------------- the stats tab */
function cells(){var g=$('osk-grid');return g?Array.prototype.slice.call(g.querySelectorAll('.osk-cell')):[]}
function markCells(){cells().forEach(function(c){c.classList.toggle('sg-open',!!st.skill&&c.dataset.skill===st.skill)})}
function decorate(){
  var S=liveSkills();
  cells().forEach(function(c,i){
    if(!c.dataset.skill&&S[i])c.dataset.skill=S[i];
    if(c.dataset.skill&&!c.hasAttribute('tabindex')){c.tabIndex=0;c.setAttribute('role','button');c.setAttribute('aria-label',c.dataset.skill+': open the skill guide')}
  });
  // the four W4 skills are not in the grid yet: one line under the total opens their (planned) guides
  var list=$('skill-list');if(!list)return;
  var soon=SkillGuideData.PLANNED_SKILLS.filter(function(s){return S.indexOf(s)<0});
  var line=$('osk-soon');
  if(!soon.length){if(line)line.remove();return}
  if(!line||line.parentNode!==list){if(line)line.remove();line=el('div');line.id='osk-soon';list.appendChild(line)}
  line.innerHTML='';line.appendChild(el('span','osk-soon-head','Coming later: '));
  soon.forEach(function(s,i){var b=el('button','osk-soon-skill');b.type='button';b.dataset.skill=s;b.setAttribute('aria-label',s+' guide (coming later)');
    var im=el('img','osk-soon-ico');im.alt='';im.draggable=false;im.src=SPR_BASE+'skills18/'+s.toLowerCase()+'.png'+sprV();
    im.onerror=function(){this.remove()};b.appendChild(im);b.appendChild(doc.createTextNode(s));
    line.appendChild(b);if(i<soon.length-1)line.appendChild(doc.createTextNode(', '))});
  markCells();
}
function wrapSkills(){
  if(typeof UI==='undefined'||!UI.refreshSkills||UI.refreshSkills.__guide)return;
  var f=UI.refreshSkills;
  UI.refreshSkills=function(){var r=f.apply(this,arguments);try{decorate();if(isOpen())render()}catch(e){console.warn('[skill-guide]',e)}return r};
  UI.refreshSkills.__guide=true;
}
function onCell(e){
  var t=e.target&&e.target.closest?e.target.closest('#skill-list .osk-cell, #skill-list .osk-soon-skill'):null;if(!t)return;
  var skill=t.dataset.skill;
  if(!skill&&t.classList.contains('osk-cell')){var i=cells().indexOf(t);skill=liveSkills()[i]}
  if(!skill)return;
  click();
  if(isOpen()&&st.skill===skill)close();else open(skill);
}
doc.addEventListener('click',onCell);
doc.addEventListener('keydown',function(e){
  if((e.key==='Enter'||e.key===' ')&&e.target&&e.target.classList&&e.target.classList.contains('osk-cell')){e.preventDefault();onCell(e)}
});
// Escape closes the guide first (window capture runs before the kit's own Escape on the document)
addEventListener('keydown',function(e){
  if((e.key==='Escape'||e.key==='Esc')&&isOpen()){e.preventDefault();e.stopPropagation();close()}
},true);
// a click anywhere outside the window (the world, the chat) closes it; the side panel and the HUD keep it open
addEventListener('pointerdown',function(e){
  if(!isOpen())return;var t=e.target;
  if(t&&t.closest&&(t.closest('.sg-win')||t.closest('#side-panel')||t.closest('#hud-rail')||t.closest('#mm-cluster')||t.closest('.mob-toggle')))return;
  close();
},true);

ensureCss();   // the stats-tab rules (cell cursor, the "Coming later" line) are in the same small file
wrapSkills();
if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',function(){wrapSkills();decorate()});else decorate();
addEventListener('load',function(){wrapSkills();decorate()});

window.SkillGuide={open:open,close:close,isOpen:isOpen,current:function(){return st.skill?{skill:st.skill,tab:st.tab}:null},
  guide:guideFor,guides:guides,render:render};
})();
