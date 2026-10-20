import {legacyGymDays,newWorkout,validGymRecord,type GymRecord} from './gymModel.ts';
import type {Activity} from './hubTypes';
export type GymTransport={read:(signal:AbortSignal)=>Promise<GymRecord[]>;write:(records:GymRecord[],signal:AbortSignal)=>Promise<void>};
type Cache={records:GymRecord[];pending:Record<string,GymRecord>;seeded:boolean};
export function createGymStore(account:string,storage:Pick<Storage,'getItem'|'setItem'>){
 const key=`daylight.gym.${account}`;
 let cache:Cache;try{cache=JSON.parse(storage.getItem(key)??'null')??{records:[],pending:{},seeded:false};}catch{cache={records:[],pending:{},seeded:false};}
 let snapshot={...cache,status:account==='local'?'Saved on this device':'Connecting gym sync…'};
 const listeners=new Set<()=>void>();let running:AbortSignal|undefined;
 function publish(status=snapshot.status){storage.setItem(key,JSON.stringify(cache));snapshot={...cache,status};for(const listener of listeners)listener();}
 function save(record:GymRecord){if(!validGymRecord(record))throw Error('Check the workout or weight values.');cache={...cache,records:cache.records.some(r=>r.id===record.id)?cache.records.map(r=>r.id===record.id?record:r):[...cache.records,record],pending:{...cache.pending,[record.id]:record}};publish(account==='local'?'Saved on this device':'Saving gym log…');}
 function seed(activities:Activity[]){for(const date of legacyGymDays(activities))if(!cache.records.some(r=>r.id===`workout:${date}`))save({...newWorkout(date),trained:true});}
 async function sync(transport:GymTransport,signal:AbortSignal,seedLocal:()=>void){
  if(running&&!running.aborted)return;running=signal;
  try{
   const remote=await transport.read(signal);if(signal.aborted)return;
   const records=new Map(remote.filter(validGymRecord).map(row=>[row.id,row])),pending={...cache.pending};
   if(!cache.seeded)for(const row of cache.records)if(!records.has(row.id))pending[row.id]=row;
   for(const row of Object.values(pending))records.set(row.id,row);
   cache={records:[...records.values()],pending,seeded:true};publish();seedLocal();
   while(!signal.aborted){const rows=Object.values(cache.pending);if(!rows.length)break;await transport.write(rows,signal);if(signal.aborted)return;const pending={...cache.pending};for(const row of rows)if(pending[row.id]===row)delete pending[row.id];cache={...cache,pending};publish();}
   if(!signal.aborted)publish('Gym logs synced');
  }catch(error){if(!signal.aborted){const e=error as {code?:string;message?:string};publish(e.code==='42P01'||e.code==='PGRST205'?'Apply 202610200001_gym_tracking.sql in Supabase to enable gym sync.':`Saved on this device; gym sync paused: ${e.message??'connection unavailable'}`);}}
  finally{if(running===signal)running=undefined;}
 }
 return {save,seed,sync,getSnapshot:()=>snapshot,subscribe:(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener);};}};
}
