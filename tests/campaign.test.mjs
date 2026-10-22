import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/game.ts';

// Uses only player actions: no resource injection, research shortcuts or clock edits.
function campaign(seed){
 const s=E.newGame(seed);s.policy='generous';
 const thresholds={food:90,water:120,wood:400,ore:200,tools:110};
 const build=(kind,district='riverside')=>{
  if(!s.roads.includes(district))E.connect(s,district);
  if(s.buildings.filter(b=>b.district===district).length>=12)district=s.roads.find(d=>s.buildings.filter(b=>b.district===d).length<12)??district;
  return E.build(s,kind,district)==='';
 };
 const staff=()=>{
  for(const p of s.people)if(p.away===null&&!p.injury)E.assign(s,p.id,null);
  const demands=[['food',s.people.length*.3],['water',s.people.length*.2],['wood',5],['ore',3],['tools',1],['knowledge',4],['coins',8]];
  for(let round=0;round<4;round++)for(const [resource,target] of demands){
   while(E.production(s).out[resource]<target){
    const b=s.buildings.filter(b=>E.BUILDINGS[b.kind].output?.[resource]&&s.people.filter(p=>p.job===b.id).length<E.BUILDINGS[b.kind].slots).sort((a,b)=>b.level-a.level)[0];
    if(!b)break;
    const skill=E.BUILDINGS[b.kind].skill;
    const p=s.people.filter(p=>p.job===null&&p.away===null&&!p.injury).sort((a,b)=>b.skills[skill]-a.skills[skill])[0];
    if(!p)break;E.assign(s,p.id,b.id);
   }
  }
  for(const p of s.people.filter(p=>p.job===null&&p.away===null&&!p.injury)){
   const b=s.buildings.filter(b=>E.BUILDINGS[b.kind].slots>s.people.filter(p=>p.job===b.id).length&&['market','study','lumber','quarry','workshop'].includes(b.kind)).sort((a,b)=>Number(b.kind==='market')-Number(a.kind==='market'))[0];
   if(b)E.assign(s,p.id,b.id);
  }
 };
 for(let day=0;day<800;day++){
  if(s.event){
   let choice=s.event.choices.map((c,i)=>({i,c,score:Object.entries(c.gain??{}).reduce((n,[r,v])=>n+v*(r==='relics'?70:r==='tools'?6:r==='knowledge'?2:r==='coins'?1:.4),0)+(c.morale??0)*3+(c.relation??0)-Object.entries(c.cost??{}).reduce((n,[r,v])=>n+v*(r==='relics'?100:r==='tools'?6:r==='coins'?.6:.3),0)})).filter(x=>!x.c.cost||E.afford(s,x.c.cost)).sort((a,b)=>b.score-a.score)[0];
   E.resolve(s,choice.i);
  }
  for(const o of E.objectives(s))if(o.done)E.claim(s,o.id);
  for(const g of E.seasonalGoals(s))if(g.done)E.claimSeasonGoal(s,g.id);
  for(const r of ['food','water','wood','ore','tools'])while(s.stock[r]>thresholds[r]+10)E.trade(s,r,false);
  for(const c of [...s.contracts])if(s.stock[c.resource]>c.amount+thresholds[c.resource]*.25)E.fulfill(s,c.id);
  if(s.age<3)E.advanceAge(s);
  if(s.stock.food<25||s.stock.water<25)E.forage(s);
  if(s.stock.food<30&&s.stock.coins>80)E.trade(s,'food',true);
  if(s.stock.water<30&&s.stock.coins>80)E.trade(s,'water',true);
  if(E.beds(s)<28&&E.beds(s)<=s.people.length+2)build('cottage');
  for(const [kind,district]of [['quarry','heights'],['workshop','riverside'],['market','riverside'],['greenhouse','woodland']]){
   if(!s.buildings.some(b=>b.kind===kind)&&s.stock.coins>130)build(kind,district);
  }
  if(s.people.length>=12&&s.buildings.filter(b=>b.kind==='farm').length<2&&s.stock.coins>100)build('farm');
  if(s.people.length>=16&&s.buildings.filter(b=>b.kind==='study').length<2&&s.stock.coins>180)build('study');
  if(s.people.length>=20&&s.buildings.filter(b=>b.kind==='well').length<2&&s.stock.coins>120)build('well');
  for(const b of s.buildings)if(b.level<Math.min(3,s.age+1)&&s.stock.coins>350&&b.kind!=='cottage')E.upgrade(s,b.id);
  if(!s.research){const next=E.TECH.find(t=>!s.tech.includes(t.id)&&t.age<=s.age&&t.requires.every(r=>s.tech.includes(r))&&E.afford(s,t.cost));if(next)E.startResearch(s,next.id);}
  staff();
  if(s.people.length>=12&&s.tech.includes('maps')&&s.trips.length<1&&s.stock.food>55&&s.stock.tools>5){
   const team=s.people.filter(p=>p.away===null&&!p.injury&&p.job!==s.buildings.find(b=>b.kind==='well')?.id&&p.job!==s.buildings.find(b=>b.kind==='farm')?.id).sort((a,b)=>b.skills.exploring-a.skills.exploring).slice(0,2).map(p=>p.id);
   E.depart(s,s.tech.includes('archives')?'islands':'archive',team,true);
  }
  if(s.tech.includes('legacy')&&build('beacon','woodland'))return s;
  assert.equal(E.tick(s),'');
  if(day%31===0)assert.deepEqual(E.restore(JSON.stringify(s)),s,'a legal campaign must remain loadable');
 }
 assert.fail(`Campaign stalled: ${JSON.stringify({seed,day:s.day,age:s.age,pop:s.people.length,tech:s.tech,stock:s.stock,buildings:s.buildings.map(b=>b.kind),morale:s.morale})}`);
}
test('three legal campaigns reach the Great Beacon without injected resources',()=>{
 for(const seed of [17,314,919]){const s=campaign(seed);assert.equal(s.age,3);assert.ok(s.buildings.some(b=>b.kind==='beacon'));console.log(`Seed ${seed}: Great Beacon on day ${s.day}`);}
});
