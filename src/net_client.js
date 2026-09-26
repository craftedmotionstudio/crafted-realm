/* ============ CRNet — the online client's connection (W2) ============
 * One WebSocket to the authoritative server, speaking docs/rebuild/NET_PROTOCOL.md v1:
 *   hello -> register / login -> welcome -> a tick every 600 ms; intents out; ping every 10 s (the server logs out a
 *   client that is silent for 60 s); logout -> the server says when (the 16-tick combat lock).
 * Reconnect (2004 rules): if the socket drops while in the world, the adventurer stays standing on the server. We keep
 * the credentials in memory only (never stored) and log in again every 2 s; the server re-attaches the same adventurer
 * (welcome.reconnected) as long as it has not logged them out, so the logout lock still holds after a reconnect.
 * Presentation-free: the online UI and world listen with on(type, fn). UMD so tools/test_online_client.js can drive it
 * with a fake socket.
 */
(function(root,factory){var api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.CRNet=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 var VERSION=1;
 var PING_MS=10000, RECONNECT_MS=2000, RECONNECT_TRIES=15;

 function Client(opts){
  var o=opts||{};
  this.url=o.url;
  this.WS=o.WebSocket||(typeof WebSocket!=='undefined'?WebSocket:null);
  this.timers=o.timers||{set:function(f,ms){return setInterval(f,ms)},clear:function(h){clearInterval(h)},once:function(f,ms){return setTimeout(f,ms)},cancel:function(h){clearTimeout(h)}};
  this.now=o.now||function(){return Date.now()};
  this.handlers={};
  this.ws=null;this.state='idle';
  this.tickMs=600;this.lastTick=-1;this.lastTickAt=0;this.rtt=null;this.pingN=0;this.pingSent={};
  this.creds=null;this.look=null;this.loggedOutReason=null;this.reconnectTries=0;this.reconnecting=false;
  this.pending=null;           // {kind, resolve}
  this.pingTimer=null;this.retryTimer=null;
  this.stats={sent:0,received:0,ticks:0,gaps:0,maxGapMs:0,reconnects:0,errors:[]};
 }
 Client.prototype.on=function(type,fn){(this.handlers[type]=this.handlers[type]||[]).push(fn);return this};
 Client.prototype.emit=function(type,a,b){var hs=this.handlers[type];if(!hs)return;for(var i=0;i<hs.length;i++){try{hs[i](a,b)}catch(e){if(typeof console!=='undefined')console.error('[CRNet] '+type+' handler',e)}}};

 /** open the socket and say hello; resolves with the server's hello */
 Client.prototype.connect=function(){
  var self=this;
  if(!this.WS)return Promise.reject(new Error('WebSocket unavailable'));
  this.close(true);
  this.state='connecting';
  return new Promise(function(resolve,reject){
   var ws;
   try{ws=new self.WS(self.url)}catch(e){self.state='idle';reject(e);return}
   self.ws=ws;
   var settled=false;
   ws.onopen=function(){ws.send(JSON.stringify({t:'hello',v:VERSION,client:'crafted-realm-web'}))};
   ws.onmessage=function(ev){
    var m;try{m=JSON.parse(typeof ev.data==='string'?ev.data:String(ev.data))}catch(e){return}
    if(!settled&&m.t==='hello'){settled=true;self.state='hello';self.tickMs=m.tickMs||600;self.startPings();resolve(m);return}
    if(!settled&&m.t==='error'){settled=true;reject(Object.assign(new Error(m.text||m.code),{code:m.code,need:m.need}));return}
    self.onMessage(m);
   };
   ws.onerror=function(){if(!settled){settled=true;self.state='idle';reject(Object.assign(new Error('Could not reach the game server.'),{code:'unreachable'}))}};
   ws.onclose=function(){if(!settled){settled=true;self.state='idle';reject(Object.assign(new Error('The game server closed the connection.'),{code:'closed'}))}self.onClose(ws)};
  });
 };
 Client.prototype.sendRaw=function(obj){
  if(!this.ws||this.ws.readyState!==1)return false;
  try{this.ws.send(JSON.stringify(obj));this.stats.sent++;return true}catch(e){return false}
 };
 /** an in-game intent ({t:'walk', x, z}, ...); refused unless we are in the world */
 Client.prototype.send=function(intent){if(this.state!=='game')return false;return this.sendRaw(intent)};
 Client.prototype.request=function(kind,msg){
  var self=this;
  return new Promise(function(resolve){
   if(self.pending)self.pending.resolve({t:'auth_fail',code:'busy',text:'Another request is still running.'});
   self.pending={kind:kind,resolve:resolve};
   if(!self.sendRaw(msg)){self.pending=null;resolve({t:'auth_fail',code:'unreachable',text:'Not connected to the game server.'})}
  });
 };
 Client.prototype.register=function(user,pass){return this.request('register',{t:'register',user:user,pass:pass})};
 /** resolves with the welcome (and keeps the credentials in memory for reconnects) or an auth_fail */
 Client.prototype.login=function(user,pass,look){
  var self=this;
  var msg={t:'login',user:user,pass:pass};if(look)msg.look=look;
  this.state='auth';
  return this.request('login',msg).then(function(m){
   if(m.t==='welcome'){self.creds={user:user,pass:pass};self.look=look||null;self.loggedOutReason=null;self.reconnectTries=0}
   else if(self.state==='auth')self.state='hello';
   return m;
  });
 };
 Client.prototype.logout=function(){return this.send({t:'logout'})};

 Client.prototype.onMessage=function(m){
  this.stats.received++;
  switch(m.t){
   case 'register_ok':if(this.pending&&this.pending.kind==='register'){var p=this.pending;this.pending=null;p.resolve(m)}return;
   case 'auth_fail':if(this.pending){var q=this.pending;this.pending=null;q.resolve(m)}this.emit('auth_fail',m);return;
   case 'welcome':
    this.state='game';this.tickMs=m.tickMs||this.tickMs;this.lastTick=m.tick;this.lastTickAt=this.now();
    if(this.pending&&this.pending.kind==='login'){var r=this.pending;this.pending=null;r.resolve(m)}
    this.emit('welcome',m);return;
   case 'tick':{
    var now=this.now();
    if(this.lastTickAt){var gap=now-this.lastTickAt;if(gap>this.stats.maxGapMs)this.stats.maxGapMs=gap}
    if(this.lastTick>=0&&m.n!==this.lastTick+1)this.stats.gaps++;
    this.lastTick=m.n;this.lastTickAt=now;this.stats.ticks++;
    this.emit('tick',m);return}
   case 'pong':if(this.pingSent[m.n]!=null){this.rtt=this.now()-this.pingSent[m.n];delete this.pingSent[m.n]}this.emit('pong',m);return;
   case 'logout':this.loggedOutReason=m.reason||'logout';this.creds=null;this.emit('logout',m);return;
   case 'error':this.stats.errors.push(m.code);if(this.stats.errors.length>50)this.stats.errors.shift();this.emit('error',m);return;
   default:this.emit(m.t,m);
  }
 };
 Client.prototype.startPings=function(){
  var self=this;if(this.pingTimer)this.timers.clear(this.pingTimer);
  this.pingTimer=this.timers.set(function(){var n=++self.pingN;self.pingSent[n]=self.now();self.sendRaw({t:'ping',n:n})},PING_MS);
 };
 Client.prototype.onClose=function(ws){
  if(ws!==this.ws)return;
  var wasGame=this.state==='game'||this.reconnecting;
  if(this.pingTimer){this.timers.clear(this.pingTimer);this.pingTimer=null}
  this.ws=null;
  if(this.pending){var p=this.pending;this.pending=null;p.resolve({t:'auth_fail',code:'closed',text:'The connection closed.'})}
  if(this.loggedOutReason||this.closing){this.state='closed';this.emit('closed',{reason:this.loggedOutReason||'client'});return}
  this.state='idle';
  if(wasGame&&this.creds){this.emit('dropped',{});this.scheduleReconnect()}
  else this.emit('closed',{reason:'dropped'});
 };
 Client.prototype.scheduleReconnect=function(){
  var self=this;
  if(this.retryTimer)return;
  if(this.reconnectTries>=RECONNECT_TRIES){this.reconnecting=false;this.emit('reconnect_failed',{});return}
  this.reconnecting=true;
  this.retryTimer=this.timers.once(function(){
   self.retryTimer=null;self.reconnectTries++;
   var creds=self.creds;if(!creds){self.reconnecting=false;return}
   self.connect().then(function(){return self.login(creds.user,creds.pass,self.look)}).then(function(m){
    if(m&&m.t==='welcome'){self.reconnecting=false;self.stats.reconnects++;self.emit('reconnected',m)}
    else if(m&&m.code==='already_online'){self.close(true);self.scheduleReconnect()}   // the old socket is still being noticed as gone
    else{self.reconnecting=false;self.emit('reconnect_failed',m||{})}
   },function(){self.scheduleReconnect()});
  },RECONNECT_MS);
 };
 /** close without reconnecting (quiet: no 'closed' event) */
 Client.prototype.close=function(quiet){
  if(this.retryTimer){this.timers.cancel(this.retryTimer);this.retryTimer=null}
  if(this.pingTimer){this.timers.clear(this.pingTimer);this.pingTimer=null}
  var ws=this.ws;this.ws=null;
  if(ws){this.closing=!quiet;try{ws.onclose=null;ws.close()}catch(e){}}
  this.closing=false;
  if(!quiet&&ws)this.emit('closed',{reason:'client'});
 };
 /** test hook: drop the socket as if the network failed (the server keeps the adventurer; we reconnect) */
 Client.prototype.simulateDrop=function(){var ws=this.ws;if(!ws)return false;try{ws.close()}catch(e){}return true};

 return {Client:Client,VERSION:VERSION,PING_MS:PING_MS,RECONNECT_MS:RECONNECT_MS};
});
