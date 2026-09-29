/* ============================================================================
   CRAFTED REALM — where each piece of the 2004 set plays (PURE DATA + one pure resolver)
   ----------------------------------------------------------------------------
   MusicAreas.trackFor(state) -> song id, from what the Music Director samples twice a second:
     { welcome: login screen showing, holm: the live Tutor's Holm is up, zone: zoneAt() id, plane: Player.plane,
       surface: the island nav surface ('b:<building>:<layer>:<mesh>' = inside that building), x, z, prev: last area key }
   and returns { track, key } (key = the area, kept for hysteresis so a walk along a border does not flip-flop).
   Tutor's Holm (the Blender island, 0..144 x 0..128): inside a building its piece plays; outdoors the nearest
   area anchor within its radius wins; between areas the last piece keeps playing (the island's welcome plays at
   the Guide House and before any area is reached). Anchors are the building placements in
   docs/rebuild/holm-overhaul/v2land.json, the Guide House (arrival-layout.json) and the Minnow Hollow pond
   (island-fishing.json). Mainland: by zone; anything underground is the cave piece.
   Loaded as a plain script (window.MusicAreas) and require()-able by tools/test_music_2004.js.
   ========================================================================== */
(function(root){
  'use strict';
  // inside a Holm building (surface b:<id>:...) -> its piece
  var HOLM_BUILDINGS={
    keep:'holm_keep', bakehouse:'holm_bakehouse', lodge:'holm_lodge', survival:'holm_camp', quarry:'holm_mine',
    bank:'holm_bank', mage:'holm_mage', haven:'holm_cove', lastlight:'holm_lastlight', cavern:'holm_mine',
    mill:'holm_mill', stair:'holm_lastlight', 'guide-cellar':'holm_morning'
  };
  // outdoors on the Holm: [key, x, z, radius (tiles), piece]
  var HOLM_AREAS=[
    ['guide-house',   66, 99, 16, 'holm_morning'],
    ['minnow-hollow', 27, 96, 10, 'holm_hollow'],
    ['survival-camp', 31, 84, 10, 'holm_camp'],
    ['bakehouse',     44, 67,  9, 'holm_bakehouse'],
    ['quest-lodge',   35, 51, 10, 'holm_lodge'],
    ['quarry-gate',   36, 33, 12, 'holm_mine'],
    ['creakwheel',    65, 64, 11, 'holm_mill'],
    ['holm-bank',     86, 57,  9, 'holm_bank'],
    ['wardens-keep',  87, 35, 14, 'holm_keep'],
    ['mage-tower',   114, 58, 12, 'holm_mage'],
    ['lastlight',    121, 26, 12, 'holm_lastlight'],
    ['keepers-stair',107, 18,  6, 'holm_lastlight'],
    ['lanternfoot',  101, 14, 12, 'holm_cove']
  ];
  var HOLM_DEFAULT='holm_morning';
  // mainland zones (game1_data.js ZONES ids) -> piece; unlisted zones are the open road
  var ZONE_TRACKS={ commons:'hm_hearthmere', wardenholm:'hm_hearthmere', scarlands:'hm_scarlands', undercrag:'hm_cave', holm:'holm_morning' };
  var ROAD='hm_road', CAVE='hm_cave', TITLE='hm_title';
  var HYSTERESIS=1.2;   // stay in the current outdoor area until 20 % past its radius

  function trackFor(s){
    s=s||{};
    if(s.welcome) return {track:TITLE, key:'title'};
    if(s.holm){
      var m=/^b:([^:]+):/.exec(s.surface||'');
      if(m && !/Terrain$/.test(s.surface) && HOLM_BUILDINGS[m[1]]) return {track:HOLM_BUILDINGS[m[1]], key:'in:'+m[1]};
      if(m && m[1]==='cavern') return {track:'holm_mine', key:'in:cavern'};                // the offshore cavern's own ground
      if(!Number.isFinite(s.x) || !Number.isFinite(s.z)) return {track:HOLM_DEFAULT, key:'holm'};
      var best=null, bestD=Infinity, prevArea=null, prevD=Infinity;
      for(var i=0;i<HOLM_AREAS.length;i++){ var a=HOLM_AREAS[i], d=Math.hypot(s.x-a[1], s.z-a[2])/a[3];
        if(d<bestD){ bestD=d; best=a; }
        if(s.prev===a[0]){ prevArea=a; prevD=d; } }
      if(best && bestD<1){
        if(prevArea && prevArea!==best && prevD<HYSTERESIS && bestD>=0.75) return {track:prevArea[4], key:prevArea[0]};   // no flip at a border
        return {track:best[4], key:best[0]};
      }
      // between areas the last piece keeps playing (the 2004 way: music changes on reaching a new area, not on
      // leaving one); the island's welcome plays only before any area has been reached
      if(prevArea) return {track:prevArea[4], key:prevArea[0]};
      var pb=/^in:(.+)$/.exec(s.prev||'');
      if(pb && HOLM_BUILDINGS[pb[1]]) return {track:HOLM_BUILDINGS[pb[1]], key:s.prev};
      return {track:HOLM_DEFAULT, key:'holm'};
    }
    if((s.plane||0)<0) return {track:(s.zone==='holm'?'holm_mine':CAVE), key:'under:'+(s.zone||'')};
    return {track:ZONE_TRACKS[s.zone]||ROAD, key:'zone:'+(s.zone||'')};
  }

  var API={ trackFor:trackFor, HOLM_BUILDINGS:HOLM_BUILDINGS, HOLM_AREAS:HOLM_AREAS, ZONE_TRACKS:ZONE_TRACKS,
            HOLM_DEFAULT:HOLM_DEFAULT, ROAD:ROAD, CAVE:CAVE, TITLE:TITLE };
  root.MusicAreas=API;
  if(typeof module!=='undefined' && module.exports) module.exports=API;
})(typeof window!=='undefined'? window : globalThis);
