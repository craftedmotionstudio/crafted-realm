/* ================= FURNISHING SOUND EFFECTS =================
 * Small, synthesized medieval prop sounds routed through the game's existing
 * Sfx master gain. They add no download weight and obey the saved SFX volume.
 */
var SfxFurnishings=(function(){
  'use strict';
  var closeTimer=0,lastEvent=null,lastThud=0,lastHearth=0,lastClimb=0,lastWaterworks=0,lastFishing=0;

  function audio(){
    if(typeof Sfx==='undefined'||!Sfx.ensure) return null;
    try{return Sfx.ensure();}catch(error){return null;}
  }
  function output(ctx){return Sfx._master||ctx.destination;}

  function woodCreak(ctx,start,duration,startHz,endHz,volume){
    var oscillator=ctx.createOscillator(),wobble=ctx.createOscillator();
    var wobbleDepth=ctx.createGain(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
    oscillator.type='sawtooth'; oscillator.frequency.setValueAtTime(startHz,start);
    oscillator.frequency.exponentialRampToValueAtTime(endHz,start+duration);
    wobble.type='triangle'; wobble.frequency.setValueAtTime(6.2,start);
    wobble.frequency.linearRampToValueAtTime(9.4,start+duration);
    wobbleDepth.gain.value=15;
    wobble.connect(wobbleDepth); wobbleDepth.connect(oscillator.frequency);
    filter.type='lowpass'; filter.frequency.setValueAtTime(720,start);
    filter.frequency.exponentialRampToValueAtTime(260,start+duration);
    filter.Q.value=1.8;
    gain.gain.setValueAtTime(.0001,start);
    gain.gain.linearRampToValueAtTime(volume,start+.055);
    gain.gain.linearRampToValueAtTime(volume*.22,start+duration*.25);
    gain.gain.linearRampToValueAtTime(volume*.82,start+duration*.48);
    gain.gain.linearRampToValueAtTime(volume*.18,start+duration*.68);
    gain.gain.linearRampToValueAtTime(volume*.55,start+duration*.82);
    gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
    oscillator.connect(filter); filter.connect(gain); gain.connect(output(ctx));
    oscillator.start(start); wobble.start(start);
    oscillator.stop(start+duration+.02); wobble.stop(start+duration+.02);
  }

  function hingeNoise(ctx,start,duration,volume){
    if(!Sfx._noiseBuf) return;
    var source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
    source.buffer=Sfx._noiseBuf; source.loop=true;
    filter.type='bandpass'; filter.frequency.setValueAtTime(1250,start);
    filter.frequency.exponentialRampToValueAtTime(310,start+duration);
    filter.Q.value=5.2;
    gain.gain.setValueAtTime(.0001,start);
    gain.gain.linearRampToValueAtTime(volume,start+.035);
    gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
    source.connect(filter); filter.connect(gain); gain.connect(output(ctx));
    source.start(start); source.stop(start+duration+.02);
  }

  function shortTone(ctx,start,frequency,endFrequency,duration,type,volume){
    var oscillator=ctx.createOscillator(),gain=ctx.createGain();
    oscillator.type=type||'triangle'; oscillator.frequency.setValueAtTime(frequency,start);
    oscillator.frequency.exponentialRampToValueAtTime(endFrequency,start+duration);
    gain.gain.setValueAtTime(volume,start);
    gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
    oscillator.connect(gain); gain.connect(output(ctx));
    oscillator.start(start); oscillator.stop(start+duration+.01);
  }

  function closingThud(){
    closeTimer=0;
    var ctx=audio(); if(!ctx) return;
    var start=ctx.currentTime+.005;
    shortTone(ctx,start,105,48,.19,'sine',.105);
    shortTone(ctx,start+.018,510,235,.075,'square',.018);
    if(Sfx._noiseBuf){
      var source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
      source.buffer=Sfx._noiseBuf; source.loop=true;
      filter.type='lowpass'; filter.frequency.value=420; filter.Q.value=.8;
      gain.gain.setValueAtTime(.09,start);
      gain.gain.exponentialRampToValueAtTime(.0001,start+.16);
      source.connect(filter); filter.connect(gain); gain.connect(output(ctx));
      source.start(start); source.stop(start+.18);
    }
    lastThud=Date.now();
  }

  function chestOpen(duration){
    if(closeTimer){clearTimeout(closeTimer);closeTimer=0;}
    var ctx=audio(); if(!ctx) return;
    var start=ctx.currentTime+.008,d=Math.max(.52,Math.min(.92,(duration||.8)*.92));
    // Small latch release, then old timber and an uneven iron hinge.
    shortTone(ctx,start,820,540,.055,'square',.018);
    woodCreak(ctx,start+.035,d,142,64,.046);
    hingeNoise(ctx,start+.06,d*.88,.025);
    lastEvent={type:'open',at:Date.now(),duration:+d.toFixed(3)};
  }

  function chestClose(duration){
    if(closeTimer){clearTimeout(closeTimer);closeTimer=0;}
    var ctx=audio(); if(!ctx) return;
    var start=ctx.currentTime+.008,d=Math.max(.42,Math.min(.72,(duration||.8)*.67));
    woodCreak(ctx,start,d,96,58,.033);
    hingeNoise(ctx,start+.015,d*.82,.017);
    // Meet the animated lid at the frame where it contacts the chest body.
    closeTimer=setTimeout(closingThud,Math.max(220,Math.round((duration||.8)*760)));
    lastEvent={type:'close',at:Date.now(),duration:+d.toFixed(3)};
  }

  function hearthCrackle(){
    var ctx=audio();if(!ctx)return;
    var start=ctx.currentTime+.01;
    // Three restrained ember snaps with a soft low fire body.  This is a short
    // interaction cue rather than a permanent loop, so it never becomes tiring
    // during long cellar sessions and still obeys the game's SFX master.
    shortTone(ctx,start,118,76,.34,'triangle',.018);
    [0,.13,.29].forEach(function(offset,index){
      shortTone(ctx,start+offset,920-index*115,310-index*28,.035,'square',.010-index*.0015);
      if(Sfx._noiseBuf){
        var source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
        source.buffer=Sfx._noiseBuf;filter.type='bandpass';filter.frequency.value=1150-index*170;filter.Q.value=2.6;
        gain.gain.setValueAtTime(.015,start+offset);gain.gain.exponentialRampToValueAtTime(.0001,start+offset+.075);
        source.connect(filter);filter.connect(gain);gain.connect(output(ctx));
        source.start(start+offset);source.stop(start+offset+.08);
      }
    });
    lastHearth=Date.now();lastEvent={type:'hearth',at:lastHearth,duration:.37};
  }

  function ladderClimb(direction){
    var ctx=audio();if(!ctx)return;
    var start=ctx.currentTime+.01;
    var pitches=direction==='up'?[92,104,116,128]:[128,116,104,92];
    pitches.forEach(function(pitch,index){
      var at=start+index*.18;
      woodCreak(ctx,at,.20,pitch,pitch*.72,.0135);
      shortTone(ctx,at+.055,72-index*3,48,.10,'triangle',.017);
    });
    // A final planted foot keeps the cue tactile without turning it into a loud
    // cinematic ladder sequence.
    shortTone(ctx,start+.75,direction==='up'?88:68,42,.16,'sine',.028);
    lastClimb=Date.now();lastEvent={type:'climb-'+direction,at:lastClimb,duration:.91};
  }
  function climbDown(){ladderClimb('down');}
  function climbUp(){ladderClimb('up');}

  function pulleyCreak(direction){
    var ctx=audio();if(!ctx)return;
    var start=ctx.currentTime+.01,raising=direction==='raise';
    woodCreak(ctx,start,.78,raising?78:112,raising?126:68,.020);
    hingeNoise(ctx,start+.04,.58,.010);
    // A few quiet pawl clicks make the crank legible without becoming harsh.
    [0,.23,.46].forEach(function(offset,index){
      shortTone(ctx,start+offset,raising?430+index*25:510-index*35,250,.045,'square',.007);
    });
    lastWaterworks=Date.now();lastEvent={type:'pulley-'+direction,at:lastWaterworks,duration:.82};
  }

  function waterSplash(){
    var ctx=audio();if(!ctx)return;
    var start=ctx.currentTime+.01;
    if(Sfx._noiseBuf){
      var source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
      source.buffer=Sfx._noiseBuf;filter.type='bandpass';filter.frequency.value=880;filter.Q.value=.75;
      gain.gain.setValueAtTime(.045,start);gain.gain.exponentialRampToValueAtTime(.0001,start+.36);
      source.connect(filter);filter.connect(gain);gain.connect(output(ctx));
      source.start(start);source.stop(start+.38);
    }
    shortTone(ctx,start+.03,210,92,.28,'sine',.020);
    lastWaterworks=Date.now();lastEvent={type:'water-splash',at:lastWaterworks,duration:.38};
  }

  function bucketSettle(){
    var ctx=audio();if(!ctx)return;
    var start=ctx.currentTime+.01;
    shortTone(ctx,start,138,70,.19,'triangle',.026);
    shortTone(ctx,start+.025,720,390,.08,'square',.009);
    lastWaterworks=Date.now();lastEvent={type:'bucket-settle',at:lastWaterworks,duration:.22};
  }

  function netCast(){
    var ctx=audio();if(!ctx)return;
    var start=ctx.currentTime+.01;
    // Soft rope-and-mesh swish followed by a small surface contact.  The cue is
    // deliberately quieter than the pulley so repeated fishing remains cozy.
    if(Sfx._noiseBuf){
      var source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
      source.buffer=Sfx._noiseBuf;filter.type='bandpass';filter.frequency.setValueAtTime(1150,start);
      filter.frequency.exponentialRampToValueAtTime(430,start+.34);filter.Q.value=.8;
      gain.gain.setValueAtTime(.0001,start);gain.gain.linearRampToValueAtTime(.018,start+.05);
      gain.gain.exponentialRampToValueAtTime(.0001,start+.38);
      source.connect(filter);filter.connect(gain);gain.connect(output(ctx));source.start(start);source.stop(start+.4);
    }
    shortTone(ctx,start+.22,164,88,.24,'sine',.012);
    lastFishing=Date.now();lastEvent={type:'net-cast',at:lastFishing,duration:.46};
  }

  function fishBite(){
    var ctx=audio();if(!ctx)return;
    var start=ctx.currentTime+.01;
    if(Sfx._noiseBuf){
      var source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
      source.buffer=Sfx._noiseBuf;filter.type='bandpass';filter.frequency.value=980;filter.Q.value=1.1;
      gain.gain.setValueAtTime(.026,start);gain.gain.exponentialRampToValueAtTime(.0001,start+.22);
      source.connect(filter);filter.connect(gain);gain.connect(output(ctx));source.start(start);source.stop(start+.24);
    }
    shortTone(ctx,start+.025,285,122,.20,'sine',.014);
    lastFishing=Date.now();lastEvent={type:'fish-bite',at:lastFishing,duration:.24};
  }

  function fishCatch(){
    var ctx=audio();if(!ctx)return;
    var start=ctx.currentTime+.01;
    // A wet lift and a muted creel tap timed to the exact-once reward frame.
    if(Sfx._noiseBuf){
      var source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
      source.buffer=Sfx._noiseBuf;filter.type='lowpass';filter.frequency.value=640;
      gain.gain.setValueAtTime(.020,start);gain.gain.exponentialRampToValueAtTime(.0001,start+.31);
      source.connect(filter);filter.connect(gain);gain.connect(output(ctx));source.start(start);source.stop(start+.33);
    }
    shortTone(ctx,start+.14,126,58,.24,'triangle',.020);
    shortTone(ctx,start+.25,390,205,.07,'square',.006);
    lastFishing=Date.now();lastEvent={type:'fish-catch',at:lastFishing,duration:.39};
  }

  return {
    profile:'cellar-furnishings-v2',
    chestOpen:chestOpen,
    chestClose:chestClose,
    hearthCrackle:hearthCrackle,
    climbDown:climbDown,
    climbUp:climbUp,
    pulleyCreak:pulleyCreak,
    waterSplash:waterSplash,
    bucketSettle:bucketSettle,
    netCast:netCast,
    fishBite:fishBite,
    fishCatch:fishCatch,
    snapshot:function(){return {profile:this.profile,lastEvent:lastEvent,lastThud:lastThud,
      lastHearth:lastHearth,lastClimb:lastClimb,pendingCloseThud:!!closeTimer,
      lastWaterworks:lastWaterworks,lastFishing:lastFishing,
      respectsMaster:typeof Sfx!=='undefined'};}
  };
})();
