// Everstead diplomacy: status, treaties, war and raids between Everstead and its three neighbours.
// Deterministic: randomness only through the injected rand(s).
import type {Game} from './game.ts';
export type Treaty = 'none'|'peace'|'trade'|'alliance';
export type Status = 'war'|'hostile'|'neutral'|'peace'|'trade'|'alliance';
export type Neighbour = {war:boolean;warSince:number;treaty:Treaty;until:number;giftDay:number;raidDay:number};
export type Diplomacy = {neighbours:Neighbour[];raidsMade:number;raidsWonAbroad:number};
export const NEIGHBOURS=['Rosehaven','Ironreach','The Wayfarers'];
export const STATUS_LABEL:Record<Status,string>={war:'At war',hostile:'Hostile',neutral:'Neutral',peace:'Peace treaty',trade:'Trade treaty',alliance:'Alliance'};
/** Relations below this break the treaty. */
export const BREAK_AT:Record<Exclude<Treaty,'none'>,number>={peace:20,trade:35,alliance:50};
const cap=(n:number,a:number,b:number)=>Math.min(b,Math.max(a,n));
const note=(s:Game,text:string)=>{s.log.unshift({day:s.day,text});s.log=s.log.slice(0,70);};
export function newNeighbour():Neighbour{return {war:false,warSince:0,treaty:'none',until:0,giftDay:-99,raidDay:-99};}
export function newDiplomacy():Diplomacy{return {neighbours:[newNeighbour(),newNeighbour(),newNeighbour()],raidsMade:0,raidsWonAbroad:0};}
export function status(s:Game,i:number):Status{const n=s.diplomacy.neighbours[i];if(n.war)return 'war';if(n.treaty!=='none')return n.treaty;return s.relations[i]<30?'hostile':'neutral';}
export const hasTreaty=(s:Game,i:number,t:Treaty)=>{const n=s.diplomacy.neighbours[i];if(n.war||n.treaty==='none')return false;const rank={none:0,peace:1,trade:2,alliance:3};return rank[n.treaty]>=rank[t];};
export const treatyCount=(s:Game,t:Treaty)=>[0,1,2].filter(i=>hasTreaty(s,i,t)).length;
export function relationShift(s:Game,i:number,d:number){s.relations[i]=cap(s.relations[i]+d,0,100);}
/** Daily upkeep: treaties expire or break, relations drift. */
export function tickDiplomacy(s:Game,_rand:(s:Game)=>number){
 const inc=treatyIncome(s);s.stock.coins+=inc.coins;s.stock.knowledge+=inc.knowledge;
 s.diplomacy.neighbours.forEach((n,i)=>{
  if(n.war)relationShift(s,i,-.2);else if(s.relations[i]<50)relationShift(s,i,.1);
  if(n.treaty!=='none'&&!n.war){
   if(s.relations[i]<BREAK_AT[n.treaty]){note(s,`${NEIGHBOURS[i]} tore up the ${n.treaty} treaty: relations fell too low.`);n.treaty='none';}
   else if(s.day>=n.until){note(s,`Your ${n.treaty} treaty with ${NEIGHBOURS[i]} expired. Renew it on the Trade page.`);n.treaty='none';}
  }
 });
}
export function validDiplomacy(d:any):boolean{const num=(v:unknown,a=-1e3,b=1e9)=>typeof v==='number'&&Number.isFinite(v)&&v>=a&&v<=b;
 return !!d&&Array.isArray(d.neighbours)&&d.neighbours.length===3&&num(d.raidsMade,0)&&num(d.raidsWonAbroad,0)&&d.neighbours.every((n:any)=>n&&typeof n.war==='boolean'&&num(n.warSince,0)&&['none','peace','trade','alliance'].includes(n.treaty)&&num(n.until,0)&&num(n.giftDay)&&num(n.raidDay));}
/** Diplomatic actions */
const bad=(i:number)=>!Number.isInteger(i)||i<0||i>2;
export const TREATY_TERMS:Record<Exclude<Treaty,'none'>,{need:number;coins:number;food:number;days:number;desc:string}>={
 peace:{need:40,coins:40,food:0,days:40,desc:'They will not raid you.'},
 trade:{need:55,coins:60,food:0,days:40,desc:'No raids, better market prices and +3 coins a day.'},
 alliance:{need:75,coins:120,food:30,days:50,desc:'All trade benefits, they help defend you in raids, +1 knowledge a day.'}};
export const giftCost=(s:Game)=>({coins:25+s.age*15,food:15});
export function gift(s:Game,i:number){if(bad(i))return 'Unknown neighbour.';const n=s.diplomacy.neighbours[i],c=giftCost(s);if(s.day-n.giftDay<3)return `${NEIGHBOURS[i]} received a gift recently. Wait ${3-(s.day-n.giftDay)} day(s).`;if(s.stock.coins<c.coins||s.stock.food<c.food)return `A gift costs ${c.coins} coins and ${c.food} food.`;s.stock.coins-=c.coins;s.stock.food-=c.food;n.giftDay=s.day;const d=n.war?6:12;relationShift(s,i,d);note(s,`Your gift pleased ${NEIGHBOURS[i]}. Relations +${d}.`);return '';}
export const peaceCost=(s:Game)=>80+s.age*40;
export function proposePeace(s:Game,i:number){if(bad(i))return 'Unknown neighbour.';const n=s.diplomacy.neighbours[i];if(!n.war)return 'You are not at war with them.';if(s.relations[i]<25)return 'Relations must be 25+ before they will talk peace. Send gifts first.';const c=peaceCost(s);if(s.stock.coins<c)return `Peace reparations cost ${c} coins.`;s.stock.coins-=c;n.war=false;n.treaty='peace';n.until=s.day+TREATY_TERMS.peace.days;relationShift(s,i,10);s.morale=cap(s.morale+4,0,100);note(s,`Peace with ${NEIGHBOURS[i]}. The war is over and a peace treaty holds for ${TREATY_TERMS.peace.days} days.`);return '';}
export function signTreaty(s:Game,i:number,kind:Exclude<Treaty,'none'>){if(bad(i)||!(kind in TREATY_TERMS))return 'Unknown treaty.';const n=s.diplomacy.neighbours[i],t=TREATY_TERMS[kind];if(n.war)return 'Make peace first.';if(s.relations[i]<t.need)return `Relations must be ${t.need}+ for this treaty.`;if(s.stock.coins<t.coins||s.stock.food<t.food)return `This treaty costs ${t.coins} coins${t.food?` and ${t.food} food`:''}.`;s.stock.coins-=t.coins;s.stock.food-=t.food;const renew=n.treaty===kind;n.treaty=kind;n.until=s.day+t.days;note(s,`${renew?'Renewed':'Signed'} a ${kind} treaty with ${NEIGHBOURS[i]} until day ${n.until}.`);return '';}
/** Treaty effects */
export function priceFactor(s:Game,buy:boolean){const t=treatyCount(s,'trade');return buy?1-.05*t:1+.05*t;}
export function treatyIncome(s:Game){return {coins:treatyCount(s,'trade')*3,knowledge:treatyCount(s,'alliance')};}
