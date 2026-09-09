/* ================= LASTLIGHT THREE-LEVEL BUILDING CONTRACT =================
 * Reference-led circulation and purpose data. Blender owns the closed tower,
 * three furnished rooms, trapdoor, beacon and Underkeep dungeon; runtime owns
 * collision, plane changes, state and animation.
 */
var HolmLastlightData=(function(){
  'use strict';
  if(typeof HolmLandscape==='undefined') throw new Error('[HolmLastlightData] HolmLandscape is required');

  var center={x:196.5,z:112.5},baseY=HolmLandscape.lastlightBeacon.summitY;
  var levels=[
    {id:'stores',label:'Lastlight Ground Floor',plane:1,y:baseY+.25,
      spawn:{x:196.5,z:117.4},up:{x:201.0,z:109.5},
      purpose:'Storm stores, boat repair and the working Underkeep hatch.'},
    {id:'keeper',label:"Lastlight Keeper's Room",plane:2,y:baseY+4.15,
      down:{x:200.5,z:109.5},up:{x:192.0,z:115.5},
      purpose:'A cozy lived-in room with the keeper\'s bed, dresser, bookshelf and sea records.'},
    {id:'lantern',label:'Lastlight Lantern Room',plane:3,y:baseY+8.05,
      down:{x:192.7,z:115.5},
      purpose:'Operate the beacon lever and survey the Holm through the tower windows.'}
  ];
  var dungeon={id:'lastlight_underkeep',label:'Lastlight Underkeep',plane:-2,y:baseY-7.2,
    center:{x:420,z:420},halfWidth:19.0,halfDepth:15.0,
    spawn:{x:408.0,z:428.0},ladder:{x:407.0,z:429.0},
    purpose:'A broad tidal cavern with three real elevation shelves, deep water, rock arches, moss and old stone formations beneath the lighthouse.'};
  var contract={
    version:3,id:'holm_lastlight_beacon_v3',label:'Lastlight Beacon',status:'reference-led-three-level-lighthouse',
    center:center,baseY:baseY,levels:levels,dungeon:dungeon,
    visual:{
      model:'assets/models/environments/holm_lastlight_lighthouse_v1.glb',
      source:'assets/blender/environments/holm_lastlight_lighthouse_v1.blend',
      manifest:'assets/manifests/holm_lastlight_lighthouse_v1.json',
      semanticRoots:['CR_Exterior','CR_Level1','CR_Level2','CR_Level3','CR_Dungeon']
    },
    footprint:{outerRadius:10.5,interiorRadius:8.8,wallThickness:.7,doorWidth:2.4,
      door:{x:196.5,z:123.0,facing:'S'},walkHalfWidth:6.6,walkHalfDepth:6.6},
    trapdoor:{plane:1,x:194.45,z:109.1,destination:'lastlight_underkeep'},
    beacon:{plane:3,x:196.5,z:112.5,lever:{x:199.2,z:111.15},initiallyLit:false},
    purpose:{primary:'Relight the Lastlight signal to call the mainland ferry.',
      secondary:'Learn vertical navigation while discovering how the keeper worked and lived.',
      clue:'The Underkeep hatch reveals a tidal cavern beneath the tower.'}
  };

  function acceptance(){
    var checks=[];function add(label,ok){checks.push({label:label,ok:!!ok});}
    add('tower remains wide enough for furnished rooms',contract.footprint.outerRadius*2>=20&&contract.footprint.walkHalfWidth*2>=12);
    add('front door fits a player-scale opening',contract.footprint.doorWidth>=2.2);
    add('three distinct purposeful levels are declared',levels.length===3&&levels.every(function(l){return l.id&&l.label&&l.purpose;}));
    add('level planes rise in strict order',levels.every(function(l,i){return l.plane===i+1&&(!i||l.y>levels[i-1].y);}));
    add('two ladder transitions connect every floor',levels.filter(function(l){return l.up;}).length===2&&levels.slice(1).every(function(l){return !!l.down;}));
    add('ladder sockets remain inside the clear room',levels.every(function(l){return ['up','down'].every(function(k){return !l[k]||Math.hypot(l[k].x-center.x,l[k].z-center.z)<contract.footprint.interiorRadius-1;});}));
    add('base trapdoor connects to a declared dungeon',contract.trapdoor.plane===1&&contract.trapdoor.destination===dungeon.id&&dungeon.plane<0);
    add('dungeon has a safe return ladder and reference-scale area',!!dungeon.ladder&&dungeon.halfWidth>=18&&dungeon.halfDepth>=14);
    add('lantern level owns a working beacon lever socket',contract.beacon.plane===3&&contract.beacon.lever&&contract.beacon.initiallyLit===false);
    add('authored lighthouse declares exterior, three floors and dungeon',contract.visual.semanticRoots.length===5&&contract.visual.semanticRoots[4]==='CR_Dungeon');
    var approach=HolmLandscape.routes.filter(function(r){return r.id===HolmLandscape.lastlightBeacon.approachRoute;})[0];
    var end=approach.points[approach.points.length-1];
    add('wide switchback terminates at the lighthouse door',approach.width>=3.2&&Math.hypot(end[0]-contract.footprint.door.x,end[1]-contract.footprint.door.z)<=1);
    var failed=checks.filter(function(c){return !c.ok;});
    if(failed.length) throw new Error('[HolmLastlightData] acceptance failed: '+failed.map(function(c){return c.label;}).join(', '));
    return {passed:checks.length,total:checks.length,checks:checks,levels:levels.length,ladders:2,dungeons:1};
  }
  var api={version:3,contract:contract,levels:levels,dungeon:dungeon,acceptance:acceptance};
  api.acceptanceResult=acceptance();
  return api;
})();
if(typeof globalThis!=='undefined') globalThis.HolmLastlightData=HolmLastlightData;
