/* Pure, bounded frame telemetry. Durations measure synchronous call boundaries,
 * not GPU work. outsideFrameMs may contain other callbacks/browser/compositor work.
 * Visibility/focus evidence is sampled at frame boundaries; unobserved transitions
 * cannot be inferred. Percentiles use the nearest-rank convention. */
(function(root,factory){
  var api=factory();
  if(typeof module==='object' && module.exports) module.exports=api;
  else root.FrameStageMetrics=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  function stats(values){
    if(!values.length) return {count:0,mean:null,p95:null,max:null};
    var sorted=values.slice().sort(function(a,b){return a-b;});
    return {count:values.length,mean:values.reduce(function(a,b){return a+b;},0)/values.length,
      p95:sorted[Math.ceil(sorted.length*.95)-1],max:sorted[sorted.length-1]};
  }
  function stages(row){
    return {start:row.start,renderEnd:row.renderEnd,visible:row.visible,focused:row.focused,
      updateMs:row.updateMs,minimapMs:row.minimapMs,renderMs:row.renderMs,totalMs:row.totalMs};
  }
  function summarize(rows,spanKey){
    var result={};
    ['updateMs','minimapMs','renderMs','totalMs','intervalMs','outsideFrameMs'].forEach(function(key){
      var eligible=spanKey && (key==='intervalMs' || key==='outsideFrameMs')?
        rows.filter(function(row){return row[spanKey];}):rows;
      result[key]=stats(eligible.map(function(row){return row[key];}).filter(function(v){return v!==null;}));
    });
    return result;
  }
  function create(capacity){
    capacity=Number.isInteger(capacity)&&capacity>0?Math.min(capacity,10000):180;
    var ring=new Array(capacity),count=0,next=0,previous=null,accepted=0,rejected=0;
    function record(input){
      // Read once into an owned record; even malformed accessors cannot interrupt play.
      var row;
      try {
        if(!input || typeof input!=='object') throw new Error('sample');
        row={start:input.start,updateEnd:input.updateEnd,mapEnd:input.mapEnd,
          renderEnd:input.renderEnd,visible:input.visible,focused:input.focused};
        if(![row.start,row.updateEnd,row.mapEnd,row.renderEnd].every(Number.isFinite) ||
          row.start<0 || row.updateEnd<row.start || row.mapEnd<row.updateEnd ||
          row.renderEnd<row.mapEnd || typeof row.visible!=='boolean' || typeof row.focused!=='boolean' ||
          (previous && (row.start<=previous.start || row.start<previous.renderEnd))) throw new Error('order');
      } catch(error){rejected++;return false;}
      row.updateMs=row.updateEnd-row.start;
      row.minimapMs=row.mapEnd-row.updateEnd;
      row.renderMs=row.renderEnd-row.mapEnd;
      row.totalMs=row.renderEnd-row.start;
      row.intervalMs=previous?row.start-previous.start:null;
      row.outsideFrameMs=previous?Math.max(0,row.start-previous.renderEnd):null;
      row.visibleSpan=!!(previous && previous.visible && row.visible);
      row.focusedSpan=!!(row.visibleSpan && previous.focused && row.focused);
      row.previousFrame=previous?stages(previous):null;
      ring[next]=row;next=(next+1)%capacity;count=Math.min(capacity,count+1);
      previous=row;accepted++;return true;
    }
    function snapshot(){
      var rows=[];
      for(var i=0;i<count;i++) rows.push(ring[(next-count+i+capacity)%capacity]);
      var visible=rows.filter(function(row){return row.visible;});
      var focused=visible.filter(function(row){return row.focused;});
      var visibleIntervals=stats(rows.filter(function(row){return row.visibleSpan;}).map(function(row){return row.intervalMs;}));
      var focusedIntervals=stats(rows.filter(function(row){return row.focusedSpan;}).map(function(row){return row.intervalMs;}));
      var longest=null;
      rows.forEach(function(row){
        if(row.intervalMs!==null && (!longest || row.intervalMs>=longest.intervalMs)){
          longest={intervalMs:row.intervalMs,outsideFrameMs:row.outsideFrameMs,
            visibleSpan:row.visibleSpan,focusedSpan:row.focusedSpan,
            previousFrame:Object.assign({},row.previousFrame),currentFrame:stages(row)};
        }
      });
      return {capacity:capacity,samples:count,accepted:accepted,rejected:rejected,
        visibleSamples:visible.length,hiddenSamples:count-visible.length,visibleFocusedSamples:focused.length,
        all:summarize(rows),visible:summarize(visible,'visibleSpan'),visibleFocused:summarize(focused,'focusedSpan'),
        visibleIntervals:visibleIntervals,visibleFocusedIntervals:focusedIntervals,
        visibleFps:visibleIntervals.mean===null?null:1000/visibleIntervals.mean,
        visibleFocusedFps:focusedIntervals.mean===null?null:1000/focusedIntervals.mean,
        longestRecentInterval:longest};
    }
    return {record:record,snapshot:snapshot};
  }
  // Small automatic contract check; synthetic data only, no engine/timer access.
  var check=create(2),first={start:0,updateEnd:1,mapEnd:2,renderEnd:3,visible:true,focused:true};
  var ok=check.record(first) && check.record({start:20,updateEnd:21,mapEnd:22,renderEnd:23,visible:true,focused:true}) &&
    check.snapshot().visibleFps===50 && check.snapshot().longestRecentInterval.outsideFrameMs===17 && !check.record(first);
  if(!ok) throw new Error('[FrameStageMetrics] acceptance failed');
  if(typeof console!=='undefined') console.log('[FrameStageMetrics] 5/5 acceptance ok');
  return {create:create};
});
