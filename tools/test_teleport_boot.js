'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const ctx={ITEMS:{},setInterval(){return 1;},clearInterval(){}};
vm.runInNewContext(fs.readFileSync('src/item_teleport_tabs.js','utf8'),ctx);
assert(ctx.ITEMS.home_tab&&ctx.ITEMS.home_tab.stack,'tablet definition must exist before delayed UI/Admin hooks');
console.log('[TELEPORT_BOOT] 1/1 passed');
