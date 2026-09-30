/* Gait Lab (owner review 5, round 3: "I need to be the one that selects which is the best option ... I need more of a panel,
 * and I need it compared to the old-school RuneScape walking and running animation, side by side").
 *
 * Left: the 2004 reference -- 8 held poses of one walk / run cycle (the old client's own frames), loaded at run time from the
 * PRIVATE folder C:\Users\iQwaZ\ref2004_captures\gait_lab (tools/ref2004/gait_lab_refpack.py), either from its localhost server
 * (double-click "Start Gait Lab reference.bat": http://127.0.0.1:8150) or picked in the page. Nothing of it is in this repo.
 * Right: our kit character (assets/models/holm_kit_v2.glb + the option clips in holm_kit_v2_gaits.glb) playing live through the
 * same lens (the 2004 camera: 36.13 deg lens, 22.5 deg above, the 2004 boom) at the same figure height, on one shared clock.
 *
 * Sliders are applied every frame on top of the clip (runtime offsets and scales, see applyPose): the change is instant. The
 * picks (Best / Not right + a note) are saved in this browser and exported as JSON; GaitLab.bake(settings) samples the tuned
 * pose at 30 fps as glTF-local bone rotations for tools/blender/bake_gait_lab.py to turn into a real clip.
 * Round 4: "shipped" is the new walk / run (the kit's own clips); S = the v4a.2b clips they replaced; K / L = round-4 variants.
 * A candidate build can be previewed before it ships: ?gaits=<repo path of a gaits GLB>&kit=<repo path of a kit GLB>.
 * Presentation only: nothing here changes the game. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const DEG=Math.PI/180;
const REF_SERVER='http://127.0.0.1:8150/';
const LS_STATE='gaitLab.state.v1',LS_PICKS='gaitLab.picks.v1';
const GO=window.HolmGaitOptions||null;
const U0=GO&&GO.urls?GO.urls:{gaits:'assets/models/holm_kit_v2_gaits.glb',mesh:{b:'assets/models/holm_kit_v2_mesh_b.glb',c:'assets/models/holm_kit_v2_mesh_c.glb'}};
const ROOT='../';
// a candidate build can be previewed without touching the game: ?gaits=<path>&kit=<path> (repo-relative, this site only)
const QS=new URLSearchParams(location.search),rel=v=>v&&/^[\w.\/-]+\.glb$/.test(v)&&!/\.\./.test(v)?v:null;
const U=Object.assign({},U0,rel(QS.get('gaits'))?{gaits:rel(QS.get('gaits'))+'?t='+Date.now()}:{});
const KIT_URL=ROOT+(rel(QS.get('kit'))?rel(QS.get('kit'))+'?t='+Date.now():'assets/models/holm_kit_v2.glb?v=16');
const PAL_URL=ROOT+'assets/models/holm_kit_v2_palettes.json';
// the 2004 cameras (tools/ref2004: side strips 1150 units from the lane, look point at mid-height; the follow camera's boom
// pitch*3+600 = 984 units, look point 50 units up), in tiles; our character stands 1.5 tiles = 1.813 kit metres
const TILE=1.813/1.5;
const CAM={side:{elev:22.5,dist:1150/128,az:-90,lift:'half'},game:{elev:22.5,dist:984/128,az:225,lift:50/128}};
const VFOV=2*Math.atan(167/512)/DEG;
const FIG=0.64,GROUND=0.88;   // the figure's height and the ground point's height as fractions of the view (both panes)
const GRASS='#4b5e30',GROUND_COL=0x55693a;

// ---- presets ------------------------------------------------------------------------------------------------------------
const NOTES={
 walk:{cur:'SHIPPED (round 4): a casual walk tipped 2.5 deg forward, the shoulders turning a little against the hips with the arms, a slight head bob, straight legs at the heel strike.',
  S:'The walk shipped until round 4 (v4a.2b): 11 deg lean, face down, a 5 % head bob.',K:'Round 4 variant: the new walk with a touch more lean (4 deg), shoulder turn and arm swing.',
  A:'Round 1: the shipped legs with a calmer upper body.',B:'Round 1: shorter reach, trailing back leg.',C:'Round 1: the 2004 trailing legs.',
  D:'Round 2: upright, relaxed arms (+-14 deg), straight legs at the heel strike, slow heel-to-toe roll.',
  E:'Round 2: D with a little more arm swing (+-20 deg) and a fuller roll.',F:'Round 2: the 2004 foot timing, arms +-17 deg.',
  G:'Round 3 strut: upright and a hair back, chest up, shoulders open, arms carried a little out with an easy swing, a touch of swagger.',
  H:'Round 3 casual stroll: upright, loose shoulders, small relaxed arm swing, gentle sway, the least effort.'},
 run:{cur:'SHIPPED (round 4): a casual run leaning 7 deg from the ankles (torso, hips and stance leg in one line), the ankles rolling heel-to-toe and pushing off pointed, the chest turning against the hips, 180 steps a minute.',
  S:'The run shipped until round 4 (v4a.2b): the 26 deg stoop with the hips folded.',K:'Round 4 variant: 10 deg lean, a slightly higher knee and heel, arms +-34.',L:'Round 4 variant: lighter -- 5 deg, lower heel and knee, arms +-26.',
  A:'Round 1: spine 12 deg, head up.',B:'Round 1: the 2004 lean from a straight back.',C:'Round 1: spine 6 deg, lighter.',
  D:'Round 2: easy run, 7 deg lean, full extension, flight.',E:'Round 2: woods run, 9 deg lean, higher knee.',F:'Round 2: 2004 run, 12 deg lean.',
  G:'Round 3 light jog: nearly upright (2 deg), short easy stride, low knee and heel, arms bent and close, gentle bounce.',
  H:'Round 3 easy jog: G with a little more going on (4 deg, slightly higher knee, arms +-32).'}};
const PRESETS={walk:['cur','K','S','G','H','D','E','F','A','B','C'],run:['cur','K','L','S','G','H','D','E','F','A','B','C']};
function presetLabel(mode,k){if(k==='cur')return 'shipped';const L=GO&&GO.labels&&GO.labels[mode];return (L&&L[k])||k}

// ---- sliders ------------------------------------------------------------------------------------------------------------
// kind: 'deg' offsets (degrees) / 'x' scales (1 = as the clip) / 'cm' offsets (centimetres, kit scale)
const SLIDERS={
 walk:[
  {id:'lean',label:'torso lean (+ forward)',min:-10,max:10,step:.5,def:0,kind:'deg'},
  {id:'shoulders',label:'shoulders back, chest up',min:0,max:16,step:.5,def:0,kind:'deg'},
  {id:'armSwing',label:'arm swing',min:0,max:2,step:.05,def:1,kind:'x'},
  {id:'armCarry',label:'arm carry out from body',min:-8,max:20,step:.5,def:0,kind:'deg'},
  {id:'elbow',label:'elbow bend',min:-20,max:45,step:1,def:0,kind:'deg'},
  {id:'stride',label:'stride length',min:.6,max:1.4,step:.02,def:1,kind:'x'},
  {id:'knee',label:'knee lift',min:.4,max:2,step:.05,def:1,kind:'x'},
  {id:'bounce',label:'bounce',min:0,max:2.5,step:.05,def:1,kind:'x'},
  {id:'counter',label:'shoulder counter-rotation',min:0,max:12,step:.5,def:0,kind:'deg'},
  {id:'sway',label:'hip sway',min:0,max:5,step:.1,def:0,kind:'cm'},
  {id:'cadence',label:'cadence (steps per second)',min:.8,max:1.25,step:.01,def:1,kind:'x'}],
 run:[
  {id:'lean',label:'lean (+ forward)',min:-10,max:15,step:.5,def:0,kind:'deg'},
  {id:'kneeDrive',label:'knee drive',min:.4,max:1.6,step:.05,def:1,kind:'x'},
  {id:'armSwing',label:'arm pump',min:0,max:2,step:.05,def:1,kind:'x'},
  {id:'elbow',label:'elbow bend',min:-25,max:30,step:1,def:0,kind:'deg'},
  {id:'armCarry',label:'arms in / out',min:-8,max:15,step:.5,def:0,kind:'deg'},
  {id:'bounce',label:'flight / bounce',min:0,max:2.5,step:.05,def:1,kind:'x'},
  {id:'stride',label:'stride length',min:.6,max:1.4,step:.02,def:1,kind:'x'},
  {id:'cadence',label:'cadence (steps per second)',min:.8,max:1.25,step:.01,def:1,kind:'x'}]};
function defaults(mode){const o={};SLIDERS[mode].forEach(s=>o[s.id]=s.def);return o}
function fmtVal(s,v){return s.kind==='x'?v.toFixed(2)+'x':s.kind==='cm'?v.toFixed(1)+' cm':(v>0?'+':'')+v.toFixed(1)+'\u00b0'}

// ---- state (saved in this browser) ---------------------------------------------------------------------------------------
const S={body:'m',mode:'walk',view:'side',mesh:'shipped',preset:{walk:'G',run:'G'},sliders:{walk:defaults('walk'),run:defaults('run')},
 offset:{walk:0,run:0},speed:1,playing:true,refCut:true,keepHead:true,keepFeet:true};
try{const s=JSON.parse(localStorage.getItem(LS_STATE)||'null');if(s){Object.assign(S,s,{playing:true});
 for(const m of ['walk','run'])S.sliders[m]=Object.assign(defaults(m),(s.sliders||{})[m]||{});}}catch(e){}
function save(){try{localStorage.setItem(LS_STATE,JSON.stringify(S))}catch(e){}}
function picks(){try{return JSON.parse(localStorage.getItem(LS_PICKS)||'[]')}catch(e){return []}}
function savePicks(p){try{localStorage.setItem(LS_PICKS,JSON.stringify(p))}catch(e){}}
function toast(t){const d=$('toast');d.textContent=t;d.style.display='block';clearTimeout(toast.t);toast.t=setTimeout(()=>d.style.display='none',1800)}

// ---- the 2004 reference ---------------------------------------------------------------------------------------------------
const REF={data:null,src:null,imgs:{}};
function refKey(){return S.body+'_'+S.mode+'_'+S.view}
function useRef(data,urlFor,src){REF.data=data;REF.src=src;REF.imgs={};
 for(const [k,c] of Object.entries(data.clips||{}))for(const p of c.poses){for(const f of [p.file,p.cut])if(f&&!REF.imgs[f]){const im=new Image();im.src=urlFor(f);REF.imgs[f]=im}}
 $('refState').innerHTML='2004 reference: <b>loaded</b> <span class="note">('+src+')</span>';$('refHelp').style.display='none'}
function loadRefServer(){return new Promise(ok=>{const s=document.createElement('script');s.src=REF_SERVER+'gait_ref.js?t='+Date.now();
 s.onload=()=>{if(window.GAIT_REF){useRef(window.GAIT_REF,f=>REF_SERVER+f,'the local reference server, 127.0.0.1:8150');ok(true)}else ok(false)};
 s.onerror=()=>ok(false);document.head.appendChild(s)})}
$('pickFolder').onclick=()=>$('folderInput').click();
$('folderInput').onchange=async e=>{const files=[...e.target.files];const by={};files.forEach(f=>by[f.name]=f);
 const js=by['gait_ref.js'];if(!js){toast('gait_ref.js is not in that folder');return}
 const txt=await js.text();const m=/window\.GAIT_REF\s*=\s*([\s\S]*);\s*$/.exec(txt.trim());if(!m){toast('gait_ref.js not recognised');return}
 const data=JSON.parse(m[1]);useRef(data,f=>by[f]?URL.createObjectURL(by[f]):'', 'the folder you picked')};

// ---- three.js scene (ours) ----------------------------------------------------------------------------------------------
const CW=$('ours').width,CH=$('ours').height;
const renderer=new THREE.WebGLRenderer({canvas:$('ours'),antialias:true});
renderer.setPixelRatio(Math.min(2,window.devicePixelRatio||1));renderer.setSize(CW,CH,true);
const scene=new THREE.Scene();scene.background=new THREE.Color(GRASS);
scene.add(new THREE.HemisphereLight(0xdfe2d8,0x8a8a72,.92));
const sun=new THREE.DirectionalLight(0xfff4e0,.85);sun.position.set(75,62,28);scene.add(sun);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(60,60),new THREE.MeshLambertMaterial({color:GROUND_COL}));ground.rotation.x=-Math.PI/2;ground.position.y=-.002;scene.add(ground);
const camera=new THREE.PerspectiveCamera(VFOV,CW/CH,.05,200);

const M={rig:null,clip:null,bind:null,kitClips:{},gaitClips:{},bones:{},rest:{},H:{},meshUrl:null,cur:null,pre:null,pal:null};
const BN=['Hips','Spine','Spine1','Spine2','Neck','Head','LeftShoulder','LeftArm','LeftForeArm','LeftHand','RightShoulder','RightArm',
 'RightForeArm','RightHand','LeftUpLeg','LeftLeg','LeftFoot','LeftToeBase','RightUpLeg','RightLeg','RightFoot','RightToeBase','HeadTop_End'];
const CH_MAT={C_HAIR:'hair',C_TORSO:'torso',C_LEGS:'legs',C_FEET:'feet',C_SKIN:'skin',C_MAKEUP:'makeup'};
function loadGLB(url){return new Promise((ok,no)=>new THREE.GLTFLoader().load(url,ok,undefined,no))}
function kitUrlFor(mesh){return mesh==='b'||mesh==='c'?ROOT+U.mesh[mesh]:KIT_URL}
async function loadModel(){
 const url=kitUrlFor(S.mesh);if(M.meshUrl===url&&M.rig){applyLook();return}
 if(!M.pal)M.pal=await fetch(PAL_URL).then(r=>r.json()).catch(()=>null);
 const g=await loadGLB(url);
 if(M.rig)scene.remove(M.rig);
 const rig=g.scene;scene.add(rig);M.rig=rig;M.meshUrl=url;
 rig.traverse(o=>{if(o.isMesh||o.isSkinnedMesh){o.frustumCulled=false;[].concat(o.material).forEach(m=>{if(m){if('metalness' in m)m.metalness=0;if('roughness' in m)m.roughness=1}})}});
 M.bones={};rig.traverse(o=>{if(o.isBone){const m=/^mixamorig:?(\w+)$/.exec(o.name);if(m)M.bones[m[1]]=o}});
 M.rest={};for(const n of BN)if(M.bones[n])M.rest[n]={q:M.bones[n].quaternion.clone(),p:M.bones[n].position.clone()};
 M.kitClips={};g.animations.forEach(c=>M.kitClips[c.name]=c);
 if(!Object.keys(M.gaitClips).length){const gg=await loadGLB(ROOT+U.gaits);gg.animations.forEach(c=>M.gaitClips[c.name]=c)}
 M.clip=null;M.bind=null;M.cur=null;M.H={};applyLook();
}
function applyLook(){if(!M.rig)return;const bt=S.body==='f'?'B':'A';
 const out=(M.pal&&M.pal.default_outfit&&M.pal.default_outfit[bt])||{};const want=new Set(Object.values(out));
 const partOf=o=>{const re=/^(Kit_[AB]_[A-Za-z]+_\d\d)/;const m=re.exec(o.name||'')||re.exec(o.parent&&o.parent.name||'');return m&&m[1]};
 M.rig.traverse(o=>{if(!(o.isMesh||o.isSkinnedMesh))return;const id=partOf(o);if(!id)return;o.visible=want.has(id);
  const cols=M.pal&&M.pal.defaults&&M.pal.defaults[bt];
  [].concat(o.material).forEach(m=>{if(!m||!cols)return;const ch=CH_MAT[(m.name||'').replace(/[._]\d+$/,'')];if(ch&&cols[ch])m.color.set(cols[ch]);
   const flat=S.mesh==='a';if(!!m.flatShading!==flat){m.flatShading=flat;m.needsUpdate=true}})});
}
function standingHeight(){const k=S.body+'|'+M.meshUrl;if(M.H[k])return M.H[k];
 // the default outfit's rest height (bind pose: the kit's feet stand at 0)
 M.rig.updateMatrixWorld(true);const box=new THREE.Box3();
 M.rig.traverse(o=>{if((o.isMesh||o.isSkinnedMesh)&&o.visible&&o.geometry){o.geometry.computeBoundingBox();box.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld))}});
 M.H[k]=box.isEmpty()?1.81:box.max.y;return M.H[k]}

// ---- the preset clip and its per-cycle measures ---------------------------------------------------------------------------
function clipFor(mode,k){return k==='cur'?M.kitClips[mode]:M.gaitClips[mode+'_'+k]}
const _v1=new THREE.Vector3(),_v2=new THREE.Vector3(),_v3=new THREE.Vector3();
function wp(n,out){return M.bones[n].getWorldPosition(out)}
// the clip is sampled straight onto the bones every frame (no AnimationMixer: the mixer skips writing a value that has not changed
// since its last write, so a held pose would keep the previous frame's slider offsets and they would pile up)
function bindClip(clip){return clip.tracks.map(tr=>{const m=/^(.+)\.(quaternion|position|scale)$/.exec(tr.name);const o=m&&M.rig.getObjectByName(m[1]);
 return o?{o,p:m[2],it:tr.createInterpolant()}:null}).filter(Boolean)}
function evalClip(t){for(const b of M.bind)b.o[b.p].fromArray(b.it.evaluate(t));M.rig.updateMatrixWorld(true)}
function selectClip(){if(M.rig&&!clipFor(S.mode,S.preset[S.mode]))S.preset[S.mode]='cur';   // (a preset this build does not carry)
 const clip=clipFor(S.mode,S.preset[S.mode]);if(!clip||!M.rig)return;
 const key=clip.name+'|'+M.meshUrl;if(M.cur===key)return;
 M.clip=clip;M.bind=bindClip(clip);M.cur=key;
 // measures over one cycle of the clip (the sliders scale and offset relative to these)
 const N=48,dur=clip.duration,pre={dur,mean:{},hipsY:0,arm:[],sway:[],thighZ:{Left:0,Right:0}};
 const acc={};const names=['LeftArm','RightArm','LeftUpLeg','RightUpLeg'];names.forEach(n=>acc[n]=new THREE.Vector4());
 const lz=[];
 for(let i=0;i<N;i++){evalClip(i/N*dur);
  for(const n of names){const q=M.bones[n].quaternion,a=acc[n];const s=(a.x*q.x+a.y*q.y+a.z*q.z+a.w*q.w)<0?-1:1;a.x+=s*q.x;a.y+=s*q.y;a.z+=s*q.z;a.w+=s*q.w}
  pre.hipsY+=M.bones.Hips.position.y/N;
  pre.arm.push(wp('LeftHand',_v1).z-wp('LeftArm',_v2).z);
  lz.push(wp('LeftFoot',_v1).z-wp('LeftUpLeg',_v2).z);
  for(const sd of ['Left','Right']){wp(sd+'Leg',_v1);wp(sd+'UpLeg',_v2);pre.thighZ[sd]+=(_v1.z-_v2.z)/_v1.distanceTo(_v2)/N}}
 for(const n of names){const a=acc[n].normalize();pre.mean[n]=new THREE.Quaternion(a.x,a.y,a.z,a.w).normalize()}
 const norm=a=>{const m=a.reduce((s,x)=>s+x,0)/a.length,h=Math.max(1e-6,...a.map(x=>Math.abs(x-m)));return a.map(x=>(x-m)/h)};
 pre.arm=norm(pre.arm);
 // weight over the left foot: the fundamental of the left foot's backward speed (it moves back while planted)
 let c=0,s_=0;for(let i=0;i<N;i++){const d=-(lz[(i+1)%N]-lz[(i-1+N)%N]);c+=d*Math.cos(2*Math.PI*i/N);s_+=d*Math.sin(2*Math.PI*i/N)}
 const amp=Math.hypot(c,s_)||1;pre.sway=[...Array(N)].map((_,i)=>(c*Math.cos(2*Math.PI*i/N)+s_*Math.sin(2*Math.PI*i/N))/amp);
 // the held poses: the 2004-style clips hold 8 poses a cycle; the phase-driven sliders (shoulder turn, sway) step with them
 const tr=clip.tracks.find(t=>/UpLeg.quaternion$/.test(t.name))||clip.tracks[0];const hs=[0];
 for(let i=1;i<tr.times.length;i++){let d=0;for(let j=0;j<4;j++)d=Math.max(d,Math.abs(tr.values[i*4+j]-tr.values[(i-1)*4+j]));if(d>1e-5&&tr.times[i]<dur-1e-6)hs.push(tr.times[i])}
 pre.holds=hs.length>=4&&hs.length<=16?hs:null;
 M.pre=pre;$('presetNote').textContent=NOTES[S.mode][S.preset[S.mode]]||'';
}
function heldPhase(t){const pre=M.pre;if(!pre.holds)return t/pre.dur;let h=0;for(const x of pre.holds)if(x<=t+1e-6)h=x;return h/pre.dur}
function sample(arr,ph){const n=arr.length,x=((ph%1)+1)%1*n,i=Math.floor(x),f=x-i;return arr[i%n]*(1-f)+arr[(i+1)%n]*f}

// ---- the tuned pose (runtime offsets and scales on the clip) --------------------------------------------------------------
const AX={x:new THREE.Vector3(1,0,0),y:new THREE.Vector3(0,1,0),z:new THREE.Vector3(0,0,1)};
const _pw=new THREE.Quaternion(),_r=new THREE.Quaternion(),_d=new THREE.Quaternion();
function rotModel(n,axis,ang){if(!ang)return;const b=M.bones[n];b.parent.getWorldQuaternion(_pw);_r.setFromAxisAngle(axis,ang);
 const pinv=_pw.clone().invert();b.quaternion.premultiply(pinv.multiply(_r).multiply(_pw));b.updateMatrixWorld(true)}
function scaleFrom(n,base,k){if(k===1)return;const b=M.bones[n];_d.copy(base).invert().multiply(b.quaternion);if(_d.w<0){_d.x=-_d.x;_d.y=-_d.y;_d.z=-_d.z;_d.w=-_d.w}
 const w=Math.min(1,_d.w),ang=2*Math.acos(w),s=Math.sqrt(1-w*w);if(s<1e-7)return;
 _r.setFromAxisAngle(_v3.set(_d.x/s,_d.y/s,_d.z/s),ang*k);b.quaternion.copy(base).multiply(_r)}
function footMin(){let m=1e9;for(const n of ['LeftFoot','RightFoot','LeftToeBase','RightToeBase'])m=Math.min(m,wp(n,_v1).y);return m}
function applyPose(tClip,sl){
 const pre=M.pre,ph=heldPhase(tClip);evalClip(tClip);
 const B=M.bones,g0=footMin(),headW=B.Head.getWorldQuaternion(new THREE.Quaternion()),yClip=B.Hips.position.y;
 const walk=S.mode==='walk';
 // scales about the cycle's mean swing (arms, thighs) and about the rest pose (knee bend)
 for(const sd of ['Left','Right']){scaleFrom(sd+'Arm',pre.mean[sd+'Arm'],sl.armSwing);scaleFrom(sd+'UpLeg',pre.mean[sd+'UpLeg'],sl.stride)}
 M.rig.updateMatrixWorld(true);
 if(walk&&sl.knee!==1)for(const sd of ['Left','Right'])scaleFrom(sd+'Leg',M.rest[sd+'Leg'].q,sl.knee);
 if(!walk&&sl.kneeDrive!==1)for(const sd of ['Left','Right']){wp(sd+'Leg',_v1);wp(sd+'UpLeg',_v2);const z=(_v1.z-_v2.z)/_v1.distanceTo(_v2);
  if(z>pre.thighZ[sd]){scaleFrom(sd+'UpLeg',pre.mean[sd+'UpLeg'],sl.kneeDrive);scaleFrom(sd+'Leg',M.rest[sd+'Leg'].q,Math.max(.3,sl.kneeDrive))}}
 M.rig.updateMatrixWorld(true);
 // hip sway: the pelvis over the stance foot, the thighs angled so the feet stay where they were
 if(walk&&sl.sway){const dx=sl.sway/100*sample(pre.sway,ph);B.Hips.position.x+=dx;M.rig.updateMatrixWorld(true);
  const a=-Math.atan2(dx,.83);rotModel('LeftUpLeg',AX.z,a);rotModel('RightUpLeg',AX.z,a)}
 // the upper body: lean from the spine base, chest up + shoulders back, shoulder turn against the arms
 rotModel('Spine',AX.x,(sl.lean||0)*DEG);
 if(walk&&sl.shoulders){rotModel('Spine2',AX.x,-sl.shoulders*.5*DEG);rotModel('LeftShoulder',AX.y,sl.shoulders*DEG);rotModel('RightShoulder',AX.y,-sl.shoulders*DEG)}
 if(walk&&sl.counter)rotModel('Spine2',AX.y,-sl.counter*DEG*sample(pre.arm,ph));
 if(sl.armCarry){rotModel('LeftArm',AX.z,sl.armCarry*DEG);rotModel('RightArm',AX.z,-sl.armCarry*DEG)}
 if(sl.elbow)for(const sd of ['Left','Right']){const s0=wp(sd+'Arm',new THREE.Vector3()),e=wp(sd+'ForeArm',new THREE.Vector3()),w=wp(sd+'Hand',new THREE.Vector3());
  const n=new THREE.Vector3().subVectors(e,s0).cross(new THREE.Vector3().subVectors(w,e));if(n.lengthSq()<1e-8)n.set(-1,0,0);n.normalize();rotModel(sd+'ForeArm',n,sl.elbow*DEG)}
 if(S.keepHead){B.Head.parent.getWorldQuaternion(_pw);B.Head.quaternion.copy(_pw.invert().multiply(headW));B.Head.updateMatrixWorld(true)}
 // the feet back on the ground, then the bounce (the pelvis's rise and fall scaled about its mean)
 if(S.keepFeet){M.rig.updateMatrixWorld(true);B.Hips.position.y+=g0-footMin()}
 if(sl.bounce!==1)B.Hips.position.y+=(sl.bounce-1)*(yClip-pre.hipsY);
 M.rig.updateMatrixWorld(true);
}

// ---- cameras: the 2004 lens and distance, zoomed so the figure fills the same share of both panes ------------------------
function fitCamera(){if(!M.rig)return;const c=CAM[S.view],H=standingHeight(),e=c.elev*DEG,az=c.az*DEG,D=c.dist*TILE;
 const lift=c.lift==='half'?H/2:c.lift*TILE;const T=new THREE.Vector3(0,lift,0);
 camera.fov=VFOV;camera.aspect=CW/CH;camera.clearViewOffset();
 camera.position.set(T.x+D*Math.cos(e)*Math.sin(az),T.y+D*Math.sin(e),T.z+D*Math.cos(e)*Math.cos(az));camera.lookAt(T);camera.updateProjectionMatrix();camera.updateMatrixWorld();
 const p0=new THREE.Vector3(0,0,0).project(camera),p1=new THREE.Vector3(0,H,0).project(camera);
 const z=(FIG*CH)/((p1.y-p0.y)/2*CH);const fw=CW*z,fh=CH*z;
 const px=(p0.x+1)/2*fw,py=(1-p0.y)/2*fh;camera.setViewOffset(fw,fh,px-CW/2,py-GROUND*CH,CW,CH);camera.updateProjectionMatrix()}

// ---- clocks: one shared phase; the 2004 cycle and ours lock together (unless the cadence slider changes ours) ---------------
const C={phase:0,oursPhase:0,last:performance.now()};
function refClip(){return REF.data&&REF.data.clips[refKey()]}
function refCycle(){const r=refClip();return r?r.cycle_ms/1000:(S.mode==='walk'?.937:.655)}
function tick(now){const dt=Math.min(.1,(now-C.last)/1000);C.last=now;
 if(S.playing)advance(dt*S.speed);draw();requestAnimationFrame(tick)}
function advance(dt){const T=refCycle(),cad=S.sliders[S.mode].cadence||1;C.phase=((C.phase+dt/T)%1+1)%1;
 if(Math.abs(cad-1)<1e-6)C.oursPhase=C.phase+S.offset[S.mode];else C.oursPhase+=dt*cad/(M.pre?M.pre.dur:T)}
function draw(){drawRef();drawOurs()}
function drawRef(){const cv=$('ref'),g=cv.getContext('2d');g.imageSmoothingEnabled=false;const r=refClip();
 const cut=S.refCut&&S.view==='side';g.fillStyle=cut?GRASS:'#0d0b08';g.fillRect(0,0,cv.width,cv.height);
 if(!r){g.fillStyle='#b8ab8f';g.font='14px Arial';g.textAlign='center';g.fillText(REF.data?'no 2004 frames for this view':'2004 reference not loaded',cv.width/2,cv.height/2);
  g.fillText(REF.data?'':'(see the buttons below)',cv.width/2,cv.height/2+20);$('refInfo').textContent='';return}
 let t=C.phase*r.cycle_ms,k=0;for(;k<7;k++){if(t<r.poses[k].ms)break;t-=r.poses[k].ms}
 const p=r.poses[k],im=REF.imgs[cut&&p.cut?p.cut:p.file];const s=FIG*cv.height/r.H;
 if(im&&im.complete&&im.naturalWidth)g.drawImage(im,cv.width/2-r.anchor[0]*s,GROUND*cv.height-r.anchor[1]*s,r.size[0]*s,r.size[1]*s);
 $('refInfo').textContent='pose '+(k+1)+'/8  cycle '+(r.cycle_ms/1000).toFixed(2)+' s'}
function drawOurs(){if(!M.rig||!M.clip||!M.pre){renderer.render(scene,camera);return}
 const ph=((C.oursPhase%1)+1)%1;applyPose(ph*M.pre.dur,S.sliders[S.mode]);renderer.render(scene,camera);
 const cad=S.sliders[S.mode].cadence||1;$('oursInfo').textContent='frame '+(Math.floor(ph*M.pre.dur*30+1e-6)+1)+'/'+Math.round(M.pre.dur*30)+'  cycle '+(M.pre.dur/cad).toFixed(2)+' s'}

// ---- UI -----------------------------------------------------------------------------------------------------------------
function setOn(sel,val,attr){document.querySelectorAll(sel).forEach(b=>b.classList.toggle('on',b.getAttribute(attr)===val))}
function presetKeys(mode){const ks=PRESETS[mode].slice();for(const n of Object.keys(M.gaitClips).sort()){const m=/^(walk|run)_([A-Z][A-Z0-9]*)$/.exec(n);
 if(m&&m[1]===mode&&!ks.includes(m[2]))ks.push(m[2])}return ks}
function buildPresets(){const box=$('presets');box.innerHTML='';for(const k of presetKeys(S.mode)){const b=document.createElement('button');
 b.textContent=k==='cur'?'shipped':k;b.title=presetLabel(S.mode,k);b.dataset.k=k;if(S.preset[S.mode]===k)b.classList.add('on');
 const has=k==='cur'?!!M.kitClips[S.mode]:!!M.gaitClips[S.mode+'_'+k];b.disabled=!has&&Object.keys(M.gaitClips).length>0;
 b.onclick=()=>{S.preset[S.mode]=k;save();refreshAll()};box.appendChild(b);
 if(k==='cur'||k==='S'||k==='H'||k==='F'){const sp=document.createElement('span');sp.style.width='8px';box.appendChild(sp)}}
 const lab=document.createElement('div');lab.className='note';lab.style.width='100%';lab.textContent='shipped = round 4 (new)  \u00b7  round 4 variants: '+(S.mode==='run'?'K, L':'K')+'  \u00b7  S = shipped until round 4  \u00b7  round 3: G, H  \u00b7  round 2: D, E, F  \u00b7  round 1: A, B, C';box.appendChild(lab)}
function buildSliders(){const box=$('sliders');box.innerHTML='';const sl=S.sliders[S.mode];
 for(const d of SLIDERS[S.mode]){const row=document.createElement('div');row.className='slider';
  row.innerHTML='<span>'+d.label+'</span><input type="range" min="'+d.min+'" max="'+d.max+'" step="'+d.step+'"><span class="val"></span><button title="reset">&#8634;</button>';
  const inp=row.querySelector('input'),val=row.querySelector('.val');inp.value=sl[d.id];val.textContent=fmtVal(d,+inp.value);inp.dataset.id=d.id;
  inp.oninput=()=>{sl[d.id]=+inp.value;val.textContent=fmtVal(d,+inp.value);save();if(!S.playing)draw()};
  row.querySelector('button').onclick=()=>{sl[d.id]=d.def;inp.value=d.def;val.textContent=fmtVal(d,d.def);save();if(!S.playing)draw()};
  box.appendChild(row)}}
function refreshAll(){setOn('[data-mode]',S.mode,'data-mode');setOn('[data-view]',S.view,'data-view');setOn('[data-body]',S.body,'data-body');
 $('mesh').value=S.mesh;$('speed').value=S.speed;$('speedVal').textContent=(+S.speed).toFixed(2)+'x';$('offset').value=S.offset[S.mode];$('offsetVal').textContent=(+S.offset[S.mode]).toFixed(2);
 $('refCut').checked=S.refCut;$('keepHead').checked=S.keepHead;$('keepFeet').checked=S.keepFeet;$('play').textContent=S.playing?'Pause':'Play';
 buildPresets();buildSliders();applyLook();selectClip();fitCamera();
 $('oursTag').textContent='Ours: '+(S.preset[S.mode]==='cur'?'shipped':S.preset[S.mode]+' ('+presetLabel(S.mode,S.preset[S.mode])+')')+(S.mesh!=='shipped'?' \u00b7 model '+S.mesh:'');
 $('refTag').textContent='2004 '+(S.body==='f'?'woman':'man')+' \u00b7 '+S.mode+' \u00b7 '+(S.view==='side'?'side':'game camera');renderPicks();draw()}
document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{S.mode=b.dataset.mode;save();refreshAll()});
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{S.view=b.dataset.view;save();refreshAll()});
document.querySelectorAll('[data-body]').forEach(b=>b.onclick=()=>{S.body=b.dataset.body;save();refreshAll()});
$('mesh').onchange=async()=>{S.mesh=$('mesh').value;save();await loadModel();refreshAll()};
$('play').onclick=()=>{S.playing=!S.playing;$('play').textContent=S.playing?'Pause':'Play'};
const step=d=>{S.playing=false;$('play').textContent='Play';advance(d);draw()};
$('stepFwd').onclick=()=>step(1/30);$('stepBack').onclick=()=>step(-1/30);
$('stepFwdPose').onclick=()=>step(refCycle()/8);$('stepBackPose').onclick=()=>step(-refCycle()/8);
$('speed').oninput=()=>{S.speed=+$('speed').value;$('speedVal').textContent=S.speed.toFixed(2)+'x';save()};
$('offset').oninput=()=>{S.offset[S.mode]=+$('offset').value;$('offsetVal').textContent=S.offset[S.mode].toFixed(2);save();advance(0);if(!S.playing)draw()};
$('swapHalf').onclick=()=>{S.offset[S.mode]=(S.offset[S.mode]+.5)%1;$('offset').value=S.offset[S.mode];$('offsetVal').textContent=S.offset[S.mode].toFixed(2);save();advance(0);if(!S.playing)draw()};
$('refCut').onchange=()=>{S.refCut=$('refCut').checked;save();draw()};
$('keepHead').onchange=()=>{S.keepHead=$('keepHead').checked;save();draw()};
$('keepFeet').onchange=()=>{S.keepFeet=$('keepFeet').checked;save();draw()};
$('resetSliders').onclick=()=>{S.sliders[S.mode]=defaults(S.mode);save();buildSliders();draw()};

// ---- picks ----------------------------------------------------------------------------------------------------------------
function settings(){const sl={};for(const d of SLIDERS[S.mode]){const v=S.sliders[S.mode][d.id];if(v!==d.def)sl[d.id]=v}
 return {mode:S.mode,preset:S.preset[S.mode],clip:S.preset[S.mode]==='cur'?S.mode:S.mode+'_'+S.preset[S.mode],sliders:sl,
  keepHead:S.keepHead,keepFeet:S.keepFeet,body:S.body,view:S.view,model:S.mesh}}
function addPick(verdict){const p=picks();p.unshift(Object.assign({id:Date.now().toString(36),at:new Date().toISOString(),verdict,note:$('note').value.trim()},settings()));
 savePicks(p);$('note').value='';renderPicks();toast(verdict==='best'?'Saved as Best':'Saved as Not right')}
function describe(p){const sl=Object.entries(p.sliders||{}).map(([k,v])=>{const d=SLIDERS[p.mode].find(x=>x.id===k);return d?d.label+' '+fmtVal(d,v):k}).join(', ');
 return p.mode+' '+(p.preset==='cur'?'shipped':p.preset)+(sl?' + '+sl:'')+(p.model&&p.model!=='shipped'?' (model '+p.model+')':'')+(p.note?' \u2014 "'+p.note+'"':'')}
function renderPicks(){const box=$('picks');const p=picks();box.innerHTML=p.length?'':'<div class="note">No picks yet.</div>';
 p.forEach((x,i)=>{const d=document.createElement('div');d.className='pick';
  d.innerHTML='<span class="v '+x.verdict+'">'+(x.verdict==='best'?'\u2714 Best':'\u2718 Not right')+'</span><span class="t"></span><button data-a="load">load</button><button data-a="del">&#10005;</button>';
  d.querySelector('.t').textContent=describe(x);
  d.querySelector('[data-a=load]').onclick=()=>{applySettings(x);toast('Loaded')};
  d.querySelector('[data-a=del]').onclick=()=>{const q=picks();q.splice(i,1);savePicks(q);renderPicks()};box.appendChild(d)})}
function applySettings(x){if(!x||!x.mode)return;S.mode=x.mode;S.preset[x.mode]=x.preset||'cur';S.sliders[x.mode]=Object.assign(defaults(x.mode),x.sliders||{});
 if(x.keepHead!==undefined)S.keepHead=x.keepHead;if(x.keepFeet!==undefined)S.keepFeet=x.keepFeet;if(x.body)S.body=x.body;if(x.view)S.view=x.view;
 const mesh=x.model||'shipped';const reload=mesh!==S.mesh;S.mesh=mesh;save();(reload?loadModel():Promise.resolve()).then(refreshAll)}
$('best').onclick=()=>addPick('best');$('notRight').onclick=()=>addPick('not');
$('copySettings').onclick=()=>{const t=JSON.stringify(settings(),null,1);(navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(()=>toast('Settings copied'),()=>{prompt('Copy these settings:',t)})};
$('exportPicks').onclick=()=>{const blob=new Blob([JSON.stringify({kind:'gait-lab-picks',version:1,exported:new Date().toISOString(),current:settings(),picks:picks()},null,1)],{type:'application/json'});
 const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='gait_lab_picks_'+new Date().toISOString().slice(0,10)+'.json';a.click();toast('Exported')};
$('importBtn').onclick=()=>{const t=prompt('Paste settings JSON (from Copy settings or an exported pick):');if(!t)return;
 try{const o=JSON.parse(t);applySettings(o.current||o.picks&&o.picks[0]||o)}catch(e){toast('That is not valid settings JSON')}};

// ---- baking (for tools/gait_lab_bake.js -> tools/blender/bake_gait_lab.py) -------------------------------------------------
// the tuned cycle sampled at 30 fps: every bone's glTF-local rotation and the Hips position -- exactly what the page shows
function bake(x,name){if(x)applySettingsSync(x);const sl=S.sliders[S.mode],cad=sl.cadence||1,dur=M.pre.dur,n=Math.max(2,Math.round(dur/cad*30));
 const frames=[];for(let f=0;f<=n;f++){applyPose((f/n)*dur%dur,sl);const q={};for(const b of BN)if(M.bones[b])q['mixamorig:'+b]=M.bones[b].quaternion.toArray().map(v=>+v.toFixed(6));
  frames.push({q,hips:M.bones.Hips.position.toArray().map(v=>+v.toFixed(6))})}
 return {kind:'gait-lab-bake',version:1,name:name||null,settings:settings(),source_clip:M.clip.name,fps:30,frames:n,seconds:+(n/30).toFixed(4),keys:frames}}
function applySettingsSync(x){S.mode=x.mode;S.preset[x.mode]=x.preset||'cur';S.sliders[x.mode]=Object.assign(defaults(x.mode),x.sliders||{});
 if(x.keepHead!==undefined)S.keepHead=x.keepHead;if(x.keepFeet!==undefined)S.keepFeet=x.keepFeet;if(x.body)S.body=x.body;selectClip()}
window.GaitLab={bake,settings,applySettings,state:S,ready:false,M,C,CAM,draw,advance,fitCamera,refresh:()=>refreshAll()};

// ---- start ---------------------------------------------------------------------------------------------------------------
(async function start(){
 renderPicks();
 loadRefServer().then(ok=>{if(!ok)$('refState').innerHTML='2004 reference: <b class="warn">not loaded</b> <span class="note">(no server on 127.0.0.1:8150)</span>'});
 try{await loadModel()}catch(e){console.error('[GaitLab] model',e);toast('Could not load the character')}
 refreshAll();window.GaitLab.ready=true;requestAnimationFrame(tick)})();
})();
