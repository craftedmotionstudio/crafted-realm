/* ================= UI: bank + shop interfaces =================
   Extracted verbatim from game4_ui.js (zero behaviour change) to trim the big-three
   file. Loads AFTER game4_ui.js (which defines `UI` and the shared `slotEl` slot
   builder) and ui_map.js, and BEFORE the wrappers in qol_ui.js / item_tags.js /
   tutorial_ext.js that decorate UI.openBank / slotEl. Both `slotEl` and `UI.refreshInv`
   are referenced by name at call time, so runtime reachability is all that matters. */
UI.openBank = function(announce=true){
    const bg=document.getElementById('bank-grid'); bg.innerHTML='';
    Player.bank.forEach((s,i)=>{
      const def=ITEMS[s.id];
      bg.appendChild(slotEl(s, ()=>{
        if(Player.addItem(s.id, def.stack?s.qty:1)){
          if(def.stack || s.qty===1) Player.bank.splice(i,1); else s.qty--;
          UI.openBank(false); }
      }, undefined, true));   // the vault stacks everything — always show the count
    });
    if(!Player.bank.length) bg.innerHTML='<i style="grid-column:1/-1;color:#9a8e78">Your vault is empty.</i>';
    const ig=document.getElementById('bank-inv-grid'); ig.innerHTML='';
    Player.inv.forEach((s,i)=>{
      ig.appendChild(slotEl(s, s?()=>{
        const ex=Player.bank.find(b=>b.id===s.id);
        if(ex) ex.qty+=s.qty; else Player.bank.push({id:s.id, qty:s.qty});
        Player.inv[i]=null; UI.refreshInv(); UI.openBank(false);
      }:null));
    });
    document.getElementById('bank-modal').style.display='block';
    if(announce && typeof Events!=='undefined') Events.emit('modalOpened', {id:'bank-modal'});
    if(announce) Sfx.coin();
  };
UI.currentShop='bazaar';
UI.openShop = function(shopKey, announce=true){
    if(shopKey===false){ announce=false; shopKey=this.currentShop; }   // legacy refresh call
    if(typeof shopKey==='string') this.currentShop=shopKey;
    const shop = SHOPS[this.currentShop] || SHOPS.bazaar;
    const DEF=10;
    if(!shop._q){ shop._q={}; shop.stock.forEach(st=>shop._q[st.id]=DEF); }
    const sprice=(base,q)=>Math.max(1, Math.round(base*(1+(DEF-q)*0.03)));   // scarcer stock = dearer
    const t=document.getElementById('shop-title'); if(t) t.textContent=shop.name;
    const sg=document.getElementById('shop-grid'); sg.innerHTML='';
    shop.stock.forEach(st=>{
      const q=shop._q[st.id]!==undefined?shop._q[st.id]:DEF;
      sg.appendChild(slotEl({id:st.id, qty:1}, ()=>{
        const cq=shop._q[st.id]!==undefined?shop._q[st.id]:DEF;
        if(cq<=0){ UI.chat('The shopkeeper is out of stock of that.','plain'); return; }
        const p=sprice(st.price, cq);
        if(Player.count('coins')<p){ UI.chat('You don\'t have enough crowns for that.','plain'); return; }
        Player.removeItem('coins',p); Player.addItem(st.id,1); shop._q[st.id]=cq-1; Sfx.coin();
        UI.chat(`You buy a ${ITEMS[st.id].name.toLowerCase()} for ${p} crowns.`,'loot');
        UI.openShop(false);
      }, sprice(st.price, q)));
    });
    const ig=document.getElementById('shop-inv-grid'); ig.innerHTML='';
    Player.inv.forEach((s,i)=>{
      if(s && s.id==='coins'){ ig.appendChild(slotEl(s,null)); return; }
      ig.appendChild(slotEl(s, s?()=>{
        const def=ITEMS[s.id];
        const price=Math.max(1,Math.floor(def.value/2));
        Player.inv[i] = (def.stack && s.qty>1) ? {id:s.id, qty:s.qty-1} : null;
        Player.addItem('coins',price); Sfx.coin();
        if(shop._q && shop._q[s.id]!==undefined) shop._q[s.id]=Math.min(DEF*2, shop._q[s.id]+1);
        UI.chat(`You sell the ${def.name.toLowerCase()} for ${price} crowns.`,'loot'); UI.refreshInv();
        UI.openShop(false);
      }:null));
    });
    document.getElementById('shop-modal').style.display='block';
    if(announce && typeof Events!=='undefined') Events.emit('modalOpened', {id:'shop-modal'});
    if(announce) Sfx.coin();
  };

/* ---- the old-school slot menus (src/osrs_menu_items.js): Withdraw-/Deposit-N, Value, Buy-N / Sell-N ----
   Same rules as the clicks above (the vault stacks everything; the shop's scarcity price; sell at half value),
   n may be Infinity (All). Each returns how many moved. */
UI.bankWithdraw = function(i, n){
  const s=Player.bank[i]; if(!s) return 0;
  const def=ITEMS[s.id]||{};
  let want=Math.min(n===Infinity?s.qty:n, s.qty);
  if(!def.stack){ const free=Player.inv.filter(x=>!x).length;
    if(!free){ UI.chat('Your pack is full.','plain'); return 0; } want=Math.min(want, free); }
  if(want<=0 || !Player.addItem(s.id, want)) return 0;
  s.qty-=want; if(s.qty<=0) Player.bank.splice(Player.bank.indexOf(s),1);
  UI.openBank(false); return want;
};
UI.bankDeposit = function(i, n){
  const s=Player.inv[i]; if(!s) return 0;
  const id=s.id, def=ITEMS[id]||{}; let moved=0;
  if(def.stack){ moved=Math.min(n===Infinity?s.qty:n, s.qty); s.qty-=moved; if(s.qty<=0) Player.inv[i]=null; }
  else { const order=[i].concat(Player.inv.map((x,j)=>j).filter(j=>j!==i));
    for(const j of order){ if(moved>=n) break; const x=Player.inv[j]; if(x&&x.id===id){ Player.inv[j]=null; moved+=x.qty||1; } } }
  if(!moved) return 0;
  const ex=Player.bank.find(b=>b.id===id); if(ex) ex.qty+=moved; else Player.bank.push({id, qty:moved});
  UI.refreshInv(); UI.openBank(false); return moved;
};
UI._shopState = function(){
  const shop=SHOPS[this.currentShop]||SHOPS.bazaar, DEF=10;
  if(!shop._q){ shop._q={}; shop.stock.forEach(st=>shop._q[st.id]=DEF); }
  return {shop, DEF, price:(base,q)=>Math.max(1, Math.round(base*(1+(DEF-q)*0.03)))};
};
UI.shopValue = function(id){
  const {shop,DEF,price}=this._shopState(), st=shop.stock.find(x=>x.id===id); if(!st) return null;
  const p=price(st.price, shop._q[id]!==undefined?shop._q[id]:DEF);
  UI.chat(`${ITEMS[id].name}: currently costs ${p} crowns.`,'plain'); return p;
};
UI.shopBuy = function(id, n){
  const def=ITEMS[id]||{name:id}; let got=0, spent=0;
  for(let k=0;k<n;k++){
    const {shop,DEF,price}=this._shopState(), st=shop.stock.find(x=>x.id===id); if(!st) break;
    const cq=shop._q[id]!==undefined?shop._q[id]:DEF;
    if(cq<=0){ UI.chat('The shopkeeper is out of stock of that.','plain'); break; }
    const p=price(st.price, cq);
    if(Player.count('coins')<p){ UI.chat('You don\'t have enough crowns for that.','plain'); break; }
    if(!def.stack && !Player.inv.some(s=>!s) && Player.count('coins')!==p){ UI.chat('Your pack is full.','plain'); break; }
    Player.removeItem('coins',p); if(!Player.addItem(id,1)){ Player.addItem('coins',p); break; }
    shop._q[id]=cq-1; got++; spent+=p;
  }
  if(got){ Sfx.coin(); UI.chat(got===1?`You buy a ${def.name.toLowerCase()} for ${spent} crowns.`:`You buy ${got} ${def.name.toLowerCase()} for ${spent} crowns.`,'loot'); }
  UI.openShop(false); return got;
};
UI.shopSellValue = function(id){
  const def=ITEMS[id]||{name:id}, p=Math.max(1,Math.floor((def.value||0)/2));
  UI.chat(`${def.name}: the shop will buy it for ${p} crowns.`,'plain'); return p;
};
UI.shopSell = function(i, n){
  const s0=Player.inv[i]; if(!s0 || s0.id==='coins') return 0;
  const id=s0.id, def=ITEMS[id]||{name:id}, {shop,DEF}=this._shopState(), price=Math.max(1,Math.floor((def.value||0)/2));
  let sold=0;
  while(sold<n){
    const j=(Player.inv[i]&&Player.inv[i].id===id)?i:Player.inv.findIndex(x=>x&&x.id===id); if(j<0) break;
    const s=Player.inv[j];
    Player.inv[j]=(def.stack && s.qty>1) ? {id, qty:s.qty-1} : null;
    Player.addItem('coins',price); sold++;
    if(shop._q && shop._q[id]!==undefined) shop._q[id]=Math.min(DEF*2, shop._q[id]+1);
  }
  if(sold){ Sfx.coin(); UI.chat(sold===1?`You sell the ${def.name.toLowerCase()} for ${price} crowns.`:`You sell ${sold} ${def.name.toLowerCase()} for ${price*sold} crowns.`,'loot'); }
  UI.refreshInv(); UI.openShop(false); return sold;
};
