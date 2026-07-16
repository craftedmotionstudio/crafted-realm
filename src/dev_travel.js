/* ================= LOCAL TEST TRAVEL =================
 * Owner/reviewer coordinate bookmarks. This is localhost-only tooling, never
 * player travel: named destinations are stable source-controlled contracts,
 * while personal bookmarks remain in this browser's local storage.
 */
var TestTravel=(function(){
  'use strict';
  var STORAGE='cr_test_travel_bookmarks_v1',VERSION=3,panel=null,toggle=null,statusTimer=0;
  var core=[
    {id:'holm_guide_apron',label:'Guide Hall — arrival apron',group:"Tutor's Holm",provider:'tutors-holm-v2',landmark:'holm_arrival',x:151,z:169,plane:0,zone:"Tutor's Holm"},
    {id:'holm_guide_interior',label:'Guide Hall — central aisle',group:"Tutor's Holm",provider:'tutors-holm-v2',landmark:'holm_arrival',x:151,z:162.5,plane:0,zone:"Tutor's Holm"},
    {id:'holm_workyard',label:'Survival Workyard — trail entrance',group:"Tutor's Holm",provider:'tutors-holm-v2',landmark:'holm_arrival',x:113.7,z:158.25,plane:0,zone:"Tutor's Holm"},
    {id:'holm_workyard_hatch',label:'Survival Workyard — cellar hatch',group:"Tutor's Holm",provider:'tutors-holm-v2',landmark:'holm_arrival',x:110.35,z:153.35,plane:0,zone:"Tutor's Holm"},
    {id:'holm_workyard_waterworks',label:'Survival Workyard — water pulley',group:"Tutor's Holm",provider:'tutors-holm-v2',landmark:'holm_arrival',x:130.5,z:149.5,plane:0,zone:"Tutor's Holm"},
    {id:'holm_workyard_fishing',label:'Survival Workyard — fishing edge',group:"Tutor's Holm",provider:'tutors-holm-v2',landmark:'holm_arrival',x:131.7,z:151.1,plane:0,zone:"Tutor's Holm"},
    {id:'holm_workyard_cellar',label:'Workyard basement — ladder landing',group:'Basements',provider:'tutors-holm-v2',landmark:'holm_arrival',x:325.95,z:302.47,plane:-1,zone:'Workyard Basement',requires:'holm_cellar'},
    {id:'holm_workyard_chest',label:'Workyard basement — reserve chest',group:'Basements',provider:'tutors-holm-v2',landmark:'holm_arrival',x:326.5,z:303.5,plane:-1,zone:'Workyard Basement',requires:'holm_cellar'},
    {id:'holm_workyard_cellar_shelf',label:'Workyard basement — reserve shelf',group:'Basements',provider:'tutors-holm-v2',landmark:'holm_arrival',x:326.25,z:299.15,plane:-1,zone:'Workyard Basement',requires:'holm_cellar'},
    {id:'holm_workyard_cellar_bench',label:'Workyard basement — provision table',group:'Basements',provider:'tutors-holm-v2',landmark:'holm_arrival',x:330,z:298.35,plane:-1,zone:'Workyard Basement',requires:'holm_cellar'},
    {id:'holm_workyard_cellar_hearth',label:'Workyard basement — masonry hearth',group:'Basements',provider:'tutors-holm-v2',landmark:'holm_arrival',x:333.28,z:302.55,plane:-1,zone:'Workyard Basement',requires:'holm_cellar'},
    {id:'holm_workyard_cellar_picture',label:'Workyard basement — Moonward Watch picture',group:'Basements',provider:'tutors-holm-v2',landmark:'holm_arrival',x:326.22,z:302.55,plane:-1,zone:'Workyard Basement',requires:'holm_cellar'},
    {id:'holm_workyard_cellar_quiet',label:'Workyard basement — quiet corner',group:'Basements',provider:'tutors-holm-v2',landmark:'holm_arrival',x:333.35,z:300.58,plane:-1,zone:'Workyard Basement',requires:'holm_cellar'},
    {id:'holm_departure',label:'Departure dock',group:"Tutor's Holm",provider:'tutors-holm-v2',landmark:'holm_departure',x:206.5,z:151.5,plane:0,zone:"Tutor's Holm"},
    {id:'veyhollow_ferry',label:'Veyhollow — ferry landing',group:'Veyhollow',provider:'veyhollow-commons-v2',landmark:'veyhollow_ferry_arrival',x:0,z:18,plane:0,zone:'Veyhollow Commons'},
    {id:'hollow_well_square',label:'Hollow Well Square',group:'Veyhollow',provider:'veyhollow-commons-v2',landmark:'hollow_well_square',x:0,z:0,plane:0,zone:'Hollow Well Square'},
    {id:'legacy_wardenholm',label:'Wardenholm Keep courtyard (legacy world)',group:'Legacy reference',x:77,z:0,plane:0,zone:'Wardenholm Keep',legacyOnly:true},
    {id:'legacy_wardenholm_undercroft',label:'Wardenholm undercroft (legacy world)',group:'Legacy reference',x:330,z:330,plane:-1,zone:'Wardenholm Undercroft',legacyOnly:true}
  ];

  function localOnly(){return location.hostname==='127.0.0.1'||location.hostname==='localhost'||location.hostname==='::1';}
  function activeProvider(){return typeof WorldV2!=='undefined'&&WorldV2.active?WorldV2.active.id:null;}
  function clean(entry){
    if(!entry||!entry.id||!entry.label||!Number.isFinite(+entry.x)||!Number.isFinite(+entry.z)||!Number.isFinite(+entry.plane)) return null;
    return {id:String(entry.id),label:String(entry.label),group:String(entry.group||'My bookmarks'),provider:entry.provider?String(entry.provider):null,
      landmark:entry.landmark?String(entry.landmark):null,x:+entry.x,z:+entry.z,plane:+entry.plane,zone:String(entry.zone||entry.label),
      requires:entry.requires?String(entry.requires):null,legacyOnly:!!entry.legacyOnly,custom:!!entry.custom};
  }
  function loadCustom(){
    try{
      var rows=JSON.parse(localStorage.getItem(STORAGE)||'[]');
      return Array.isArray(rows)?rows.map(clean).filter(Boolean).slice(0,25):[];
    }catch(error){return [];}
  }
  function saveCustom(rows){try{localStorage.setItem(STORAGE,JSON.stringify(rows.slice(0,25)));}catch(error){}}
  function visibleBookmarks(){
    var legacy=typeof CRWorldMode!=='undefined'&&CRWorldMode.legacy;
    return core.concat(loadCustom()).filter(function(row){return !row.legacyOnly||legacy;});
  }
  function find(id){return visibleBookmarks().filter(function(row){return row.id===id;})[0]||null;}
  function waitFor(test,timeout){
    return new Promise(function(resolve,reject){var started=Date.now(),timer=setInterval(function(){
      var value=false;try{value=test();}catch(error){}
      if(value){clearInterval(timer);resolve(value);}
      else if(Date.now()-started>timeout){clearInterval(timer);reject(new Error('destination room did not finish loading'));}
    },80);});
  }
  function resetPlayer(){
    Player.target=null;Player.action=null;Player.moveTo=null;Player.path=[];Player._pathPartial=false;
  }
  function snapCamera(x,y,z){
    if(typeof camera==='undefined'||typeof camCtl==='undefined') return;
    var cx=x+camCtl.dist*Math.sin(camCtl.yaw)*Math.cos(camCtl.pitch*.6);
    var cz=z+camCtl.dist*Math.cos(camCtl.yaw)*Math.cos(camCtl.pitch*.6);
    var cy=y+camCtl.dist*Math.sin(camCtl.pitch);
    camera.position.set(cx,cy,cz);camera.lookAt(x,y+1.2,z);
  }
  function activateProvider(entry){
    if(entry.legacyOnly||!entry.provider||typeof WorldV2==='undefined'||typeof WorldTravel==='undefined') return;
    if(activeProvider()===entry.provider) return;
    var provider=WorldV2.get(entry.provider);
    if(!provider) throw new Error('world provider '+entry.provider+' is not available');
    var landmark=entry.landmark||provider.defaultLandmark;
    WorldTravel.perform(entry.provider,landmark,{zoneLabel:entry.zone,arrivalMessage:'[TEST TRAVEL] Provider ready.'});
  }
  function ensureRoom(entry){
    if(entry.requires!=='holm_cellar') return Promise.resolve(true);
    if(typeof HolmSurvivalCellar==='undefined') return Promise.reject(new Error('Workyard basement runtime is not available'));
    HolmSurvivalCellar.load();
    return waitFor(function(){var snap=HolmSurvivalCellar.snapshot();return snap.ready&&snap.entryFloorReady;},7000);
  }
  function exactPlace(entry){
    var plane=entry.plane||0;
    if(plane===0&&typeof WorldV2!=='undefined'&&WorldV2.active&&WorldV2.active.updateResidency)
      WorldV2.active.updateResidency(entry.x,entry.z,true);
    var y=plane===0?(typeof groundY==='function'?groundY(entry.x,entry.z):0):
      (typeof Planes!=='undefined'?Planes.elevAt(entry.x,entry.z,plane):null);
    if(!Number.isFinite(y)) throw new Error('no registered walkable floor exists at those coordinates');
    resetPlayer();Player.plane=plane;player.position.set(entry.x,y,entry.z);
    if(typeof Planes!=='undefined'&&Planes.refreshVisibility) Planes.refreshVisibility();
    snapCamera(entry.x,y,entry.z);
    if(typeof drawMinimap==='function') drawMinimap();
    if(typeof UI!=='undefined'){
      if(UI.closeWorldModals) UI.closeWorldModals();
      if(UI.zone) UI.zone(entry.zone);
      UI.chat('[TEST TRAVEL] '+entry.label+' — X '+entry.x.toFixed(2)+', Z '+entry.z.toFixed(2)+', plane '+plane+'.','sys');
    }
    renderCurrent();
    return {id:entry.id,x:entry.x,z:entry.z,plane:plane,provider:activeProvider()};
  }
  function go(target){
    if(!localOnly()) return Promise.resolve(false);
    var entry=typeof target==='string'?find(target):clean(target);
    if(!entry) return Promise.resolve(false);
    if(entry.legacyOnly&&!(typeof CRWorldMode!=='undefined'&&CRWorldMode.legacy)){
      if(typeof UI!=='undefined') UI.chat('[TEST TRAVEL] That bookmark belongs to the legacy reference world.','sys');
      return Promise.resolve(false);
    }
    return Promise.resolve().then(function(){activateProvider(entry);return ensureRoom(entry);}).then(function(){
      var result=exactPlace(entry);close();return result;
    }).catch(function(error){
      console.error('[TestTravel]',error);
      if(typeof UI!=='undefined') UI.chat('[TEST TRAVEL] '+String(error&&error.message||error)+'.','sys');
      return false;
    });
  }
  function coordText(row){return 'X '+row.x.toFixed(2)+' · Z '+row.z.toFixed(2)+' · P '+row.plane;}
  function renderCurrent(){
    if(!panel||!panel.parentNode||typeof player==='undefined') return;
    var out=panel.querySelector('#test-travel-current');if(!out)return;
    out.textContent='Current: X '+player.position.x.toFixed(2)+' · Z '+player.position.z.toFixed(2)+' · Plane '+((Player&&Player.plane)||0)+' · '+(activeProvider()||'legacy world');
  }
  function renderBookmarks(){
    if(!panel)return;var host=panel.querySelector('#test-travel-bookmarks');if(!host)return;
    host.innerHTML='';var groups={};visibleBookmarks().forEach(function(row){(groups[row.group]||(groups[row.group]=[])).push(row);});
    Object.keys(groups).forEach(function(group){
      var title=document.createElement('div');title.className='test-travel-group';title.textContent=group;host.appendChild(title);
      groups[group].forEach(function(row){
        var line=document.createElement('div');line.className='test-travel-row';
        var button=document.createElement('button');button.className='opt';button.textContent=row.label;button.onclick=function(){go(row.id);};line.appendChild(button);
        var coords=document.createElement('span');coords.textContent=coordText(row);line.appendChild(coords);
        if(row.custom){var del=document.createElement('button');del.className='test-travel-delete';del.textContent='×';del.title='Delete saved bookmark';del.onclick=function(){removeCustom(row.id);};line.appendChild(del);}
        host.appendChild(line);
      });
    });
  }
  function saveCurrent(){
    var name=(panel.querySelector('#test-travel-name').value||'').trim();if(!name)return;
    var rows=loadCustom(),id='custom_'+Date.now();rows.push({id:id,label:name,group:'My bookmarks',provider:activeProvider(),
      x:+player.position.x.toFixed(2),z:+player.position.z.toFixed(2),plane:(Player.plane||0),zone:name,custom:true});
    saveCustom(rows);panel.querySelector('#test-travel-name').value='';renderBookmarks();
  }
  function removeCustom(id){saveCustom(loadCustom().filter(function(row){return row.id!==id;}));renderBookmarks();}
  function manualGo(){
    var provider=panel.querySelector('#test-travel-provider').value||null;
    go({id:'manual',label:'Manual coordinates',group:'Manual',provider:provider,
      landmark:provider==='veyhollow-commons-v2'?'veyhollow_ferry_arrival':'holm_arrival',
      x:+panel.querySelector('#test-travel-x').value,z:+panel.querySelector('#test-travel-z').value,
      plane:+panel.querySelector('#test-travel-plane').value,zone:'Manual review point',
      requires:+panel.querySelector('#test-travel-plane').value===-1&&provider==='tutors-holm-v2'?'holm_cellar':null});
  }
  function build(){
    if(panel||!localOnly())return;
    toggle=document.createElement('button');toggle.id='test-travel-toggle';toggle.textContent='📍';toggle.title='Open Test Travel (F8)';toggle.onclick=open;document.body.appendChild(toggle);
    panel=document.createElement('div');panel.id='test-travel-panel';panel.className='steel';panel.innerHTML=
      '<span class="close-x" aria-label="Close">✕</span><h3>Test Travel</h3><small>Local testing only · exact coordinates</small>'+
      '<div id="test-travel-current"></div><div id="test-travel-bookmarks"></div>'+
      '<div class="test-travel-group">Manual coordinates</div><div class="test-travel-manual">'+
      '<select id="test-travel-provider"><option value="tutors-holm-v2">Tutor\'s Holm</option><option value="veyhollow-commons-v2">Veyhollow</option></select>'+
      '<input id="test-travel-x" type="number" step="0.01" placeholder="X"><input id="test-travel-z" type="number" step="0.01" placeholder="Z">'+
      '<input id="test-travel-plane" type="number" step="1" value="0" title="0 surface, -1 basement, 1 upper floor"><button id="test-travel-go">Go</button></div>'+
      '<div class="test-travel-save"><input id="test-travel-name" placeholder="Bookmark name"><button id="test-travel-save">Save current</button></div>';
    document.body.appendChild(panel);panel.querySelector('.close-x').onclick=close;
    panel.querySelector('#test-travel-go').onclick=manualGo;panel.querySelector('#test-travel-save').onclick=saveCurrent;
    renderBookmarks();renderCurrent();statusTimer=setInterval(function(){
      if(toggle)toggle.style.display=typeof running!=='undefined'&&running?'block':'none';
      renderCurrent();
    },300);
  }
  function open(){build();if(!panel)return;panel.style.display='block';renderBookmarks();renderCurrent();}
  function close(){if(panel)panel.style.display='none';}
  function register(entry){
    var row=clean(entry);if(!row||core.some(function(item){return item.id===row.id;}))return false;core.push(row);renderBookmarks();return true;
  }
  function init(){
    build();addEventListener('keydown',function(event){if(event.key==='F8'&&!/INPUT|TEXTAREA|SELECT/.test((event.target&&event.target.tagName)||'')){event.preventDefault();panel&&panel.style.display==='block'?close():open();}});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
  return {version:VERSION,open:open,close:close,go:go,register:register,bookmarks:visibleBookmarks,
    current:function(){return typeof player==='undefined'?null:{x:player.position.x,z:player.position.z,plane:(Player.plane||0),provider:activeProvider()};},
    snapshot:function(){return {version:VERSION,core:core.length,custom:loadCustom().length,localOnly:localOnly(),current:this.current()};}};
})();
if(typeof globalThis!=='undefined')globalThis.TestTravel=TestTravel;
