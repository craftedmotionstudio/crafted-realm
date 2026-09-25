/* Shared visual path from verified approach data; never grants walkability. */
var HolmArrivalTrail=(function(){
'use strict';
function geometry(layout,sample,offset){
 offset=offset||{x:0,z:0};
 if(!layout||!layout.approach||!layout.building||typeof sample!=="function"||![offset.x,offset.z].every(Number.isFinite))throw Error("[HolmArrivalTrail] invalid inputs");
 if(!Array.isArray(layout.approach.waypoints)||layout.approach.waypoints.length<2||!Number.isFinite(layout.approach.clearWidth)||layout.approach.clearWidth<=0)throw Error("[HolmArrivalTrail] invalid route");
 layout.approach.waypoints.forEach((p,i,a)=>{if(!Array.isArray(p)||p.length!==3||!p.every(Number.isFinite)||(i&&p[0]===a[i-1][0]&&p[2]===a[i-1][2]))throw Error("[HolmArrivalTrail] invalid waypoint")});
 const points=layout.approach.waypoints,step=.25,vertices=[],colors=[],indices=[];
 const xs=points.map(p=>p[0]),zs=points.map(p=>p[2]);
 const half=layout.approach.clearWidth/2;
 function distance(x,z){let best=Infinity;for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i],dx=b[0]-a[0],dz=b[2]-a[2],l=dx*dx+dz*dz;
  const t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[2])*dz)/l));best=Math.min(best,Math.hypot(x-a[0]-t*dx,z-a[2]-t*dz));
 }return best}
 const house=layout.building.world;
 // Clip each small triangle against the trail contour rather than accepting
 // whole grid squares. This preserves sampled terrain while removing stair-step edges.
 function field(p){return half-.025+.025*Math.sin(p[0]*2+p[1]*1.3)-distance(...p)}
 function clip(poly,value){const out=[];for(let i=0;i<poly.length;i++){
  const a=poly[i],b=poly[(i+1)%poly.length],fa=value(a),fb=value(b);
  if(fa>=0)out.push(a);
  if((fa>=0)!==(fb>=0)){const t=fa/(fa-fb);out.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);}
 }return out}
 for(let z=Math.floor(Math.min(...zs)-half);z<Math.max(...zs)+half;z+=step)for(let x=Math.floor(Math.min(...xs)-half);x<Math.max(...xs)+half;x+=step){
  if(distance(x+step/2,z+step/2)>half+step)continue;
  if(z+step<=house.z+7.4)continue; // stop at the Blender porch's outer edge
  // split each small square on the same diagonal as the ground tile under it (HolmOverhaulGround.chunk alternates the
  // tile diagonal with (x+z)&1), so no trail triangle straddles a ground crease and the trail never dips under the ground
  const odd=(Math.floor(x+1e-9)+Math.floor(z+1e-9))&1;
  for(const triangle of odd?[[[x,z],[x,z+step],[x+step,z+step]],[[x,z],[x+step,z+step],[x+step,z]]]:[[[x,z],[x,z+step],[x+step,z]],[[x+step,z],[x,z+step],[x+step,z+step]]]){
   const poly=clip(clip(triangle,field),p=>p[1]-house.z-7.4);if(poly.length<3)continue;
   const base=vertices.length/3;
   for(const [xx,zz] of poly){const y=sample(xx,zz);if(!Number.isFinite(y))throw Error("[HolmArrivalTrail] nonfinite ground");vertices.push(xx+offset.x,y+.025,zz+offset.z);
    const edge=Math.min(1,Math.max(0,field([xx,zz]))/.2),shade=.96+.025*Math.sin(xx*1.7+zz*.9);
    colors.push((.41+.025*edge)*shade,(.33+.018*edge)*shade,(.20+.014*edge)*shade);
   }
   for(let i=1;i<poly.length-1;i++)indices.push(base,base+i,base+i+1);
  }
 }
 return {positions:vertices,colors,indices};
}
function create(THREE,layout,sample,offset){
 const data=geometry(layout,sample,offset),g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(data.positions,3));g.setAttribute('color',new THREE.Float32BufferAttribute(data.colors,3));g.setIndex(data.indices);g.computeVertexNormals();
 const mesh=new THREE.Mesh(g,new THREE.MeshLambertMaterial({vertexColors:true,flatShading:true}));mesh.name='ArrivalTrail';mesh.receiveShadow=true;return mesh;
}
function terrainSampler(bundle){
 if(!bundle||bundle.width!==144||bundle.depth!==128||!Array.isArray(bundle.heights)||bundle.heights.length!==145*129)throw Error('[HolmArrivalTrail] invalid terrain');
 return function(x,z){
  if(!Number.isFinite(x)||!Number.isFinite(z)||x<0||z<0||x>bundle.width||z>bundle.depth)throw Error('[HolmArrivalTrail] sample outside terrain');
  const ix=Math.min(bundle.width-1,Math.floor(x)),iz=Math.min(bundle.depth-1,Math.floor(z)),fx=x-ix,fz=z-iz,w=bundle.width+1;
  const a=bundle.heights[iz*w+ix],b=bundle.heights[iz*w+ix+1],c=bundle.heights[(iz+1)*w+ix],d=bundle.heights[(iz+1)*w+ix+1];
  // Same diagonal as the actual streamed ground (HolmOverhaulGround.chunk, owner reviews 5+6): even tiles a,c,b / b,c,d,
  // odd tiles ((ix+iz)&1) a,c,d / a,d,b. The fixed b-c diagonal left the drawn ground up to 8 cm over the trail on odd
  // tiles: a green triangle on the brown path at its turn toward the Guide House (owner play-test 2026-09-25).
  if((ix+iz)&1)return fz>=fx?a+fz*(c-a)+fx*(d-c):a+fx*(b-a)+fz*(d-b);
  return fx+fz<=1?a+fx*(b-a)+fz*(c-a):d+(1-fx)*(c-d)+(1-fz)*(b-d);
 };
}
return {geometry,create,terrainSampler};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HolmArrivalTrail;
