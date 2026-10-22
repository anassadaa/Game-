// Everstead v2 systems: raids, rival rankings, resident requests, families, era goals and town rank.
// Deterministic: randomness only through the injected rand(s).
import type {Game, Resource, Cost, BuildingKind} from './game.ts';
export type Request = {id:string;person:number;kind:'deliver'|'build';resource?:Resource;amount?:number;building?:BuildingKind;base?:number;reward:Cost;morale:number;due:number;text:string};
export type Extra = {nextRaid:number;raidFrom:number;raidsWon:number;raidsLost:number;requests:Request[];nextRequest:number;nextBirth:number;births:number;eraClaimed:string[];pactDay:number};
type Rand = (s:Game)=>number;
const cap=(n:number,a:number,b:number)=>Math.min(b,Math.max(a,n));
const RIVAL_NAMES=['Rosehaven','Ironreach','The Wayfarers'];
const note=(s:Game,text:string)=>{s.log.unshift({day:s.day,text});s.log=s.log.slice(0,70);};
export function newExtra(day=1):Extra{return {nextRaid:Math.max(day+6,20),raidFrom:1,raidsWon:0,raidsLost:0,requests:[],nextRequest:day+3,nextBirth:day+8,births:0,eraClaimed:[],pactDay:0};}
const homeBeds=(s:Game)=>4+s.buildings.filter(b=>b.kind==='cottage').reduce((n,b)=>n+4*b.level,0);
const staffed=(s:Game,id:number)=>s.people.filter(p=>p.job===id&&p.away===null&&p.injury===0).length;
export function count(s:Game,k:BuildingKind){return s.buildings.filter(b=>b.kind===k).length;}
export function buildingCounts(s:Game){const m:Partial<Record<BuildingKind,number>>={};for(const b of s.buildings)m[b.kind]=(m[b.kind]??0)+1;return m;}
/** Clarity: when the next settler can arrive and why not. */
export function settlerStatus(s:Game){const left=6-(s.day%6);const reasons:string[]=[];if(homeBeds(s)<=s.people.length)reasons.push('needs a free bed (build a Cottage)');if(s.morale<65)reasons.push(`morale ${Math.round(s.morale)}% is below 65%`);return {days:left,ok:reasons.length===0,reasons,leaving:s.morale<30&&s.people.length>4};}
/** Defence */
export function defence(s:Game){return Math.round(s.buildings.filter(b=>b.kind==='watch').reduce((n,b)=>n+4*b.level+staffed(s,b.id)*7,0)+s.people.filter(p=>p.away===null&&p.injury===0).length*.6+s.age*3);}
export function raidStrength(s:Game,day=s.extra.nextRaid){return Math.round((5+day*.09+s.age*4+s.rivalGrowth[s.extra.raidFrom]*.05)*(s.difficulty==='explorer'?.8:s.difficulty==='survival'?1.2:1)*(s.relations[s.extra.raidFrom]>70?.7:1));}
function raid(s:Game,rand:Rand){const x=s.extra,from=RIVAL_NAMES[x.raidFrom]==='The Wayfarers'?'Outlaws on the Wayfarer road':`Raiders backed by ${RIVAL_NAMES[x.raidFrom]}`;const atk=raidStrength(s),def=defence(s);
 if(def>=atk){x.raidsWon++;s.stock.coins+=25+s.age*15;s.morale=cap(s.morale+4,0,100);note(s,`${from} struck at dawn, but your defenders (${def} vs ${atk}) drove them off. Morale rises.`);}
 else{x.raidsLost++;const loss:Cost={};for(const r of ['food','wood','coins'] as Resource[]){const n=Math.floor(s.stock[r]*.12);s.stock[r]-=n;loss[r]=n;}s.morale=cap(s.morale-6,0,100);note(s,`${from} overran your outskirts (${def} vs ${atk}) and carried off ${Object.entries(loss).map(([k,v])=>`${v} ${k}`).join(', ')}. Build and staff Watchtowers.`);}
 const lowest=s.relations.indexOf(Math.min(...s.relations));x.raidFrom=rand(s)<.6?lowest:Math.floor(rand(s)*3);x.nextRaid=s.day+14+Math.floor(rand(s)*7);}
const REQ_DELIVER:[Resource,number,string][]=[['food',20,'wants to host supper for the neighbours'],['wood',25,'hopes to mend the family roof'],['water',20,'is planting a herb patch'],['tools',3,'needs proper tools for an apprentice'],['knowledge',10,'wants books for the children']];
const REQ_BUILD:[BuildingKind,string][]=[['garden','dreams of a garden to sit in at dusk'],['cottage','is getting married and needs a home'],['farm','worries the harvest will not stretch']];
function newRequest(s:Game,rand:Rand){const home=s.people.filter(p=>p.away===null);if(!home.length)return;const p=home[Math.floor(rand(s)*home.length)];const id=`r${s.day}-${p.id}`;const coins=30+s.age*20;
 if(rand(s)<.65){const [r,n,why]=REQ_DELIVER[Math.floor(rand(s)*REQ_DELIVER.length)];const amount=Math.ceil(n*(1+s.age*.5));s.extra.requests.push({id,person:p.id,kind:'deliver',resource:r,amount,reward:{coins},morale:4,due:s.day+8,text:`${p.name} ${why}. Give ${amount} ${r}.`});}
 else{const [b,why]=REQ_BUILD[Math.floor(rand(s)*REQ_BUILD.length)];s.extra.requests.push({id,person:p.id,kind:'build',building:b,base:count(s,b),reward:{coins:coins+20,knowledge:8},morale:6,due:s.day+10,text:`${p.name} ${why}. Build one more ${b}.`});}
 note(s,`${p.name} has a personal request. See the Town page.`);}
export function requestReady(s:Game,q:Request){return q.kind==='deliver'?s.stock[q.resource!]>=q.amount!:count(s,q.building!)>q.base!;}
export function fulfilRequest(s:Game,id:string){const q=s.extra.requests.find(r=>r.id===id);if(!q)return 'That request is no longer open.';if(!requestReady(s,q))return q.kind==='deliver'?`Need ${q.amount} ${q.resource}.`:`Build another ${q.building} first.`;if(q.kind==='deliver')s.stock[q.resource!]-=q.amount!;for(const [k,v] of Object.entries(q.reward))s.stock[k as Resource]+=v!;s.morale=cap(s.morale+q.morale,0,100);const p=s.people.find(p=>p.id===q.person);if(p)p.xp=Math.min(11,p.xp+4);s.extra.requests=s.extra.requests.filter(r=>r.id!==id);note(s,`You helped ${p?.name??'a resident'}. Word spreads; morale +${q.morale}.`);return '';}
/** Families: couples grow the town when there is room and people are happy. */
function births(s:Game,rand:Rand,person:(s:Game,name?:string)=>Game['people'][number]){const x=s.extra;x.nextBirth=s.day+8;if(s.people.length<6||s.morale<55||homeBeds(s)<=s.people.length)return;if(rand(s)<.55){const parent=s.people[Math.floor(rand(s)*s.people.length)];const child=person(s);child.skills={growing:1,craft:1,learning:2,exploring:1};child.trait='Young';s.people.push(child);x.births++;note(s,`${parent.name}'s family welcomed a child, ${child.name}. Everstead grows from within.`);}}
export function tickExtra(s:Game,rand:Rand,person:(s:Game,name?:string)=>Game['people'][number]){const x=s.extra;
 x.requests=x.requests.filter(q=>{if(q.due<s.day){s.morale=cap(s.morale-2,0,100);note(s,`A resident's request went unanswered. Morale −2.`);return false;}return s.people.some(p=>p.id===q.person);});
 if(s.day>=x.nextRequest){x.nextRequest=s.day+5;if(x.requests.length<2)newRequest(s,rand);}
 if(s.day>=x.nextBirth)births(s,rand,person);
 if(s.day>=x.nextRaid)raid(s,rand);
}
/** Rival rankings and a trade pact */
export function townScore(s:Game){return Math.round(s.buildings.reduce((n,b)=>n+b.level*4,0)+s.people.length*3+s.age*25+s.tech.length*4+s.discoveries*3+s.stock.relics*5);}
export function rankings(s:Game){return [{name:'Everstead',score:townScore(s),you:true},...RIVAL_NAMES.map((name,i)=>({name,score:Math.round(30+s.rivalGrowth[i]*2.2+s.day*.35),you:false}))].sort((a,b)=>b.score-a.score);}
export function pact(s:Game,rival:number){if(!Number.isInteger(rival)||rival<0||rival>2)return 'Unknown neighbour.';if(s.relations[rival]<60)return 'Relations must be 60+ for a trade pact.';if(s.day-s.extra.pactDay<5)return `Next pact available in ${5-(s.day-s.extra.pactDay)} days.`;if(s.stock.wood<20)return 'A pact needs 20 wood to send.';s.stock.wood-=20;const gain:[Resource,number][]=[['food',35],['ore',18],['tools',5]];const [r,n]=gain[rival];s.stock[r]+=n;s.stock.coins+=20;s.extra.pactDay=s.day;s.rivalGrowth[rival]=Math.max(0,s.rivalGrowth[rival]-2);note(s,`Trade pact with ${RIVAL_NAMES[rival]}: 20 wood for ${n} ${r} and 20 coins.`);return '';}
/** Town rank */
const RANKS=['Camp','Hamlet','Village','Town','Market Town','City','Great City','Capital'];
export function townRank(s:Game){const sc=townScore(s),steps=[0,60,110,170,250,350,480,650];let i=0;while(i<steps.length-1&&sc>=steps[i+1])i++;return {name:RANKS[i],level:i+1,score:sc,next:steps[i+1]??null,prev:steps[i]};}
/** Era-long goals */
export function eraGoals(s:Game){const a=s.age,mul=a+1;const list=[
 {id:`e${a}-pop`,name:'A growing people',desc:`Reach ${10+a*6} residents.`,progress:s.people.length,target:10+a*6},
 {id:`e${a}-build`,name:'Raise the skyline',desc:`Have ${10+a*6} buildings.`,progress:s.buildings.length,target:10+a*6},
 {id:`e${a}-def`,name:'Hold the walls',desc:`Repel ${1+a} raid(s).`,progress:s.extra.raidsWon,target:1+a},
 {id:`e${a}-kin`,name:'Roots in the valley',desc:`Welcome ${1+a} child(ren).`,progress:s.extra.births,target:1+a}];
 return list.map(g=>({...g,progress:Math.min(g.progress,g.target),done:g.progress>=g.target,claimed:s.extra.eraClaimed.includes(g.id),reward:{coins:100*mul,knowledge:20*mul} as Cost}));}
export function claimEraGoal(s:Game,id:string){const g=eraGoals(s).find(g=>g.id===id);if(!g||!g.done||g.claimed)return 'This era goal is not ready.';for(const [k,v] of Object.entries(g.reward))s.stock[k as Resource]+=v!;s.extra.eraClaimed.push(id);note(s,`Era goal achieved: ${g.name}.`);return '';}
export function validExtra(x:any,s:any):boolean{const num=(v:unknown,a=0,b=1e12)=>typeof v==='number'&&Number.isFinite(v)&&v>=a&&v<=b;const keys=['coins','food','water','wood','ore','tools','knowledge','relics'];
 return !!x&&num(x.nextRaid,1)&&Number.isInteger(x.raidFrom)&&num(x.raidFrom,0,2)&&num(x.raidsWon)&&num(x.raidsLost)&&num(x.nextRequest,1)&&num(x.nextBirth,1)&&num(x.births)&&num(x.pactDay)&&Array.isArray(x.eraClaimed)&&x.eraClaimed.length<=40&&x.eraClaimed.every((e:any)=>typeof e==='string')&&Array.isArray(x.requests)&&x.requests.length<=3&&x.requests.every((q:any)=>q&&typeof q.id==='string'&&typeof q.text==='string'&&q.text.length<300&&num(q.person,1)&&num(q.due)&&num(q.morale,0,20)&&q.reward&&Object.entries(q.reward).every(([k,v])=>keys.includes(k)&&num(v,0,1e6))&&(q.kind==='deliver'?keys.includes(q.resource)&&num(q.amount,1,1e5):q.kind==='build'&&typeof q.building==='string'&&num(q.base,0,100)));}
