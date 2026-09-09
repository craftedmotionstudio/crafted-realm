'use strict';
const assert=require('assert');
const p=require('../src/qa_profile.js');
assert.strictEqual(p.resolve({hostname:'127.0.0.1',search:'?qaProfile=a'}).key,'motionscape_save__qa_a');
assert.strictEqual(p.resolve({hostname:'game.example',search:'?qaProfile=a'}).key,'motionscape_save');
assert.strictEqual(p.resolve({hostname:'localhost',search:'?qaProfile=../bad'}).isolated,false);
console.log('[QA PROFILE] PASS');
