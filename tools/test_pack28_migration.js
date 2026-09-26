#!/usr/bin/env node
/* The 2004 backpack (owner decision 2026-09-25): 28 slots. A save from the 24-slot pack loads with every item in the
 * slot it had and four empty slots after; a full 28-slot pack round-trips; junk entries become empty slots.
 * Runs SaveGame.migrateInv from src/ui_save.js in a vm. */
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const ctx={console};vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname,'..','src','ui_save.js'),'utf8')+'\n;globalThis.__S=SaveGame;',ctx);
const S=ctx.__S;let n=0;
const old=Array.from({length:24},(_,i)=>i%5===4?null:{id:'item'+i,qty:i+1});
const m=S.migrateInv(old);
assert.strictEqual(m.length,28,'28 slots');n++;
old.forEach((s,i)=>assert.deepStrictEqual(m[i],s,'slot '+i+' kept'));n++;
assert.deepStrictEqual(m.slice(24),[null,null,null,null],'four new empty slots');n++;
const full=Array.from({length:28},(_,i)=>({id:'x'+i,qty:1}));assert.deepStrictEqual(S.migrateInv(full),full,'a full 28-slot pack round-trips');n++;
assert.deepStrictEqual(S.migrateInv([{id:'a',qty:1},{},0,null]).slice(0,4),[{id:'a',qty:1},null,null,null],'junk entries become empty slots');n++;
assert.strictEqual(S.migrateInv(undefined).length,28,'a missing pack is 28 empty slots');n++;
console.log('[PACK28] '+n+'/6 checks passed: 24-slot saves keep every item in its slot and gain four empty slots');
