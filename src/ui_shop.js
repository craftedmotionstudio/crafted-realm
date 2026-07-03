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
