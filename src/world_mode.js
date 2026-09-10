/* ================= WORLD MODE SELECTOR =================
 * The rebuilt world is now the safe default.  The legacy composition remains
 * available at ?world=legacy for reference, but its self-placing scripts are not
 * even downloaded during the normal boot.
 *
 * This is intentionally a plain global because index.html uses it while classic
 * scripts are still being parsed in order.
 */
var CRWorldMode = (function(){
  var query = new URLSearchParams(location.search);
  var legacy = query.get('world') === 'legacy' || query.get('legacy') === '1';
  var mode = {
    id: legacy ? 'legacy' : 'v2',
    legacy: legacy,
    lite: !legacy,
    startedAt: performance.now(),
    provider: null,
    providerId: null,
    initialRect: null,
    attachProvider: function(provider){
      if(this.legacy) return null;
      if(!provider || typeof provider.getWorldRect!=='function')
        throw new Error('[world mode] v2 requires a valid WorldProvider');
      this.provider=provider;
      this.providerId=provider.id;
      this.initialRect=provider.getWorldRect();
      return provider;
    },
    loadLegacyScript: function(src){
      if(!this.legacy) return;
      document.write('<script src="'+String(src).replace(/"/g,'&quot;')+'"><'+'/script>');
    }
  };
  document.documentElement.setAttribute('data-world-mode', mode.id);
  return mode;
})();
