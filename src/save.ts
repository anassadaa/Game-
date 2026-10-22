import {newGame,restore} from './game.ts';
export function readSave(read:()=>string|null){
 let raw:string|null=null;
 try{
  raw=read();
  return {game:raw?restore(raw):newGame(),blocked:false,recovery:null as string|null,warning:''};
 }catch{
  return {game:newGame(),blocked:true,recovery:raw,warning:raw
   ?'Your saved settlement could not be read. It has been kept untouched. Download the recovery file before importing a backup or starting a new settlement.'
   :'Browser storage is unavailable. You can play and export your progress, but automatic saving is disabled.'};
 }
}
