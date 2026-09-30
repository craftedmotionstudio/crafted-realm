/* The sounds the sound pass (2026-09-29) replaced, kept only so the owner can hear old against new on the sound board
 * (tools/sound_board.html) and so tools/render_sfx.js can render both. Each is a faithful port of the code as it stood at
 * live 16448ba3: Sfx.* (src/game3_systems.js), LevelUpFX.sound (src/fx_levelup.js), SfxFurnishings (src/sfx_furnishings.js),
 * CombatFX's voices (src/combat_fx.js), and the inline cues of src/holm_island_anim.js, src/holm_fishing.js, src/holm_mill.js.
 * The game never loads this file. */
var SfxLegacy=(function(){
 'use strict';
 var seed=0x1e7e1a;function rnd(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}
 var bufs=[];function noiseBuf(ctx,sec){for(var i=0;i<bufs.length;i++)if(bufs[i].ctx===ctx&&bufs[i].sec===sec)return bufs[i].b;
  var len=Math.floor(ctx.sampleRate*sec),b=ctx.createBuffer(1,len,ctx.sampleRate),d=b.getChannelData(0);for(var j=0;j<len;j++)d[j]=rnd()*2-1;bufs.push({ctx:ctx,sec:sec,b:b});return b}
 // the old Sfx.noise / Sfx.tone, with a start offset (the old code used setTimeout for the later notes)
 function K(ctx,out,t0){var nb=noiseBuf(ctx,1);return {
  noise:function(dur,freq,q,vol,type,slideTo,at){var t=t0+(at||0),src=ctx.createBufferSource();src.buffer=nb;src.loop=true;var f=ctx.createBiquadFilter();f.type=type||'bandpass';f.frequency.setValueAtTime(freq,t);f.Q.value=q||1;
   if(slideTo)f.frequency.exponentialRampToValueAtTime(slideTo,t+dur);var g=ctx.createGain();g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);src.connect(f);f.connect(g);g.connect(out);src.start(t);src.stop(t+dur)},
  tone:function(freq,dur,type,vol,slideTo,at){var t=t0+(at||0),o=ctx.createOscillator(),g=ctx.createGain();o.type=type||'sine';o.frequency.setValueAtTime(freq,t);if(slideTo)o.frequency.exponentialRampToValueAtTime(slideTo,t+dur);
   g.gain.setValueAtTime(vol||.05,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(g);g.connect(out);o.start(t);o.stop(t+dur)},
  ctx:ctx,out:out,t0:t0,nb:nb}}
 // SfxFurnishings helpers
 function woodCreak(k,start,duration,startHz,endHz,volume){var ctx=k.ctx,o=ctx.createOscillator(),w=ctx.createOscillator(),wd=ctx.createGain(),f=ctx.createBiquadFilter(),g=ctx.createGain();
  o.type='sawtooth';o.frequency.setValueAtTime(startHz,start);o.frequency.exponentialRampToValueAtTime(endHz,start+duration);w.type='triangle';w.frequency.setValueAtTime(6.2,start);w.frequency.linearRampToValueAtTime(9.4,start+duration);
  wd.gain.value=15;w.connect(wd);wd.connect(o.frequency);f.type='lowpass';f.frequency.setValueAtTime(720,start);f.frequency.exponentialRampToValueAtTime(260,start+duration);f.Q.value=1.8;
  g.gain.setValueAtTime(.0001,start);g.gain.linearRampToValueAtTime(volume,start+.055);g.gain.linearRampToValueAtTime(volume*.22,start+duration*.25);g.gain.linearRampToValueAtTime(volume*.82,start+duration*.48);
  g.gain.linearRampToValueAtTime(volume*.18,start+duration*.68);g.gain.linearRampToValueAtTime(volume*.55,start+duration*.82);g.gain.exponentialRampToValueAtTime(.0001,start+duration);
  o.connect(f);f.connect(g);g.connect(k.out);o.start(start);w.start(start);o.stop(start+duration+.02);w.stop(start+duration+.02)}
 function hinge(k,start,duration,volume){var ctx=k.ctx,s=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain();s.buffer=k.nb;s.loop=true;f.type='bandpass';f.frequency.setValueAtTime(1250,start);
  f.frequency.exponentialRampToValueAtTime(310,start+duration);f.Q.value=5.2;g.gain.setValueAtTime(.0001,start);g.gain.linearRampToValueAtTime(volume,start+.035);g.gain.exponentialRampToValueAtTime(.0001,start+duration);
  s.connect(f);f.connect(g);g.connect(k.out);s.start(start);s.stop(start+duration+.02)}
 function st(k,start,frequency,endFrequency,duration,type,volume){var ctx=k.ctx,o=ctx.createOscillator(),g=ctx.createGain();o.type=type||'triangle';o.frequency.setValueAtTime(frequency,start);
  o.frequency.exponentialRampToValueAtTime(endFrequency,start+duration);g.gain.setValueAtTime(volume,start);g.gain.exponentialRampToValueAtTime(.0001,start+duration);o.connect(g);g.connect(k.out);o.start(start);o.stop(start+duration+.01)}
 function fn(k,start,type,freq,q,vol,dur){var ctx=k.ctx,s=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain();s.buffer=k.nb;s.loop=true;f.type=type;f.frequency.value=freq;f.Q.value=q;
  g.gain.setValueAtTime(vol,start);g.gain.exponentialRampToValueAtTime(.0001,start+dur);s.connect(f);f.connect(g);g.connect(k.out);s.start(start);s.stop(start+dur+.02)}
 // CombatFX voices
 function ct(k,type,f0,f1,t,dur,peak,att){var c=k.ctx,o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(f0,t);if(f1&&f1!==f0)o.frequency.exponentialRampToValueAtTime(f1,t+dur);
  g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(peak,t+(att||.004));g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(g);g.connect(k.out);o.start(t);o.stop(t+dur+.02)}
 function cn(k,ft,f0,f1,q,t,dur,peak,att){var c=k.ctx,s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();s.buffer=k.nb;s.loop=true;f.type=ft;f.frequency.setValueAtTime(f0,t);if(f1&&f1!==f0)f.frequency.exponentialRampToValueAtTime(f1,t+dur);f.Q.value=q||1;
  g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(peak,t+(att||.004));g.gain.exponentialRampToValueAtTime(.0001,t+dur);s.connect(f);f.connect(g);g.connect(k.out);s.start(t,rnd()*.8);s.stop(t+dur+.02)}
 function lvlSound(k){var ctx=k.ctx,dest=k.out,t0=k.t0+.02,buf=noiseBuf(ctx,.6);
  function env(g,t,att,peak,dec){g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(peak,t+att);g.gain.exponentialRampToValueAtTime(.0001,t+att+dec)}
  function hiss(t,att,dec,type,f0,f1,q,peak){var s=ctx.createBufferSource();s.buffer=buf;s.loop=true;var f=ctx.createBiquadFilter();f.type=type;f.frequency.setValueAtTime(f0,t);if(f1)f.frequency.exponentialRampToValueAtTime(f1,t+att+dec);f.Q.value=q;var g=ctx.createGain();env(g,t,att,peak,dec);
   s.connect(f);f.connect(g);g.connect(dest);s.start(t,rnd()*.4);s.stop(t+att+dec+.05)}
  function tone(t,freq,type,att,dec,peak,f1){var o=ctx.createOscillator();o.type=type;o.frequency.setValueAtTime(freq,t);if(f1)o.frequency.exponentialRampToValueAtTime(f1,t+att+dec);var g=ctx.createGain();env(g,t,att,peak,dec);o.connect(g);g.connect(dest);o.start(t);o.stop(t+att+dec+.05)}
  hiss(t0,.34,.12,'bandpass',320,2400,1.3,.035);hiss(t0+.47,.004,.1,'lowpass',1500,480,.7,.05);tone(t0+.47,170,'sine',.004,.12,.035,80);hiss(t0+.63,.004,.09,'lowpass',1150,420,.7,.035);tone(t0+.63,150,'sine',.004,.11,.025,75);
  for(var i=0;i<10;i++)hiss(t0+.52+rnd()*.62,.002,.018+rnd()*.02,'highpass',3200+rnd()*2400,0,.8,.007+rnd()*.009);
  [[880,.55],[1108.73,.62]].forEach(function(nt){tone(t0+nt[1],nt[0],'sine',.012,1.2,.03);tone(t0+nt[1],nt[0]*2,'sine',.01,.6,.009);tone(t0+nt[1],nt[0]*2.76,'sine',.006,.25,.004)})}
 var S={
  'Sfx.click':function(k){k.tone(700,.04,'square',.015)},
  'Sfx.quest':function(k){k.tone(392,.14,'square',.05);k.tone(523,.2,'square',.05,0,.14)},
  'Sfx.questDone':function(k){k.tone(440,.12,'square',.05);k.tone(554,.12,'square',.05,0,.12);k.tone(659,.22,'square',.05,0,.24)},
  'Sfx.level':lvlSound,
  'Sfx.coin':function(k){k.tone(1180,.06,'sine',.06);k.tone(1560,.08,'sine',.05)},
  'Sfx.eat':function(k){k.noise(.09,500,1,.07,'lowpass');k.tone(220,.06,'triangle',.04)},
  'Sfx.chop':function(k){k.noise(.07,700,2,.12,'bandpass',200);k.tone(160,.06,'triangle',.08,90)},
  'Sfx.mine':function(k){k.tone(2300,.05,'square',.035,1400);k.noise(.05,4500,4,.05,'highpass')},
  'Sfx.smith':function(k){k.tone(1850,.07,'square',.05,980);k.noise(.08,3200,3,.045,'highpass')},
  'Sfx.smelt':function(k){k.noise(.34,620,.8,.055,'lowpass',260);k.tone(170,.28,'triangle',.035,105)},
  'Sfx.splash':function(k){k.noise(.35,900,.8,.08,'lowpass',250)},
  'Sfx.treeFall':function(k){k.noise(.5,300,.8,.1,'lowpass',80)},
  'Sfx.death':function(k){k.tone(300,.5,'sawtooth',.08,60)},
  'Sfx.kill':function(k){k.tone(150,.35,'sawtooth',.06,55)},
  'anvil clink (square)':function(k){k.tone(2350,.05,'square',.02,1500);k.noise(.05,3600,3,.02,'highpass')},
  'tree landing':function(k){k.noise(.3,240,.8,.08,'lowpass',70);k.tone(70,.22,'sine',.05,45)},
  'bell ding (sines)':function(k){var v=.05;k.tone(988,1.1,'sine',v);k.tone(1976,.5,'sine',v*.35);k.tone(1318,.8,'triangle',v*.25)},
  'chestOpen':function(k){var s=k.t0+.008,d=Math.max(.52,Math.min(.92,.6*.92));st(k,s,820,540,.055,'square',.018);woodCreak(k,s+.035,d,142,64,.046);hinge(k,s+.06,d*.88,.025)},
  'chestClose':function(k){var s=k.t0+.008,d=Math.max(.42,Math.min(.72,.6*.67));woodCreak(k,s,d,96,58,.033);hinge(k,s+.015,d*.82,.017);
   var t=k.t0+Math.max(.22,.6*.76);st(k,t,105,48,.19,'sine',.105);st(k,t+.018,510,235,.075,'square',.018);fn(k,t,'lowpass',420,.8,.09,.16)},
  'hearthCrackle':function(k){var s=k.t0+.01;st(k,s,118,76,.34,'triangle',.018);[0,.13,.29].forEach(function(o,i){st(k,s+o,920-i*115,310-i*28,.035,'square',.010-i*.0015);fn(k,s+o,'bandpass',1150-i*170,2.6,.015,.075)})},
  'climbUp':function(k){var s=k.t0+.01;[92,104,116,128].forEach(function(p,i){var a=s+i*.18;woodCreak(k,a,.2,p,p*.72,.0135);st(k,a+.055,72-i*3,48,.1,'triangle',.017)});st(k,s+.75,88,42,.16,'sine',.028)},
  'climbDown':function(k){var s=k.t0+.01;[128,116,104,92].forEach(function(p,i){var a=s+i*.18;woodCreak(k,a,.2,p,p*.72,.0135);st(k,a+.055,72-i*3,48,.1,'triangle',.017)});st(k,s+.75,68,42,.16,'sine',.028)},
  'pulleyCreak':function(k){var s=k.t0+.01;woodCreak(k,s,.78,78,126,.02);hinge(k,s+.04,.58,.01);[0,.23,.46].forEach(function(o,i){st(k,s+o,430+i*25,250,.045,'square',.007)})},
  'bucketSettle':function(k){var s=k.t0+.01;st(k,s,138,70,.19,'triangle',.026);st(k,s+.025,720,390,.08,'square',.009)},
  'CombatFX swing stab':function(k){var t=k.t0;cn(k,'bandpass',3200,1300,2.2,t,.11,.10,.02);ct(k,'triangle',900,500,t,.05,.015)},
  'CombatFX swing slash':function(k){cn(k,'bandpass',2400,480,1.3,k.t0,.18,.12,.035)},
  'CombatFX swing crush':function(k){var t=k.t0;cn(k,'lowpass',1100,240,.9,t,.24,.15,.06);cn(k,'bandpass',600,220,1.4,t+.03,.18,.06,.04)},
  'CombatFX swing':function(k){cn(k,'bandpass',2400,480,1.3,k.t0,.18,.12,.035)},
  'CombatFX snap':function(k){var t=k.t0;cn(k,'highpass',3400,3400,1,t,.03,.07);cn(k,'highpass',2600,2600,1,t+.05,.03,.06);ct(k,'square',1100,480,t+.02,.05,.012)},
  'CombatFX hit':function(k){var t=k.t0;ct(k,'sine',175,48,t,.15,.24);cn(k,'lowpass',1400,280,1,t,.09,.16);ct(k,'square',1500,520,t,.018,.035);cn(k,'bandpass',3600,1800,3,t,.06,.05)},
  'CombatFX hurt':function(k){var t=k.t0;ct(k,'sine',120,46,t,.17,.22);cn(k,'lowpass',900,220,1,t,.1,.14);ct(k,'triangle',320,180,t+.01,.08,.03)},
  'CombatFX block':function(k){var t=k.t0;ct(k,'triangle',860,520,t,.05,.09);cn(k,'bandpass',2600,2000,4,t,.04,.07);ct(k,'triangle',640,420,t+.028,.04,.05)},
  'CombatFX bow':function(k){var t=k.t0;ct(k,'triangle',250,142,t,.2,.11);ct(k,'sine',500,300,t,.12,.04);cn(k,'highpass',4200,2400,1,t,.06,.06);cn(k,'bandpass',1800,700,1.5,t+.02,.16,.05,.02)},
  'CombatFX arrowHit':function(k){var t=k.t0;cn(k,'bandpass',1150,340,2,t,.08,.17);ct(k,'sine',240,88,t,.1,.14);ct(k,'square',900,300,t,.02,.02)},
  'CombatFX arrowHit miss':function(k){var t=k.t0;cn(k,'highpass',2600,1500,1,t,.035,.07);ct(k,'sine',180,90,t,.06,.05)},
  'CombatFX charge':function(k){var t=k.t0;cn(k,'bandpass',480,2600,3,t,.46,.075,.22);ct(k,'sine',330,700,t,.45,.03,.2);ct(k,'sine',495,1050,t+.05,.4,.018,.18)},
  'CombatFX release':function(k){var t=k.t0;cn(k,'bandpass',2000,650,1.2,t,.28,.11,.02);cn(k,'highpass',5200,3000,1,t,.12,.03)},
  'CombatFX magicHit':function(k){var t=k.t0;cn(k,'highpass',3200,900,1,t,.22,.11);ct(k,'sine',760,210,t,.2,.08);ct(k,'sine',130,58,t,.14,.12)},
  'CombatFX splash':function(k){var t=k.t0;cn(k,'bandpass',2600,650,.9,t,.36,.08,.02);ct(k,'sine',320,170,t,.22,.03);cn(k,'highpass',6000,4000,1,t,.1,.02)},
  'CombatFX death (saw)':function(k){var c=k.ctx,t=k.t0,o=c.createOscillator(),f=c.createBiquadFilter(),g=c.createGain();o.type='sawtooth';o.frequency.setValueAtTime(230,t);o.frequency.exponentialRampToValueAtTime(62,t+.45);
   f.type='lowpass';f.frequency.value=850;g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(.07,t+.03);g.gain.exponentialRampToValueAtTime(.0001,t+.5);o.connect(f);f.connect(g);g.connect(k.out);o.start(t);o.stop(t+.55)},
  'CombatFX thud':function(k){var t=k.t0;ct(k,'sine',120,44,t,.2,.18);cn(k,'lowpass',520,140,.8,t,.14,.1)},
  'holm_fishing cast':function(k){k.noise(.24,900,1.2,.06,'bandpass',260)},
  'holm_fishing plish':function(k){k.noise(.16,1900,1.6,.05,'bandpass',700);k.tone(560,.06,'sine',.018,320)},
  'holm_fishing flop':function(k){k.noise(.1,420,1,.08,'lowpass');k.tone(150,.09,'sine',.05,90);k.noise(.08,380,1,.06,'lowpass',0,.14);k.tone(130,.07,'sine',.04,80,.14)},
  'holm_fishing leap':function(k){k.noise(.38,1100,.8,.08,'lowpass',200)},
  'holm_fishing croak (saw)':function(k){k.tone(105,.16,'sawtooth',.012,86)},
  'holm_fishing chirp':function(k){k.tone(2550,.07,'sine',.012,2900);k.tone(2600,.05,'sine',.01,3100,.09)},
  'holm_fishing quack (square)':function(k){k.tone(420,.09,'square',.012,300);k.noise(.08,900,3,.012)},
  'mill slap':function(k){k.noise(.12,700,1.2,.03,'lowpass',260)},
  'mill creak (saw)':function(k){k.tone(172,.34,'sawtooth',.008,118);k.tone(128,.22,'triangle',.006,100,.18)},
  'mill loop (band noise)':function(k){fn(k,k.t0,'lowpass',900,.7,.022,3)},
  'pond ambience (band noise)':function(k){fn(k,k.t0,'bandpass',650,.7,.012,3)}
 };
 // the old sound behind each new one (the recipes' `old` field names these keys)
 function has(key){return !!S[key]}
 function play(ctx,out,key,delay){var f=S[key];if(!f)return false;f(K(ctx,out,ctx.currentTime+(delay||0)+.005));return true}
 return {has:has,play:play,keys:function(){return Object.keys(S)}};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=SfxLegacy;
