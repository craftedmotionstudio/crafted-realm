/* The grey paths of Tutor's Holm, authored tile by tile (path tiles pass, 2026-09-29). Owner: "we almost need an agent to
 * go around and map out the exact tiles of the path, because there's a lot of random squares where the path is added
 * that I don't think need to be. They're not the most concise paths." The review-5 lanes (875 tiles, routed by a
 * generator) are replaced by this hand-kept layout: named segments from door to door and station to station along the
 * routes adventurers walk, straight runs and simple bends, one width per lane, tidy junctions, and three small courts
 * where a yard really is. HolmOverhaulGround draws every tile in the grey-stone underlay with its soft edge blend (style
 * 'grey'): the look is unchanged, only which tiles are path.
 *
 * HOW TO EDIT. A segment is {id, name, from, to, w, line}:
 *  - line: the lane's centre line, point to point [x,z]; each run goes along x, along z, or at exactly 45 degrees;
 *  - w: the lane's width, 2 tiles, or 1 where the ground is tight (a plant, prop, trunk or cliff leaves one tile);
 *    a 2-wide line runs on tile corners (whole numbers), a 1-wide line through tile centres (n.5);
 *  - its tiles: every tile whose centre lies within w/2 of a run, measured square to the run (the ends are flat), and
 *    the tiles within w/2 of each bend point (a bend is filled round its corner). So line [[86,62],[86,66]] at w 2 paves
 *    x 85-86, z 62-65 (eight tiles); line [[40.5,88.5],[40.5,92.5]] at w 1 paves x 40, z 88-92 (five tiles);
 *  - from / to: what each end meets: a place (the outside tile of a door, a lesson station: see PLACES in
 *    tools/holm_path_tiles_facts.js), 'crossing:<bridge id>' (the lane runs on to a bridge's deck), 'court:<id>', or
 *    'junction:<id>' (JUNCTIONS below: where lanes meet).
 * A court is {id, name, from, rect:[x0,z0,x1,z1]}: every tile of the rectangle, both ends included.
 * A junction is {id, name, at:[x,z]}: the tile where two or more lanes (or a lane and a court) meet.
 * Check an edit: node tools/test_holm_grey_paths.js (no isolated tile, no stub, one width, every end on what it names,
 * nothing on a floor, prop, plant, trunk, water, ground decor or cliff, every lesson door and station served, the walk
 * graph unchanged); node tools/stage_holm_grey_paths.js takes the ground decor up off new path tiles; the tile map:
 * node tools/audit_holm_path_tiles.js out.json && python tools/map_holm_path_tiles.py out.json map.png; a first line
 * for a new lane: node tools/propose_holm_path_segment.js x,z x,z [--w 1]. Then node tools/bump_script_versions.js.
 *
 * API (unchanged; HolmArrivalQA hands .tiles to HolmOverhaulGround.setPaths with .style; the minimap reads .tiles):
 * tiles "x,z" -> 1 (every path tile, weight 1: crisp), style 'grey', schema, graph (the walk graph the paths lie on:
 * paths are visual only). Added: layout, segments (each with its expanded tiles [[x,z],...]), courts (each with its
 * tiles), junctions, expand(segment), courtTiles(court). */
var HolmIslandGreyPaths=(function(){
 'use strict';
 var SEGMENTS=[
  // ---- the 18-lesson route, in lesson order ----
  {id:'dock-guide-house',name:"dock to Guide House",from:'dock',to:'guide-house:front-door',w:2,line:[[61,118],[61,114],[66,114],[66,105]]},   // under the arrival ribbon
  {id:'guide-house-back',name:"Guide House back door down the knoll",from:'guide-house:back-door',to:'junction:knoll-foot',w:2,line:[[65,94],[65,87]]},
  {id:'knoll-bridge',name:"the knoll foot to the timber bridge",from:'junction:knoll-foot',to:'crossing:timber_teaching_bridge',w:1,line:[[63.5,87.5],[50.5,87.5]]},   // the causeway row, in line with the deck
  {id:'bridge-camp',name:"timber bridge to the Survival camp",from:'crossing:timber_teaching_bridge',to:'survival:camp',w:1,line:[[42.5,87.5],[33.5,87.5]]},
  {id:'hollow-path',name:"the Hollow Path: Survival camp past Wenna and the teaching oaks to Fire Beach",from:'junction:camp-corner',to:'hollow:fire-beach',w:2,line:[[34,88],[34,99]]},
  {id:'camp-bakehouse',name:"Survival camp up the bench to the Bakehouse lane",from:'junction:camp-gap',to:'junction:bakehouse-corner',w:1,line:[[38.5,86.5],[38.5,79.5],[35.5,79.5],[35.5,72.5]]},   // one tile between the camp and the rocks
  {id:'bakehouse-lane',name:"the Bakehouse lane",from:'junction:bakehouse-corner',to:'junction:bakehouse-yard',w:2,line:[[35,71],[46,71]]},
  {id:'bakehouse-door',name:"Bakehouse door",from:'bakehouse:entrance',to:'junction:bakehouse-yard',w:2,line:[[46,68],[46,71]]},
  {id:'bakehouse-lodge',name:"Bakehouse lane to the Quest Lodge door",from:'junction:bakehouse-corner',to:'lodge:entrance',w:2,line:[[38,70],[38,54],[35,54]]},
  {id:'lodge-quarry',name:"Quest Lodge up the mesa ramp to the Quarry Gate",from:'junction:lodge-front',to:'quarry:approach',w:1,line:[[36.5,55.5],[29.5,55.5],[29.5,47.5],[27.5,47.5],[27.5,43.5],[30.5,43.5],[30.5,39.5],[35.5,39.5],[35.5,37.5]]},   // the one-tile ramp by the lodge and up the mesa
  // (the Quarry Gate's shaft leads down to the cavern and the drift up into the Warden's Keep: no surface path)
  {id:'keep-bank',name:"Warden's Keep gate court down the ledge to the Holm Bank court",from:'court:keep-court',to:'court:bank-court',w:1,line:[[85.5,49.5],[84.5,50.5],[83.5,50.5],[83.5,51.5],[79.5,51.5],[79.5,62.5],[82.5,62.5]]},   // a diagonal step past the shrub, then the ledge between the rock and the bank wall
  {id:'bank-mage',name:"Holm Bank court across the gully to the Mage tower door",from:'court:bank-court',to:'mage:entrance',w:2,line:[[91,63],[106,63],[106,57]]},
  {id:'mage-climb',name:"Mage tower door up the crown climb",from:'mage:entrance',to:'junction:crown-ramp-foot',w:2,line:[[106,57],[106,51],[114,51],[114,46],[127,46]]},
  {id:'crown-ramp',name:"the crown climb ramp",from:'junction:crown-ramp-foot',to:'junction:crown-ramp-head',w:1,line:[[127.5,45.5],[127.5,38.5]]},   // a flower patch stands on the ramp's east tile
  {id:'crown-lastlight',name:"the crown climb to Lastlight",from:'junction:crown-ramp-head',to:'junction:lastlight-west',w:2,line:[[128,38],[115,38],[115,31]]},
  {id:'lastlight-stair',name:"Lastlight to the Keeper's Stair head",from:'junction:lastlight-west',to:'stair:head',w:2,line:[[115,31],[111,31],[111,22]]},
  {id:'lastlight-door',name:"Lastlight storm door",from:'junction:lastlight-west',to:'lastlight:door',w:1,line:[[113.5,29.5],[113.5,26.5]]},   // the strip between the rock and the lighthouse wall
  {id:'stair-haven',name:"Keeper's Stair foot to the haven pier",from:'stair:foot',to:'haven:shore',w:1,line:[[104.5,13.5],[104.5,17.5],[102.5,17.5]]},
  // ---- lanes between the buildings ----
  {id:'village-lane',name:"the village lane: Quest Lodge lane past Hettie's Garden gate to the stone village bridge",from:'junction:village-corner',to:'crossing:stone_village_bridge',w:2,line:[[38,56],[47,56],[48,57],[57,57],[57,54],[60,54]]},   // one step down past the rocks at x 48
  {id:'bridge-mill',name:"stone village bridge to the Creakwheel Mill",from:'crossing:stone_village_bridge',to:'mill:door',w:2,line:[[66,53],[66,58]]},
  {id:'mill-road',name:"the village road: Creakwheel Mill down to the east lane",from:'mill:door',to:'junction:village-road-foot',w:1,line:[[67.5,57.5],[72.5,57.5],[72.5,75.5],[73.5,75.5],[73.5,78.5]]},
  {id:'east-lane',name:"the east lane: Guide House knoll up the bank shoulder to the Mage tower lane",from:'junction:knoll-foot',to:'junction:bank-shoulder',w:1,line:[[66.5,87.5],[67.5,87.5],[67.5,79.5],[90.5,79.5],[90.5,69.5],[95.5,69.5],[95.5,64.5]]},
  {id:'mage-farm',name:"Mage practice yard to Haycombe Farm",from:'court:mage-yard',to:'farm:yard',w:1,line:[[113.5,65.5],[113.5,87.5],[117.5,87.5],[117.5,95.5]]}
 ];
 var COURTS=[
  {id:'keep-court',name:"Warden's Keep gate court",from:'keep:gate',rect:[85,45,89,48]},
  {id:'bank-court',name:"Holm Bank court",from:'bank:entrance',rect:[83,62,90,64]},
  {id:'mage-yard',name:"Mage practice yard",from:'mage:yard',rect:[109,63,114,64]}
 ];
 var JUNCTIONS=[
  {id:'knoll-foot',name:"the knoll foot below the Guide House back door",at:[64,87]},
  {id:'camp-corner',name:"the Survival camp's east corner, the head of the Hollow Path",at:[33,87]},
  {id:'camp-gap',name:"the gap between the Survival camp and the rocks",at:[38,87]},
  {id:'bakehouse-corner',name:"the Bakehouse lane's west corner",at:[36,71]},
  {id:'bakehouse-yard',name:"the Bakehouse door yard",at:[45,70]},
  {id:'lodge-front',name:"in front of the Quest Lodge door",at:[36,55]},
  {id:'village-corner',name:"where the village lane leaves the Quest Lodge lane",at:[38,56]},
  {id:'village-road-foot',name:"where the village road meets the east lane",at:[73,79]},
  {id:'bank-shoulder',name:"the bank shoulder, where the east lane meets the Mage tower lane",at:[95,63]},
  {id:'crown-ramp-foot',name:"the foot of the crown climb ramp",at:[127,45]},
  {id:'crown-ramp-head',name:"the head of the crown climb ramp",at:[127,38]},
  {id:'lastlight-west',name:"below Lastlight's west wall",at:[114,31]}
 ];
 // a segment's tiles, by the rule above (the same in the browser and in node)
 function expand(s){
  var w=s.w||2,half=w/2-1e-6,L=s.line,out=[],seen={},i,x,z;
  var x0=Infinity,x1=-Infinity,z0=Infinity,z1=-Infinity;
  for(i=0;i<L.length;i++){x0=Math.min(x0,L[i][0]);x1=Math.max(x1,L[i][0]);z0=Math.min(z0,L[i][1]);z1=Math.max(z1,L[i][1])}
  function near(cx,cz){
   if(L.length===1)return Math.hypot(cx-L[0][0],cz-L[0][1])<half;
   for(var j=1;j<L.length;j++){var a=L[j-1],b=L[j],dx=b[0]-a[0],dz=b[1]-a[1],ll=dx*dx+dz*dz,t=((cx-a[0])*dx+(cz-a[1])*dz)/ll;
    // a centre on a flat end's edge counts only when it lies on the line itself (the end tile of a 1-wide lane); at a
    // bend the round fill below takes the corner
    var d=Math.hypot(cx-a[0]-t*dx,cz-a[1]-t*dz),edge=Math.abs(t)<1e-9||Math.abs(t-1)<1e-9;
    if(t>=-1e-9&&t<=1+1e-9&&d<half&&(!edge||d<1e-6))return true}
   for(var k=1;k<L.length-1;k++)if(Math.hypot(cx-L[k][0],cz-L[k][1])<half)return true;
   return false;
  }
  for(z=Math.floor(z0-w);z<=Math.ceil(z1+w);z++)for(x=Math.floor(x0-w);x<=Math.ceil(x1+w);x++)
   if(near(x+.5,z+.5)&&!seen[x+','+z]){seen[x+','+z]=1;out.push([x,z])}
  return out;
 }
 function courtTiles(c){var r=c.rect,out=[];for(var z=r[1];z<=r[3];z++)for(var x=r[0];x<=r[2];x++)out.push([x,z]);return out}
 var tiles={};
 SEGMENTS.forEach(function(s){s.tiles=expand(s);s.tiles.forEach(function(t){tiles[t[0]+','+t[1]]=1})});
 COURTS.forEach(function(c){c.tiles=courtTiles(c);c.tiles.forEach(function(t){tiles[t[0]+','+t[1]]=1})});
 return {schema:'holm-island-paths-v2-grey',style:'grey',layout:'holm-path-tiles-authored-v1',
  /* the walk graph re-measured with the Warden's Keep overhaul (2026-09-29; was 10468 / 27691 / d41278dc47dbc168) */
  graph:{nodes:10384,edges:27343,hash:'98f185b84f967d38'},segments:SEGMENTS,courts:COURTS,junctions:JUNCTIONS,tiles:tiles,expand:expand,courtTiles:courtTiles};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HolmIslandGreyPaths;
