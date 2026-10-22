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
