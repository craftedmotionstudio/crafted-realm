/* ================= MEASURED BOOT COORDINATOR =================
 * Runs named, weighted boot work and reports progress only after work finishes.
 * A failed step remains visible and can be retried without reloading the page.
 */
(function(global){
  'use strict';
  function now(){ return (global.performance&&global.performance.now)?global.performance.now():Date.now(); }
  function later(fn){
    if(typeof global.requestAnimationFrame==='function') global.requestAnimationFrame(function(){ setTimeout(fn,0); });
    else setTimeout(fn,0);
  }
  function BootCoordinator(options){
    options=options||{};
    this.steps=(options.steps||[]).slice();
    this.onProgress=options.onProgress||function(){};
    this.onReady=options.onReady||function(){};
    this.onFailure=options.onFailure||function(){};
    this.totalWeight=this.steps.reduce(function(n,s){ return n+(Number(s.weight)||0); },0)||1;
    this.index=0; this.completedWeight=0; this.running=false;
    this.telemetry={status:'idle',startedAt:0,readyAt:0,totalMs:0,progress:0,failedStep:null,steps:[]};
    global.CR_BOOT_TELEMETRY=this.telemetry;
  }
  BootCoordinator.prototype._publish=function(step,message){
    var pct=Math.max(0,Math.min(100,Math.round(this.completedWeight/this.totalWeight*100)));
    this.telemetry.progress=pct;
    this.onProgress(pct,message||step.label,step);
  };
  BootCoordinator.prototype.start=function(){
    if(this.running) return;
    if(!this.telemetry.startedAt) this.telemetry.startedAt=now();
    this.telemetry.status='running'; this.running=true;
    this._next();
  };
  BootCoordinator.prototype._next=function(){
    var self=this;
    if(this.index>=this.steps.length){
      this.running=false; this.telemetry.status='ready'; this.telemetry.progress=100;
      this.telemetry.readyAt=now(); this.telemetry.totalMs=+(this.telemetry.readyAt-this.telemetry.startedAt).toFixed(2);
      this.onProgress(100,'Ready',null); this.onReady(this.telemetry); return;
    }
    var step=this.steps[this.index], started=now();
    this._publish(step,step.label);
    later(function(){
      var result;
      try{ result=step.run(); }
      catch(error){ self._fail(step,error,started); return; }
      Promise.resolve(result).then(function(){
        var ended=now();
        self.telemetry.steps.push({id:step.id,label:step.label,weight:step.weight,
          startedAt:+started.toFixed(2),durationMs:+(ended-started).toFixed(2),status:'complete'});
        self.completedWeight+=Number(step.weight)||0; self.index++;
        self._publish(step,step.label); self._next();
      },function(error){ self._fail(step,error,started); });
    });
  };
  BootCoordinator.prototype._fail=function(step,error,started){
    this.running=false; this.telemetry.status='failed'; this.telemetry.failedStep=step.id;
    this.telemetry.steps.push({id:step.id,label:step.label,weight:step.weight,
      startedAt:+started.toFixed(2),durationMs:+(now()-started).toFixed(2),status:'failed',
      error:String(error&&error.message||error)});
    this.onFailure(error,step,this.retry.bind(this));
  };
  BootCoordinator.prototype.retry=function(){
    if(this.running || this.telemetry.status!=='failed') return;
    this.telemetry.failedStep=null; this.telemetry.status='running'; this.running=true;
    this._next();
  };
  global.BootCoordinator=BootCoordinator;
})(window);
