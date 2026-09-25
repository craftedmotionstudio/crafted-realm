#!/usr/bin/env node
/* Combat feel pass (2026-09-25): headless unit test of src/combat_fx.js timing and presentation logic.
 * Loads the module in a vm with a tiny THREE / DOM stub and a Math.random that throws, then checks:
 *   melee splat + flinch appear at the kit clip's impact frame (not at the logical hit), the bar holds the pre-hit
 *   value until then; an arrow's splat waits for the visible arrow to land; a missed spell shows a blue 0 on landing;
 *   the corpse waits for the killing splat and the drop stays hidden until the body is gone; four stacked slots;
 *   bounded pools under spam; the screen shake respects reduced motion; the module never touches Math.random.
 * Run: node tools/test_holm_combat_fx.js */
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
let pass=0,fail=0;const ok=(n,c,d)=>{if(c){pass++;console.log('PASS '+n)}else{fail++;console.log('FAIL '+n+(d!==undefined?'  '+JSON.stringify(d):''))}};

class V{constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z}set(x,y,z){this.x=x;this.y=y;this.z=z;return this}copy(v){this.x=v.x;this.y=v.y;this.z=v.z;return this}
 clone(){return new V(this.x,this.y,this.z)}add(v){this.x+=v.x;this.y+=v.y;this.z+=v.z;return this}sub(v){this.x-=v.x;this.y-=v.y;this.z-=v.z;return this}
 multiplyScalar(k){this.x*=k;this.y*=k;this.z*=k;return this}addScaledVector(v,k){this.x+=v.x*k;this.y+=v.y*k;this.z+=v.z*k;return this}
 lerp(v,t){this.x+=(v.x-this.x)*t;this.y+=(v.y-this.y)*t;this.z+=(v.z-this.z)*t;return this}distanceToSquared(v){const a=this.x-v.x,b=this.y-v.y,c=this.z-v.z;return a*a+b*b+c*c}
 distanceTo(v){return Math.sqrt(this.distanceToSquared(v))}setFromMatrixPosition(m){return this.copy(m.pos)}applyQuaternion(){return this}project(){this.x/=40;this.y/=40;this.z=.5;return this}}
class Col{constructor(h){this.h=h||0}setHex(h){this.h=h;return this}copy(c){this.h=c.h;return this}lerp(){return this}getHex(){return this.h}}
class O3{constructor(){this.position=new V();this.rotation={x:0,y:0,z:0,set(){}};this.scale={x:1,setScalar(s){this.x=s}};this.quaternion={};this.userData={};this.children=[];this.parent=null;this.visible=true;this.name='';this.matrixWorld={pos:this.position}}
 add(c){this.children.push(c);c.parent=this;return this}remove(c){const i=this.children.indexOf(c);if(i>=0)this.children.splice(i,1);c.parent=null;return this}
 traverse(f){f(this);this.children.forEach(c=>c.traverse(f))}updateMatrixWorld(){}getWorldPosition(o){return o.copy(this.position)}lookAt(){}rotateY(){}}
class Spr extends O3{constructor(m){super();this.material=m}}
const THREE={Vector3:V,Color:Col,Object3D:O3,Group:O3,Sprite:Spr,SpriteMaterial:class{constructor(o){Object.assign(this,o);this.color=new Col(0xffffff);this.rotation=0}},
 CanvasTexture:class{},AdditiveBlending:2,NormalBlending:1,Box3:class{constructor(){this.min=new V();this.max=new V()}makeEmpty(){return this}setFromObject(o){this.min.set(0,0,0);this.max.set(1,(o.userData&&o.userData.h)||.75,1);return this}getCenter(v){return v.set(0,0,0)}}};
const ctx2d=new Proxy({},{get:(t,k)=>k in t?t[k]:(()=>({addColorStop(){}})),set:(t,k,v)=>{t[k]=v;return true}});
const el=()=>({style:{},width:0,height:0,getContext:()=>ctx2d,appendChild(){},insertAdjacentElement(){},isConnected:true});
const document={createElement:el,getElementById:()=>null,body:{appendChild(){}}};
const store={};const localStorage={getItem:k=>k in store?store[k]:null,setItem:(k,v)=>{store[k]=String(v)}};
const calls={hit:0,block:0,clip:[],view:0,clear:0};
const scene=new O3(),camera={setViewOffset(){calls.view++},clearViewOffset(){calls.clear++},updateMatrixWorld(){}};
const player=new O3();player.userData.holmPlayer=true;player.name='player';scene.add(player);
const Player={hp:10,maxHp:10,target:null};
function npc(hp){const n={t:{hp,glbHeight:.75,size:.8,deathStyle:'flip'},hp,dead:false,dying:false,target:null,mesh:new O3()};n.mesh.userData.npc=n;n.mesh.add(new O3());n.mesh.position.set(2,0,0);scene.add(n.mesh);return n}
const g=npc(5),WORLD={npcs:[g],drops:[]};
const sb={THREE,document,window:{devicePixelRatio:1,matchMedia:()=>({matches:false})},innerWidth:1280,innerHeight:800,localStorage,scene,camera,player,Player,WORLD,console,
  hitReact(){calls.hit++},blockReact(){calls.block++},HolmIslandPlayer:{play(n){calls.clip.push(n)}},arrowMesh:()=>new O3()};
const ctx=vm.createContext(sb);
vm.runInContext('Math.random=function(){throw new Error("Math.random called by the combat feel layer")};',ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname,'..','src','combat_fx.js'),'utf8')+'\n;this.CombatFX=CombatFX;',ctx);
const FX=ctx.CombatFX;let T=0;const step=(s,dt=1/60)=>{for(let t=0;t<s-1e-9;t+=dt){FX.update(dt);T+=dt}};
const splats=d=>FX.qaSplats().filter(s=>d===undefined||s.dmg===d);

try{
  FX.update(1/60);
  // impact timing table (kit clip key frames at 30 fps, bow and cast played a touch faster)
  const it=t=>+FX.impactTime(player,t).toFixed(3);
  ok('kit impact frames: stab/slash .30, crush .40, bow release .83/1.35, cast release .47/1.15',it('stab')===.3&&it('slash')===.3&&it('crush')===.4&&it('bow')===+(0.83/1.35).toFixed(3)&&it('cast')===+(0.47/1.15).toFixed(3),{stab:it('stab'),crush:it('crush'),bow:it('bow'),cast:it('cast')});
  const gm={attack:{getClip:()=>({duration:.6,name:'attack'}),isRunning:()=>false}};g.mesh.userData.gmix=gm;
  ok('grubkin strike lands at its snap frame (half of the 0.6 s attack clip)',Math.abs(FX.impactTime(g.mesh,'slash')-.3)<1e-9);
  delete g.mesh.userData.gmix;

  // 1. melee: logical hit now, splat + flinch at the impact frame
  g.hp=3;FX.melee(player,g,'stab',2,3);FX.hit(g.mesh,2);
  ok('melee: no splat at the logical hit',splats(2).length===0);
  ok('melee: the bar still shows the pre-hit value',FX.qaBar(g.mesh)===1,FX.qaBar(g.mesh));
  step(.26);ok('melee: still no splat at 0.26 s',splats(2).length===0&&calls.hit===0);
  step(.06);const sp=splats(2)[0];
  ok('melee: red splat + flinch at the stab impact frame (0.30 s)',!!sp&&sp.kind==='hit'&&calls.hit===1,{sp,hit:calls.hit});
  ok('melee: the bar drops when the splat shows',FX.qaBar(g.mesh)===0.6,FX.qaBar(g.mesh));

  // 2. ranged: the logical arrow lands at 0.55 s, the splat waits for the visible arrow (released at the bow frame)
  const f=FX.launch('arrow',player,g.mesh,{dmg:1});step(.55);
  FX.expectProjectile(f,g.mesh);g.hp=2;FX.hit(g.mesh,1);
  ok('ranged: no splat when the logical arrow lands (visible arrow still in flight)',splats(1).length===0&&FX.stats().projectiles===1,FX.stats());
  let seen=null,landed=null;for(let i=0;i<120&&(seen===null||landed===null);i++){step(1/60);if(landed===null&&FX.stats().projectiles===0)landed=i;if(seen===null&&splats(1).length)seen=i}
  ok('ranged: the splat shows on the frame the arrow lands',seen!==null&&seen===landed,{seen,landed});

  // 3. magic miss: a blue 0 when the orb lands (splash)
  const m=FX.launch('bolt',player,g.mesh,{dmg:0,spell:'wind_strike'});step(.5);FX.expectProjectile(m,g.mesh);FX.hit(g.mesh,0);
  ok('magic: the miss waits for the orb',splats(0).filter(s=>!s.player).length===0);
  step(1.2);ok('magic: a blue 0 (miss) once the orb lands',FX.qaSplats().some(s=>s.dmg===0&&s.kind==='miss')||calls.block>0,{splats:FX.qaSplats(),block:calls.block});

  // 4. kill: the fall waits for the killing splat; the drop stays hidden until the body is gone
  step(2);const k=npc(5);WORLD.npcs.push(k);k.hp=0;k.dead=true;k.dying=true;k.mesh.userData.death={t:0,dur:.55,baseY:0};
  const drop=new O3();drop.userData={kind:'drop'};WORLD.drops.push(drop);
  FX.melee(player,k,'crush',5,5);FX.hit(k.mesh,5);FX.onKill(k,[drop],false);
  const d=k.mesh.userData.death;
  ok('kill: the corpse waits for the killing splat',d.wait===true&&d.style==='flip'&&d.sink>0&&d.hold>0,d);
  step(.2);ok('kill: still waiting before the crush impact frame (0.40 s)',d.wait===true);
  step(.25);ok('kill: the fall starts with the killing (gold max-hit) splat',d.wait===false&&splats(5).some(s=>s.kind==='max'),{wait:d.wait,s:splats(5)});
  ok('kill: the drop is hidden while the body falls',drop.visible===false&&drop.userData._cfxHide===true);
  k.dying=false;step(.1);ok('kill: the drop appears once the body is gone',drop.userData._cfxHide===false&&drop.visible!==false);

  // 5. stacking: four slots, the fifth replaces the oldest
  step(2);[1,2,3,4].forEach(n=>FX.hit(g.mesh,n));const slots=FX.qaSplats().filter(s=>s.name===g.mesh.name&&!s.player).map(s=>s.slot).sort();
  ok('stacking: four hits take the four OSRS slots',JSON.stringify(slots)==='[0,1,2,3]',slots);
  FX.hit(g.mesh,7);const s7=FX.qaSplats().filter(s=>!s.player);ok('stacking: a fifth replaces the oldest (still four)',s7.length===4&&s7.some(s=>s.dmg===7)&&!s7.some(s=>s.dmg===1),s7);

  // 6. the player: hit clip on damage, guard on a 0, shake on a big hit unless reduced motion
  step(2);calls.clip.length=0;const b0=calls.block;Player.hp=7;FX.hit(player,3);step(.05);
  ok('player: a red splat plays the kit hit clip',calls.clip.includes('hit'));
  FX.hit(player,0);step(.05);ok('player: a 0 raises the guard (block)',calls.block>b0);
  step(1);Player.hp=0;const v0=calls.view;FX.hit(player,10);step(.03);ok('shake: a big hit offsets the view for ~80 ms',FX.stats().shaking||calls.view>v0,{view:calls.view-v0});
  step(.2);ok('shake: over after 80 ms',!FX.stats().shaking);
  store.cr_login_reduced_motion='1';step(2.2);const v1=calls.view;FX.hit(player,10);step(.05);
  ok('shake: none with Reduced motion on',calls.view===v1&&!FX.stats().shaking&&FX.reducedMotion()===true);

  // 7. bounded pools under spam
  for(let i=0;i<400;i++){FX.hit(g.mesh,i%4);FX.hit(player,i%3);if(i%10===0){FX.launch(i%20?'arrow':'bolt',player,g.mesh,{dmg:i%3});}FX.update(1/60)}
  step(4);const st=FX.stats();
  ok('pools stay bounded under spam (particles <= 160, arrows <= 6, no leaked events)',st.particlePool<=160&&st.arrowPool<=6&&st.pending===0&&st.splats===0,st);
  ok('the combat feel layer never called Math.random',true);
}catch(e){ok('no exception (Math.random or runtime error)',false,String(e&&e.stack||e).slice(0,500))}
console.log('[HOLM_COMBAT_FX] '+pass+'/'+(pass+fail)+(fail?' FAIL':' PASS'));
process.exit(fail?1:0);
