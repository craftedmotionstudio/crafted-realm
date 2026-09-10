/* ================= AUTOMATED SMOKE GATE =================
 * The repeatable verification gate (CLAUDE.md's long-planned smoke test).
 *
 *   http://127.0.0.1:8777/?smoke=1
 *
 * Loaded FIRST so it can record every boot error. Passive without ?smoke=1 except for
 * the always-on error recorder (window.SMOKE_ERRORS — lets any session ask "were there
 * errors?" after manual play too). With ?smoke=1 it:
 *   1. waits for the loading sequence, then drives the REAL login flow (never teleports,
 *      never fakes state — verify-don't-assert). A saved adventurer is continued, never wiped.
 *   2. waits for `running` + the enter-buffer settle, recording boot/settle times.
 *   3. runs the structural suite (tools/smoke_test.js → CR_smoke()).
 *   4. runs a REAL walk-flow test: computePath to a nearby tile, orderWalk out and back,
 *      and requires arrival — the same code path a player click exercises.
 *   5. walks across three real chunk boundaries, round-trips the actual save,
 *      and returns while checking residency/disposal continuity.
 *   6. samples perf for 4s (FPS, worst frame, draw calls, triangles, world ticks alive)
 *      and checks everything against SMOKE_BUDGETS.
 * Result: window.SMOKE_RESULT, ONE greppable console line ("[SMOKE] {...}"), and an
 * on-screen PASS/FAIL badge (visible in screenshots for the vision gate).
 * Read it from the harness with read_console_messages pattern "[SMOKE]".
 */
(function(){
  'use strict';

  /* ---- always-on error recorder (cheap; hooks before every other script) ---- */
  var ERRS = window.SMOKE_ERRORS = [];
  function rec(kind, msg){ if(ERRS.length<60) ERRS.push({kind:kind, msg:String(msg).slice(0,300), t:Math.round(performance.now())}); }
  window.addEventListener('error', function(e){
    rec('uncaught', (e.message||'script error')+' @ '+(e.filename||'?')+':'+(e.lineno||0));
  });
  window.addEventListener('unhandledrejection', function(e){
    rec('promise', (e.reason && (e.reason.message||e.reason)) || 'unhandled rejection');
  });
  var _cerr = console.error.bind(console);
  console.error = function(){ rec('console', Array.prototype.map.call(arguments,String).join(' ')); _cerr.apply(null, arguments); };

  if(!/[?&]smoke=1/.test(location.search)) return;   // passive unless explicitly armed

  // Read-only engine sight for browser-driven verification. It exposes no
  // teleport, inventory, save, or state mutation command; manual tests still
  // have to click and traverse the real game. Nested building parts report
  // world positions so the harness can distinguish a bad click from bad data.
  window.CR_SMOKE_INSPECT=function(){
    try{
      var doors=(typeof WORLD!=='undefined'&&WORLD.doors?WORLD.doors:[]).map(function(d){
        var p=(d.getWorldPosition&&typeof THREE!=='undefined')?d.getWorldPosition(new THREE.Vector3()):d.position;
        var screen=(typeof UI!=='undefined'&&UI.worldToScreen)?UI.worldToScreen(d,0.9):null;
        function approachScreen(a){
          if(!a||typeof UI==='undefined'||!UI.worldToScreen||typeof THREE==='undefined') return null;
          var y=(typeof Planes!=='undefined')?Planes.elevAt(a.x,a.z,Player.plane||0):groundY(a.x,a.z);
          var q=UI.worldToScreen(new THREE.Vector3(a.x,y===null?0:y,a.z),.08);
          return {x:+q.x.toFixed(1),y:+q.y.toFixed(1)};
        }
        return {partId:d.userData&&d.userData.partId,x:+p.x.toFixed(2),z:+p.z.toFixed(2),open:!!(d.userData&&d.userData.open),
          inside:d.userData&&d.userData.entryInside,outside:d.userData&&d.userData.entryOutside,
          insideScreen:approachScreen(d.userData&&d.userData.entryInside),
          outsideScreen:approachScreen(d.userData&&d.userData.entryOutside),
          screen:screen?{x:+screen.x.toFixed(1),y:+screen.y.toFixed(1)}:null};
      });
      var semantics=[];
      if(typeof WORLD!=='undefined'&&WORLD.clickables) WORLD.clickables.forEach(function(o){
        var kind=o.userData&&o.userData.kind;
        if(!kind||(kind.indexOf('holm_')!==0&&kind!=='climb')) return;
        var p=(o.getWorldPosition&&typeof THREE!=='undefined')?o.getWorldPosition(new THREE.Vector3()):o.position;
        var screen=(typeof UI!=='undefined'&&UI.worldToScreen)?UI.worldToScreen(o,0.7):null;
        semantics.push({kind:kind,partId:o.userData&&o.userData.partId,name:o.name,label:o.userData&&o.userData.label,
          plane:o.userData&&o.userData.plane,walkAt:o.userData&&o.userData.walkAt,x:+p.x.toFixed(2),z:+p.z.toFixed(2),
          screen:screen?{x:+screen.x.toFixed(1),y:+screen.y.toFixed(1)}:null});
      });
      var hall=null;
      if(typeof scene!=='undefined') for(var i=0;i<scene.children.length;i++){
        var o=scene.children[i]; if(o.userData&&o.userData.worldObjectId==='holm_guide_hall'){
          hall={x:+o.position.x.toFixed(2),z:+o.position.z.toFixed(2),visible:o.visible}; break;
        }
      }
      var dest=(typeof Player!=='undefined'&&Player.path&&Player.path.length)?Player.path[Player.path.length-1]
        :(typeof Player!=='undefined'?Player.moveTo:null);
      var liveProvider=typeof CRWorldMode!=='undefined'&&CRWorldMode.provider;
      var expectedObjectIds=liveProvider&&liveProvider.residentChunks?liveProvider.residentChunks().reduce(function(out,ch){
        ch.layers.objects.forEach(function(row){out.push(row.id);});return out;
      },[]).sort():[];
      return {
        provider:typeof CRWorldMode!=='undefined'?CRWorldMode.providerId:null,
        viewport:{width:innerWidth,height:innerHeight,dpr:window.devicePixelRatio||1},
        player:typeof player!=='undefined'?{x:+player.position.x.toFixed(2),z:+player.position.z.toFixed(2),
          plane:typeof Player!=='undefined'?(Player.plane||0):0}:null,
        cameraYaw:typeof camCtl!=='undefined'?+camCtl.yaw.toFixed(4):null,
        destination:dest?{x:+dest.x.toFixed(2),z:+dest.z.toFixed(2)}:null,
        hall:hall,doors:doors,semantics:semantics,
        furnishingAudio:typeof SfxFurnishings!=='undefined'&&SfxFurnishings.snapshot?
          SfxFurnishings.snapshot():null,
        waterworks:typeof WorkyardWaterworksU4!=='undefined'&&WorkyardWaterworksU4.snapshot?
          WorkyardWaterworksU4.snapshot():null,
        walkSurfaces:typeof WorldWalkSurfaces!=='undefined'&&WorldWalkSurfaces.snapshot?
          WorldWalkSurfaces.snapshot():null,
        testTravel:typeof TestTravel!=='undefined'&&TestTravel.snapshot?TestTravel.snapshot():null,
        objectRuntime:typeof WorldV2Objects!=='undefined'?WorldV2Objects.snapshot():null,
        expectedObjectIds:expectedObjectIds
      };
    }catch(e){ return {error:String(e&&e.message||e)}; }
  };
  window.setInterval(function(){
    try{ document.documentElement.setAttribute('data-cr-smoke-state',JSON.stringify(window.CR_SMOKE_INSPECT())); }catch(e){}
  },250);

  /* ---- budgets (calibrate against a healthy build, then hold the line) ---- */
  var legacyMode=/[?&](?:world=legacy|legacy=1)(?:&|$)/.test(location.search);
  var SMOKE_BUDGETS = window.SMOKE_BUDGETS = legacyMode ? {
    bootMs:120000, settleMs:12000, minFps:25, maxWorstFrameMs:1500,
    maxDrawCalls:4500, maxTris:3500000, minTicks:4, walkTimeoutMs:30000, streamTimeoutMs:60000
  } : {
    bootMs:5000,             // shell + initial Holm region must remain responsive
    settleMs:2500,           // no hidden post-Play construction herd
    minFps:45,
    maxWorstFrameMs:150,
    maxDrawCalls:800,
    maxTris:900000,
    minTicks:4,
    walkTimeoutMs:10000,
    streamTimeoutMs:30000
  };

  var T0 = performance.now();
  var R = { verdict:'RUNNING', phases:{}, errors:ERRS, budgets:SMOKE_BUDGETS };
  window.SMOKE_RESULT = R;

  function waitFor(cond, timeoutMs){
    return new Promise(function(res){
      var t0=performance.now();
      (function poll(){
        var ok=false; try{ ok=!!cond(); }catch(e){}
        if(ok) return res(true);
        if(performance.now()-t0>timeoutMs) return res(false);
        setTimeout(poll, 150);
      })();
    });
  }
  function el(id){ return document.getElementById(id); }
  function click(id){ var b=el(id); if(b){ b.click(); return true; } return false; }

  /* ---- the on-screen badge (screenshot-visible verdict for the vision gate) ---- */
  function badge(text, pass){
    var b=el('smoke-badge');
    if(!b){ b=document.createElement('div'); b.id='smoke-badge';
      b.style.cssText='position:fixed;top:6px;left:50%;transform:translateX(-50%);z-index:200;'+
        'font:bold 12px Consolas,monospace;padding:4px 12px;border-radius:4px;cursor:pointer;'+
        'text-shadow:1px 1px 0 #000;border:1px solid #000;';
      b.title='Click to dump full SMOKE_RESULT to console';
      b.onclick=function(){ console.log('[SMOKE:FULL]', JSON.stringify(window.SMOKE_RESULT)); };
      document.body.appendChild(b);
    }
    b.textContent=text;
    b.style.background = pass===undefined ? '#4a4436' : (pass ? '#1e5c1e' : '#7c1410');
    b.style.color = '#fff';
  }

  /* ---- phase 4: real walk-flow (out and back along the click-to-move path) ---- */
  function walkTest(){
    return new Promise(function(res){
      var out={ok:false, note:''};
      try{
        var sx=player.position.x, sz=player.position.z;
        var offs=[[5,0],[-5,0],[0,5],[0,-5],[4,3],[-4,-3],[3,-4],[-3,4]];
        var tgt=null;
        for(var i=0;i<offs.length;i++){
          var tx=sx+offs[i][0], tz=sz+offs[i][1];
          var r=computePath(sx, sz, tx, tz);
          if(r.reached && r.pts.length>=4){ tgt={x:tx,z:tz}; break; }
        }
        if(!tgt){ out.note='no reachable target tile near spawn'; return res(out); }
        var t0=performance.now(), leg=1;
        orderWalk(new THREE.Vector3(tgt.x, 0, tgt.z));
        (function poll(){
          var dx, dz;
          if(leg===1){ dx=player.position.x-tgt.x; dz=player.position.z-tgt.z; }
          else       { dx=player.position.x-sx;    dz=player.position.z-sz;    }
          if(Math.hypot(dx,dz)<0.9){
            if(leg===1){ leg=2; orderWalk(new THREE.Vector3(sx, 0, sz)); return setTimeout(poll, 150); }
            out.ok=true; out.ms=Math.round(performance.now()-t0); out.note='out+back '+out.ms+'ms';
            return res(out);
          }
          if(performance.now()-t0>SMOKE_BUDGETS.walkTimeoutMs){ out.note='leg '+leg+' timed out'; return res(out); }
          setTimeout(poll, 150);
        })();
      }catch(e){ out.note='threw: '+e.message; res(out); }
    });
  }

  /* ---- phase 5: streamed boundary traversal + actual save/load round-trip ---- */
  function streamSaveTest(){
    return new Promise(function(res){
      var out={ok:false,note:''}, provider=null, originalSave=null, originalTimer=null,
        storeCaptured=false, restoredStore=false;
      try{
        provider=(typeof CRWorldMode!=='undefined'&&CRWorldMode.provider)||null;
        if(!provider||provider.renderStrategy!=='chunk-native-terrain'){
          out.ok=legacyMode; out.note=legacyMode?'legacy mode skipped':'chunk-native provider unavailable'; return res(out);
        }
        var sx=player.position.x, sz=player.position.z;
        var scx=WorldV2.tileToChunk(sx), scz=WorldV2.tileToChunk(sz);
        var startRuntime=provider.snapshot().runtime||{}, startObjects=startRuntime.objects||{};
        var objectChunks=(startObjects.catalogObjectChunks||[]).map(function(id){
          var p=id.split(','); return {cx:Number(p[0]),cz:Number(p[1])};
        });
        function evictsAuthoredObjects(ch){
          return objectChunks.some(function(o){
            return Math.abs(o.cx-ch.cx)>provider.residentRadius||Math.abs(o.cz-ch.cz)>provider.residentRadius;
          });
        }
        var chunks=provider.residentChunks().slice().sort(function(a,b){
          var da=Math.abs(a.cx-scx)+Math.abs(a.cz-scz), db=Math.abs(b.cx-scx)+Math.abs(b.cz-scz);
          return Number(!evictsAuthoredObjects(a))-Number(!evictsAuthoredObjects(b))||
            Math.abs(da-3)-Math.abs(db-3)||da-db||a.cz-b.cz||a.cx-b.cx;
        });
        var rect=provider.getWorldRect(), probes=[[4,4],[2,4],[6,4],[4,2],[4,6]], target=null, route=null;
        for(var ci=0;ci<chunks.length&&!target;ci++){
          var ch=chunks[ci], distance=Math.abs(ch.cx-scx)+Math.abs(ch.cz-scz);
          if(distance<3) continue;
          for(var pi=0;pi<probes.length;pi++){
            var tx=Math.max(rect.x0+0.5,Math.min(rect.x0+rect.w-0.5,ch.cx*8+probes[pi][0]+0.5));
            var tz=Math.max(rect.z0+0.5,Math.min(rect.z0+rect.h-0.5,ch.cz*8+probes[pi][1]+0.5));
            var candidate=computePath(sx,sz,tx,tz);
            if(candidate.reached&&candidate.pts.length>=10){ target={x:tx,z:tz,cx:ch.cx,cz:ch.cz}; route=candidate; break; }
          }
        }
        if(!target){ out.note='no reachable target three chunk boundaries away'; return res(out); }

        originalSave=Persist.store.get(SaveGame.KEY); storeCaptured=true;
        originalTimer=SaveGame.timer; SaveGame.timer=999;
        var durable=function(){ return JSON.stringify({xp:Player.xp,inv:Player.inv,bank:Player.bank,
          equip:Player.equip,quests:Player.quests,look:typeof CharCfg!=='undefined'?CharCfg:null}); };
        var durableBefore=durable(), startSnap=provider.snapshot(), crossings=0;
        var startMinimap=typeof CRMinimap!=='undefined'?CRMinimap.snapshot():null;
        var lastCenter=startSnap.lastCenter ? startSnap.lastCenter.cx+','+startSnap.lastCenter.cz : scx+','+scz;
        var residencyWorst=0, t0=performance.now();
        function observe(){
          var snap=provider.snapshot(), center=snap.lastCenter&&snap.lastCenter.cx+','+snap.lastCenter.cz;
          if(center&&center!==lastCenter){ crossings++; lastCenter=center; residencyWorst=Math.max(residencyWorst,snap.lastResidencyMs||0); }
        }
        function waitAt(point,done){
          // Each leg gets its OWN streamTimeoutMs budget (t0 stays global for out.ms),
          // plus a stall watchdog: no closest-approach progress for 8s = fail.
          var legT0=performance.now(), best=Infinity, lastProgress=legT0;
          (function poll(){
            observe();
            var d=Math.hypot(player.position.x-point.x,player.position.z-point.z);
            if(d<0.9) return done(true);
            if(d<best-0.25){ best=d; lastProgress=performance.now(); }
            if(performance.now()-legT0>SMOKE_BUDGETS.streamTimeoutMs) return done(false);
            if(performance.now()-lastProgress>8000) return done(false);
            setTimeout(poll,100);
          })();
        }
        orderWalk(new THREE.Vector3(target.x,0,target.z));
        waitAt(target,function(reached){
          if(!reached){ cleanup('outbound traversal timed out'); return; }
          if(typeof drawMinimap==='function') drawMinimap();
          var far={x:player.position.x,z:player.position.z};
          var saved=SaveGame.save(true), raw=Persist.store.get(SaveGame.KEY), payload=null;
          try{ payload=raw&&JSON.parse(raw); }catch(e){}
          Player.path=[]; Player.moveTo=null;
          player.position.set(sx,groundY(sx,sz),sz); provider.updateResidency(sx,sz,true);
          var loaded=saved&&SaveGame.load(); observe();
          var positionLoss=Math.hypot(player.position.x-far.x,player.position.z-far.z);
          var center=provider.snapshot().lastCenter;
          var centered=center&&center.cx===target.cx&&center.cz===target.cz;
          var progressSame=durable()===durableBefore;
          var payloadExact=payload&&Math.hypot(payload.pos[0]-far.x,payload.pos[1]-far.z)<0.001;
          restoredStore=true;
          if(originalSave===null||originalSave===undefined) Persist.store.del(SaveGame.KEY);
          else Persist.store.set(SaveGame.KEY,originalSave);
          if(!loaded||positionLoss>0.001||!centered||!progressSame||!payloadExact||!SaveGame.lastLoad.residencyCentered){
            cleanup('save/load mismatch'); return;
          }
          orderWalk(new THREE.Vector3(sx,0,sz));
          waitAt({x:sx,z:sz},function(returned){
            if(!returned){ cleanup('return traversal timed out'); return; }
            if(typeof drawMinimap==='function') drawMinimap();
            var end=provider.snapshot(), tr=end.runtime&&end.runtime.terrain, ob=end.runtime&&end.runtime.objects;
            var endMinimap=typeof CRMinimap!=='undefined'?CRMinimap.snapshot():null;
            out.boundaryCrossings=crossings; out.routeTiles=route.pts.length;
            out.saveLoadPositionError=+positionLoss.toFixed(4); out.progressLossless=progressSame;
            out.maxResidencyMs=+residencyWorst.toFixed(3);
            out.liveGeometries=tr&&tr.liveGeometries; out.residentChunks=end.residentChunks;
            out.disposed=end.unloaded-startSnap.unloaded;
            out.objectReleases=ob&&ob.instancesReleased-(startObjects.instancesReleased||0);
            out.objectCacheHits=ob&&ob.cacheHits-(startObjects.cacheHits||0);
            out.liveObjects=ob&&ob.liveInstances; out.objectBaseline=startObjects.liveInstances;
            out.objectExpected=provider.residentChunks().reduce(function(n,ch){return n+ch.layers.objects.length;},0);
            out.objectTemplates=ob&&ob.templates;
            out.minimapStaticRebuilds=endMinimap&&startMinimap?endMinimap.staticBuilds-startMinimap.staticBuilds:null;
            out.minimapMarkerRebuilds=endMinimap&&startMinimap?endMinimap.markerBuilds-startMinimap.markerBuilds:null;
            out.minimapDynamicMarkers=endMinimap&&endMinimap.dynamicMarkers;
            out.ms=Math.round(performance.now()-t0);
            out.ok=crossings>=3&&out.liveGeometries===out.residentChunks&&out.disposed>0&&
              residencyWorst<=SMOKE_BUDGETS.maxWorstFrameMs&&out.objectReleases>0&&out.objectCacheHits>0&&
              out.liveObjects===out.objectExpected&&out.objectTemplates>=startObjects.templates&&
              ob.templateBuilds===ob.templates&&out.minimapStaticRebuilds>=2&&
              out.minimapMarkerRebuilds>=2&&out.minimapDynamicMarkers<=endMinimap.dynamicLimit;
            out.note=out.ok?('crossed '+crossings+' boundaries; save/load exact'):'stream lifecycle assertion failed';
            cleanup();
          });
        });
        function cleanup(reason){
          try{
            SaveGame.timer=originalTimer;
            if(storeCaptured&&!restoredStore){
              if(originalSave===null||originalSave===undefined) Persist.store.del(SaveGame.KEY);
              else Persist.store.set(SaveGame.KEY,originalSave);
            }
          }catch(e){}
          if(reason) out.note=reason;
          res(out);
        }
      }catch(e){
        try{ if(originalTimer!==null) SaveGame.timer=originalTimer;
          if(storeCaptured){
            if(originalSave===null||originalSave===undefined) Persist.store.del(SaveGame.KEY);
            else Persist.store.set(SaveGame.KEY,originalSave);
          } }catch(ignore){}
        out.note='threw: '+e.message; res(out);
      }
    });
  }

  /* ---- phase 6: perf sample (FPS + worst frame + renderer stats + tick health) ----
   * Background tab: rAF is FROZEN (the Studio capture gotcha) — only the setInterval
   * heartbeat runs the sim. There FPS is meaningless: sample ticks + last-frame renderer
   * stats via setTimeout instead, and report fps:null (not a failure). */
  function perfSample(seconds){
    var recentlyOccluded=!!(window.CR_LAST_OCCLUDED_AT&&performance.now()-window.CR_LAST_OCCLUDED_AT<2500);
    if(document.hidden||recentlyOccluded) return new Promise(function(res){
      // hidden-tab timers throttle to ~1Hz AND Chrome budget-throttles harder right after
      // the heavy boot drains the background CPU budget — observed 2026-07-06: the smoke
      // window read 2-4 ticks while a steady-state probe minutes later read 9 in 5.9s.
      // So in a hidden tab the tick check only asserts the sim is ALIVE (≥1); the walk
      // phase already proves real-time progression, and true tick-rate QA needs a
      // foreground run. Sample 2× longer for a fair read.
      var ticks0 = (typeof worldTickCount!=='undefined') ? worldTickCount : null;
      var t0=performance.now(), dur=seconds*2000;
      setTimeout(function(){
        var calls=0, tris=0; try{ calls=renderer.info.render.calls; tris=renderer.info.render.triangles; }catch(e){}
        var elapsed=(performance.now()-t0)/1000;
        var ticks=(ticks0===null||typeof worldTickCount==='undefined')?null:(worldTickCount-ticks0);
        res({ fps:null, worstFrameMs:null, hiddenTab:document.hidden, occludedTab:recentlyOccluded,
              drawCalls:calls, triangles:tris,
              ticks:ticks, tickWindowS:+elapsed.toFixed(1),
              minTicksEff:(ticks===null)?null:1 });
      }, dur);
    });
    return new Promise(function(res){
      var frames=0, worst=0, last=performance.now(), t0=last;
      var ticks0 = (typeof worldTickCount!=='undefined') ? worldTickCount : null;
      var calls=0, tris=0;
      (function frame(){
        var now=performance.now(), dt=now-last; last=now;
        frames++; if(dt>worst) worst=dt;
        try{ calls=renderer.info.render.calls; tris=renderer.info.render.triangles; }catch(e){}
        if(now-t0 < seconds*1000) return requestAnimationFrame(frame);
        res({ fps:Math.round(frames/((now-t0)/1000)), worstFrameMs:Math.round(worst),
              drawCalls:calls, triangles:tris,
              ticks:(ticks0===null||typeof worldTickCount==='undefined')?null:(worldTickCount-ticks0) });
      })();
    });
  }

  /* ---- the run ---- */
  (async function run(){
    badge('SMOKE: booting…');

    // 1. loading sequence → welcome screen
    var booted = await waitFor(function(){ return el('welcome-screen') && el('welcome-screen').style.display==='flex'; }, SMOKE_BUDGETS.bootMs);
    R.phases.boot = { ok:booted, ms:Math.round(performance.now()-T0) };
    if(!booted) return finish('boot never reached the welcome screen');

    // 2. the REAL login flow (continue if a save exists — never wipe one)
    badge('SMOKE: logging in…');
    var hadSave=false; try{ hadSave = SaveGame.exists(); }catch(e){}
    if(hadSave){ click('btn-continue'); }
    else { click('btn-new'); await waitFor(function(){ return el('login-create').style.display!=='none'; }, 4000); click('btn-begin'); }
    var atPlay = await waitFor(function(){ return el('login-play').style.display!=='none'; }, 6000);
    if(!atPlay) return finish('login flow never reached the play screen');
    try{ CharCfg._new=false; }catch(e){}    // suppress the Character Design modal — it blocks the walk test
    click('play-btn');
    var tPlay=performance.now();
    var settled = await waitFor(function(){
      if(typeof running==='undefined' || !running) return false;
      var buf=el('enter-buffer');
      if(!buf || buf.style.display==='none') return true;
      // background tab: the buffer's fade is rAF-driven and rAF is frozen — the heartbeat
      // still runs the sim, so treat >4s of `running` as settled there.
      return document.hidden && (performance.now()-tPlay)>4000;
    }, SMOKE_BUDGETS.settleMs+8000);
    R.phases.enter = { ok:settled, hadSave:hadSave, settleMs:Math.round(performance.now()-tPlay) };
    if(!settled) return finish('world never settled after play');

    // The cellar shell can settle before its paired surface workyard enters the
    // scene. Let both sides of that traversal bind before inspecting them; this
    // still fails normally if the hatch/ladder pair never becomes ready.
    await waitFor(function(){
      if(typeof HolmSurvivalCellar==='undefined')return true;
      var cellar=HolmSurvivalCellar.snapshot();
      return cellar.ready&&cellar.ladderTemplateReady&&cellar.ladderAssetReady&&
        cellar.cellarWallLadderOnly&&cellar.cellarClimbUpSound&&
        cellar.legacyCellarLadderHidden&&cellar.legacySurfaceLadderHidden;
    },3500);

    // Chunk geometry can become resident one task before its asynchronously
    // prepared authored props are attached.  Wait for those two ledgers to
    // agree so the structural gate measures a settled region rather than an
    // arbitrary asset-callback boundary.
    await waitFor(function(){
      try{
        var provider=typeof CRWorldMode!=='undefined'&&CRWorldMode.provider;
        if(!provider||provider.renderStrategy!=='chunk-native-terrain')return true;
        var expected=provider.residentChunks().reduce(function(n,ch){return n+ch.layers.objects.length;},0);
        var objects=typeof WorldV2Objects!=='undefined'&&WorldV2Objects.snapshot();
        return objects&&objects.liveInstances===expected;
      }catch(e){return false;}
    },3500);

    // The minimap paints on rAF during normal play, but a newly created or
    // background test tab can reach the synchronous structural suite before
    // its first frame. Drive one real paint while waiting so the suite tests
    // the cache contract instead of browser-tab scheduling luck.
    await waitFor(function(){
      try{
        if(typeof drawMinimap==='function') drawMinimap();
        var map=el('minimap'),snap=typeof CRMinimap!=='undefined'&&CRMinimap.snapshot();
        var px=map&&map.getContext('2d').getImageData(72,72,1,1).data;
        return !!px&&px[3]>0&&snap&&snap.staticBuilds>=1&&snap.markerBuilds>=1;
      }catch(e){ return false; }
    },3500);

    // 3. structural suite (tools/smoke_test.js)
    badge('SMOKE: structural…');
    if(!window.CR_smoke){ var s=document.createElement('script'); s.src='tools/smoke_test.js?_='+Date.now(); document.head.appendChild(s); }
    await waitFor(function(){ return typeof window.CR_smoke==='function'; }, 8000);
    try{ var cs=window.CR_smoke(); R.phases.structural={ ok:cs.fail===0, pass:cs.pass, fail:cs.fail, failures:cs.failures }; }
    catch(e){ R.phases.structural={ ok:false, note:'threw: '+e.message }; }

    // 4. walk flow
    badge('SMOKE: walking…');
    R.phases.walk = await walkTest();

    // 5. three chunk boundaries + real save/load
    badge('SMOKE: streaming + save…');
    R.phases.stream = await streamSaveTest();

    // 6. perf + budgets
    badge('SMOKE: perf sample…');
    var p = await perfSample(4);
    p.ok = (p.fps===null || p.fps>=SMOKE_BUDGETS.minFps) &&
           (p.worstFrameMs===null || p.worstFrameMs<=SMOKE_BUDGETS.maxWorstFrameMs) &&
           p.drawCalls<=SMOKE_BUDGETS.maxDrawCalls && p.triangles<=SMOKE_BUDGETS.maxTris &&
           (p.ticks===null || p.ticks>=(p.minTicksEff!=null?p.minTicksEff:SMOKE_BUDGETS.minTicks)) &&
           R.phases.boot.ms<=SMOKE_BUDGETS.bootMs && R.phases.enter.settleMs<=SMOKE_BUDGETS.settleMs;
    R.phases.perf = p;

    finish();
  })().catch(function(e){ rec('console','smoke runner threw: '+e.message); finish('runner threw'); });

  function finish(fatal){
    var errs = ERRS.filter(function(e){ return e.kind==='uncaught'||e.kind==='promise'; });
    var cerrs= ERRS.filter(function(e){ return e.kind==='console'; });
    R.phases.console = { ok:errs.length===0 && cerrs.length===0, uncaught:errs.length, consoleErrors:cerrs.length };
    var ok = !fatal && Object.keys(R.phases).every(function(k){ return R.phases[k].ok; });
    R.verdict = ok ? 'PASS' : 'FAIL';
    if(fatal) R.fatal = fatal;
    R.totalMs = Math.round(performance.now()-T0);
    var jsonOut=el('smoke-result-json');
    if(!jsonOut){ jsonOut=document.createElement('output'); jsonOut.id='smoke-result-json'; jsonOut.hidden=true; document.body.appendChild(jsonOut); }
    jsonOut.textContent=JSON.stringify(R);
    var brief = R.verdict+(fatal?' ('+fatal+')':'')
      +' · boot '+Math.round((R.phases.boot?R.phases.boot.ms:0)/1000)+'s'
      +(R.phases.perf?(' · '+(R.phases.perf.fps===null?'hidden-tab':R.phases.perf.fps+'fps')+' · '+R.phases.perf.drawCalls+' calls'):'')
      +(R.phases.structural?(' · struct '+(R.phases.structural.pass||0)+'/'+((R.phases.structural.pass||0)+(R.phases.structural.fail||0))):'')
      +' · errors '+(R.phases.console.uncaught+R.phases.console.consoleErrors);
    badge('SMOKE '+brief, ok);
    try{ console.log('[SMOKE] '+JSON.stringify(R)); }catch(e){ console.log('[SMOKE] verdict='+R.verdict); }
  }
})();
