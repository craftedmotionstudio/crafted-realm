/* Select the saved provider before renderer/world boot. New and migrated saves
 * always begin on Tutor's Holm; only a save written after a real ferry crossing
 * may boot directly into the mainland provider. */
(function(global){
  'use strict';
  if(!global.WorldV2||!global.CRWorldMode||global.CRWorldMode.legacy) return;
  var wanted='tutors-holm-v2';
  try{
    if(global.Persist&&Persist.store){
      var raw=Persist.store.get('motionscape_save'),save=raw&&JSON.parse(raw);
      if(save&&save.world&&typeof save.world.provider==='string'&&WorldV2.get(save.world.provider))
        wanted=save.world.provider;
    }
  }catch(e){ wanted='tutors-holm-v2'; }
  var provider=WorldV2.activate(wanted);
  CRWorldMode.attachProvider(provider);
})(window);
