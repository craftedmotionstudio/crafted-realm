/* ============================================================================
   UI_BOOK_TIPS -- the hover tip on every prayer and spell (owner 2026-09-27: "In the prayer tab, hovering a prayer
   (e.g. Oak Hide) should show a brief description of what it does").

   Hover a prayer: its name, level, how fast it drains your prayer points, and one line of what it does
   ("Oak Hide / Level 1 / Drain: 1 point every 12 s / Raises your Defence by 5%."). Hover a spell: name, level, runes
   and one line ("Gale Dart / Level 1 / Runes: 1 Gale, 1 Wit / Hits for up to 2."). On a touch screen a long press
   shows the same tip and does not toggle the prayer or pick the spell; a plain tap still does.

   Every word comes from the data: the prayer's level from PRAYERS, its effect and drain from the RULES the combat
   engine runs (shared/combat.js: pct, protect, drain, prayerDrainResistance, pvpProtectedMaxHit), the spell's level,
   runes and effect from SPELLS (magic_spells.js). The lines are built by SkillGuideData, so the guide rows and the tip
   say the same thing. The drain uses your worn prayer bonus (2004: resistance 60 + 2 x bonus).
   Styled like the old-school "Choose Option" box (assets/ui/skill_guide.css). ui_prayer_magic.js marks each button
   with data-book="prayers:<id>" / "spells:<id>" (and no longer hands it to the kit's yellow HUD tip).
   ============================================================================ */
(function(){
'use strict';
if(window.BookTips)return;
var doc=document,tip=null,cur=null,last={x:-1,y:-1},lp={timer:0,btn:null,x:0,y:0,shown:false,until:0,hide:0};
var SEL='#prayer-grid .prayer-btn, #spell-grid .prayer-btn';
function css(){if(window.CRGuideCss)window.CRGuideCss();else if(!doc.getElementById('cr-guide-css')){var l=doc.createElement('link');l.id='cr-guide-css';l.rel='stylesheet';l.href='assets/ui/skill_guide.css?v=h31f67d7d';doc.head.appendChild(l)}}
function box(){if(!tip){css();tip=doc.createElement('div');tip.id='book-tip';tip.setAttribute('role','tooltip');doc.body.appendChild(tip)}return tip}

/* which prayer or spell a button is: data-book (ui_prayer_magic.js), else its place in the grid */
function which(btn){
  var b=btn.getAttribute('data-book');if(b){var p=b.split(':');return {kind:p[0],id:p[1]}}
  var grid=btn.parentNode,kind=grid&&grid.id==='prayer-grid'?'prayers':grid&&grid.id==='spell-grid'?'spells':null;if(!kind)return null;
  var table=kind==='prayers'?(typeof PRAYERS!=='undefined'?PRAYERS:null):(typeof SPELLS!=='undefined'?SPELLS:null);if(!table)return null;
  var i=Array.prototype.indexOf.call(grid.querySelectorAll('.prayer-btn'),btn);return {kind:kind,id:Object.keys(table)[i]};
}
function G(){return SkillGuideData.fromGlobals()}
function lvl(s){try{return Player.lvl(s)}catch(e){return 1}}
function prayerBonus(){
  try{if(typeof LocalCombat!=='undefined'&&LocalCombat.ready&&LocalCombat.ready()){var b=LocalCombat.stats().bonuses;if(b&&typeof b.prayer==='number')return b.prayer}}catch(e){}
  try{return Player._sumBonus('prayB')||0}catch(e){return 0}
}
/* the tip's lines: [{text, cls}] under a title */
function content(w){
  var g=G(),out={title:'',lines:[]};
  if(w.kind==='prayers'){
    var p=g.PRAYERS&&g.PRAYERS[w.id];if(!p)return null;out.title=p.name;
    var need=lvl('Prayer')<p.req,sec=SkillGuideData.prayerDrainSeconds(g,w.id,prayerBonus());
    out.lines.push({text:'Level '+p.req+(need?' (you have '+lvl('Prayer')+')':''),cls:need?'bt-need':''});
    if(sec!=null)out.lines.push({text:'Drain: 1 point every '+SkillGuideData.secondsText(sec)});
    out.lines.push({text:SkillGuideData.prayerLine(g,w.id),cls:'bt-eff'});
    try{if(Player.activePrayers&&Player.activePrayers.has(w.id))out.lines.push({text:'Active',cls:'bt-on'})}catch(e){}
  }else{
    var sp=g.SPELLS&&g.SPELLS[w.id];if(!sp)return null;out.title=sp.name;
    var needM=lvl('Magic')<sp.req;
    out.lines.push({text:'Level '+sp.req+(needM?' (you have '+lvl('Magic')+')':''),cls:needM?'bt-need':''});
    var runes=SkillGuideData.spellRunes(g,w.id);
    if(runes){var short=false;try{short=sp.utility!=='teleport'||Object.keys(sp.runes||{}).length?!Player.hasRunes(sp):false}catch(e){}
      out.lines.push({text:runes,cls:short&&!needM?'bt-need':''})}
    out.lines.push({text:SkillGuideData.spellLine(g,w.id),cls:'bt-eff'});
  }
  return out;
}
function paint(c){
  var t=box();t.innerHTML='';
  var h=doc.createElement('div');h.className='bt-head';h.textContent=c.title;t.appendChild(h);
  c.lines.forEach(function(l){if(!l.text)return;var d=doc.createElement('div');d.className='bt-line'+(l.cls?' '+l.cls:'');d.textContent=l.text;t.appendChild(d)});
}
function position(btn){
  var t=box(),r=btn.getBoundingClientRect(),w=t.offsetWidth,h=t.offsetHeight,W=innerWidth,H=innerHeight;
  // just outside the side panel's left edge, level with the button, so the rest of the book stays in view; under the
  // button when there is no room on the left (a phone's slide-in panel)
  var host=btn.closest&&btn.closest('#side-panel'),edge=host?host.getBoundingClientRect().left:r.left;
  var x=edge-w-6,y=r.top+r.height/2-h/2;
  if(x<4){x=r.left+r.width/2-w/2;y=r.bottom+6;if(y+h>H-4)y=r.top-h-6}
  x=Math.max(4,Math.min(W-w-4,x));y=Math.max(4,Math.min(H-h-4,y));
  t.style.left=Math.round(x)+'px';t.style.top=Math.round(y)+'px';
}
function show(btn){
  var w=which(btn);if(!w||!w.id){hide();return}
  var c;try{c=content(w)}catch(e){console.warn('[book-tips]',e);c=null}
  if(!c){hide();return}
  cur=btn;paint(c);box().classList.add('on');position(btn);
  btn.setAttribute('aria-describedby','book-tip');
}
function hide(){if(tip)tip.classList.remove('on');if(cur)cur.removeAttribute('aria-describedby');cur=null}
function btnAt(t){return t&&t.closest?t.closest(SEL):null}

/* ---- mouse (and pen): hover */
doc.addEventListener('pointerover',function(e){if(e.pointerType==='touch')return;var b=btnAt(e.target);if(b){if(b!==cur)show(b)}else if(cur&&!lp.shown)hide()},true);
doc.addEventListener('pointerout',function(e){if(e.pointerType==='touch'||!cur)return;var to=e.relatedTarget;if(to&&cur.contains(to))return;if(!btnAt(to)&&!lp.shown)hide()},true);
doc.addEventListener('pointermove',function(e){if(e.pointerType!=='touch'){last.x=e.clientX;last.y=e.clientY}},{capture:true,passive:true});

/* ---- touch: a long press shows the tip and swallows the tap that follows it */
function cancelPress(){if(lp.timer){clearTimeout(lp.timer);lp.timer=0}}
doc.addEventListener('pointerdown',function(e){
  if(lp.shown&&e.pointerType==='touch'){hide();lp.shown=false}
  if(e.pointerType!=='touch')return;var b=btnAt(e.target);if(!b)return;
  cancelPress();lp.btn=b;lp.x=e.clientX;lp.y=e.clientY;
  lp.timer=setTimeout(function(){lp.timer=0;show(b);lp.shown=true;lp.until=Date.now()+1500;
    clearTimeout(lp.hide);lp.hide=setTimeout(function(){if(lp.shown){hide();lp.shown=false}},4000)},450);
},true);
doc.addEventListener('pointermove',function(e){if(e.pointerType==='touch'&&lp.timer&&Math.hypot(e.clientX-lp.x,e.clientY-lp.y)>10)cancelPress()},{capture:true,passive:true});
doc.addEventListener('pointerup',function(e){if(e.pointerType==='touch')cancelPress()},true);
doc.addEventListener('pointercancel',function(){cancelPress()},true);
doc.addEventListener('click',function(e){
  if(!lp.shown||Date.now()>lp.until)return;var b=btnAt(e.target);if(!b||b!==lp.btn)return;
  e.preventDefault();e.stopImmediatePropagation();lp.until=0;   // the long press only reads the tip
},true);
doc.addEventListener('contextmenu',function(e){if(btnAt(e.target))e.preventDefault()},true);

/* the book re-renders on every toggle: keep the tip on the button now under the pointer */
function refresh(){
  if(!cur&&!lp.shown)return;
  var b=null;
  if(lp.shown&&lp.btn&&!lp.btn.isConnected&&lp.btn.getAttribute('data-book'))b=doc.querySelector('[data-book="'+lp.btn.getAttribute('data-book')+'"]');
  else if(last.x>=0)b=btnAt(doc.elementFromPoint(last.x,last.y));
  if(b)show(b);else hide();
}
function wrap(){
  if(typeof UI==='undefined')return false;
  ['refreshPrayers','refreshSpells'].forEach(function(k){var f=UI[k];if(typeof f!=='function'||f.__bookTips)return;
    UI[k]=function(){var r=f.apply(this,arguments);try{refresh()}catch(e){}return r};UI[k].__bookTips=true});
  return !!(UI.refreshPrayers&&UI.refreshPrayers.__bookTips);
}
if(!wrap()){var n=0,iv=setInterval(function(){if(wrap()||++n>60)clearInterval(iv)},250)}
addEventListener('load',wrap);
// a tab switch or a scroll leaves no tip hanging
addEventListener('blur',hide);
doc.addEventListener('scroll',function(){if(cur)hide()},true);

window.BookTips={show:show,hide:hide,content:function(kind,id){return content({kind:kind,id:id})},current:function(){return cur?which(cur):null}};
})();
