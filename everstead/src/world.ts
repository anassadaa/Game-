import type {Cost, Game, Resource, Story, Trip} from './game.ts';

export const PHASES = ['Boom','Growth','Stable','Slowdown','Recession','Recovery'] as const;
export type Phase = typeof PHASES[number];
type Metric = 'built'|'traded'|'crafted'|'completed';
type Goal = {id:string; metric:Metric; start:number; target:number; claimed:boolean};
export type World = {
 phase:Phase; nextCycle:number; nextEvent:number;
 demand:Record<'food'|'water'|'wood'|'ore'|'tools',number>;
 pending:{key:string;due:number}[]; seasonIndex:number; goals:Goal[];
};
const revenue:Record<Phase,number> = {Boom:1.18,Growth:1.08,Stable:1,Slowdown:.94,Recession:.86,Recovery:1.03};
const market:Record<Phase,number> = {Boom:1.18,Growth:1.10,Stable:1,Slowdown:.93,Recession:.84,Recovery:.98};
const metrics:Metric[]=['built','traded','completed','crafted'];
const names:Record<Metric,string>={built:'A place taking shape',traded:'The caravan season',completed:'Beyond the familiar',crafted:'Made by our own hands'};
const units:Record<Metric,string>={built:'new buildings',traded:'goods sold or delivered',completed:'returned expeditions',crafted:'crafted supplies or festivals'};
const clamp=(n:number,min:number,max:number)=>Math.min(max,Math.max(min,n));
const note=(s:Game,text:string)=>{s.log.unshift({day:s.day,text});s.log=s.log.slice(0,70);};
const value=(s:Game,m:Metric)=>m==='completed'?s.completed:s.stats[m];

function goals(day:number,stats:Game['stats'],completed:number,age:number):Goal[]{
 const season=Math.floor((day-1)/12);
 return [0,1].map(offset=>{
  const metric=metrics[(season+offset)%metrics.length];
  return {id:`season-${season}-${metric}`,metric,start:metric==='completed'?completed:stats[metric],
   target:metric==='traded'?40+age*20:metric==='built'?2:metric==='completed'?1:2,claimed:false};
 });
}
export function newWorld(day:number,stats:Game['stats'],completed:number,age=0):World {
 return {phase:'Stable',nextCycle:day+10,nextEvent:day+4,demand:{food:1,water:1,wood:1,ore:1,tools:1},pending:[],seasonIndex:Math.floor((day-1)/12),goals:goals(day,stats,completed,age)};
}
export function revenueFactor(s:Game){return revenue[s.world.phase];}
export function marketFactor(s:Game,r:Resource){return market[s.world.phase]*(s.world.demand[r as keyof World['demand']]??1);}
export function saleFactor(s:Game){
 const pressure=s.rivalGrowth.reduce((n,influence,i)=>n+Math.min(1,influence/150)*(1-s.relations[i]/100),0)/3;
 return 1-.12*pressure;
}
export function seasonalGoals(s:Game){return s.world.goals.map(g=>({...g,name:names[g.metric],desc:`Complete ${g.target} ${units[g.metric]} this season.`,progress:Math.min(g.target,Math.max(0,value(s,g.metric)-g.start)),done:value(s,g.metric)-g.start>=g.target,reward:{coins:60+s.age*25,knowledge:12+s.age*5} as Cost}));}
export function claimSeasonGoal(s:Game,id:string){
 const g=seasonalGoals(s).find(g=>g.id===id);
 if(!g||g.claimed||!g.done)return 'This seasonal reward is not available.';
 for(const [r,n] of Object.entries(g.reward))s.stock[r as Resource]+=n!;
 s.world.goals.find(goal=>goal.id===id)!.claimed=true;note(s,`Seasonal ambition complete: ${g.name}.`);return '';
}

export const FOLLOWUPS:Record<string,Story>={
 'returning-family':{key:'returning-family',title:'A promise comes home',body:'The family whose wagon you repaired returns with a caravan. They remembered your help and offer a partnership.',scene:'town',choices:[
  {label:'Equip their next journey',detail:'20 wood for 85 coins. Trade ties strengthen.',cost:{wood:20},gain:{coins:85},relation:6},
  {label:'Ask for rare seeds',detail:'12 coins. Farm yields +30% for 6 days.',cost:{coins:12},buff:{kind:'harvest',days:6}},
  {label:'Welcome them to the table',detail:'They share 24 food. Morale +4.',gain:{food:24},morale:4}]},
 'bridge-finished':{key:'bridge-finished',title:'Across the water',body:'Rosehaven has finished the bridge you supplied. Its merchants offer the first crossing to your town.',scene:'frontier',choices:[
  {label:'Fund a trade delegation',detail:'20 food for 100 coins. Relations +8.',cost:{food:20},gain:{coins:100},relation:8},
  {label:'Send the surveyors',detail:'Gain 24 knowledge from a new route.',gain:{knowledge:24}},
  {label:'Celebrate at home',detail:'Morale +8.',morale:8}]},
 'toll-dispute':{key:'toll-dispute',title:'The price of a crossing',body:'The toll you demanded has diverted caravans around Everstead. Ironreach asks you to reconsider before the next trading season.',scene:'frontier',choices:[
  {label:'Remove the toll',detail:'Refund 30 coins. Relations +14.',cost:{coins:30},relation:14},
  {label:'Create a fair-trade charter',detail:'18 knowledge. Relations +10.',cost:{knowledge:18},relation:10},
  {label:'Keep our terms',detail:'Gain 20 coins; relations −10. Strong rivals reduce sale proceeds.',gain:{coins:20},relation:-10}]},
 'invention-result':{key:'invention-result',title:'An invention takes shape',body:'Your apprentice has finished a working prototype. Scaling the design requires a choice between production and sharing knowledge.',scene:'colony',choices:[
  {label:'Build a small run',detail:'12 ore for 16 tools.',cost:{ore:12},gain:{tools:16}},
  {label:'Publish the design',detail:'Gain 35 knowledge and improve relations.',gain:{knowledge:35},relation:6},
  {label:'Display it in the hall',detail:'Morale +9.',morale:9}]},
 'caravan-favour':{key:'caravan-favour',title:'Kindness travels',body:'The caravan you sheltered sent a courier. Its traders have saved useful supplies for you.',scene:'frontier',choices:[
  {label:'Take the tools',detail:'Receive 8 tools and a thank-you letter.',gain:{tools:8}},
  {label:'Ask for winter stores',detail:'Receive 45 food and 20 water.',gain:{food:45,water:20}},
  {label:'Share the gift locally',detail:'Morale +10 and relations +5.',morale:10,relation:5}]},
 'orchard-grown':{key:'orchard-grown',title:'What you planted',body:'The orchard you tended has taken root. Its first harvest brings a new decision for the valley.',scene:'town',choices:[
  {label:'Fill the pantry',detail:'Receive 50 food.',gain:{food:50}},
  {label:'Sell the first harvest',detail:'Receive 65 coins.',gain:{coins:65}},
  {label:'Share the seedlings',detail:'Morale +6 and relations +8.',morale:6,relation:8}]},
};
export function queueFollowup(s:Game,key:string,rng:(s:Game)=>number){
 if(!FOLLOWUPS[key]||s.world.pending.some(p=>p.key===key)||s.world.pending.length>=12)return;
 s.world.pending.push({key,due:s.day+4+Math.floor(rng(s)*4)});
}
export function tickWorld(s:Game,rng:(s:Game)=>number){
 const w=s.world;
 if(s.day>=w.nextCycle){
  const choices=PHASES.filter(p=>p!==w.phase);w.phase=choices[Math.floor(rng(s)*choices.length)];
  w.nextCycle=s.day+9+Math.floor(rng(s)*8);
  // Each sector gets a separate draw; a recession can coexist with a timber boom.
  for(const r of Object.keys(w.demand) as (keyof World['demand'])[])w.demand[r]=Math.round((.7+rng(s)*.7)*100)/100;
  note(s,`The regional economy enters ${w.phase.toLowerCase()}. Sector demand has shifted; check the caravan exchange.`);
 }
 const index=Math.floor((s.day-1)/12);
 if(index!==w.seasonIndex){w.seasonIndex=index;w.goals=goals(s.day,s.stats,s.completed,s.age);note(s,'A new season brings two fresh ambitions in the chronicle.');}
 if(!s.event&&s.day>=w.nextEvent){const i=w.pending.findIndex(p=>p.due<=s.day);if(i>=0){const [p]=w.pending.splice(i,1);s.event=structuredClone(FOLLOWUPS[p.key]);w.nextEvent=Math.max(w.nextEvent,s.day+5);}}
}
export function chooseStory(s:Game,stories:Story[],rng:(s:Game)=>number){
 if(s.event||s.day<s.world.nextEvent)return;
 const eligible=(e:Story)=>!(e.key==='flood'&&s.weather!=='Storm')&&!(e.key==='wind'&&Math.floor((s.day-1)/12)%4<2)&&!(e.key==='flowers'&&Math.floor((s.day-1)/12)%4===3);
 let pool=stories.filter(e=>!s.recent.includes(e.key)&&eligible(e));
 if(!pool.length)pool=stories.filter(e=>!s.recent.includes(e.key));
 if(!pool.length)return;
 const e=pool[Math.floor(rng(s)*pool.length)];s.event=structuredClone(e);s.recent=[e.key,...s.recent].slice(0,8);s.world.nextEvent=s.day+7+Math.floor(rng(s)*5);
}
export function encounter(s:Game,t:Trip,siteName:string,rng:(s:Game)=>number):Story{
 const variants=[
  {title:'A light off the trail',body:`Near ${siteName}, a traveller calls from the trees. Investigating takes supplies but may reveal a safer path.`,label:'Help the traveller',gain:{wood:12}},
  {title:'The washed-out trail',body:`The route to ${siteName} has been cut by rain. A detour is safer, while the old crossing offers salvage.`,label:'Find a sheltered detour',gain:{ore:8}},
  {title:'Footprints in the mist',body:`Your team near ${siteName} discovers a caravan's notes. Taking time to translate them could make the onward route safer.`,label:'Study the markings',gain:{knowledge:10}},
  {title:'A quiet clearing',body:`Beyond ${siteName}, an abandoned camp holds useful provisions. Resting here would give your team time to scout ahead.`,label:'Rest and scout',gain:{food:16}},
 ];
 const v=variants[Math.floor(rng(s)*variants.length)];
 return {key:'journey',title:v.title,body:v.body,scene:'frontier',trip:t.id,choices:[
  {label:v.label,detail:'8 food; +1 day and +8% success.',cost:{food:8}},
  {label:'Gather and press on',detail:`Gain ${Object.entries(v.gain).map(([k,n])=>`${n} ${k}`).join(', ')}; success −8%.`,gain:v.gain},
  {label:'Return to safety',detail:'Return tomorrow with a small haul. No extra supplies needed.'},
 ]};
}
export function validWorld(w:any):w is World{
 const num=(n:unknown,a=0,b=1e12)=>typeof n==='number'&&Number.isFinite(n)&&n>=a&&n<=b;
 return !!w&&PHASES.includes(w.phase)&&num(w.nextCycle,1,1e7+20)&&num(w.nextEvent,1,1e7+20)&&w.demand&&
 ['food','water','wood','ore','tools'].every(r=>num(w.demand[r],.5,2))&&
 Array.isArray(w.pending)&&w.pending.length<=12&&w.pending.every((p:any)=>p&&Object.hasOwn(FOLLOWUPS,p.key)&&num(p.due,1,1e7+20))&&
 Number.isInteger(w.seasonIndex)&&num(w.seasonIndex,0,1e7)&&Array.isArray(w.goals)&&w.goals.length===2&&
 new Set(w.goals.map((g:any)=>g?.id)).size===2&&w.goals.every((g:any)=>g&&metrics.includes(g.metric)&&g.id===`season-${w.seasonIndex}-${g.metric}`&&num(g.start)&&num(g.target,1,200)&&typeof g.claimed==='boolean');
}
