/* ================= SOUND RECIPES (sound pass, owner review 2026-09-29) =================
 * Every sound effect the game plays, as a recipe for the synthesis kit in src/sfx_lib.js. `made` says what each one is
 * made of (the sound board, tools/sound_board.html, shows it beside the Play buttons); `old` names the sound it replaced
 * (the board plays the old one from tools/sfx_legacy.js for comparison). lvl: the loudest 50 ms in dB against the music
 * (src/sfx_lib.js K.fin); the mix plan in docs/rebuild/HOLM_SOUND_INVENTORY.md.
 * Owner notes this pass answers: the relief chart sounded plain; the hatchet's equip noise was not an equip noise; the tree
 * hit should be its own sound; the level-up noise (keep the fireworks); doors had no sound; the pickaxe on rock was not
 * right, and an ore chunk breaking off should sound different. Musical cues are tuned (no pitch nudge). */
(function(L){
 'use strict';
 if(!L)return;
 var def=L.def;
 // a few shared bodies
 var WOOD=[[190,1,.075],[410,.8,.055],[760,.55,.04],[1320,.3,.025]];
 function each(ts,fn){for(var i=0;i<ts.length;i++)fn(ts[i],i)}

 /* ======================================================================== UI */
 def('ui_click',{cat:'UI',label:'Button click',old:'Sfx.click',dur:.06,lvl:-20,pv:.04,
  made:'a 14 ms noise tick band-passed near 3 kHz over a soft 480 Hz triangle blip: a wooden button, not a square-wave beep',
  fn:function(k){k.noise({d:.014,f:k.j(3000,.06),q:1.4,g:1});k.tone({d:.022,f:k.j(480,.04),f1:360,wave:'tri',g:.35});k.lp(7000)}});
 def('ui_tab',{cat:'UI',label:'Side-panel tab',old:'Sfx.click',dur:.07,lvl:-20,pv:.03,
  made:'a leather-and-wood tab tick: an 18 ms noise tick near 2.4 kHz and a small 210 Hz sine knock falling to 150 Hz',
  fn:function(k){k.noise({d:.018,f:k.j(2400,.05),q:1.1,g:1});k.tone({d:.035,f:k.j(210,.04),f1:150,g:.55});k.lp(6500)}});
 def('ui_window_open',{cat:'UI',label:'Window opens',dur:.14,lvl:-17,
  made:'a parchment flap (noise swept up 0.9 to 2.4 kHz) and a light wooden tick as the frame settles',
  fn:function(k){k.noise({a:.012,d:.07,f:900,f1:2400,q:.9,g:1});k.modal({t:.05,modes:[[680,1,.03],[1450,.4,.02]],det:.04,g:.35});k.lp(7000)}});
 def('ui_window_close',{cat:'UI',label:'Window closes',dur:.12,lvl:-18,
  made:'the flap folding shut (noise swept down 2.2 to 0.8 kHz) and a soft 160 Hz thump',
  fn:function(k){k.noise({a:.006,d:.06,f:2200,f1:800,q:.9,g:1});k.tone({t:.03,d:.05,f:160,f1:90,g:.45});k.lp(6500)}});
 def('ui_map_open',{vars:1,cat:'UI',label:'Relief chart / map opens',old:'Sfx.click',dur:1.6,lvl:-10,pv:0,gv:.06,
  made:'a parchment unrolling: a rising swish, fourteen paper crinkles (band-passed 2.5-6 kHz grains), the chart settling on the table (a low thump and a wooden tap), then two soft harp notes (D4, A4; plucked strings) for discovery, in a small room',
  fn:function(k){k.noise({a:.15,d:.3,f:1500,f1:3000,q:.6,g:.35});k.grains({n:14,span:.42,f:[2500,6000],d:[.008,.02],q:3,g:.5});
   k.tone({t:.42,d:.08,f:120,f1:70,g:.35});k.modal({t:.43,modes:[[520,.5,.05],[1180,.25,.03]],g:.2});
   k.pluck({t:.5,f:293.66,d:1.1,bright:.3,g:.5});k.pluck({t:.6,f:440,d:1.1,bright:.3,g:.45});k.room(.14,1);k.lp(7500)}});
 def('ui_map_close',{cat:'UI',label:'Relief chart / map closes',dur:.32,lvl:-15,
  made:'the parchment rolling up: a falling swish, six crinkles and a small thump',
  fn:function(k){k.noise({a:.03,d:.2,f:3000,f1:1500,q:.6,g:.5});k.grains({n:6,span:.2,f:[2500,5500],d:[.008,.018],q:3,g:.5});k.tone({t:.2,d:.06,f:130,f1:80,g:.3})}});
 def('ui_dialogue',{cat:'UI',label:'Dialogue: continue',old:'Sfx.click',dur:.06,lvl:-21,
  made:'a page turning under the thumb: a 35 ms noise tick near 1.8 kHz with a faint 5 kHz edge',
  fn:function(k){k.noise({a:.004,d:.035,f:1800,q:1,g:1});k.noise({d:.012,type:'hp',f:5000,g:.3})}});
 def('quest_step',{vars:1,cat:'UI',label:'Lesson / quest step',old:'Sfx.quest',dur:1.1,lvl:-8,pv:0,gv:.05,
  made:'two plucked harp notes (A4 then E5, Karplus-Strong strings) in a small room; the old one was two square-wave beeps',
  fn:function(k){k.pluck({f:440,d:.9,bright:.4,g:.8});k.pluck({t:.11,f:659.26,d:.9,bright:.4,g:.9});k.room(.15,1);k.lp(7000)}});
 def('quest_done',{vars:1,cat:'UI',label:'Quest complete',old:'Sfx.questDone',dur:2.3,lvl:-6,pv:0,gv:.04,
  made:'a harp flourish G4 B4 D5 G5, then a G major chord (G4 D5 B5) over a soft sine bed (G3, D4), in a warm room; the old one was a square-wave triad',
  fn:function(k){each([[392,0],[493.88,.09],[587.33,.18],[783.99,.27]],function(n){k.pluck({t:n[1],f:n[0],d:1.2,bright:.42,g:.8})});
   each([[392,.5],[587.33,.5],[987.77,.52]],function(n){k.pluck({t:n[1],f:n[0],d:1.6,bright:.35,g:.6})});
   k.tone({t:.45,a:.1,d:1.4,f:196,g:.2,h2:.15});k.tone({t:.45,a:.1,d:1.3,f:293.66,g:.12});k.room(.25,1.2);k.lp(7500)}});
 // the level-up: three candidates, one picked (SfxLib.LEVEL_PICK); the fireworks stay, the noise changed
 def('level_up_a',{vars:1,cat:'Level-up',label:'Level-up A: lute arpeggio (PICKED)',old:'Sfx.level',dur:1.75,lvl:-6,pv:0,gv:.04,
  made:'a warm plucked-lute arpeggio C5 E5 G5 rising with the rockets, blooming into C6 and G5 as they burst (0.46 s), over a soft C4 and G3 sine glow, with four tiny high sparkles for the stars; small warm room',
  fn:function(k){each([[523.25,0,.8],[659.26,.085,.85],[783.99,.17,.9]],function(n){k.pluck({t:n[1],f:n[0],d:1.1,bright:.45,g:n[2]})});
   k.pluck({t:.46,f:1046.5,d:1.0,bright:.35,g:.7});k.pluck({t:.465,f:783.99,d:1.0,bright:.35,g:.5});k.pluck({t:.47,f:659.26,d:.9,bright:.3,g:.3});
   k.tone({t:.44,a:.06,d:1.1,f:261.63,g:.22,h2:.15});k.tone({t:.44,a:.08,d:1.0,f:196,g:.14});
   k.grains({t:.5,n:4,span:.3,type:'hp',f:[6000,8000],d:[.004,.01],g:.08});k.room(.22,1.1);k.lp(8000)}});
 def('level_up_b',{vars:1,cat:'Level-up',label:'Level-up B: music box',dur:1.6,lvl:-6,pv:0,gv:.04,
  made:'four music-box tines G5 C6 E6 G6 (a sine with its bright 5.4x overtone ringing short) and a closing E6 G6 dyad over a C4 bed',
  fn:function(k){function tine(t,f,g){k.modal({t:t,modes:[[f,1,.9],[f*5.4,.12,.15]],g:g});k.noise({t:t,d:.003,type:'hp',f:4000,g:g*.2})}
   tine(0,783.99,.8);tine(.11,1046.5,.8);tine(.22,1318.5,.85);tine(.36,1568,.9);tine(.62,1318.5,.55);tine(.625,1568,.5);
   k.tone({t:.3,a:.08,d:1.0,f:261.63,g:.18});k.room(.25,1);k.lp(8500)}});
 def('level_up_c',{vars:1,cat:'Level-up',label:'Level-up C: soft horn call',dur:1.5,lvl:-6,pv:0,gv:.04,
  made:'a two-note horn call (G4 then a held C5 over G4), four soft sine harmonics each with a slow vibrato and low-passed, over a small timpani thump',
  fn:function(k){function horn(t,f,h,d,g){[[1,1],[2,.5],[3,.28],[4,.14]].forEach(function(p){k.tone({t:t,a:.05,h:h,d:d,f:f*p[0],vib:[5,.004],g:g*p[1]})})}
   horn(0,392,.08,.12,.7);horn(.2,523.25,.35,.5,.9);horn(.2,392,.35,.5,.5);k.tone({t:.2,d:.5,f:98,f1:90,g:.4});k.lp(2600);k.room(.18,1.1)}});
 def('coins',{cat:'UI',label:'Coins',old:'Sfx.coin',dur:.22,lvl:-12,
  made:'two small coins clinking: each three inharmonic metal modes (about 3.1, 4.6 and 6.9 kHz) ringing under 0.1 s, with a hairline click',
  fn:function(k){k.modal({modes:[[3150,1,.1],[4630,.55,.07],[6900,.3,.04]],det:.03,g:.8});k.noise({d:.003,type:'hp',f:5000,g:.25});
   k.modal({t:.05,modes:[[2870,.8,.09],[4380,.5,.06],[6400,.25,.035]],det:.03,g:.65});k.noise({t:.05,d:.003,type:'hp',f:5000,g:.2});k.lp(9000)}});

 /* ======================================================================== items */
 def('equip_metal',{cat:'Items',label:'Equip: metal (blade, armour)',old:'Sfx.click',dur:.3,lvl:-12,
  made:'a hand on the grip (low noise), the blade sliding home (noise 4.2 to 2.6 kHz) and a short steel ring (modes 1.87, 3.1, 5.0 kHz)',
  fn:function(k){k.noise({d:.03,type:'lp',f:800,g:.5});k.noise({t:.01,a:.012,d:.09,f:4200,f1:2600,q:3,g:.55});
   k.modal({t:.035,modes:[[1870,1,.2],[3120,.55,.13],[4980,.3,.07],[6800,.12,.04]],det:.02,g:.6});k.lp(7500)}});
 def('unequip_metal',{cat:'Items',label:'Unequip: metal',old:'Sfx.click',dur:.28,lvl:-13,
  made:'the blade drawn out (noise rising 2.4 to 4.2 kHz), a lower, shorter steel ring and a soft set-down',
  fn:function(k){k.noise({a:.01,d:.08,f:2400,f1:4200,q:3,g:.55});k.modal({t:.05,modes:[[1590,1,.14],[2650,.5,.09],[4230,.25,.05]],det:.02,g:.5});k.tone({t:.06,d:.05,f:140,f1:90,g:.3});k.lp(7000)}});
 def('equip_tool',{cat:'Items',label:'Equip: tool (hatchet, pickaxe, hammer)',old:'Sfx.click',dur:.22,lvl:-12,
  made:'the hand closing on an ash haft (a 130 Hz thump), the haft knocking (wood modes 240, 565, 1150 Hz) and the iron head clunking (1.3, 2.2, 3.4 kHz), with a tiny rattle: a hefty tool taken up',
  fn:function(k){k.tone({d:.06,f:130,f1:80,g:.5});k.modal({modes:[[240,1,.07],[565,.6,.05],[1150,.3,.03]],det:.03,g:1});
   k.modal({t:.014,modes:[[1320,1,.1],[2150,.6,.07],[3420,.3,.045]],det:.03,g:.5});k.grains({t:.05,n:2,span:.04,f:[2500,4000],d:[.003,.006],g:.12});k.lp(6500)}});
 def('unequip_tool',{cat:'Items',label:'Unequip: tool',old:'Sfx.click',dur:.2,lvl:-13,
  made:'the iron head first, then the haft knocking lower as the tool is set down',
  fn:function(k){k.modal({modes:[[1180,1,.08],[1930,.55,.05]],det:.03,g:.4});k.modal({t:.03,modes:[[205,1,.07],[480,.55,.05],[980,.25,.03]],det:.03,g:1});k.tone({t:.03,d:.06,f:110,f1:70,g:.4});k.lp(6000)}});
 def('equip_wood',{cat:'Items',label:'Equip: wood (bow, staff)',old:'Sfx.click',dur:.3,lvl:-13,
  made:'a hollow wooden knock (330, 820, 1650 Hz) and, faintly, a bow string brushed (a plucked string at 165 Hz)',
  fn:function(k){k.modal({modes:[[330,1,.08],[820,.5,.05],[1650,.22,.03]],det:.03,g:1});k.pluck({t:.02,f:k.j(165,.03),d:.25,bright:.3,g:.2});k.noise({d:.05,f:1800,q:.8,g:.25})}});
 def('unequip_wood',{cat:'Items',label:'Unequip: wood',old:'Sfx.click',dur:.2,lvl:-14,
  made:'a softer, lower wooden knock and a brush of noise',
  fn:function(k){k.noise({a:.01,d:.05,f:1500,q:.8,g:.3});k.modal({t:.02,modes:[[280,1,.07],[700,.45,.045]],det:.03,g:1})}});
 def('equip_cloth',{cat:'Items',label:'Equip: cloth',old:'Sfx.click',dur:.24,lvl:-15,
  made:'two fabric rustles: noise swept up through 1.5-2.6 kHz with a fast random roughness (the weave)',
  fn:function(k){k.noise({a:.02,d:.12,f:1500,f1:2600,q:.6,grit:[180,.8,.2],g:1});k.noise({t:.09,a:.015,d:.1,f:1100,f1:1900,q:.6,grit:[160,.8,.2],g:.7});k.lp(6000)}});
 def('unequip_cloth',{cat:'Items',label:'Unequip: cloth',old:'Sfx.click',dur:.2,lvl:-16,
  made:'one rustle swept down 2.4 to 1.2 kHz',
  fn:function(k){k.noise({a:.015,d:.13,f:2400,f1:1200,q:.6,grit:[170,.8,.2],g:1});k.lp(6000)}});
 def('equip_leather',{cat:'Items',label:'Equip: leather',old:'Sfx.click',dur:.2,lvl:-15,
  made:'a leather creak (stick-slip pulses 55 to 110 per second ringing 520, 980, 1900 Hz) and a soft strap thump',
  fn:function(k){k.creak({a:.01,d:.12,r0:55,r1:110,res:[[520,7,1],[980,6,.6],[1900,5,.25]],g:.7});k.tone({t:.02,d:.05,f:150,f1:95,g:.5});k.noise({t:.02,d:.05,type:'lp',f:900,g:.45})}});
 def('unequip_leather',{cat:'Items',label:'Unequip: leather',old:'Sfx.click',dur:.18,lvl:-16,
  made:'a shorter, falling leather creak and a light thump',
  fn:function(k){k.creak({a:.01,d:.1,r0:100,r1:60,res:[[480,7,1],[900,6,.5]],g:.6});k.tone({t:.05,d:.04,f:130,f1:90,g:.4})}});
 def('equip_ammo',{cat:'Items',label:'Equip: arrows',old:'Sfx.click',dur:.2,lvl:-16,
  made:'arrow shafts rattling into the quiver: six wooden ticks (1.5-3.5 kHz grains) and a small knock',
  fn:function(k){k.grains({n:6,span:.12,f:[1500,3500],d:[.006,.015],q:2,g:.8});k.modal({t:.1,modes:[[900,.5,.03],[1900,.25,.02]],g:.35})}});
 def('pickup',{cat:'Items',label:'Pick up',old:'(none)',dur:.1,lvl:-15,
  made:'a soft grab: a short noise brush falling 1.2 to 0.7 kHz and a 240 Hz sine tuck',
  fn:function(k){k.noise({a:.006,d:.05,f:1200,f1:700,q:.8,g:.8});k.tone({d:.05,f:240,f1:160,g:.55});k.noise({t:.01,d:.03,type:'hp',f:3500,g:.15})}});
 def('drop',{cat:'Items',label:'Drop',old:'Sfx.click',dur:.15,lvl:-12,
  made:'an item landing on the ground: a 130 Hz thud falling to 65 Hz, low noise and a brush of grass',
  fn:function(k){k.tone({d:.09,f:k.j(130,.05),f1:65,g:1});k.noise({d:.08,type:'lp',f:600,f1:250,g:.6});k.noise({t:.008,d:.06,f:2400,q:.8,grit:[300,.8,.3],g:.22})}});
 def('bank_open',{cat:'Items',label:'Bank opens',old:'Sfx.coin',dur:.5,lvl:-12,
  made:'an iron latch (1.65, 2.75 kHz modes), a short hinge creak, and the strongbox lid settling (wood 150-720 Hz)',
  fn:function(k){k.modal({modes:[[1650,.8,.06],[2750,.5,.04],[4100,.2,.025]],g:.4});k.creak({t:.03,a:.04,h:.05,d:.2,r0:30,r1:60,res:[[330,9,1],[700,8,.6],[1350,6,.3]],g:.6});
   k.modal({t:.3,modes:[[150,1,.12],[340,.5,.08],[720,.25,.05]],g:.55});k.noise({t:.3,d:.08,type:'lp',f:500,g:.4});k.lp(6500)}});
 def('bank_deposit',{cat:'Items',label:'Bank: deposit',old:'(none)',dur:.14,lvl:-15,
  made:'an item set into the strongbox: a wooden clunk (190, 430, 900 Hz) and a small rustle',
  fn:function(k){k.modal({modes:[[190,1,.08],[430,.5,.05],[900,.2,.03]],det:.04,g:1});k.noise({d:.05,type:'lp',f:700,g:.5});k.noise({t:.01,d:.04,f:2600,q:1,grit:[240,.7,.3],g:.2})}});
 def('bank_withdraw',{cat:'Items',label:'Bank: withdraw',old:'(none)',dur:.12,lvl:-15,
  made:'an item lifted out: a rustle and a lighter knock (260, 610 Hz)',
  fn:function(k){k.noise({a:.01,d:.05,f:1800,f1:900,q:.8,grit:[260,.7,.3],g:.7});k.modal({t:.03,modes:[[260,1,.06],[610,.45,.04]],det:.04,g:.8})}});
 def('eat',{cat:'Items',label:'Eat',old:'Sfx.eat',dur:.45,lvl:-12,
  made:'two crunchy bites (eight 1.4-3.8 kHz grains over a rough 900 Hz body each) and a short chew',
  fn:function(k){each([0,.16],function(t,i){k.grains({t:t,n:8,span:.05,f:[1400,3800],d:[.004,.012],q:1.5,g:1-i*.2});k.noise({t:t,a:.003,d:.06,f:900,q:1,grit:[400,.9,.4],g:.6-i*.1})});
   k.noise({t:.3,a:.02,d:.08,type:'lp',f:500,grit:[40,.8,.2],g:.3})}});
 def('drink',{cat:'Items',label:'Drink',old:'Sfx.eat',dur:.66,lvl:-12,
  made:'two gulps (a sine glug 420 to 190 Hz with wet noise and a rising bubble each) and a satisfied breath',
  fn:function(k){each([0,.24],function(t,i){k.tone({t:t,a:.006,d:.085,f:k.j(420,.05),f1:190,g:1-i*.15});k.noise({t:t+.005,d:.05,f:700,q:2,g:.35});k.tone({t:t+.045,a:.001,d:.03,f:900,f1:1400,g:.2})});
   k.noise({t:.5,a:.02,d:.12,type:'lp',f:900,g:.2})}});

 /* ======================================================================== doors and gates */
 def('door_open',{cat:'Doors',label:'Door opens',old:'chestOpen',dur:.75,lvl:-12,
  made:'the iron latch lifting (modes 1.45, 2.3, 3.6 kHz and a click), then the hinge: stick-slip pulses speeding from 28 to 70 per second ringing the planks (380, 760, 1450 Hz), and the air of the leaf swinging',
  fn:function(k){k.modal({modes:[[1450,.8,.05],[2300,.5,.035],[3600,.25,.02]],det:.03,g:.45});k.noise({d:.004,type:'hp',f:2500,g:.3});
   k.creak({t:.07,a:.06,h:.12,d:.34,r0:k.j(28,.1),r1:k.j(70,.1),jit:.3,res:[[k.j(380,.05),10,1],[760,9,.55],[1450,7,.25]],g:.6});
   k.noise({t:.1,a:.12,d:.3,type:'lp',f:450,g:.12});k.lp(6000)}});
 def('door_close',{cat:'Doors',label:'Door closes',old:'chestClose',dur:.62,lvl:-9,
  made:'a short falling creak, then the leaf meeting the frame (a 95 Hz thud, wood modes 170-820 Hz, low noise) and the latch dropping',
  fn:function(k){k.creak({a:.03,h:.05,d:.2,r0:60,r1:30,jit:.3,res:[[400,9,1],[800,8,.5],[1500,6,.2]],g:.4});
   k.tone({t:.27,d:.14,f:95,f1:55,g:1});k.modal({t:.27,modes:[[170,1,.1],[390,.55,.07],[820,.25,.045]],det:.04,g:.8});k.noise({t:.27,d:.1,type:'lp',f:500,g:.5});
   k.modal({t:.3,modes:[[1500,.6,.035],[2450,.35,.025]],g:.3});k.lp(5500)}});
 def('door_locked',{cat:'Doors',label:'Door locked',old:'(none)',dur:.3,lvl:-13,
  made:'the handle tried: three quick latch rattles (iron 1.25, 2.1 kHz against wood 300, 680 Hz), each quieter',
  fn:function(k){each([0,.075,.14],function(t,i){var g=[1,.8,.55][i];k.modal({t:t,modes:[[1250,.7,.035],[2100,.4,.025],[3300,.2,.015]],det:.05,g:.5*g});
   k.modal({t:t,modes:[[300,1,.04],[680,.4,.025]],det:.05,g:.7*g});k.noise({t:t,d:.004,type:'hp',f:2500,g:.35*g})})}});
 def('gate_open',{cat:'Doors',label:'Iron gate opens (bank vault)',old:'chestOpen',dur:.8,lvl:-11,
  made:'an iron bolt drawn (a clank at 520, 1180 Hz), then the iron hinge squealing (a tonal stick-slip rising 180 to 320 Hz through 900, 1700, 2900 Hz resonances)',
  fn:function(k){k.modal({modes:[[520,.8,.12],[1180,.5,.08],[2050,.25,.05]],det:.03,g:.6});k.noise({d:.004,type:'hp',f:2500,g:.3});
   k.creak({t:.1,a:.1,h:.2,d:.35,r0:180,r1:320,jit:.12,res:[[900,14,1],[1700,12,.5],[2900,10,.2]],g:.45});k.lp(6000)}});
 def('gate_close',{cat:'Doors',label:'Iron gate closes',old:'chestClose',dur:.7,lvl:-9,
  made:'a short hinge squeal, then the bars meeting the post: an iron clang (520, 1180, 2050, 3100 Hz ringing up to 0.3 s) and the bolt shot home',
  fn:function(k){k.creak({a:.03,h:.05,d:.2,r0:300,r1:200,jit:.12,res:[[950,14,1],[1800,12,.4]],g:.3});
   k.modal({t:.25,modes:[[520,1,.3],[1180,.6,.2],[2050,.35,.12],[3100,.15,.07]],det:.02,g:.8});k.tone({t:.25,d:.08,f:130,f1:80,g:.4});
   k.modal({t:.33,modes:[[1400,.5,.04],[2300,.3,.03]],g:.3});k.lp(6500)}});
 def('chest_open',{cat:'Doors',label:'Chest opens',old:'chestOpen',dur:.6,lvl:-13,
  made:'a small latch click and a short, low lid creak (pulses 24 to 55 per second ringing 300, 620 Hz)',
  fn:function(k){k.modal({modes:[[1700,.7,.04],[2800,.4,.03]],g:.4});k.creak({t:.04,a:.05,h:.1,d:.3,r0:24,r1:55,res:[[300,10,1],[620,8,.5],[1200,6,.2]],g:.6});k.lp(6000)}});
 def('chest_close',{cat:'Doors',label:'Chest closes',old:'chestClose',dur:.55,lvl:-10,
  made:'a short creak and the lid landing (a 110 Hz thud and wood modes 160-700 Hz)',
  fn:function(k){k.creak({a:.02,h:.05,d:.18,r0:45,r1:26,res:[[320,10,1],[660,8,.4]],g:.4});
   k.tone({t:.26,d:.12,f:110,f1:55,g:1});k.modal({t:.26,modes:[[160,1,.09],[350,.5,.06],[700,.2,.04]],det:.04,g:.7});k.noise({t:.26,d:.08,type:'lp',f:500,g:.4});k.lp(5500)}});

 /* ======================================================================== skills */
 def('chop',{cat:'Woodcutting',label:'Chop (each stroke)',old:'Sfx.chop',dur:.2,lvl:-9,pv:.04,
  made:'the axe biting (a 4 ms high click), the oak answering (wood modes near 190, 410, 760, 1320 Hz: a solid "thock"), the weight of the swing (a 120 Hz thump) and four splinter chips',
  fn:function(k){k.noise({d:.004,type:'hp',f:2500,g:.7});k.modal({pitch:k.j(1,.06),modes:WOOD,det:.05,g:1});k.tone({d:.05,f:120,f1:78,g:.45});
   k.grains({t:.004,n:4,span:.06,f:[2500,5200],d:[.006,.012],q:1.5,g:.22,decay:.8});k.lp(6800)}});
 def('log_land',{cat:'Woodcutting',label:'Logs land',old:'(none)',dur:.22,lvl:-13,
  made:'a log dropping onto the pile: a low wooden clunk (150, 330, 640 Hz) and a small bounce',
  fn:function(k){k.modal({modes:[[150,1,.09],[330,.6,.06],[640,.3,.04]],det:.04,g:1});k.noise({d:.05,type:'lp',f:800,g:.45});k.modal({t:.07,modes:[[210,1,.05],[480,.5,.035]],det:.05,g:.45})}});
 def('tree_creak',{cat:'Woodcutting',label:'Tree tips (fall starts)',old:'(none)',dur:1.0,lvl:-12,pv:.02,
  made:'the last fibres snapping (three grains and a crack), the trunk creaking as it tips (stick-slip 12 to 60 per second ringing 260, 520, 980 Hz) and the crown swishing down',
  fn:function(k){k.grains({n:3,span:.04,f:[1500,3200],d:[.01,.02],q:1.2,g:.6});k.noise({d:.025,type:'lp',f:2200,g:.5});
   k.creak({t:.04,a:.2,h:.25,d:.35,r0:12,r1:60,jit:.35,res:[[260,12,1],[520,10,.6],[980,8,.3]],g:.75});k.noise({t:.55,a:.3,d:.12,f:900,f1:1900,q:.5,g:.35})}});
 def('tree_fall',{cat:'Woodcutting',label:'Tree lands',old:'tree landing',dur:1.0,lvl:-6,pv:.03,
  made:'the trunk hitting the ground (a 72 Hz sine drop, low noise, wood modes 110-520 Hz), the branches crashing (rough mid noise) and ten twigs and leaves settling',
  fn:function(k){k.tone({d:.38,f:72,f1:38,g:1});k.noise({d:.3,type:'lp',f:380,f1:120,g:.9});k.modal({modes:[[110,1,.22],[240,.6,.14],[520,.3,.08]],det:.05,g:.6});
   k.noise({t:.01,a:.02,d:.25,f:2200,q:.6,grit:[90,.7,.2],g:.35});k.grains({t:.08,n:10,span:.6,f:[2000,5000],d:[.01,.03],q:1,g:.15,decay:.9});k.lp(5000)}});
 def('mine',{cat:'Mining',label:'Pickaxe strike',old:'Sfx.mine',dur:.3,lvl:-9,pv:.04,
  made:'the iron pick head pinging (inharmonic modes near 2.35, 3.73, 5.9 kHz, under 0.1 s), the stone cracking (a sharp 1.8 kHz noise burst over a low stone body and a 180 Hz knock) and a pinch of grit bouncing to rest',
  fn:function(k){k.noise({d:.003,type:'hp',f:3000,g:.6});k.modal({pitch:k.j(1,.04),modes:[[2350,1,.09],[3730,.6,.055],[5900,.3,.03]],det:.02,g:.55});
   k.noise({d:.03,f:1800,q:1.4,g:.8});k.noise({d:.045,type:'lp',f:700,g:.55});k.tone({d:.04,f:180,f1:120,g:.3});
   k.grains({t:.02,n:5,span:.18,bounce:.6,f:[3000,7000],d:[.004,.01],q:2,g:.3,decay:.7});k.lp(8000)}});
 def('ore_break',{cat:'Mining',label:'Ore chunk breaks off',old:'(none)',dur:.6,lvl:-8,pv:.03,
  made:'a different noise from the strike: the seam splitting (a rough 1.2 kHz crack), the chunk coming away (a 140 Hz drop and low noise), landing (stone modes 420, 900, 1700 Hz) and twelve pebbles running out',
  fn:function(k){k.noise({d:.004,type:'hp',f:2000,g:.8});k.noise({d:.06,f:1200,q:1,grit:[500,.8,.5],g:1});k.tone({d:.1,f:140,f1:70,g:.7});k.noise({d:.12,type:'lp',f:500,g:.6});
   k.modal({t:.13,modes:[[420,1,.05],[900,.6,.03],[1700,.25,.02]],det:.05,g:.5});k.tone({t:.13,d:.06,f:120,f1:80,g:.4});
   k.grains({t:.03,n:12,span:.45,bounce:.75,f:[2500,6500],d:[.005,.015],q:1.8,g:.35,decay:.85});k.lp(7500)}});
 def('rock_empty',{cat:'Mining',label:'Rock runs empty',old:'(none)',dur:.7,lvl:-11,
  made:'a small gravel slide (rough low-passed noise falling 1.5 to 0.4 kHz with sixteen grains) and a settling thud',
  fn:function(k){k.noise({a:.05,d:.45,type:'lp',f:1500,f1:400,grit:[70,.8,.3],g:.8});k.grains({t:.02,n:16,span:.5,f:[1500,4200],d:[.006,.02],q:1.5,g:.4,decay:.93});k.tone({t:.45,d:.12,f:110,f1:60,g:.5})}});
 def('prospect',{cat:'Mining',label:'Prospect (two taps)',old:'(none)',dur:.45,lvl:-16,
  made:'two light hammer taps on rock (a 2.2 kHz tick, faint stone modes and a 300 Hz knock); not wired: there is no Prospect option yet',
  fn:function(k){each([0,.34],function(t){k.noise({t:t,d:.015,f:2200,q:2,g:.7});k.modal({t:t,modes:[[1100,.3,.03],[2100,.2,.02]],g:.35});k.tone({t:t,d:.02,f:300,f1:200,g:.3})})}});
 def('fish_cast',{cat:'Fishing',label:'Net cast',old:'holm_fishing cast',dur:.6,lvl:-13,
  made:'net and rope swishing out (noise 2.4 to 0.7 kHz, a little rough), the net meeting the water (a 1.4 kHz plash, a 250 Hz blub) and four droplets (rising sine chirps)',
  fn:function(k){k.noise({a:.06,d:.22,f:2400,f1:700,q:.8,grit:[140,.5,.2],g:.7});
   k.noise({t:.3,a:.003,d:.15,f:1400,f1:600,q:.9,g:.8});k.tone({t:.3,d:.07,f:250,f1:150,g:.3});k.grains({t:.32,n:4,span:.14,drop:true,f:[800,1300],d:[.02,.035],g:.25})}});
 def('fish_splash',{cat:'Fishing',label:'Splash (each roll)',old:'holm_fishing plish',dur:.2,lvl:-15,
  made:'a small water plish (noise 1.5 to 0.7 kHz, a 260 Hz blub) and three droplet chirps',
  fn:function(k){k.noise({a:.002,d:.1,f:1500,f1:700,q:1,g:.9});k.tone({d:.06,f:260,f1:150,g:.3});k.grains({t:.01,n:3,span:.1,drop:true,f:[900,1500],d:[.02,.03],g:.3})}});
 def('fish_catch',{cat:'Fishing',label:'Catch',old:'holm_fishing flop',dur:.6,lvl:-11,
  made:'the net lifting wet (low noise and dripping chirps), the fish slapping three times (short 1.1 kHz noise over a 180 Hz knock) and a muted tap into the creel',
  fn:function(k){k.noise({a:.01,d:.2,type:'lp',f:1200,f1:600,g:.6});k.grains({t:.08,n:3,span:.25,drop:true,f:[700,1100],d:[.025,.04],g:.3});
   each([.2,.29,.37],function(t,i){k.noise({t:t,d:.025,f:1100,q:1.2,g:.5*(1-i*.2)});k.tone({t:t,d:.03,f:180,f1:120,g:.3*(1-i*.2)})});
   k.modal({t:.46,modes:[[520,.4,.04],[1200,.25,.02]],g:.25})}});
 def('fish_leap',{cat:'Fishing',label:'A fish leaps',old:'holm_fishing leap',dur:.45,lvl:-15,
  made:'a quick splash (noise 1.1 to 0.35 kHz) and five falling droplets',
  fn:function(k){k.noise({a:.004,d:.3,f:1100,f1:350,q:.8,g:.9});k.grains({t:.05,n:5,span:.3,drop:true,f:[700,1400],d:[.02,.04],g:.35})}});
 def('fire_strike',{cat:'Firemaking',label:'Tinderbox strike',old:'(none)',dur:.16,lvl:-14,pv:.05,
  made:'steel scraping flint (a rough 3.5 kHz high-passed burst), a thin 6 kHz ring and four sparks (tiny high grains)',
  fn:function(k){k.noise({d:.03,type:'hp',f:3500,grit:[800,.9,.5],g:.9});k.noise({d:.04,f:6000,q:3,g:.35});k.grains({t:.01,n:4,span:.09,type:'hp',f:[5000,9000],d:[.002,.004],g:.35,decay:.8})}});
 def('fire_catch',{cat:'Firemaking',label:'Fire catches',old:'(none)',dur:.9,lvl:-9,
  made:'the tinder taking with a soft whoomp (low-passed noise opening 200 Hz to 1.4 kHz, a 90 Hz warm body) and the first eight crackles',
  fn:function(k){k.noise({a:.12,d:.35,type:'lp',f:200,f1:1400,ft:.2,g:1});k.tone({a:.08,d:.3,f:90,f1:120,g:.3});k.grains({t:.2,n:8,span:.6,f:[1500,5000],d:[.003,.01],q:1.5,g:.35,decay:.95})}});
 def('fire_loop',{cat:'Firemaking',label:'Fire crackle loop (by any fire)',old:'(none)',dur:7,xf:.5,loop:true,vars:1,lvl:-14,pv:.02,gv:0,
  made:'a seamless 7 s loop: the fire\'s low breathing (brown noise under 320 Hz, slowly uneven), a faint flame hiss, about 45 small pops (1.2-4.5 kHz ticks, mostly tiny) and five bigger snaps with a log\'s knock; played quietly and only near a fire',
  fn:function(k){var L=7.5;k.noise({a:.001,h:L,d:.01,type:'lp',f:320,q:.5,color:'brown',grit:[3,.5,.02],g:.5});k.noise({a:.001,h:L,d:.01,f:1100,q:.6,color:'pink',grit:[6,.7,.03],g:.14});
   for(var i=0;i<45;i++){var s=k.R();k.noise({t:k.R()*L,a:.0003,d:k.r(.002,.008),f:k.r(1200,4500),q:1.5,g:.1+.5*s*s*s})}
   for(i=0;i<5;i++){var t=k.r(.2,L-.3);k.grains({t:t,n:3,span:.03,f:[1500,3500],d:[.003,.008],g:.8});k.tone({t:t,d:.02,f:300,f1:200,g:.25})}}});
 def('fire_crackle',{cat:'Firemaking',label:'Hearth crackle (warming at a hearth)',old:'hearthCrackle',dur:.5,lvl:-14,
  made:'three ember snaps over a soft low fire body (brown noise), no square waves',
  fn:function(k){k.noise({a:.03,d:.35,type:'lp',f:300,color:'brown',g:.5});each([0,.13,.29],function(t,i){k.grains({t:t,n:2,span:.02,f:[1200,3500],d:[.003,.007],g:.8-i*.15})})}});
 def('cook_sizzle',{cat:'Cooking',label:'Sizzle (food on the fire)',old:'(none)',dur:1.0,lvl:-13,
  made:'fat spitting: high-passed noise over 3.5 kHz with a slow random sputter, twelve spits and a faint mid body',
  fn:function(k){k.noise({a:.06,h:.35,d:.5,type:'hp',f:3500,q:.6,grit:[25,.7,.1],g:.8});k.grains({t:.05,n:12,span:.8,type:'hp',f:[3000,7000],d:[.002,.006],g:.5,decay:.97});
   k.noise({a:.1,h:.3,d:.4,f:1200,q:.5,grit:[40,.6,.1],g:.25});k.lp(9000)}});
 def('cook_done',{cat:'Cooking',label:'Cooked',old:'(none)',dur:.4,lvl:-13,
  made:'the sizzle dying away and two light spatula taps (640, 1500 Hz): done',
  fn:function(k){k.noise({a:.005,d:.3,type:'hp',f:3200,grit:[30,.6,.1],g:.5});k.modal({t:.06,modes:[[640,.6,.05],[1500,.35,.03]],det:.04,g:.6});k.modal({t:.14,modes:[[700,.5,.045],[1650,.3,.025]],det:.04,g:.4})}});
 def('cook_burn',{cat:'Cooking',label:'Burnt',old:'(none)',dur:.5,lvl:-10,
  made:'a sharp flare-up hiss (2.5 to 5 kHz), fourteen crackles, a low "pff" and a small sour sine droop',
  fn:function(k){k.noise({a:.01,d:.35,type:'hp',f:2500,f1:5000,g:.8});k.grains({n:14,span:.4,f:[1500,5000],d:[.003,.008],g:.5,decay:.93});k.noise({a:.02,d:.25,type:'lp',f:400,g:.55});k.tone({d:.22,f:220,f1:140,g:.15})}});
 def('bake_in',{cat:'Cooking',label:'Bread into the oven',old:'Sfx.click',dur:.65,lvl:-12,
  made:'the iron oven door (modes 430, 980, 1720 Hz), a breath of heat (low noise) and the door shut on the tray (380, 860 Hz)',
  fn:function(k){k.modal({modes:[[430,.8,.12],[980,.5,.08],[1720,.25,.05]],det:.03,g:.6});k.noise({d:.004,type:'hp',f:2500,g:.35});
   k.noise({t:.08,a:.1,d:.4,type:'lp',f:600,f1:300,g:.45});k.modal({t:.22,modes:[[380,.7,.08],[860,.4,.05]],det:.03,g:.45})}});
 def('bake_done',{cat:'Cooking',label:'Bread baked',old:'(none)',dur:.45,lvl:-13,
  made:'the oven door creaking open, warm air, and two hollow knocks on the crust (360, 800 Hz)',
  fn:function(k){k.creak({a:.02,d:.12,r0:35,r1:25,res:[[700,8,1],[1400,6,.4]],g:.3});k.noise({t:.05,a:.05,d:.2,type:'lp',f:700,g:.25});
   k.modal({t:.14,modes:[[360,.5,.05],[800,.25,.03]],g:.6});k.modal({t:.24,modes:[[380,.45,.045],[830,.2,.03]],g:.4})}});
 def('smelt_roar',{cat:'Smithing',label:'Furnace roar (smelting)',old:'Sfx.smelt',dur:1.2,lvl:-9,
  made:'the furnace roaring up (pink noise opening 250 to 700 Hz), two bellows breaths (500 Hz noise puffs), a 55 Hz rumble and a few crackles',
  fn:function(k){k.noise({a:.25,h:.3,d:.55,type:'lp',f:250,f1:700,ft:.35,g:1,color:'pink'});each([.12,.6],function(t){k.noise({t:t,a:.06,d:.18,f:500,q:.8,g:.45})});
   k.tone({a:.2,d:.8,f:55,g:.25});k.grains({t:.1,n:10,span:.9,f:[1500,4500],d:[.003,.008],g:.2})}});
 def('smelt_bar',{cat:'Smithing',label:'Bar comes out',old:'Sfx.smelt',dur:.35,lvl:-13,
  made:'a hot bar set down on stone: a dull metal ring (900, 1850, 2950 Hz), a thump and a thin hiss',
  fn:function(k){k.modal({modes:[[900,.6,.12],[1850,.4,.07],[2950,.2,.045]],det:.03,g:.6});k.tone({d:.05,f:160,f1:100,g:.45});k.noise({t:.02,a:.02,d:.2,type:'hp',f:4000,g:.2})}});
 def('anvil',{cat:'Smithing',label:'Hammer on anvil (each strike)',old:'anvil clink (square)',dur:.55,lvl:-9,pv:.035,
  made:'the hammer face meeting the anvil (a 3 ms click), the anvil ringing (inharmonic modes near 1150, 1720, 2690, 3850, 5100 Hz, the lowest ringing a third of a second) and the hammer\'s body thud, in a small room, low-passed so it rings rather than stings',
  fn:function(k){k.noise({d:.003,type:'hp',f:3000,g:.7});k.modal({pitch:k.j(1,.04),modes:[[1150,1,.35],[1720,.55,.24],[2690,.45,.18],[3850,.22,.1],[5100,.1,.06]],det:.015,g:.8});
   k.tone({d:.04,f:200,f1:140,g:.35});k.room(.12,.8);k.lp(7200)}});
 def('smith_done',{cat:'Smithing',label:'Item finished',old:'Sfx.smith',dur:.45,lvl:-13,
  made:'the new blade cooling (a thin rising hiss) and set down (a short ring at 1.3, 2.7 kHz and a thump)',
  fn:function(k){k.noise({a:.02,d:.35,type:'hp',f:3000,f1:6000,g:.35});k.modal({t:.05,modes:[[1300,.5,.1],[2700,.3,.06]],det:.03,g:.45});k.tone({t:.05,d:.05,f:170,f1:110,g:.4})}});
 def('bucket_take',{cat:'Skills',label:'Take a bucket',old:'Sfx.click',dur:.15,lvl:-14,
  made:'a wooden bucket knocked (300, 700 Hz) and its iron bail clinking (1.9, 3.1 kHz)',
  fn:function(k){k.modal({modes:[[300,.7,.05],[700,.3,.03]],det:.04,g:.8});k.modal({t:.03,modes:[[1900,.4,.045],[3100,.2,.025]],det:.03,g:.35});k.noise({d:.03,type:'lp',f:800,g:.4})}});
 def('bucket_water',{cat:'Skills',label:'Fill bucket: water',old:'Sfx.click',dur:.75,lvl:-12,
  made:'water pouring into a wooden bucket (noise rising 0.9 to 1.5 kHz, a little rough) with ten bubbles whose pitch climbs as it fills',
  fn:function(k){k.modal({modes:[[260,.5,.05]],g:.4});k.noise({t:.03,a:.05,h:.35,d:.25,f:900,f1:1500,ft:.6,q:1,grit:[45,.5,.1],g:.7});
   for(var i=0;i<10;i++){var f=k.j(500+i*60,.06);k.tone({t:.05+i*.055+k.r(0,.02),a:.0008,d:k.r(.02,.035),f:f,f1:f*1.6,g:.25})}}});
 def('bucket_flour',{cat:'Skills',label:'Fill bucket: flour',old:'Sfx.click',dur:.7,lvl:-13,
  made:'dry flour pouring (dense rough low-passed noise) and a soft puff as it settles',
  fn:function(k){k.noise({a:.05,h:.3,d:.2,type:'lp',f:2500,grit:[300,.8,.3],g:.8});k.noise({t:.45,a:.02,d:.15,type:'lp',f:700,g:.3})}});
 def('dough',{cat:'Skills',label:'Mix dough',old:'Sfx.click',dur:.4,lvl:-14,
  made:'two soft kneads (wet low noise pressed down) and a floury pat',
  fn:function(k){each([0,.15],function(t){k.noise({t:t,a:.02,d:.1,type:'lp',f:600,grit:[60,.6,.2],g:.8});k.tone({t:t,d:.06,f:120,f1:80,g:.35})});k.noise({t:.3,d:.05,f:1500,q:.8,g:.3})}});
 def('rope_tie',{cat:'Skills',label:'Tie the rope',old:'(none)',dur:.7,lvl:-12,
  made:'rope fibres rubbing (1.4 kHz noise fluttering at 18 Hz), then two tugs: a short rope squeak (700, 1300 Hz) and a taut 110 Hz thump each',
  fn:function(k){k.noise({a:.04,d:.25,f:1400,q:.7,am:[18,.6],g:.6});k.creak({t:.28,a:.02,d:.15,r0:70,r1:40,res:[[700,6,1],[1300,5,.5]],g:.4});k.tone({t:.3,d:.06,f:110,f1:80,g:.5});
   k.creak({t:.5,a:.02,d:.1,r0:60,r1:45,res:[[750,6,1]],g:.25});k.tone({t:.52,d:.05,f:105,f1:80,g:.3})}});
 def('rope_climb',{cat:'Skills',label:'Climb the rope',old:'(none)',dur:.95,lvl:-12,
  made:'four hand-over-hand rubs (noise 1.1 to 0.7 kHz, a small squeak each) and the shaft frame taking the weight (a slow low creak)',
  fn:function(k){each([0,.22,.44,.66],function(t){k.noise({t:t,a:.01,d:.09,f:1100,f1:700,q:.8,g:.55});k.creak({t:t+.02,a:.01,d:.07,r0:80,r1:60,res:[[600,6,1]],g:.2})});
   k.creak({a:.1,h:.3,d:.4,r0:20,r1:35,res:[[220,10,1],[470,8,.4]],g:.25})}});
 function ladder(up){return function(k){var P=up?[1,1.06,1.12,1.18]:[1.18,1.12,1.06,1];
  each(P,function(p,i){var t=i*.19;k.modal({t:t,pitch:p,modes:[[180,1,.06],[420,.5,.04],[900,.2,.025]],det:.03,g:.8});k.tone({t:t+.01,d:.05,f:110,f1:70,g:.4});k.creak({t:t+.02,a:.01,d:.06,r0:50,r1:40,res:[[500,8,1]],g:.12})});
  k.tone({t:.8,d:.12,f:up?95:75,f1:45,g:.5});k.noise({t:.8,d:.06,type:'lp',f:500,g:.35})}}
 def('ladder_up',{cat:'Skills',label:'Ladder: climb up',old:'climbUp',dur:1.0,lvl:-11,
  made:'four rungs rising in pitch (wood knocks 180, 420, 900 Hz, a foot thump and a tiny creak each) and a last step onto the floor',fn:ladder(true)});
 def('ladder_down',{cat:'Skills',label:'Ladder: climb down',old:'climbDown',dur:1.0,lvl:-11,
  made:'four rungs falling in pitch and a lower last step onto the floor below',fn:ladder(false)});
 def('stairs',{cat:'Skills',label:'Stairs (up or down a flight)',old:'(none)',dur:.7,lvl:-15,pv:.04,
  made:'three footfalls on wooden treads (hollow knocks 210, 480, 1050 Hz, a low thump each), a little quicker than a ladder',
  fn:function(k){each([0,.17,.34],function(t,i){k.modal({t:t,pitch:1+i*.04,modes:[[210,.8,.06],[480,.4,.04],[1050,.15,.025]],det:.05,g:1-i*.1});k.tone({t:t,d:.05,f:100,f1:65,g:.4});k.noise({t:t,d:.03,type:'lp',f:1100,g:.3})});
   k.creak({t:.1,a:.02,d:.12,r0:40,r1:30,res:[[420,9,1],[860,7,.4]],g:.15})}});
 def('pulley',{cat:'Skills',label:'Pulley / windlass creak',old:'pulleyCreak',dur:.85,lvl:-15,
  made:'a windlass creak (stick-slip 20 to 40 per second through 180, 400 Hz) and three soft pawl ticks (wood, not square waves)',
  fn:function(k){k.creak({a:.08,h:.3,d:.4,r0:20,r1:40,res:[[180,10,1],[400,8,.5],[820,6,.2]],g:.7});each([0,.23,.46],function(t){k.modal({t:t,modes:[[1100,.4,.025],[2300,.2,.015]],g:.3})})}});

 /* ======================================================================== combat */
 def('swing_stab',{cat:'Combat',label:'Swing: stab',old:'CombatFX swing stab',dur:.14,lvl:-12,
  made:'a short, high thrust whoosh (band-passed noise 3.2 to 1.6 kHz) and a thin air edge',
  fn:function(k){k.noise({a:.02,d:.08,f:3200,f1:1600,q:1.6,g:1});k.noise({t:.01,d:.04,type:'hp',f:5000,g:.2})}});
 def('swing_slash',{cat:'Combat',label:'Swing: slash',old:'CombatFX swing slash',dur:.22,lvl:-10,
  made:'a longer arc whoosh (noise swept 2.6 to 0.7 kHz, swelling in the middle like a blade passing)',
  fn:function(k){k.noise({a:.06,d:.13,f:2600,f1:700,q:1.2,g:1})}});
 def('swing_crush',{cat:'Combat',label:'Swing: crush',old:'CombatFX swing crush',dur:.28,lvl:-10,
  made:'a heavy, low whoosh (low-passed noise 1.1 kHz to 300 Hz) with a slower swell',
  fn:function(k){k.noise({a:.07,d:.18,type:'lp',f:1100,f1:300,q:.7,g:1});k.noise({t:.03,d:.15,f:600,f1:250,q:1.2,g:.4})}});
 function hit(kind){return function(k){var f0=kind==='crush'?140:kind==='stab'?190:165;
  k.tone({d:.12,f:k.j(f0,.05),f1:55,g:1});k.noise({d:.07,type:'lp',f:1400,f1:300,g:.8});k.noise({d:.005,f:2000,q:1,g:.3});
  if(kind==='slash')k.noise({d:.05,f:3600,f1:1800,q:3,g:.3});
  if(kind==='stab')k.noise({d:.035,f:2400,q:2,g:.35});
  if(kind==='crush'){k.tone({t:.01,d:.25,f:95,f1:40,g:.6});k.noise({d:.2,type:'lp',f:700,f1:120,g:.5})}
  k.lp(6000)}}
 def('hit_slash',{cat:'Combat',label:'Hit: slash',old:'CombatFX hit',dur:.3,lvl:-5,made:'a body blow (a 165 Hz sine drop to 55 Hz, low noise, a click) and a cutting 3.6 kHz edge',fn:hit('slash')});
 def('hit_stab',{cat:'Combat',label:'Hit: stab',old:'CombatFX hit',dur:.3,lvl:-5,made:'a tighter body blow (190 Hz drop) with a short pierce at 2.4 kHz',fn:hit('stab')});
 def('hit_crush',{cat:'Combat',label:'Hit: crush',old:'CombatFX hit',dur:.35,lvl:-5,made:'a heavy blow (140 Hz drop plus a 95 Hz sub-thump) and a long low noise body',fn:hit('crush')});
 def('hurt',{cat:'Combat',label:'Player is hit',old:'CombatFX hurt',dur:.25,lvl:-5,
  made:'a dull body blow on the adventurer (130 Hz sine drop, low noise) with a faint 320 Hz grunt-like triangle',
  fn:function(k){k.tone({d:.15,f:130,f1:48,g:1});k.noise({d:.09,type:'lp',f:900,f1:200,g:.8});k.tone({t:.005,d:.06,f:320,f1:180,wave:'tri',g:.15})}});
 def('block',{cat:'Combat',label:'Block (0 on a guard)',old:'CombatFX block',dur:.15,lvl:-10,
  made:'a parry: a "tock-tink" of wood and metal (modes 520, 1180, 2350 Hz), a short 2.4 kHz scrape and a small thump',
  fn:function(k){k.modal({modes:[[520,1,.05],[1180,.6,.035],[2350,.3,.025]],det:.04,g:.8});k.noise({d:.02,f:2400,q:2,g:.5});k.tone({d:.04,f:140,f1:100,g:.4})}});
 def('miss',{cat:'Combat',label:'Miss (0 on a beast)',old:'CombatFX block',dur:.14,lvl:-15,
  made:'a whiff: a soft noise swish 1.5 to 0.9 kHz and a little low air',
  fn:function(k){k.noise({a:.015,d:.07,f:1500,f1:900,q:1,g:1});k.noise({t:.04,d:.05,type:'lp',f:600,g:.3})}});
 def('bow',{cat:'Combat',label:'Bow: loose',old:'CombatFX bow',dur:.45,lvl:-8,
  made:'the bowstring (a plucked string near 98 Hz), the limbs kicking (a 180 Hz thump) and the arrow leaving (noise 3 to 1.5 kHz)',
  fn:function(k){k.pluck({f:k.j(98,.03),d:.35,bright:.7,g:1});k.tone({d:.06,f:180,f1:90,g:.4});k.noise({t:.01,a:.01,d:.1,f:3000,f1:1500,q:1,g:.35});k.lp(6000)}});
 def('arrow_hit',{cat:'Combat',label:'Arrow hits',old:'CombatFX arrowHit',dur:.2,lvl:-7,
  made:'a thwack (a click, a 240 Hz sine drop and a 1.1 kHz noise knock) and the shaft quivering (190 Hz with a 38 Hz tremble)',
  fn:function(k){k.noise({d:.003,type:'hp',f:2000,g:.7});k.tone({d:.08,f:240,f1:90,g:.9});k.noise({d:.07,f:1100,f1:340,q:2,g:.8});k.tone({t:.005,a:.002,d:.14,f:190,trem:[38,.9],g:.18})}});
 def('arrow_miss',{cat:'Combat',label:'Arrow misses',old:'CombatFX arrowHit miss',dur:.12,lvl:-12,
  made:'the arrow striking earth: a short high scuff, a 180 Hz thud and three grains of dirt',
  fn:function(k){k.noise({d:.035,type:'hp',f:2600,f1:1500,g:.5});k.tone({d:.05,f:180,f1:90,g:.4});k.grains({t:.005,n:3,span:.05,f:[1500,3000],d:[.004,.01],g:.25})}});
 def('spell_charge',{cat:'Combat',label:'Spell: gather (wind)',old:'CombatFX charge',dur:.5,lvl:-10,
  made:'air drawn in: a resonant noise sweep 480 Hz to 2.6 kHz with two soft rising sines (330 and 495 Hz upward, a little vibrato)',
  fn:function(k){k.noise({a:.25,d:.2,f:480,f1:2600,ft:.4,q:3,g:.8});k.tone({a:.2,d:.25,f:330,f1:700,ft:.4,vib:[7,.01],g:.2});k.tone({t:.05,a:.18,d:.22,f:495,f1:1050,ft:.4,vib:[7,.01],g:.13})}});
 def('spell_cast',{cat:'Combat',label:'Spell: release (wind)',old:'CombatFX release',dur:.32,lvl:-8,
  made:'the gust let go: a noise whoosh 2 kHz to 650 Hz, a thin high air layer and a falling sine',
  fn:function(k){k.noise({a:.02,d:.26,f:2000,f1:650,q:1.2,g:1});k.noise({d:.12,type:'hp',f:5200,f1:3000,g:.25});k.tone({d:.15,f:700,f1:300,g:.1})}});
 def('spell_hit',{cat:'Combat',label:'Spell: impact',old:'CombatFX magicHit',dur:.3,lvl:-7,
  made:'an airy burst (high-passed noise falling 3.2 to 0.9 kHz), a falling 760 Hz sine, a low 130 Hz thump and six sparkle grains',
  fn:function(k){k.noise({a:.002,d:.2,type:'hp',f:3200,f1:900,g:.8});k.tone({d:.18,f:760,f1:210,g:.3});k.tone({d:.12,f:130,f1:58,g:.5});k.grains({n:6,span:.15,type:'hp',f:[6000,9000],d:[.003,.006],g:.2})}});
 def('spell_splash',{cat:'Combat',label:'Spell: splash (miss)',old:'CombatFX splash',dur:.38,lvl:-10,
  made:'a fizzle: noise 2.6 kHz falling to 650 Hz, a small falling sine and a faint high hiss',
  fn:function(k){k.noise({a:.01,d:.3,f:2600,f1:650,q:.9,g:.7});k.tone({d:.2,f:320,f1:170,g:.2});k.noise({d:.08,type:'hp',f:6000,g:.15})}});
 def('body_fall',{cat:'Combat',label:'Body falls',old:'CombatFX thud',dur:.3,lvl:-7,
  made:'a body meeting the ground: a 120 Hz sine drop to 44 Hz, low noise and four grains of dust',
  fn:function(k){k.tone({d:.2,f:120,f1:44,g:1});k.noise({d:.14,type:'lp',f:520,f1:140,g:.7});k.grains({t:.02,n:4,span:.12,f:[1200,3000],d:[.006,.015],g:.2})}});
 def('player_death',{vars:1,cat:'Combat',label:'Adventurer dies',old:'Sfx.death',dur:1.8,lvl:-6,pv:0,
  made:'a soft falling sigh (a sine 330 to 110 Hz with a touch of second harmonic), two low harp notes (E3, C3) and the fall; no sawtooth',
  fn:function(k){k.tone({a:.03,h:.1,d:.9,f:330,f1:110,ft:.9,vib:[5,.006],g:.45,h2:.2});k.pluck({t:.1,f:164.81,d:1.2,bright:.35,g:.5});k.pluck({t:.38,f:130.81,d:1.4,bright:.3,g:.55});
   k.tone({t:.55,d:.2,f:110,f1:48,g:.6});k.noise({t:.55,d:.15,type:'lp',f:500,g:.4});k.room(.2,1.1)}});

 /* ======================================================================== creatures (formant voices) */
 var A=[700,1150,2500],U=[380,850,2300],O=[480,850,2300];
 def('rat_idle',{cat:'Creatures',label:'Rat: squeak',old:'(none)',dur:.2,lvl:-14,pv:.05,
  made:'two short squeaks: sine chirps 3.2-3.9 kHz with a fast 45 Hz wobble, and a breath of hiss',
  fn:function(k){k.tone({a:.005,h:.02,d:.05,pts:[[0,3200],[.03,3900],[.075,3000]],vib:[45,.03],g:1});k.tone({t:.11,a:.005,h:.01,d:.04,pts:[[0,3000],[.025,3600],[.06,2900]],vib:[50,.03],g:.7});k.noise({d:.03,type:'hp',f:5000,g:.1})}});
 def('rat_attack',{cat:'Creatures',label:'Rat: bite',old:'CombatFX snap',dur:.2,lvl:-9,pv:.05,
  made:'a hiss (noise over 3.5 kHz), a sharp rising squeak and the teeth snapping (a 2.5 kHz tick)',
  fn:function(k){k.noise({a:.01,d:.12,type:'hp',f:3500,g:.6});k.tone({t:.03,a:.004,h:.02,d:.05,pts:[[0,3600],[.04,4300]],vib:[55,.03],g:1});k.noise({t:.06,d:.005,f:2500,q:1,g:.4})}});
 def('rat_hurt',{cat:'Creatures',label:'Rat: hurt',old:'(none)',dur:.16,lvl:-8,pv:.05,
  made:'a squeal falling 4.2 to 3.1 kHz with a 55 Hz wobble',
  fn:function(k){k.tone({a:.003,h:.04,d:.08,pts:[[0,4200],[.12,3100]],vib:[55,.04],g:1,h2:.2})}});
 def('rat_death',{cat:'Creatures',label:'Rat: dies',old:'CombatFX death (saw)',dur:.42,lvl:-7,pv:.04,
  made:'a long squeal sliding down 3.8 to 1.9 kHz and fading',
  fn:function(k){k.tone({a:.005,h:.1,d:.25,pts:[[0,3800],[.35,1900]],vib:[40,.05],g:1,h2:.15})}});
 def('goblin_idle',{cat:'Creatures',label:'Goblin: mutter',old:'(none)',dur:.45,lvl:-14,pv:.04,
  made:'three gruff syllables: a glottal pulse train at 160-210 Hz through three vowel formants, a little breathy',
  fn:function(k){var V=[A,U,O,[550,1700,2500]];each([0,.14,.3],function(t,i){k.voice({t:t,a:.01,h:.04,d:.06,pts:[[0,k.r(165,210)],[.1,k.r(150,190)]],vow:[[0,V[Math.floor(k.R()*V.length)]]],breath:.3,jit:.04,g:1-i*.15})})}});
 def('goblin_attack',{cat:'Creatures',label:'Goblin: attack',old:'CombatFX swing',dur:.3,lvl:-9,pv:.04,
  made:'a short "hah!": the voice rising 170 to 235 Hz and falling, vowel "ah" (F1 650-780, F2 1150-1250 Hz), breathy',
  fn:function(k){k.voice({a:.015,h:.08,d:.12,pts:[[0,170],[.06,235],[.2,150]],vow:[[0,[650,1150,2500]],[.1,[780,1250,2600]]],breath:.35,jit:.03,g:1});k.noise({d:.1,type:'hp',f:3000,g:.12})}});
 def('goblin_hurt',{cat:'Creatures',label:'Goblin: hurt',old:'(none)',dur:.22,lvl:-8,pv:.04,
  made:'an "ugh": the voice falling 215 to 150 Hz, vowel "u" (F1 380-450, F2 850-950 Hz)',
  fn:function(k){k.voice({a:.01,h:.05,d:.12,pts:[[0,215],[.17,150]],vow:[[0,[450,950,2400]],[.15,U]],breath:.3,jit:.04,g:1})}});
 def('goblin_death',{cat:'Creatures',label:'Goblin: dies',old:'CombatFX death (saw)',dur:.7,lvl:-7,pv:.03,
  made:'an "urrgh": the voice sinking 185 to 88 Hz and roughening (jitter), vowel "ah" closing to "u"',
  fn:function(k){k.voice({a:.02,h:.25,d:.35,pts:[[0,185],[.55,88]],vow:[[0,[600,1050,2450]],[.3,[420,880,2350]],[.6,U]],breath:.3,jit:.12,g:1})}});
 def('chicken_idle',{cat:'Creatures',label:'Chicken: cluck',old:'(none)',dur:.36,lvl:-14,pv:.05,
  made:'"buk buk": short voiced clucks at about 620 Hz through bright formants (1.1, 2.2, 3.3 kHz)',
  fn:function(k){var n=k.R()<.4?3:2;for(var i=0;i<n;i++)k.voice({t:i*.12,a:.004,h:.02,d:.035,pts:[[0,k.j(620,.05)],[.05,560]],vow:[[0,[1100,2200,3300]]],bw:[140,180,220],breath:.15,g:1-i*.12})}});
 def('chicken_hurt',{cat:'Creatures',label:'Chicken: squawk',old:'(none)',dur:.35,lvl:-8,pv:.05,
  made:'"b\'KAWK": a clipped cluck then a loud squawk (900-1000 Hz voice, formants 1.3, 2.6, 3.5 kHz) with feathers fluttering (noise pulsing at 24 Hz)',
  fn:function(k){k.voice({a:.004,h:.015,d:.02,pts:[[0,650]],vow:[[0,[1100,2200,3300]]],bw:[140,180,220],g:.5});k.voice({t:.06,a:.005,h:.06,d:.08,pts:[[0,900],[.05,1000],[.14,760]],vow:[[0,[1300,2600,3500]]],bw:[150,200,250],breath:.25,g:1});
   k.noise({t:.05,a:.01,d:.2,f:2200,q:.8,am:[24,.8],g:.25})}});
 def('chicken_attack',{cat:'Creatures',label:'Chicken: peck',old:'CombatFX snap',dur:.2,lvl:-10,pv:.05,
  made:'a beak tap (a 2.8 kHz tick and a small knock) and one cluck',
  fn:function(k){k.noise({d:.004,f:2800,q:2,g:.6});k.tone({d:.02,f:400,f1:250,g:.3});k.voice({t:.05,a:.004,h:.02,d:.04,pts:[[0,680],[.05,600]],vow:[[0,[1100,2200,3300]]],bw:[140,180,220],g:1})}});
 def('chicken_death',{cat:'Creatures',label:'Chicken: dies',old:'CombatFX death (saw)',dur:.6,lvl:-7,pv:.04,
  made:'a falling squawk (950 to 700 Hz) and a last flurry of feathers (noise fluttering at 22 Hz)',
  fn:function(k){k.voice({a:.006,h:.1,d:.18,pts:[[0,950],[.25,700]],vow:[[0,[1300,2600,3500]]],bw:[150,200,250],breath:.25,g:1});k.noise({t:.1,a:.02,h:.15,d:.2,f:2000,q:.7,am:[22,.85],g:.45})}});
 def('cow_idle',{cat:'Creatures',label:'Cow: moo',old:'(none)',dur:1.2,lvl:-12,pv:.03,
  made:'"mooo": a low voice at 104 rising to 126 Hz and sagging to 98 Hz, from a closed nasal "m" (F1 300 Hz) opening to "oo", breathy, low-passed',
  fn:function(k){k.voice({a:.15,h:.5,d:.45,pts:[[0,104],[.35,126],[.9,98]],vow:[[0,[300,900,2300]],[.25,[420,850,2250]],[.9,[460,820,2200]]],bw:[80,110,160],breath:.12,jit:.02,amp:[1,.5,.2],g:1});k.lp(3000)}});
 def('cow_hurt',{cat:'Creatures',label:'Cow: hurt',old:'(none)',dur:.35,lvl:-8,pv:.03,
  made:'a short "mmh!": the voice at 150 falling to 118 Hz, "m" opening to "uh"',
  fn:function(k){k.voice({a:.03,h:.12,d:.16,pts:[[0,150],[.25,118]],vow:[[0,[320,900,2300]],[.1,[480,860,2200]]],breath:.2,g:1});k.lp(3200)}});
 def('cow_attack',{cat:'Creatures',label:'Cow: butt',old:'CombatFX swing crush',dur:.3,lvl:-10,pv:.04,
  made:'a snort (a 700 Hz noise blast) and a low 95 Hz grunt',
  fn:function(k){k.noise({a:.02,d:.2,f:700,q:.7,g:.8});k.voice({t:.05,a:.02,h:.05,d:.1,pts:[[0,95],[.15,88]],vow:[[0,O]],breath:.3,g:.8});k.lp(3500)}});
 def('cow_death',{cat:'Creatures',label:'Cow: dies',old:'CombatFX death (saw)',dur:1.3,lvl:-7,pv:.03,
  made:'a low moo sinking 112 to 68 Hz and roughening, then the fall (a thud and low noise)',
  fn:function(k){k.voice({a:.05,h:.35,d:.5,pts:[[0,112],[.8,68]],vow:[[0,[420,850,2250]],[.8,[350,780,2200]]],breath:.2,jit:.06,g:1});k.tone({t:.75,d:.2,f:100,f1:45,g:.7});k.noise({t:.75,d:.15,type:'lp',f:450,g:.5});k.lp(3200)}});

 /* ======================================================================== world */
 def('bell',{vars:1,cat:'World',label:'Ferry bell (one ring)',old:'bell ding (sines)',dur:2.6,lvl:-6,pv:.004,gv:.05,
  made:'a bronze bell: hum, prime, minor-third tierce, quint, nominal (988 Hz, as before), and three upper partials, each with its own decay and a slowly beating twin (1.1 Hz), a soft clapper click and a small room',
  fn:function(k){var f=494;k.modal({modes:[[f*.5,.35,3],[f,.55,2.2],[f*1.2,.45,1.7],[f*1.5,.2,1.1],[f*2,.8,1.5],[f*2.5,.22,.8],[f*3,.15,.6],[f*4.2,.08,.35]],beat:1.1,g:1});
   k.noise({d:.004,type:'lp',f:3000,g:.25});k.room(.18,1.2);k.lp(6000)}});
 def('skiff_push',{cat:'World',label:'Skiff pushes off',old:'(none)',dur:1.2,lvl:-9,
  made:'the hull knocking the pier (wood modes 95, 210 Hz), the planks creaking (stick-slip 40 to 20 per second) and water sloshing along the side',
  fn:function(k){k.modal({modes:[[95,.8,.25],[210,.5,.15],[430,.2,.08]],det:.03,g:.6});k.creak({t:.05,a:.1,h:.2,d:.3,r0:40,r1:20,res:[[220,10,1],[480,8,.4]],g:.5});
   k.noise({t:.1,a:.1,d:.6,type:'lp',f:900,grit:[12,.5,.1],g:.5});k.noise({t:.2,a:.003,d:.15,f:1300,f1:600,q:.9,g:.35})}});
 def('oar',{cat:'World',label:'Oar stroke',old:'(none)',dur:.8,lvl:-12,
  made:'the blade dipping (a 1.2 kHz plash and droplets), the oar knocking in its lock (420, 950 Hz) and the water swirling past',
  fn:function(k){k.noise({a:.01,d:.18,f:1200,f1:500,q:.9,g:.8});k.grains({t:.03,n:3,span:.15,drop:true,f:[700,1200],d:[.02,.035],g:.25});k.modal({t:.25,modes:[[420,.5,.05],[950,.3,.03]],det:.04,g:.4});k.noise({t:.2,a:.1,d:.4,type:'lp',f:600,grit:[20,.5,.1],g:.3})}});
 def('water_loop',{cat:'World',label:'Shore water loop',old:'(none)',dur:8,xf:.6,loop:true,vars:1,lvl:-20,gv:0,pv:0,
  made:'a seamless 8 s loop: a soft low bed of water (pink noise under 400 Hz) and four slow waves washing in (noise opening 500 to 900 Hz over a second) with a few plinks',
  fn:function(k){var L=8.6;k.noise({a:.001,h:L,d:.01,type:'lp',f:400,color:'pink',g:.3});
   for(var i=0;i<4;i++)k.noise({t:i*2.1+k.r(0,.4),a:1.1,d:1.2,type:'lp',f:500,f1:900,ft:1.1,color:'pink',g:.55});
   k.grains({n:6,span:L-.3,drop:true,f:[600,1100],d:[.02,.04],g:.15})}});
 def('pond_loop',{cat:'World',label:'Pond loop (Minnow Hollow)',old:'pond ambience (band noise)',dur:6,xf:.5,loop:true,vars:1,lvl:-24,gv:0,pv:0,
  made:'a seamless 6 s loop: still water lapping at the reeds (band-passed pink noise near 650 Hz, slowly uneven) with a few small plinks',
  fn:function(k){var L=6.5;k.noise({a:.001,h:L,d:.01,f:650,q:.7,color:'pink',grit:[2,.5,.02],g:.5});k.grains({n:5,span:L-.3,drop:true,f:[700,1300],d:[.02,.035],g:.25})}});
 def('frog',{cat:'World',label:'Frog croak',old:'holm_fishing croak (saw)',dur:.45,lvl:-20,pv:.04,
  made:'a "rib-bit": a 95 Hz voice pulsed at 28 Hz through a dark vowel, twice',
  fn:function(k){var p=k.j(1,.07);k.voice({a:.01,h:.06,d:.12,pts:[[0,95*p],[.18,88*p]],vow:[[0,[400,1100,2400]]],bw:[120,160,200],trem:[28,.9],g:1});k.voice({t:k.r(.2,.26),a:.01,h:.04,d:.1,pts:[[0,100*p],[.12,90*p]],vow:[[0,[420,1150,2400]]],bw:[120,160,200],trem:[30,.9],g:.8})}});
 def('duck',{cat:'World',label:'Duck quack',old:'holm_fishing quack (square)',dur:.35,lvl:-20,pv:.05,
  made:'a nasal "quack": a 390 Hz voice falling to 300 Hz through narrow formants (900, 1650, 2900 Hz), twice',
  fn:function(k){each([0,.17],function(t,i){k.voice({t:t,a:.01,h:.03,d:.07,pts:[[0,390],[.1,300]],vow:[[0,[900,1650,2900]]],bw:[60,80,120],breath:.2,g:1-i*.2})})}});
 def('bird',{cat:'World',label:'Bird chirp',old:'holm_fishing chirp',dur:.2,lvl:-20,pv:.06,
  made:'two sine chirps around 2.4-3.3 kHz',
  fn:function(k){var p=k.j(1,.08);k.tone({a:.004,d:.06,pts:[[0,2400*p],[.035,3200*p],[.07,2800*p]],g:1});k.tone({t:k.r(.08,.11),a:.004,d:.05,pts:[[0,2700*p],[.03,3300*p]],g:.8})}});
 def('mill_rush',{cat:'World',label:'Mill race loop',old:'mill loop (band noise)',dur:5,xf:.5,loop:true,vars:1,lvl:-19,gv:0,pv:0,
  made:'a seamless 5 s loop of falling water: pink noise under 900 Hz with a bright, rough white-water layer near 2.2 kHz',
  fn:function(k){var L=5.5;k.noise({a:.001,h:L,d:.01,type:'lp',f:900,color:'pink',grit:[4,.3,.02],g:.6});k.noise({a:.001,h:L,d:.01,f:2200,q:.5,grit:[30,.6,.1],g:.25})}});
 def('mill_slap',{cat:'World',label:'Mill paddle slap',old:'mill slap',dur:.25,lvl:-20,
  made:'a paddle meeting the tailrace: low-passed noise 700 to 260 Hz and three droplets',
  fn:function(k){k.noise({a:.003,d:.12,type:'lp',f:700,f1:260,g:1});k.grains({t:.01,n:3,span:.12,drop:true,f:[600,1000],d:[.02,.03],g:.3})}});
 def('mill_creak',{cat:'World',label:'Mill axle creak',old:'mill creak (saw)',dur:.6,lvl:-20,
  made:'the wooden axle turning: a slow creak (stick-slip 18 to 28 per second through 160, 330, 700 Hz) and a lower answer',
  fn:function(k){k.creak({a:.05,h:.12,d:.2,r0:18,r1:28,jit:.3,res:[[160,12,1],[330,10,.5],[700,8,.2]],g:1});k.creak({t:.2,a:.03,d:.15,r0:15,r1:20,res:[[128,12,1],[270,10,.4]],g:.6})}});
 def('forge_loop',{cat:'World',label:'Furnace loop (by the furnace)',old:'(none)',dur:6,xf:.5,loop:true,vars:1,lvl:-16,gv:0,pv:0,
  made:'a seamless 6 s loop: a deep rumble (brown noise under 180 Hz), a slow breathing roar (pink noise under 500 Hz) and twenty small crackles',
  fn:function(k){var L=6.5;k.noise({a:.001,h:L,d:.01,type:'lp',f:180,color:'brown',grit:[1.5,.4,.01],g:.7});k.noise({a:.001,h:L,d:.01,type:'lp',f:500,color:'pink',am:[.35,.4],g:.45});
   for(var i=0;i<20;i++){var s=k.R();k.noise({t:k.R()*L,a:.0003,d:k.r(.002,.006),f:k.r(1500,4500),q:1.5,g:.1+.3*s*s})}}});
 def('step_grass',{cat:'World',label:'Footstep: grass / earth',old:'(none)',dur:.08,lvl:-24,pv:.08,gv:.25,
  made:'a soft muffled footfall: low-passed noise 900 to 400 Hz, a brush of rough high noise and a 90 Hz thump',
  fn:function(k){k.noise({a:.004,d:.05,type:'lp',f:900,f1:400,g:.8});k.noise({t:.005,d:.03,f:3000,q:.8,grit:[400,.8,.4],g:.25});k.tone({d:.03,f:90,f1:60,g:.3})}});
 def('step_wood',{cat:'World',label:'Footstep: planks',old:'(none)',dur:.08,lvl:-24,pv:.08,gv:.25,
  made:'a hollow plank knock (210, 480, 1050 Hz) and a little low noise',
  fn:function(k){k.modal({modes:[[210,.7,.05],[480,.35,.03],[1050,.15,.02]],det:.05,g:.8});k.noise({d:.03,type:'lp',f:1200,g:.4})}});
 def('step_stone',{cat:'World',label:'Footstep: stone',old:'(none)',dur:.06,lvl:-25,pv:.08,gv:.25,
  made:'a harder tick (a 1.5 kHz noise tap), two grit grains and a small knock',
  fn:function(k){k.noise({d:.02,f:1500,q:1,g:.7});k.grains({n:2,span:.02,type:'hp',f:[3500,5000],d:[.002,.004],g:.3});k.tone({d:.02,f:120,f1:90,g:.3})}});

 // which level-up candidate the game plays (see the inventory doc for the reasons)
 L.LEVEL_PICK='level_up_a';
 // sounds rendered ahead after the first gesture, so their first play never renders on the spot
 L.WARM=['ui_click','ui_tab','ui_dialogue','chop','mine','anvil','hit_slash','hit_stab','hit_crush','hurt','block','miss','swing_slash','swing_stab','swing_crush',
  'pickup','drop','eat','quest_step','level_up_a','fire_loop','door_open','door_close','fish_splash','fish_cast','step_grass',
  // the heavier ones a first play would otherwise render on the spot (tens of ms)
  'quest_done','ui_map_open','ui_window_open','ui_window_close','equip_tool','equip_metal','log_land','tree_creak','tree_fall','ore_break','rock_empty','bank_open','fire_strike','fire_catch',
  'cook_sizzle','cook_done','cook_burn','bake_in','smelt_roar','smelt_bar','smith_done','water_loop','forge_loop','pond_loop','mill_rush','ladder_up','ladder_down'];
})(typeof SfxLib!=='undefined'?SfxLib:(typeof module!=='undefined'&&module.exports?require('./sfx_lib.js'):null));
