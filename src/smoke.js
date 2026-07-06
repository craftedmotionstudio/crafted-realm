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
 *   5. samples perf for 4s (FPS, worst frame, draw calls, triangles, world ticks alive)
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

  /* ---- budgets (calibrate against a healthy build, then hold the line) ---- */
  var SMOKE_BUDGETS = window.SMOKE_BUDGETS = {
    bootMs:   120000,   // script eval → welcome screen (the harness sees 60-90s boots)
    settleMs: 12000,    // play click → enter-buffer faded (prop-settle freeze budget)
    minFps:   25,       // 4s average after settle
    maxWorstFrameMs: 1500, // no multi-second render freeze once settled
    maxDrawCalls: 4500, // renderer.info.render.calls on a settled frame
    maxTris:  3500000,  // scene triangle budget
    minTicks: 4,        // world ticks during the 4s sample (600ms tick → ~6 expected)
    walkTimeoutMs: 30000
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

  /* ---- phase 5: perf sample (FPS + worst frame + renderer stats + tick health) ----
   * Background tab: rAF is FROZEN (the Studio capture gotcha) — only the setInterval
   * heartbeat runs the sim. There FPS is meaningless: sample ticks + last-frame renderer
   * stats via setTimeout instead, and report fps:null (not a failure). */
  function perfSample(seconds){
    if(document.hidden) return new Promise(function(res){
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
        res({ fps:null, worstFrameMs:null, hiddenTab:true, drawCalls:calls, triangles:tris,
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

    // 3. structural suite (tools/smoke_test.js)
    badge('SMOKE: structural…');
    if(!window.CR_smoke){ var s=document.createElement('script'); s.src='tools/smoke_test.js?_='+Date.now(); document.head.appendChild(s); }
    await waitFor(function(){ return typeof window.CR_smoke==='function'; }, 8000);
    try{ var cs=window.CR_smoke(); R.phases.structural={ ok:cs.fail===0, pass:cs.pass, fail:cs.fail, failures:cs.failures }; }
    catch(e){ R.phases.structural={ ok:false, note:'threw: '+e.message }; }

    // 4. walk flow
    badge('SMOKE: walking…');
    R.phases.walk = await walkTest();

    // 5. perf + budgets
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
    var brief = R.verdict+(fatal?' ('+fatal+')':'')
      +' · boot '+Math.round((R.phases.boot?R.phases.boot.ms:0)/1000)+'s'
      +(R.phases.perf?(' · '+(R.phases.perf.fps===null?'hidden-tab':R.phases.perf.fps+'fps')+' · '+R.phases.perf.drawCalls+' calls'):'')
      +(R.phases.structural?(' · struct '+(R.phases.structural.pass||0)+'/'+((R.phases.structural.pass||0)+(R.phases.structural.fail||0))):'')
      +' · errors '+(R.phases.console.uncaught+R.phases.console.consoleErrors);
    badge('SMOKE '+brief, ok);
    try{ console.log('[SMOKE] '+JSON.stringify(R)); }catch(e){ console.log('[SMOKE] verdict='+R.verdict); }
  }
})();
