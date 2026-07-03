/* ================= SAVE SYSTEM (localStorage) =================
   Extracted verbatim from game4_ui.js (pure move, zero behavior change).
   Loads right after game4_ui.js / ui_map.js / ui_shop.js and before every
   SaveGame consumer (intents.js, game5_main.js, char_creator/customizer),
   all of which only touch SaveGame at runtime (post-boot). */
const SaveGame = {
  KEY:'motionscape_save',
  // all durable bytes flow through the Persist boundary (src/persist.js) — V2 swaps the store
  available(){ try{ return typeof Persist!=='undefined' && !!Persist.store; }catch(e){ return false; } },
  exists(){ if(!this.available()) return false;
    return Persist.store.has(this.KEY); },
  serialize(){
    return JSON.stringify({
      v:1,
      xp:Player.xp, hp:Player.hp, maxHp:Player.maxHp,
      inv:Player.inv, bank:Player.bank, equip:Player.equip,
      quests:Player.quests, castMode:!!Player.castMode,
      tut:{step:Tutorial.step, complete:!!Tutorial.complete},
      pos:[player.position.x, player.position.z],
      tracked:Quest.tracked,
      look:{name:CharCfg.name, gender:CharCfg.gender, shirt:CharCfg.shirt, skin:CharCfg.skin,
            hair:CharCfg.hair, hairStyle:CharCfg.hairStyle, beard:CharCfg.beard, legs:CharCfg.legs},
      styles:Player.attackStyles, autoRetaliate:Player.autoRetaliate,
      music:{unlocked:Music.unlocked, mode:Music.mode, current:Music.current},
      energy:Player.energy, runOn:Player.runOn, spec:Player.spec,
      prayerPts:Player.prayerPts,
      spell:Player.spell,
    });
  },
  save(silent){
    if(!this.available()) return false;
    try{ if(!Persist.store.set(this.KEY, this.serialize())) return false;
      if(!silent) UI.chat('Game saved.','sys');
      return true;
    }catch(e){ return false; }
  },
  load(){
    if(!this.available()) return false;
    let d=null;
    try{ const raw=Persist.store.get(this.KEY); if(!raw) return false; d=JSON.parse(raw); }
    catch(e){ return false; }
    if(!d || d.v!==1) return false;
    try{
      Object.assign(Player.xp, d.xp);
      Player.hp=d.hp; Player.maxHp=d.maxHp;
      Player.inv=d.inv; Player.bank=d.bank; Player.equip=d.equip;
      Player.quests=d.quests||{}; Player.castMode=!!d.castMode;
      Quest.tracked=d.tracked||null;
      if(d.styles) Object.assign(Player.attackStyles, d.styles);
      if(d.autoRetaliate!==undefined) Player.autoRetaliate=!!d.autoRetaliate;
      if(d.energy!==undefined){ Player.energy=d.energy; Player.runOn=!!d.runOn; }
      if(d.spec!==undefined) Player.spec=d.spec;
      if(d.prayerPts!==undefined) Player.prayerPts=Math.min(d.prayerPts, Player.maxPrayer());
      if(d.spell && SPELLS[d.spell]){ Player.spell=d.spell; Player.castMode=true; }
      // old spark runes fuse into mind runes
      Player.inv.forEach(s=>{ if(s && s.id==='spark_rune') s.id='mind_rune'; });
      (Player.bank||[]).forEach(s=>{ if(s && s.id==='spark_rune') s.id='mind_rune'; });
      if(d.music){ Music.unlocked=d.music.unlocked||Music.unlocked;
        Music.mode=d.music.mode||'auto'; Music.current=d.music.current||'hollow_square'; }
      if(d.look){ CharCfg.name=d.look.name||'Adventurer';
        CharCfg.shirt=d.look.shirt||0x3a6ea5; CharCfg.skin=d.look.skin||0xd8a878;
        if(d.look.gender) CharCfg.gender=d.look.gender;
        if(d.look.hair!==undefined) CharCfg.hair=d.look.hair;
        if(d.look.hairStyle) CharCfg.hairStyle=d.look.hairStyle;
        if(d.look.beard!==undefined) CharCfg.beard=d.look.beard;
        if(d.look.legs!==undefined) CharCfg.legs=d.look.legs;
        applyPlayerLook(); }
      if(d.tut && d.tut.complete){
        Tutorial.complete=true; Tutorial.step=Tutorial.steps.length;
        const ob=document.getElementById('objective'); if(ob) ob.style.display='none';
      } else if(d.tut){ Tutorial.step=d.tut.step||0; }
      if(d.pos){
        const y=groundY(d.pos[0],d.pos[1]);
        if(y!==null) player.position.set(d.pos[0], y, d.pos[1]);
      }
      refreshPlayerGear();
      UI.refreshInv(); UI.refreshSkills(); UI.refreshQuests(); UI.refreshEquip(); UI.refreshHud();
      UI.chat('Welcome back to Veyhollow. Your progress has been restored.','sys');
      return true;
    }catch(e){ return false; }
  },
  reset(){
    if(!this.available()) return;
    Persist.store.del(this.KEY);
  },
  timer:0,
  tick(dt){
    this.timer-=dt;
    if(this.timer<=0){ this.timer=20; this.save(true); }
  },
};
