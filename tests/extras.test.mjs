import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/game.ts';
const run=(s,n)=>{for(let i=0;i<n;i++){if(s.event){const i2=s.event.choices.findIndex(c=>!c.cost||E.afford(s,c.cost));E.resolve(s,i2);}E.tick(s);}};
test('version-one saves migrate to version two with extra systems',()=>{const s=E.newGame(9);run(s,10);delete s.extra;s.version=1;const r=E.restore(JSON.stringify(s));assert.equal(r.version,2);assert.ok(r.extra);assert.equal(r.day,s.day);});
test('settler status explains missing beds and low morale',()=>{const s=E.newGame(3);s.morale=40;const st=E.settlerStatus(s);assert.equal(st.ok,false);assert.ok(st.reasons.some(r=>/bed/.test(r)));assert.ok(st.reasons.some(r=>/65/.test(r)));});
test('raids resolve, requests appear, and saves round-trip over a long game',()=>{const s=E.newGame(21);run(s,80);assert.ok(s.extra.raidsWon+s.extra.raidsLost>=2);assert.deepEqual(E.restore(JSON.stringify(s)),s);});
test('requests can be fulfilled once; era goals claim once',()=>{const s=E.newGame(5);s.extra.requests.push({id:'x',person:s.people[0].id,kind:'deliver',resource:'food',amount:5,reward:{coins:10},morale:3,due:99,text:'t'});assert.equal(E.fulfilRequest(s,'x'),'');assert.match(E.fulfilRequest(s,'x'),/no longer/);s.extra.raidsWon=5;assert.equal(E.claimEraGoal(s,'e0-def'),'');assert.match(E.claimEraGoal(s,'e0-def'),/not ready/);});
test('town rank and rankings are computed',()=>{const s=E.newGame(1);assert.ok(E.townRank(s).name);assert.equal(E.rankings(s).length,4);});
