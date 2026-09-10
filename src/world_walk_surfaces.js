/* ================= AUTHORED WALK SURFACES =================
 * Small, chunk-owned walkable platforms that sit above terrain or water.
 * Building definitions describe their rectangles in building-local space;
 * this registry lets groundY/pathfinding see the same deck height while the
 * visual GLB remains the only rendered surface.
 */
var WorldWalkSurfaces=(function(){
  'use strict';
  var groups=new Map(),nextId=0;

  function boundsFor(root,rows){
    root.updateMatrixWorld(true);
    var minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity;
    rows.forEach(function(row){
      var hw=row.w/2,hd=row.d/2;
      [[-hw,-hd],[hw,-hd],[hw,hd],[-hw,hd]].forEach(function(c){
        var p=root.localToWorld(new THREE.Vector3(row.x+c[0],row.y||0,row.z+c[1]));
        minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);minZ=Math.min(minZ,p.z);maxZ=Math.max(maxZ,p.z);
      });
    });
    return {minX:minX,maxX:maxX,minZ:minZ,maxZ:maxZ};
  }

  function rebake(bounds){
    if(!bounds||typeof CollisionGrid==='undefined'||!CollisionGrid.rebakeArea) return;
    var x=(bounds.minX+bounds.maxX)/2,z=(bounds.minZ+bounds.maxZ)/2;
    var r=Math.max(bounds.maxX-bounds.minX,bounds.maxZ-bounds.minZ)/2+1.5;
    CollisionGrid.rebakeArea(x,z,r);
  }

  function register(root,rows,owner){
    if(!root||!Array.isArray(rows)||!rows.length) return null;
    var id='walk-surface-'+(++nextId),copy=rows.map(function(row){
      return {id:row.id||null,x:Number(row.x)||0,z:Number(row.z)||0,y:Number(row.y)||0,
        w:Number(row.w)||0,d:Number(row.d)||0,role:row.role||'platform'};
    });
    var group={id:id,owner:owner||null,root:root,rows:copy,bounds:boundsFor(root,copy)};
    groups.set(id,group);rebake(group.bounds);return group;
  }

  function unregister(group){
    if(!group||!groups.has(group.id)) return;
    groups.delete(group.id);rebake(group.bounds);
  }

  function heightAt(x,z){
    var result=null;
    groups.forEach(function(group){
      if(x<group.bounds.minX||x>group.bounds.maxX||z<group.bounds.minZ||z>group.bounds.maxZ) return;
      group.root.updateMatrixWorld(true);
      var local=group.root.worldToLocal(new THREE.Vector3(x,group.root.position.y,z));
      for(var i=group.rows.length-1;i>=0;i--){
        var row=group.rows[i];
        if(Math.abs(local.x-row.x)<=row.w/2&&Math.abs(local.z-row.z)<=row.d/2){
          var world=group.root.localToWorld(new THREE.Vector3(row.x,row.y,row.z));
          if(result===null||world.y>result) result=world.y;
        }
      }
    });
    return result;
  }

  function clear(){ Array.from(groups.values()).forEach(unregister); }
  function snapshot(){
    var surfaces=0,owners=[];
    groups.forEach(function(group){surfaces+=group.rows.length;if(group.owner)owners.push(group.owner);});
    return {groups:groups.size,surfaces:surfaces,owners:owners};
  }
  return {register:register,unregister:unregister,heightAt:heightAt,clear:clear,snapshot:snapshot};
})();
