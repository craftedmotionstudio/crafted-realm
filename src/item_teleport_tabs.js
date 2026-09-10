/* ============ item_teleport_tabs — consumable TELEPORT TAB (net-new) ============
 * Purely ADDITIVE. Registers one stackable item `home_tab` ('Veyhollow teleport')
 * and wires its "use" so that clicking one in the inventory consumes a single tab
 * and whisks the player to the mainland home — reusing the EXACT same teleport the
 * tutorial finish uses (Admin.tp('commons')). It wraps UI.useItem and calls through
 * to the original for every other item, so no existing use-path is touched.
 *
 * The 2D inventory icon is injected by pre-seeding ICONS['home_tab'] with a drawn
 * data-URL; game0_icons.js's iconFor() returns any pre-cached icon early, so we get
 * a proper sprite without editing that file. Mutates globals at load only; edits no
 * other source file. Self-boots via a setInterval guard. Reversible: drop the tag.
 */
(function(){
  const ID   = 'home_tab';
  const DEST = 'commons';   // the mainland home — same zone the tutorial finish sends you to

  /* stackable, cheap consumable — modelled on the rune/coins schema in ITEMS */
  const DEF = {name:'Veyhollow teleport', stack:true, value:5,
    examine:'A rune-etched clay tablet. Crush it to fold the world back to Veyhollow.'};

  /* Draw a small teleport rune/tablet into the icon cache (32×32), matching the
     outlined sprite style of game0_icons.js. A purple slab, a teal home-glow and a
     pale house glyph — reads clearly as a home-teleport tablet. */
  function drawIcon(){
    if(typeof ICONS==='undefined' || ICONS[ID]) return;
    try{
      const c=document.createElement('canvas'); c.width=32; c.height=32;
      const x=c.getContext('2d');
      x.lineWidth=1.5; x.lineJoin='round'; x.lineCap='round';
      const O='#1a1208';
      const fillS=(color,fn)=>{ x.fillStyle=color; x.strokeStyle=O; x.beginPath(); fn(); x.fill(); x.stroke(); };
      const poly=(pts)=>{ x.moveTo(pts[0][0],pts[0][1]); for(let i=1;i<pts.length;i++) x.lineTo(pts[i][0],pts[i][1]); x.closePath(); };
      const ell=(cx,cy,rx,ry)=>x.ellipse(cx,cy,rx,ry,0,0,7);
      // slab
      fillS('#7a5e94',()=>poly([[9,5],[23,5],[25,9],[25,23],[23,27],[9,27],[7,23],[7,9]]));
      // teal teleport glow
      x.fillStyle='#3ec6b4'; x.globalAlpha=0.4; x.beginPath(); ell(16,16,7,9); x.fill(); x.globalAlpha=1;
      // pale "home" glyph
      fillS('#eafffb',()=>poly([[16,10],[21,15],[19,15],[19,21],[13,21],[13,15],[11,15]]));
      ICONS[ID]=c.toDataURL();
    } catch(e){ console.error('[item_teleport_tabs] icon', e); }
  }

  /* Consume one tab and teleport home. Reuses the tutorial-finish teleport verbatim. */
  function useTab(i){
    if(Player.count(ID)<1) return;
    Player.removeItem(ID,1);
    if(UI.refreshInv) UI.refreshInv();
    if(typeof Sfx!=='undefined' && Sfx.click) Sfx.click();
    UI.chat('You crush the teleport tablet. The world folds around you...','sys');
    Admin.tp(DEST);            // the SAME mainland teleport the tutorial finish uses
  }

  function boot(){
    if(typeof ITEMS==='undefined' || typeof UI==='undefined' || typeof Player==='undefined') return false;
    if(typeof Admin==='undefined' || typeof Admin.tp!=='function') return false;
    if(typeof UI.useItem!=='function') return false;

    /* 1) register the item only if absent — never clobber an existing id */
    if(!ITEMS[ID]) ITEMS[ID]=DEF;

    /* 2) seed the inventory icon */
    drawIcon();

    /* 3) wrap UI.useItem: intercept ONLY home_tab; everything else is untouched */
    const _useItem = UI.useItem.bind(UI);
    UI.useItem = function(i){
      const s = Player.inv[i];
      if(s && s.id===ID){ useTab(i); return; }
      return _useItem(i);
    };

    console.log('[item_teleport_tabs] registered home_tab teleport');
    return true;
  }

  const iv=setInterval(()=>{ try{ if(boot()) clearInterval(iv); }
    catch(e){ console.error('[item_teleport_tabs]', e); clearInterval(iv); } }, 1800);
})();
