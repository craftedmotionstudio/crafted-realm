/* ================= SAVE SYSTEM (localStorage) =================
   Extracted verbatim from game4_ui.js (pure move, zero behavior change).
   Loads right after game4_ui.js / ui_map.js / ui_shop.js and before every
   SaveGame consumer (intents.js, game5_main.js, char_creator/customizer),
   all of which only touch SaveGame at runtime (post-boot). */
const SaveGame = {
  KEY:(typeof QAProfile!=='undefined'&&QAProfile.key)||'motionscape_save',
  // all durable bytes flow through the Persist boundary (src/persist.js) — V2 swaps the store
  available(){ try{ return typeof Persist!=='undefined' && !!Persist.store; }catch(e){ return false; } },
  exists(){ if(!this.available()) return false;
    return Persist.store.has(this.KEY); },
  provider(){
    try{
      return (typeof CRWorldMode!=='undefined' && !CRWorldMode.legacy && CRWorldMode.provider)
        ? CRWorldMode.provider : null;
    }catch(e){ return null; }
  },
  worldMeta(){
    const p=this.provider();
    if(!p) return {provider:'legacy', worldRevision:0, landmark:'holm_arrival'};
    const near=p.closestLandmark(player.position.x,player.position.z);
    return {provider:p.id, worldRevision:p.worldRevision, landmark:near&&near.id};
  },
  serialize(){
    return JSON.stringify({
      v:1,
      xp:Player.xp, hp:Player.hp, maxHp:Player.maxHp,
      inv:Player.inv, bank:Player.bank, equip:Player.equip,
      quests:Player.quests, castMode:!!Player.castMode,
      tut:{step:Tutorial.step, complete:!!Tutorial.complete,
        curriculumVersion:Tutorial.curriculumVersion||0,
        lessonId:(!Tutorial.complete&&Tutorial.steps&&Tutorial.steps[Tutorial.step])?Tutorial.steps[Tutorial.step].id:null,
        departurePackClaimed:!!Tutorial.departurePackClaimed,
        cellarRationClaimed:!!Tutorial.cellarRationClaimed,
        optional:Tutorial.optional||{}},
      pos:[player.position.x, player.position.z],
      plane:Player.plane||0,
      zoneLabel:(typeof document!=='undefined'&&document.getElementById('zone-label'))?
        document.getElementById('zone-label').textContent:null,
      world:this.worldMeta(),
      tracked:Quest.tracked,
      look:{name:CharCfg.name, gender:CharCfg.gender, shirt:CharCfg.shirt, skin:CharCfg.skin,
            hair:CharCfg.hair, hairStyle:CharCfg.hairStyle, beard:CharCfg.beard, legs:CharCfg.legs},
      styles:Player.attackStyles, autoRetaliate:Player.autoRetaliate,
      music:{unlocked:Music.unlocked, mode:Music.mode, current:Music.current},
      energy:Player.energy, runOn:Player.runOn, spec:Player.spec,
      prayerPts:Player.prayerPts,
      spell:Player.spell,
      waterworks:typeof WorkyardWaterworksU4!=='undefined'&&WorkyardWaterworksU4.saveState?
        WorkyardWaterworksU4.saveState():null,
      fishingEdge:typeof WorkyardFishingU5!=='undefined'&&WorkyardFishingU5.saveState?
        WorkyardFishingU5.saveState():null,
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
      if(typeof WorkyardWaterworksU4!=='undefined'&&WorkyardWaterworksU4.restoreState)
        WorkyardWaterworksU4.restoreState(d.waterworks);
      if(typeof WorkyardFishingU5!=='undefined'&&WorkyardFishingU5.restoreState)
        WorkyardFishingU5.restoreState(d.fishingEdge);
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
      if(d.tut){
        Tutorial.departurePackClaimed=!!d.tut.departurePackClaimed;
        Tutorial.cellarRationClaimed=!!d.tut.cellarRationClaimed;
        Tutorial.optional=Object.assign({},d.tut.optional||{});
      }
      if(d.tut && d.tut.complete){
        Tutorial.complete=true; Tutorial.step=Tutorial.steps.length;
        const ob=document.getElementById('objective'); if(ob) ob.style.display='none';
      } else if(d.tut){
        const activeVersion=Number(Tutorial.curriculumVersion)||0;
        const savedVersion=Number(d.tut.curriculumVersion)||0;
        let migratedStep=-1;
        if(d.tut.lessonId&&Tutorial.steps){
          migratedStep=Tutorial.steps.findIndex(s=>s.id===d.tut.lessonId);
        }
        if(migratedStep<0&&savedVersion===4&&activeVersion===5&&Tutorial.steps){
          const v4=['equip_hatchet','chop_logs','light_fire','catch_fish','cook_fish','bake_bread','descend_cavern','mine_copper','mine_tin','smelt_bronze','forge_dagger','open_bank'];
          let next=v4[Math.max(0,Number(d.tut.step)||0)];
          if(next==='bake_bread') next='descend_cavern';
          migratedStep=Tutorial.steps.findIndex(s=>s.id===next);
        }
        if(migratedStep<0&&savedVersion===activeVersion&&Tutorial.steps){
          migratedStep=Math.max(0,Math.min(Tutorial.steps.length-1,Number(d.tut.step)||0));
        }
        Tutorial.step=migratedStep>=0?migratedStep:0;
      }
      let relocated=false, relocationReason=null,restoredPlane=false;
      const savedPlane=Number(d.plane)||0;
      if(savedPlane!==0&&d.pos&&typeof Planes!=='undefined'){
        const px=Number(d.pos[0]),pz=Number(d.pos[1]),py=Planes.elevAt(px,pz,savedPlane);
        let planeSafe=Number.isFinite(px)&&Number.isFinite(pz)&&Number.isFinite(py);
        try{if(planeSafe&&collides(px,pz,.42,true,savedPlane))planeSafe=false;}catch(e){}
        if(planeSafe){
          Player.plane=savedPlane;player.position.set(px,py,pz);restoredPlane=true;
          const planeProvider=this.provider();if(planeProvider)planeProvider.updateResidency(px,pz,true);
          Planes.refreshVisibility();if(d.zoneLabel&&typeof UI!=='undefined'&&UI.zone)UI.zone(d.zoneLabel);
          if(typeof camera!=='undefined'&&typeof camCtl!=='undefined'){
            const cx=px+camCtl.dist*Math.sin(camCtl.yaw)*Math.cos(camCtl.pitch*.6);
            const cz=pz+camCtl.dist*Math.cos(camCtl.yaw)*Math.cos(camCtl.pitch*.6);
            const cy=py+camCtl.dist*Math.sin(camCtl.pitch);
            camera.position.set(cx,cy,cz);camera.lookAt(px,py+1.2,pz);
          }
        }
      }
      if(!restoredPlane&&(d.pos || this.provider())){
        const provider=this.provider();
        let target;
        if(provider) target=provider.resolveSavedPosition(d.pos,d.world);
        else if(d.pos) target={x:Number(d.pos[0]),z:Number(d.pos[1]),relocated:false,reason:'legacy-position'};
        if(target){
          let y=groundY(target.x,target.z);
          let safe=y!==null && y>=-1.2;
          try{ if(safe && collides(target.x,target.z,0.42,true,0)) safe=false; }catch(e){}
          if(!safe && provider){
            const fallback=provider.getSpawnLandmark(provider.defaultLandmark);
            target={x:fallback.x,z:fallback.z,relocated:true,reason:'unsafe-saved-position'};
            y=groundY(target.x,target.z); safe=y!==null && y>=-1.2;
          }
          if(safe){
            Player.plane=0;
            player.position.set(target.x,y,target.z);
            // Saves may restore into a chunk outside the boot-time arrival ring.
            // Re-centre terrain and collision before the welcome overlay is removed,
            // so Continue never reveals sea/blocked cells for one frame.
            if(provider) provider.updateResidency(target.x,target.z,true);
            relocated=!!target.relocated; relocationReason=target.reason||null;
          }
        }
      }
      this.lastLoad={ok:true,relocated:relocated,reason:relocationReason,
        restoredPlane:savedPlane&&restoredPlane?savedPlane:0,
        residencyCentered:!!this.provider(),
        provider:this.provider()?this.provider().id:'legacy'};
      refreshPlayerGear();
      UI.refreshInv(); UI.refreshSkills(); UI.refreshQuests(); UI.refreshEquip(); UI.refreshHud();
      UI.chat('Welcome back to Veyhollow. Your progress has been restored.','sys');
      if(relocated){
        const provider=this.provider(),safe=provider&&provider.getSpawnLandmark(provider.defaultLandmark);
        UI.chat('The rebuilt map has placed you safely at '+(safe&&safe.label?safe.label:'a safe arrival point')+'. Your progress is unchanged.','sys');
      }
      return true;
    }catch(e){ this.lastLoad={ok:false,error:String(e&&e.message||e)}; return false; }
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
