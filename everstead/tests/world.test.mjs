import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/game.ts';
function advance(s,n){for(let i=0;i<n;i++){if(s.event)E.resolve(s,s.event.choices.findIndex(c=>!c.cost||E.afford(s,c.cost)));E.tick(s);}}

test('economic cycles change demand without locking sectors together',()=>{
 const s=E.newGame(919), phases=new Set(), spreads=new Set();
 assert.ok(s.world,'new settlements need persistent world conditions');
 for(let i=0;i<160;i++){advance(s,1);phases.add(s.world.phase);spreads.add(JSON.stringify(s.world.demand));}
 assert.ok(phases.size>=4);assert.ok(spreads.size>=5);
 assert.ok(new Set(Object.values(s.world.demand)).size>1);
});
test('rival influence reduces sale proceeds and diplomacy offsets it',()=>{
 const s=E.newGame(1);s.rivalGrowth=[500,500,500];s.relations=[0,0,0];const hostile=E.price(s,'wood',false);
 s.relations=[100,100,100];assert.ok(E.price(s,'wood',false)>hostile);
});
test('all market phases preserve buy/sell spreads',()=>{
 const s=E.newGame(52);assert.ok(s.world);
 for(const phase of ['Boom','Growth','Stable','Slowdown','Recession','Recovery']){
  s.world.phase=phase;for(const r of ['food','water','wood','ore','tools']){
   s.stock.coins=10000;E.trade(s,r,true);E.trade(s,r,false);assert.ok(s.stock.coins<10000);
  }
 }
});
test('helping a traveller leads to a delayed return and survives saving',()=>{
 const s=E.newGame(8);s.event=structuredClone(E.EVENTS.find(e=>e.key==='traveler'));
 assert.equal(E.resolve(s,0),'');assert.ok(s.world?.pending.length,'choice should schedule a follow-up');
 const restored=E.restore(JSON.stringify(s));let found=false;
 for(let i=0;i<12;i++){advance(restored,1);if(restored.event?.key==='returning-family'){found=true;break;}}
 assert.ok(found);assert.ok(restored.event.choices.some(c=>!c.cost));
});
test('seasonal ambitions track new activity and pay once, then renew',()=>{
 const s=E.newGame(4);assert.equal(typeof E.seasonalGoals,'function');
 let g=E.seasonalGoals(s)[0];assert.equal(g.progress,0);assert.notEqual(E.claimSeasonGoal(s,g.id),'');
 s.stats.traded+=1000;s.stats.built+=1000;s.stats.crafted+=1000;s.completed+=1000;
 g=E.seasonalGoals(s)[0];assert.equal(g.done,true);assert.equal(E.claimSeasonGoal(s,g.id),'');
 const before=structuredClone(s.stock);assert.notEqual(E.claimSeasonGoal(s,g.id),'');assert.deepEqual(s.stock,before);
 const ids=E.seasonalGoals(s).map(g=>g.id);advance(s,12);
 assert.ok(E.seasonalGoals(s).every(g=>!ids.includes(g.id)&&g.progress===0));
});
test('old version-one saves retain progress and acquire world state',()=>{
 const s=E.newGame(4);advance(s,8);delete s.world;const restored=E.restore(JSON.stringify(s));
 assert.ok(restored.world);assert.deepEqual(restored.stock,s.stock);assert.equal(restored.day,s.day);
});
test('invalid story effects cannot poison the simulation',()=>{
 for(const change of [c=>c.morale='bad',c=>c.buff={kind:'harvest',days:-9},c=>c.relation={},c=>c.follow='missing-story',c=>c.cost={coins:-99}]){
  const s=E.newGame(5);s.event=structuredClone(E.EVENTS[0]);change(s.event.choices[0]);assert.throws(()=>E.restore(JSON.stringify(s)));
 }
});
test('save import rejects overstaffed jobs and inconsistent expedition teams',()=>{
 const s=E.newGame(6),farm=s.buildings.find(b=>b.kind==='farm');s.people[0].job=farm.id;
 assert.throws(()=>E.restore(JSON.stringify(s)));
 const t=E.newGame(6);assert.equal(E.depart(t,'grove',[t.people[0].id,t.people[7].id],true),'');
 t.people[0].away=null;assert.throws(()=>E.restore(JSON.stringify(t)));
});
test('town event cooldown prevents recent stories from recurring',()=>{
 const s=E.newGame(88),seen=[];let iterations=0;
 while(seen.length<22&&iterations++<250){advance(s,1);if(s.event&&E.EVENTS.some(e=>e.key===s.event.key)){
  assert.ok(!seen.slice(-8).includes(s.event.key));seen.push(s.event.key);
 }}
 assert.ok(seen.length>=22);
});
