import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/game.ts';
test('corrupt saved progress is retained for recovery instead of auto-overwritten',async()=>{
 const {readSave}=await import('../src/save.ts');
 const corrupt='{"version":1,"day":400,"stock":null}';
 const result=readSave(()=>corrupt);
 assert.equal(result.blocked,true);assert.equal(result.recovery,corrupt);assert.ok(result.warning);
});
test('valid saved progress resumes and storage errors disable auto-save',async()=>{
 const {readSave}=await import('../src/save.ts');const s=E.newGame(45);
 assert.deepEqual(readSave(()=>JSON.stringify(s)).game,s);
 assert.equal(readSave(()=>{throw new Error('Storage denied')}).blocked,true);
 assert.equal(readSave(()=>null).blocked,false);
});
