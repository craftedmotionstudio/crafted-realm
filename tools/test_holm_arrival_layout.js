'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path');
const file=path.join(__dirname,'../docs/rebuild/holm-overhaul/arrival-layout.json');
function validate(c){
  const b=c.building,s=c.stairs,near=(a,b)=>Math.abs(a-b)<1e-8;
  assert.strictEqual(c.schema,'holm-overhaul-arrival-layout-v1');
  assert(b.width===12&&b.depth===10&&b.world.x===66&&b.world.z===99&&b.world.foundationY===3);
  const bound=(x,z,margin=0)=>Math.abs(x)+margin<=b.width/2-b.wallThickness+1e-8&&Math.abs(z)+margin<=b.depth/2-b.wallThickness+1e-8;
  c.doors.forEach(d=>{assert(d.clearWidth>=1.2&&d.clearHeight>=2.2);assert(d.clearWidth>=2*c.avatar.radius);const worldX=b.world.x+d.x,nearest=Math.floor(worldX)+.5;assert(Math.abs(nearest-worldX)+c.avatar.radius<=d.clearWidth/2,"Door lacks a traversable tile-centre lane");assert(d.clearHeight>=c.avatar.height+c.avatar.headMargin);});
  assert(s.axis==='z'&&s.direction===-1&&s.treads===12&&s.treadRun>=.4&&s.riserHeight<=.25);
  assert(near(s.treads*s.riserHeight,s.endY-s.startY)&&near(s.endY,b.upperFloorY));
  assert(near(s.treads*s.treadRun,s.startZ-s.endZ)&&s.clearWidth>=1.2);
  const o=s.floorOpening;
  assert(near(o.x0,s.x-s.clearWidth/2)&&near(o.x1,s.x+s.clearWidth/2)&&near(o.z0,s.endZ)&&near(o.z1,s.startZ));
  assert(bound(o.x0,o.z0)&&bound(o.x1,o.z1));
  [s.lowerLanding,s.upperLanding].forEach(l=>{assert(bound(l.x-l.w/2,l.z-l.d/2)&&bound(l.x+l.w/2,l.z+l.d/2));assert(l.w>=1.2&&l.d>=1.2);});
  assert(near(s.lowerLanding.z-s.lowerLanding.d/2,s.startZ));
  assert(near(s.upperLanding.z+s.upperLanding.d/2,s.endZ));
  assert(b.upperCeilingY-s.endY>=s.headClearance&&b.upperFloorY-b.upperFloorThickness>=c.avatar.height+c.avatar.headMargin);
  [...c.groundServices,...c.upperServices].forEach(p=>{
    assert(bound(p.x-p.w/2,p.z-p.d/2)&&bound(p.x+p.w/2,p.z+p.d/2));assert(bound(p.interaction[0],p.interaction[2]));
    assert(Math.abs(p.interaction[0]-p.x)>p.w/2||Math.abs(p.interaction[2]-p.z)>p.d/2);
    assert(p.x+p.w/2<=o.x0||p.x-p.w/2>=o.x1||p.z+p.d/2<=o.z0||p.z-p.d/2>=o.z1);
  });
  const route=c.approach.waypoints;
  for(let i=1;i<route.length;i++){
    const a=route[i-1],d=route[i],dx=Math.abs(d[0]-a[0]),dz=Math.abs(d[2]-a[2]);
    assert((dx===0)!==(dz===0));assert(Math.abs(d[1]-a[1])/(dx+dz)<=.4);
  }
  assert.deepStrictEqual(route[0],[c.landing.x,c.landing.height,c.landing.z]);
  assert.deepStrictEqual(route.at(-1),[b.world.x,b.world.foundationY,b.world.z+4]);
  return true;
}
const c=JSON.parse(fs.readFileSync(file)),before=JSON.stringify(c);validate(c);validate(c);assert.strictEqual(JSON.stringify(c),before);
const mutations=[x=>x.doors[0].clearWidth=1.6,x=>x.stairs.riserHeight=.4,x=>x.stairs.treadRun=.2,x=>x.stairs.floorOpening.z1=1,x=>x.doors[0].clearHeight=1.9,x=>x.approach.waypoints[1][1]=5];
mutations.forEach(m=>{const bad=JSON.parse(before);m(bad);assert.throws(()=>validate(bad));});
console.log('[HOLM_ARRIVAL_LAYOUT] numeric layout + determinism + 6 negative fixtures passed; live accessibility unverified');
module.exports={validate};
