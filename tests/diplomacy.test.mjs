import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/game.ts';
const run=(s,n)=>{for(let i=0;i<n;i++){if(s.event){const i2=s.event.choices.findIndex(c=>!c.cost||E.afford(s,c.cost));E.resolve(s,i2);}E.tick(s);}};
test('version-two saves migrate to version three with neutral neighbours',()=>{const s=E.newGame(4);run(s,6);delete s.diplomacy;s.version=2;const r=E.restore(JSON.stringify(s));assert.equal(r.version,3);assert.deepEqual([0,1,2].map(i=>E.status(r,i)).filter(x=>x!=='neutral'&&x!=='hostile'),[]);});
test('invalid diplomacy is rejected',()=>{const s=E.newGame(4);s.diplomacy.neighbours[0].treaty='empire';assert.throws(()=>E.restore(JSON.stringify(s)));});
test('treaties expire and break when relations fall',()=>{const s=E.newGame(4);const n=s.diplomacy.neighbours;n[0].treaty='trade';n[0].until=s.day+1;n[1].treaty='alliance';n[1].until=999;s.relations[1]=10;run(s,2);assert.equal(n[0].treaty,'none');assert.equal(n[1].treaty,'none');});
