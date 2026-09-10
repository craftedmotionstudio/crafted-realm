/* Tick-health telemetry (rsbox Engine pattern, GOAL.md §15).
 * game5_main.js reports each fixed-tick batch here: how long the 600ms sim work
 * actually took on the wall clock, plus backlog drops after tab stalls. Overruns
 * get a throttled console warning; the optional overlay shows live counters. */

const TickHealth = {
  ticks:0, overruns:0, dropped:0, worstMs:0, avgMs:0,
  _lastWarnAt:0, _el:null, _iv:null,

  /* ms = wall-clock time spent simulating n ticks this frame */
  sample(ms, n){
    if(!n) return;
    const per = ms / n;
    this.ticks += n;
    this.avgMs = this.avgMs ? this.avgMs*0.95 + per*0.05 : per;   // EWMA
    if(per > this.worstMs) this.worstMs = per;
    const budget = TICK*1000;
    if(per > budget){
      this.overruns++;
      const now = performance.now();
      if(now - this._lastWarnAt > 5000){
        this._lastWarnAt = now;
        console.warn('[TickHealth] world tick overran its '+budget+'ms budget: '
          +per.toFixed(1)+'ms ('+this.overruns+' overruns total). Is the sim lagging?');
      }
    }
  },

  /* the accumulator threw away a backlog (tab stall / long freeze) */
  droppedBacklog(){
    this.dropped++;
    console.warn('[TickHealth] tick backlog dropped after a stall ('+this.dropped+' total).');
  },

  _render(){
    if(!this._el) return;
    this._el.innerHTML =
      '<b style="color:#e8c46a">Tick health</b><br>'
      +'sim ticks: '+this.ticks
      +'<br>avg: '+this.avgMs.toFixed(2)+'ms / '+(TICK*1000)+'ms budget'
      +'<br>worst: '+this.worstMs.toFixed(1)+'ms'
      +'<br>overruns: <span style="color:'+(this.overruns?'#e07a5f':'#9fc45a')+'">'+this.overruns+'</span>'
      +' &nbsp; drops: <span style="color:'+(this.dropped?'#e07a5f':'#9fc45a')+'">'+this.dropped+'</span>';
  },
  start(){
    if(!this._el){
      const e=document.createElement('div');
      e.style.cssText='position:absolute;top:64px;left:200px;z-index:26;min-width:150px;'+
        'background:rgba(43,37,28,.88);border:2px solid;border-color:#7a7265 #241f17 #241f17 #7a7265;'+
        'padding:5px 7px;font-size:11px;color:#d8ccb4;pointer-events:none;line-height:1.45;';
      document.body.appendChild(e);
      this._el=e;
    }
    this._el.style.display='block';
    this._render();
    this._iv=setInterval(()=>this._render(), 1000);
  },
  stop(){
    if(this._iv){ clearInterval(this._iv); this._iv=null; }
    if(this._el) this._el.style.display='none';
  }
};

if(typeof Overlays!=='undefined'){
  Overlays.register({
    id:'tick-health', name:'Tick health',
    desc:'Sim-tick telemetry: average/worst tick cost vs the 600ms budget, overrun and backlog-drop counters.',
    defaultOn:false,
    start:()=>TickHealth.start(), stop:()=>TickHealth.stop()
  });
}
