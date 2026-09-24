// Keep the Studio ocean out of the open skiff. The footprint is inset into the
// authored hull's waterline; it does not hide hull geometry or affect navigation.
export function makeSkiffWaterMask(THREE,draft){
 const stations=draft.waterlineStations;
 if(!Array.isArray(stations)||stations.length<3||stations.some(p=>p.length!==2||!p.every(Number.isFinite)||p[1]<=0))throw Error('Invalid skiff waterline');
 const shape=new THREE.Shape();
 const contour=stations.map(([z,w])=>[w*.76,-z]).concat(stations.slice().reverse().map(([z,w])=>[-w*.76,-z]));
 shape.moveTo(...contour[0]);for(const p of contour.slice(1))shape.lineTo(...p);shape.closePath();
 const material=new THREE.MeshBasicMaterial({colorWrite:false,depthWrite:false,depthTest:false,side:THREE.DoubleSide,stencilWrite:true,stencilRef:1,stencilFunc:THREE.AlwaysStencilFunc,stencilFail:THREE.ReplaceStencilOp,stencilZFail:THREE.ReplaceStencilOp,stencilZPass:THREE.ReplaceStencilOp});
 const geometry=new THREE.ShapeGeometry(shape);geometry.rotateX(-Math.PI/2);
 const mask=new THREE.Mesh(geometry,material);mask.name='SkiffWaterMask';mask.rotation.y=draft.rotation;
 mask.position.set(draft.world.x-72,-.03,draft.world.z-64);mask.renderOrder=-10;
 return mask;
}
