/* Reference-led parchment quest detail screen. Quest state and tracking remain
 * owned by the existing Quest/Player systems; this file is presentation only. */
(function(){
'use strict';
if(typeof UI==='undefined'||UI.openQuestDetail)return;
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function itemName(id){return ITEMS[id]?ITEMS[id].name:id.replace(/_/g,' ');}
UI.openQuestDetail=function(id){
  var q=QUESTS[id];if(!q)return;
  var state=Player.quests[id]||null,done=!!(state&&state.stage===99),stage=state?state.stage:0;
  document.getElementById('quest-scroll-title').textContent=q.name;
  document.getElementById('quest-scroll-difficulty').textContent=(q.difficulty||'Unrated')+' quest';
  document.getElementById('quest-scroll-giver').textContent='Given by '+(q.giver||'an unknown hand');
  document.getElementById('quest-scroll-points').textContent=(q.qp||0)+' quest point'+(q.qp===1?'':'s');
  var html='<p class="quest-scroll-desc">'+esc(q.desc)+'</p>';
  if(q.requires&&q.requires.quests&&q.requires.quests.length){
    html+='<section class="quest-scroll-section"><h3>Before you begin</h3><div>'+q.requires.quests.map(function(r){return esc(QUESTS[r]?QUESTS[r].name:r);}).join(', ')+'</div></section>';
  }
  html+='<section class="quest-scroll-section"><h3>'+(!state?'How to begin':done?'Quest complete':'Current journal')+'</h3>';
  q.stages.forEach(function(s,i){var cls=done||state&&i<stage?' done':state&&i===stage?' current':'';
    html+='<div class="quest-stage'+cls+'"><span class="quest-stage-mark">'+(done||state&&i<stage?'✓':state&&i===stage?'◆':'◇')+'</span><span>'+esc(s.text.replace('%n',state&&state.counter||0))+'</span></div>';});
  html+='</section><section class="quest-scroll-section"><h3>Rewards</h3><div class="quest-rewards">';
  var rewards=q.reward||{};
  Object.keys(rewards.xp||{}).forEach(function(skill){html+='<div class="quest-reward"><b>'+esc(rewards.xp[skill])+'</b> '+esc(skill)+' XP</div>';});
  (rewards.items||[]).forEach(function(it){html+='<div class="quest-reward"><img src="'+esc(iconFor(it.id))+'" alt=""><span>'+esc(it.q>1?it.q+' × '+itemName(it.id):itemName(it.id))+'</span></div>';});
  html+='</div></section>';
  document.getElementById('quest-scroll-body').innerHTML=html;
  var track=document.getElementById('quest-scroll-track');
  track.textContent=Quest.tracked===id?'Tracking quest':'Track quest';track.classList.toggle('tracked',Quest.tracked===id);
  track.onclick=function(){Quest.track(id);UI.openQuestDetail(id);if(typeof Sfx!=='undefined')Sfx.click();};
  var modal=document.getElementById('quest-scroll-modal');modal.style.display='block';
  if(typeof Events!=='undefined')Events.emit('modalOpened',{id:'quest-scroll-modal',quest:id});
};
})();
