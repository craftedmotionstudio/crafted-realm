/* Crafted Realm welcome/profile flow v1. Keeps the legacy smoke IDs while making save deletion explicit. */
(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const stages=['login-choose','login-create','login-play','login-confirm-new','login-options'];
  let current='login-choose';

  function clickSound(){ try{ if(typeof Sfx!=='undefined'&&Sfx.click) Sfx.click(); }catch(e){} }
  function hasSave(){ try{ return typeof SaveGame!=='undefined'&&SaveGame.exists(); }catch(e){ return false; } }
  function setStage(id,focusId){
    stages.forEach(stage=>{ const el=$(stage); if(el) el.style.display=stage===id?'block':'none'; });
    current=id;
    window.setTimeout(()=>{ const f=$(focusId)||(id==='login-choose'?$('btn-continue'):null); if(f&&!f.disabled) f.focus(); },0);
  }
  function readSave(){
    if(!hasSave()) return null;
    try{ const raw=Persist.store.get(SaveGame.KEY); return raw?JSON.parse(raw):null; }catch(e){ return null; }
  }
  function totalXp(data){
    if(!data||!data.xp) return 0;
    return Object.keys(data.xp).reduce((sum,key)=>sum+(Number(data.xp[key])||0),0);
  }
  function stageLabel(data){
    if(data&&data.tut&&data.tut.complete) return 'Holm complete';
    const step=data&&data.tut?Number(data.tut.step)||0:0;
    return step?'Lesson '+(step+1):"Tutor's Holm";
  }
  function updateProfileSummary(data){
    const box=$('login-profile-summary'); if(!box) return;
    const name=(data&&data.look&&data.look.name)||CharCfg.name||'Adventurer';
    const crowns=(data&&data.inv||[]).reduce((n,s)=>n+(s&&s.id==='coins'?(Number(s.qty)||0):0),0);
    box.innerHTML='<span><b>'+escapeHtml(name)+'</b>Adventurer</span><span><b>'+totalXp(data).toLocaleString()+'</b>Total XP</span><span><b>'+escapeHtml(stageLabel(data))+'</b>Journey</span><span><b>'+crowns.toLocaleString()+'</b>Crowns carried</span>';
    if($('btn-reset-save')) $('btn-reset-save').textContent=hasSave()?'Erase save':'Discard adventurer';
  }
  function escapeHtml(value){ const d=document.createElement('div'); d.textContent=String(value); return d.innerHTML; }
  function refreshSaveState(){
    const exists=hasSave(), data=readSave(), btn=$('btn-continue'), note=$('login-note'), detail=$('continue-detail');
    if(btn){ btn.disabled=!exists; btn.setAttribute('aria-disabled',String(!exists)); }
    if(detail) detail.textContent=exists?('Resume '+((data&&data.look&&data.look.name)||'your local adventurer')):'No local adventurer found';
    if(note){ note.textContent=exists?'Saved on this device · progress ready':'No save found · begin a new adventure'; note.classList.toggle('has-save',exists); }
    return {exists,data};
  }
  function applyPreferences(){
    let reduced=false,contrast=false;
    try{ reduced=localStorage.getItem('cr_login_reduced_motion')==='1'; contrast=localStorage.getItem('cr_login_high_contrast')==='1'; }catch(e){}
    const screen=$('welcome-screen'); if(screen){ screen.classList.toggle('login-reduced-motion',reduced); screen.classList.toggle('login-high-contrast',contrast); }
    if($('login-reduced-motion')) $('login-reduced-motion').checked=reduced;
    if($('login-high-contrast')) $('login-high-contrast').checked=contrast;
  }
  function makeEmbers(){
    const host=$('login-embers'); if(!host||host.childElementCount) return;
    for(let i=0;i<18;i++){
      const e=document.createElement('i'); e.className='login-ember';
      const side=i%2===0, lane=3+((i*37)%14);
      e.style.left=(side?lane:100-lane)+'%'; e.style.setProperty('--dur',(7+(i%6)*1.2)+'s');
      e.style.setProperty('--delay',(-i*.83)+'s'); e.style.setProperty('--drift',((i%5)-2)*11+'px'); host.appendChild(e);
    }
  }
  function bind(){
    const screen=$('welcome-screen'); if(!screen) return;
    makeEmbers(); applyPreferences(); refreshSaveState();

    if($('btn-new')) $('btn-new').onclick=()=>{ clickSound(); if(hasSave()) setStage('login-confirm-new','btn-cancel-new'); else setStage('login-create','char-name'); };
    if($('btn-confirm-new')) $('btn-confirm-new').onclick=()=>{ clickSound(); SaveGame.reset(); refreshSaveState(); setStage('login-create','char-name'); };
    if($('btn-cancel-new')) $('btn-cancel-new').onclick=()=>{ clickSound(); setStage('login-choose','btn-new'); };
    if($('btn-create-back')) $('btn-create-back').onclick=()=>{ clickSound(); setStage('login-choose',hasSave()?'btn-continue':'btn-new'); };
    if($('btn-play-back')) $('btn-play-back').onclick=()=>{ clickSound(); refreshSaveState(); setStage('login-choose',hasSave()?'btn-continue':'btn-new'); };
    if($('btn-options-back')) $('btn-options-back').onclick=()=>{ clickSound(); setStage('login-choose','btn-login-options'); };
    if($('btn-login-options')) $('btn-login-options').onclick=()=>{ clickSound(); setStage('login-options','login-reduced-motion'); };

    if($('btn-continue')) $('btn-continue').onclick=()=>{
      clickSound(); if(!hasSave()){ refreshSaveState(); return; }
      const data=readSave();
      if(!SaveGame.load()){ if($('login-note')) $('login-note').textContent='That save could not be restored. Your data has not been erased.'; return; }
      if($('play-welcome')) $('play-welcome').textContent='Welcome back, '+(CharCfg.name||'adventurer');
      if($('play-sub')) $('play-sub').textContent='Your progress has been restored and Veyhollow is ready.';
      updateProfileSummary(data); setStage('login-play','play-btn');
    };
    if($('btn-begin')) $('btn-begin').onclick=()=>{
      clickSound(); const input=$('char-name'); const nm=((input&&input.value)||'Adventurer').trim().replace(/\s+/g,' ').slice(0,14);
      CharCfg.name=nm||'Adventurer'; CharCfg._new=true; applyPlayerLook();
      if($('play-welcome')) $('play-welcome').textContent='Welcome, '+CharCfg.name;
      if($('play-sub')) $('play-sub').innerHTML='You are about to wash ashore on <b>Tutor\'s Holm</b>.';
      updateProfileSummary({look:{name:CharCfg.name},xp:Player.xp,tut:{step:0},inv:Player.inv}); setStage('login-play','play-btn');
    };
    if($('btn-reset-save')) $('btn-reset-save').onclick=()=>{ clickSound(); if(hasSave()) setStage('login-confirm-new','btn-cancel-new'); else setStage('login-choose','btn-new'); };
    if($('login-music-toggle')) $('login-music-toggle').onclick=()=>{ clickSound(); try{ Sfx.ensure(); Music.toggle(); }catch(e){} };
    if($('btn-login-fullscreen')) $('btn-login-fullscreen').onclick=()=>{ clickSound(); try{ if(!document.fullscreenElement) document.documentElement.requestFullscreen(); else document.exitFullscreen(); }catch(e){} };
    if($('login-reduced-motion')) $('login-reduced-motion').onchange=e=>{ try{ localStorage.setItem('cr_login_reduced_motion',e.target.checked?'1':'0'); }catch(err){} applyPreferences(); };
    if($('login-high-contrast')) $('login-high-contrast').onchange=e=>{ try{ localStorage.setItem('cr_login_high_contrast',e.target.checked?'1':'0'); }catch(err){} applyPreferences(); };

    screen.addEventListener('keydown',e=>{
      if(e.key==='Escape'){
        if(current==='login-create'||current==='login-play'||current==='login-options'||current==='login-confirm-new'){ e.preventDefault(); setStage('login-choose',hasSave()?'btn-continue':'btn-new'); }
      }else if(e.key==='Enter'&&document.activeElement===$('char-name')){ e.preventDefault(); $('btn-begin').click(); }
    });
    setStage('login-choose',hasSave()?'btn-continue':'btn-new');
  }
  window.LoginOverhaul={init:bind,setStage,refreshSaveState,updateProfileSummary};
  bind();
})();
