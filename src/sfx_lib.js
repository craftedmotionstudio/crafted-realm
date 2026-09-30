/* ================= SOUND LIBRARY, CORE (sound pass, owner review 2026-09-29) =================
 * docs/rebuild/HOLM_SOUND_INVENTORY.md lists every sound and where the game plays it; src/sfx_recipes.js holds the recipes.
 * Every sound effect is synthesized here in plain JavaScript, in the spirit of the 2004 client's short, crisp sounds (our
 * own designs, never copies): noise bursts through resonant filters, pitch envelopes, modal rings (metal, wood, stone, a
 * bell), plucked strings (Karplus-Strong), a small formant voice for the creatures, stick-slip creaks and scattered grains
 * (debris, crackle, droplets). A recipe writes ONE mono buffer; the game plays it as one buffer source and one gain node
 * on the Sfx bus (src/game3_systems.js), so a sound costs two audio nodes however rich it is.
 * Variation: each sound keeps a few variants (different seeds, rendered on first use) and every play nudges the pitch
 * (playback rate) and the gain a little, so repeats never grate.
 * Determinism: a private LCG drives every render and every nudge (never Math.random, like src/combat_fx.js), so a
 * recipe renders the same samples in the game, on the sound board (tools/sound_board.html) and offline to WAV
 * (tools/render_sfx.js), and a sound inside a fight never shifts a seeded combat roll.
 * Levels: every recipe is normalised to its own loudness, DEFS[id].lvl: its loudest 50 ms in dB against the 2004 music's
 * typical short-term level at the default volumes (measured offline, tools/music_render.js: RMS about 0.05), before the SFX
 * volume. Every effect sits under the music (UI ticks about -20 dB, skilling strokes -9, blows -5), under a 0.3 peak ceiling.
 * No square or sawtooth oscillators anywhere: tones are sine or triangle. */
var SfxLib=(function(){
 'use strict';
 var TAU=Math.PI*2,DEFS={},ORDER=[];
 function lcg(seed){var s=(seed>>>0)||0x9e3779b9;return function(){s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296}}
 function hash(str){var h=2166136261;for(var i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
 function clamp(x,a,b){return x<a?a:x>b?b:x}
 function now(){return typeof performance!=='undefined'&&performance.now?performance.now():Date.now()}
 // RBJ biquad coefficients [b0,b1,b2,a1,a2]; 'bp' is the constant 0 dB peak band-pass
 function biq(type,f,q,sr){f=clamp(f,10,sr*.45);q=Math.max(.05,q||.707);var w=TAU*f/sr,cs=Math.cos(w),sn=Math.sin(w),al=sn/(2*q),b0,b1,b2;
  if(type==='lp'){b0=(1-cs)/2;b1=1-cs;b2=b0}else if(type==='hp'){b0=(1+cs)/2;b1=-(1+cs);b2=b0}else{b0=al;b1=0;b2=-al}
  var a0=1+al;return [b0/a0,b1/a0,b2/a0,(-2*cs)/a0,(1-al)/a0]}
 // an envelope: linear attack a, hold h, exponential decay to -60 dB over d
 function env(t,a,h,d){if(t<0)return 0;if(t<a)return t/a;t-=a;if(t<h)return 1;t-=h;return t>=d?0:Math.exp(-6.9*t/d)}
 // piecewise-exponential points [[t, value], ...] (pitch contours)
 function ptsAt(p,t){if(t<=p[0][0])return p[0][1];for(var i=1;i<p.length;i++)if(t<=p[i][0]){var a=p[i-1],b=p[i],u=(t-a[0])/Math.max(1e-9,b[0]-a[0]);return a[1]*Math.pow(b[1]/a[1],u)}return p[p.length-1][1]}
 // linear vowel points [[t, [F1,F2,F3]], ...]
 function vowAt(v,t){if(t<=v[0][0])return v[0][1];for(var i=1;i<v.length;i++)if(t<=v[i][0]){var a=v[i-1][1],b=v[i][1],u=(t-v[i-1][0])/Math.max(1e-9,v[i][0]-v[i-1][0]);return [a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u,a[2]+(b[2]-a[2])*u]}return v[v.length-1][1]}
 function filt(c,s,x){var y=c[0]*x+c[1]*s[0]+c[2]*s[1]-c[3]*s[2]-c[4]*s[3];s[1]=s[0];s[0]=x;s[3]=s[2];s[2]=y;return y}

 /* ---------------- the render kit: layers mixed into one mono buffer ---------------- */
 function Kit(sr,dur,R){this.sr=sr;this.n=Math.max(1,Math.ceil(sr*dur));this.b=new Float32Array(this.n);this.R=R;this.layers=0}
 var K=Kit.prototype;
 K.r=function(a,b){return a+(b-a)*this.R()};
 K.j=function(x,amt){return x*(1+(this.R()*2-1)*amt)};           // x, nudged by up to +-amt
 // mix a rendered layer into the buffer at time t, scaled so the layer's own peak is g
 K.mix=function(buf,t,g){var o=Math.round((t||0)*this.sr),pk=0,i,v;for(i=0;i<buf.length;i++){v=buf[i]<0?-buf[i]:buf[i];if(v>pk)pk=v}
  if(!(pk>0))return this;var k=(g==null?1:g)/pk;for(i=0;i<buf.length;i++){var j=o+i;if(j>=0&&j<this.n)this.b[j]+=buf[i]*k}this.layers++;return this};
 // filtered noise: {t,a,h,d,g, type 'bp'|'lp'|'hp'|'none', f -> f1 over ft, q, color 'white'|'pink'|'brown',
 //  am [rate, depth] (a steady flutter), grit [rate, depth, smooth] (a random stepped roughness: crunch, rustle, pour)}
 K.noise=function(o){var sr=this.sr,a=Math.max(.0003,o.a||.001),h=o.h||0,d=o.d||.1,L=a+h+d,n=Math.ceil(L*sr),out=new Float32Array(n),R=this.R;
  var type=o.type||'bp',f0=o.f||1000,f1=o.f1||f0,q=o.q||.8,ft=o.ft||L,col=o.color||'white',c=null,s4=[0,0,0,0],p0=0,p1=0,p2=0,br=0;
  var am=o.am,amPh=R()*TAU,gr=o.grit,gv=1,gt=1,gc=0,gs=gr?Math.max(1,Math.round(sr/gr[0])):0,gk=gr&&gr[2]?gr[2]:.05;
  for(var i=0;i<n;i++){var t=i/sr;
   if(type!=='none'&&(i&15)===0)c=biq(type,f0*Math.pow(f1/f0,Math.min(1,t/ft)),q,sr);
   var w=R()*2-1,s;
   if(col==='pink'){p0=.99765*p0+w*.099046;p1=.963*p1+w*.2965164;p2=.57*p2+w*1.0526913;s=(p0+p1+p2+w*.1848)*.25}
   else if(col==='brown'){br=(br+w*.05)*.996;s=br}else s=w;
   if(c)s=filt(c,s4,s);
   var e=env(t,a,h,d);
   if(am)e*=1-am[1]+am[1]*(.5+.5*Math.sin(TAU*am[0]*t+amPh));
   if(gs){if(++gc>=gs){gc=0;gt=1-gr[1]*R()}gv+=(gt-gv)*gk;e*=gv}
   out[i]=s*e}
  return this.mix(out,o.t,o.g)};
 // a tone, sine or triangle (never square or saw): pitch f -> f1 over ft (exponential) or through pts [[t,f],...];
 // vib [rate, depth ratio]; h2 adds a little second harmonic (warmth)
 K.tone=function(o){var sr=this.sr,a=Math.max(.0005,o.a||.002),h=o.h||0,d=o.d||.1,L=a+h+d,n=Math.ceil(L*sr),out=new Float32Array(n);
  var f0=o.f||440,f1=o.f1||f0,ft=o.ft||L,pts=o.pts,ph=0,wave=o.wave||'sine',vib=o.vib,vph=this.R()*TAU,h2=o.h2||0,trem=o.trem;
  for(var i=0;i<n;i++){var t=i/sr,f=pts?ptsAt(pts,t):f0*Math.pow(f1/f0,Math.min(1,t/ft));
   if(vib)f*=1+vib[1]*Math.sin(TAU*vib[0]*t+vph);
   ph+=TAU*f/sr;var s;
   if(wave==='tri'){var x=(ph/TAU)%1;s=x<.5?4*x-1:3-4*x}else s=Math.sin(ph);
   if(h2)s+=h2*Math.sin(2*ph);
   var e=env(t,a,h,d);if(trem)e*=1-trem[1]+trem[1]*(.5+.5*Math.sin(TAU*trem[0]*t));
   out[i]=s*e}
  return this.mix(out,o.t,o.g)};
 // a struck body: decaying sine modes [[freq, amp, seconds to -60 dB], ...] (metal, wood, stone, a bell); pitch scales
 // every mode, det nudges each one, beat adds a slowly beating twin to each (a bell's warmth)
 K.modal=function(o){var sr=this.sr,m=o.modes,pm=o.pitch||1,a=Math.max(.0004,o.a||.0012),L=0,i,k;
  for(k=0;k<m.length;k++)L=Math.max(L,m[k][2]);L+=a;var n=Math.ceil(L*sr),out=new Float32Array(n);
  for(k=0;k<m.length;k++){var twins=o.beat?[0,o.beat]:[0];
   for(var q=0;q<twins.length;q++){var f=m[k][0]*pm*(1+(this.R()*2-1)*(o.det||0))+twins[q];if(f>=sr*.45||f<=0)continue;
    var amp=m[k][1]/twins.length,dec=Math.exp(-6.9/(m[k][2]*sr)),w=TAU*f/sr,cw=Math.cos(w),sw=Math.sin(w),re=1,im=0;
    for(i=0;i<n;i++){var r2=re*cw-im*sw;im=(re*sw+im*cw)*dec;re=r2*dec;var t=i/sr;out[i]+=im*amp*(t<a?t/a:1)}}}
  return this.mix(out,o.t,o.g)};
 // a plucked string (Karplus-Strong, fractional delay): f, d seconds to -60 dB, bright 0..1 (the pluck's colour)
 K.pluck=function(o){var sr=this.sr,f=o.f,d=o.d||1,n=Math.ceil((d+.02)*sr),out=new Float32Array(n),R=this.R;
  var S=16384,ring=new Float64Array(S),Nr=Math.max(2,sr/f-.5),L0=Math.ceil(Nr)+1,lp=0,br=clamp(o.bright==null?.5:o.bright,.03,1),mean=0,i;
  for(i=0;i<L0;i++){lp+=((R()*2-1)-lp)*br;ring[i]=lp;mean+=lp}mean/=L0;for(i=0;i<L0;i++)ring[i]-=mean;
  var rho=Math.pow(.001,1/(d*f)),wi=L0;
  function at(p){var i0=Math.floor(p),fr=p-i0,a0=ring[((i0%S)+S)%S],a1=ring[(((i0+1)%S)+S)%S];return a0+(a1-a0)*fr}
  for(i=0;i<n;i++){var y=rho*.5*(at(wi-Nr)+at(wi-Nr-1));ring[wi%S]=y;wi++;var t=i/sr;out[i]=y*(t<.0015?t/.0015:1)}
  return this.mix(out,o.t,o.g)};
 // a small voice (the creatures): a glottal pulse train on the pitch points through three formant resonators (vowel
 // points [[t,[F1,F2,F3]],...], bandwidths bw), with breath noise, jitter and an optional tremolo (a croak's pulses)
 K.voice=function(o){var sr=this.sr,a=o.a||.02,h=o.h||0,d=o.d||.1,L=a+h+d,n=Math.ceil(L*sr),out=new Float32Array(n),R=this.R;
  var pts=o.pts||[[0,o.f||200]],vow=o.vow||[[0,[700,1200,2600]]],bw=o.bw||[90,120,170],amp=o.amp||[1,.55,.3],br=o.breath||0,jit=o.jit||0,open=o.open||.6,trem=o.trem;
  var ph=0,prev=0,st=[[0,0,0,0],[0,0,0,0],[0,0,0,0]],cs=[null,null,null],jv=0,k;
  for(var i=0;i<n;i++){var t=i/sr;
   if((i&31)===0){jv=(jv+(R()*2-1)*jit*.35)*.85;var F=vowAt(vow,t);for(k=0;k<3;k++)cs[k]=biq('bp',F[k],F[k]/bw[k],sr)}
   ph+=ptsAt(pts,t)*(1+jv)/sr;if(ph>=1)ph-=1;
   var gl=ph<open?(1-Math.cos(TAU*ph/open))*.5:0,src=(gl-prev)*8+(R()*2-1)*br*.25;prev=gl;
   var y=0;for(k=0;k<3;k++)y+=filt(cs[k],st[k],src)*amp[k];
   var e=env(t,a,h,d);if(trem)e*=1-trem[1]+trem[1]*(.5+.5*Math.sin(TAU*trem[0]*t));
   out[i]=y*e}
  return this.mix(out,o.t,o.g)};
 // a creak: stick-slip pulses (r0 -> r1 per second, jittered) ringing a few resonances [[freq, q, amp], ...]
 K.creak=function(o){var sr=this.sr,a=o.a||.03,h=o.h||0,d=o.d||.2,L=a+h+d,n=Math.ceil(L*sr),out=new Float32Array(n),R=this.R;
  var r0=o.r0||30,r1=o.r1||r0,res=o.res||[[400,8,1]],cs=res.map(function(x){return biq('bp',x[0],x[1],sr)}),ss=res.map(function(){return [0,0,0,0]}),next=0,jit=o.jit==null?.25:o.jit;
  for(var i=0;i<n;i++){var t=i/sr,imp=0;
   if(i>=next){imp=.55+.45*R();var r=r0*Math.pow(r1/r0,Math.min(1,t/L));next=i+Math.max(1,Math.round(sr/r*(1+(R()*2-1)*jit)))}
   var y=0;for(var k=0;k<cs.length;k++)y+=filt(cs[k],ss[k],imp)*res[k][2];
   out[i]=y*env(t,a,h,d)}
  return this.mix(out,o.t,o.g)};
 // scattered grains: n tiny filtered noise ticks over span (debris, crackle, splinters); drop:true makes each a rising
 // droplet chirp; bounce (0..1) spaces them like a pebble coming to rest; decay scales each next grain
 K.grains=function(o){var n=o.n||6,span=o.span||.2,t0=o.t||0,g=o.g==null?1:o.g,times=[],i,d=o.d||[.004,.012],f=o.f||[2000,5000];
  if(o.bounce){var b=o.bounce,gap=span*(1-b)/Math.max(1e-6,1-Math.pow(b,n)),tt=t0;for(i=0;i<n;i++){times.push(tt);tt+=gap*this.r(.8,1.2);gap*=b}}
  else{for(i=0;i<n;i++)times.push(t0+this.R()*span);times.sort(function(x,y){return x-y})}
  var amp=1;for(i=0;i<n;i++){var gi=g*amp*this.r(o.minAmp==null?.45:o.minAmp,1);
   if(o.drop){var fd=this.r(f[0],f[1]);this.tone({t:times[i],a:.0008,d:this.r(d[0],d[1]),f:fd,f1:fd*(o.rise||1.7),g:gi})}
   else this.noise({t:times[i],a:.0003,d:this.r(d[0],d[1]),type:o.type||'bp',f:this.r(f[0],f[1]),q:o.q||2,g:gi});
   amp*=o.decay==null?1:o.decay}
  return this};
 // whole-buffer filters and finishing
 K.lp=function(fc,q){var c=biq('lp',fc,q||.707,this.sr),s=[0,0,0,0];for(var i=0;i<this.n;i++)this.b[i]=filt(c,s,this.b[i]);return this};
 K.hp=function(fc,q){var c=biq('hp',fc,q||.707,this.sr),s=[0,0,0,0];for(var i=0;i<this.n;i++)this.b[i]=filt(c,s,this.b[i]);return this};
 K.sat=function(drive){var k=Math.tanh(drive);for(var i=0;i<this.n;i++)this.b[i]=Math.tanh(this.b[i]*drive)/k;return this};
 // a small room (four damped combs and two all-passes): warmth and a short tail for bells, anvils, chimes
 K.room=function(mix,size,damp){size=size||1;damp=damp==null?.35:damp;var sr=this.sr,b=this.b,n=this.n,wet=new Float32Array(n),i;
  [[.0297,.78],[.0371,.77],[.0411,.76],[.0437,.75]].forEach(function(cd){var D=Math.max(1,Math.round(cd[0]*size*sr)),buf=new Float32Array(D),w=0,lp=0;
   for(i=0;i<n;i++){var y=buf[w];lp=y*(1-damp)+lp*damp;buf[w]=b[i]+lp*cd[1];w=(w+1)%D;wet[i]+=y*.25}});
  [.005,.0017].forEach(function(dl){var D=Math.max(1,Math.round(dl*size*sr)),buf=new Float32Array(D),w=0;
   for(i=0;i<n;i++){var bo=buf[w],x=wet[i],y=-.6*x+bo;buf[w]=x+.6*y;w=(w+1)%D;wet[i]=y}});
  for(i=0;i<n;i++)b[i]=b[i]*(1-mix*.35)+wet[i]*mix;return this};
 // a loop: the buffer was rendered xf seconds long past the loop; cross-fade that tail into the head (equal power)
 K.loopify=function(xf){var X=Math.round(xf*this.sr),n=this.n-X,b=this.b;if(X<=0||n<=X)return this;
  for(var i=0;i<X;i++){var u=i/X;b[i]=b[i]*Math.sqrt(u)+b[n+i]*Math.sqrt(1-u)}this.b=b.slice(0,n);this.n=n;return this};
 // finish: no DC, a click-free start and end (unless a loop), then the recipe's loudness: its loudest 50 ms is set to
 // lvl dB against the music (REF, the 2004 set's typical short-term RMS at the default music volume), under a peak ceiling
 K.fin=function(lvl,loop){this.hp(28);var b=this.b,n=this.n,i,pk=0;
  if(!loop){var fi=Math.min(n,Math.round(.0008*this.sr)),fo=Math.min(n,Math.round(.012*this.sr));for(i=0;i<fi;i++)b[i]*=i/fi;for(i=0;i<fo;i++)b[n-1-i]*=i/fo}
  var st=loudness(b,this.sr);for(i=0;i<n;i++){var v=b[i]<0?-b[i]:b[i];if(v>pk)pk=v}
  if(st>0){var k=REF*Math.pow(10,lvl/20)/st;if(pk*k>CEIL)k=CEIL/pk;for(i=0;i<n;i++)b[i]*=k}return this};
 var REF=.05,CEIL=.3;
 // the loudest 50 ms of a buffer (RMS): how loud a short sound is heard
 function loudness(b,sr){var W=Math.max(1,Math.round(.05*sr)),best=0,s=0;for(var i=0;i<b.length;i++){s+=b[i]*b[i];if(i>=W)s-=b[i-W]*b[i-W];if(i>=W-1&&s>best)best=s}
  if(b.length<W){best=s;W=b.length}return Math.sqrt(Math.max(0,best)/W)}

 /* ---------------- the registry ---------------- */
 // def(id, {cat, label, made (what it is made of), dur, lvl (dB vs the music), fn(kit, variant), vars, pv (pitch nudge), gv (gain nudge),
 //  loop, xf, old (the sound it replaced, for the sound board)})
 function def(id,o){o.id=id;if(!DEFS[id])ORDER.push(id);DEFS[id]=o;return o}
 function render(id,sr,v){var d=DEFS[id];if(!d)return null;v=v|0;
  var R=lcg((hash(id)^Math.imul(v+1,0x9e3779b1))>>>0),xf=d.loop?(d.xf||.4):0,k=new Kit(sr||44100,d.dur+xf,R);
  d.fn(k,v);if(d.loop)k.loopify(xf);k.fin(d.lvl==null?-12:d.lvl,!!d.loop);return k.b}

 /* ---------------- playback: one buffer source + one gain node per sound ---------------- */
 var cache=typeof WeakMap!=='undefined'?new WeakMap():null,fallback={ctx:null,m:null};
 var prng=lcg(0x51f0c0de),lastVar={},stats={plays:0,byId:{},last:null,renders:0,renderMs:0,trace:[]};
 function mapFor(ctx){if(cache){var m=cache.get(ctx);if(!m){m={};cache.set(ctx,m)}return m}if(fallback.ctx!==ctx){fallback.ctx=ctx;fallback.m={}}return fallback.m}
 function bufferFor(ctx,id,v){var m=mapFor(ctx),a=m[id]||(m[id]=[]);if(a[v])return a[v];
  var t0=now(),data=render(id,ctx.sampleRate,v),ab=ctx.createBuffer(1,data.length,ctx.sampleRate);
  if(ab.copyToChannel)ab.copyToChannel(data,0);else ab.getChannelData(0).set(data);
  a[v]=ab;stats.renders++;stats.renderMs+=now()-t0;return ab}
 // o: {gain, rate, delay (s), variant, loop, label}
 function play(ctx,dest,id,o){o=o||{};var d=DEFS[id];if(!d||!ctx||!dest)return null;
  var nv=d.vars||3,v=o.variant!=null?o.variant%nv:Math.floor(prng()*nv);if(o.variant==null&&nv>1&&v===lastVar[id])v=(v+1)%nv;lastVar[id]=v;
  var buf=bufferFor(ctx,id,v),src=ctx.createBufferSource(),g=ctx.createGain(),pv=d.pv==null?.03:d.pv,gv=d.gv==null?.12:d.gv;
  src.buffer=buf;src.loop=!!(o.loop||d.loop);
  var rate=(o.rate||1)*(1+(prng()*2-1)*pv),gain=Math.max(0,(o.gain==null?1:o.gain)*(1-gv*prng()));   // a little quieter at most, never louder
  src.playbackRate.value=rate;g.gain.value=gain;src.connect(g);g.connect(dest);
  var at=ctx.currentTime+Math.max(0,o.delay||0);src.start(at);
  stats.plays++;stats.byId[id]=(stats.byId[id]||0)+1;
  stats.last={id:id,variant:v,rate:+rate.toFixed(4),gain:+gain.toFixed(4),at:+at.toFixed(3),nodes:2,loop:src.loop,samples:buf.length,sampleRate:buf.sampleRate,dest:dest.__sfxName||dest.constructor&&dest.constructor.name||'node'};
  stats.trace.push(stats.last);if(stats.trace.length>60)stats.trace.shift();
  return {src:src,gain:g,id:id,variant:v,at:at,duration:buf.duration/rate}}
 // render a few variants ahead (the common sounds, after the first gesture) so a first play never renders on the spot
 function warm(ctx,ids){(ids||[]).forEach(function(id){var d=DEFS[id];if(d)bufferFor(ctx,id,0)})}

 /* ---------------- WAV (tools and the sound board) ---------------- */
 function wav(samples,sr){var n=samples.length,buf=new ArrayBuffer(44+n*2),v=new DataView(buf),p=0;
  function s(str){for(var i=0;i<str.length;i++)v.setUint8(p++,str.charCodeAt(i))}function u32(x){v.setUint32(p,x,true);p+=4}function u16(x){v.setUint16(p,x,true);p+=2}
  s('RIFF');u32(36+n*2);s('WAVE');s('fmt ');u32(16);u16(1);u16(1);u32(sr);u32(sr*2);u16(2);u16(16);s('data');u32(n*2);
  for(var i=0;i<n;i++){var x=clamp(samples[i],-1,1);v.setInt16(p,x<0?x*32768:x*32767,true);p+=2}return buf}
 function measure(samples,sr){var pk=0,ss=0,n=samples.length,last=0;for(var i=0;i<n;i++){var a=samples[i]<0?-samples[i]:samples[i];if(a>pk)pk=a;ss+=samples[i]*samples[i];if(a>.001)last=i}
  return {peak:+pk.toFixed(4),rms:+Math.sqrt(ss/Math.max(1,n)).toFixed(4),seconds:+(n/sr).toFixed(3),audible:+(last/sr).toFixed(3)}}

 return {def:def,DEFS:DEFS,ORDER:ORDER,render:render,play:play,warm:warm,bufferFor:bufferFor,stats:function(){return stats},
  wav:wav,measure:measure,loudness:loudness,REF:REF,CEIL:CEIL,lcg:lcg,hash:hash,Kit:Kit,biq:biq,env:env};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=SfxLib;
