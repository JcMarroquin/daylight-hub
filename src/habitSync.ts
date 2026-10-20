import {habitCheckId,migrateHabits,type Habit} from './habitModel.ts';
import type {Activity} from './hubTypes';
import type {Task} from './scheduler';
import type {Recurrence} from './recurrence';

export type HabitCheck={id:string;habitId:string;date:string;checked:boolean;label:string;category:string};
type Cache={habits:Habit[];checks:HabitCheck[];pendingHabits:Record<string,Habit>;pendingChecks:Record<string,HabitCheck>;seeded:boolean};
export type HabitRemote={habits:Habit[];checks:HabitCheck[]};
export type HabitTransport={read:(signal:AbortSignal)=>Promise<HabitRemote>;write:(habits:Habit[],checks:HabitCheck[],signal:AbortSignal)=>Promise<void>};
type Storage=Pick<globalThis.Storage,'getItem'|'setItem'>;
export const habitMigration='202610180001_habit_sync.sql';
export function habitSyncError(error:unknown){const e=error as {code?:string;message?:string};return e?.code==='42P01'||e?.code==='PGRST205'?`Apply ${habitMigration} in Supabase to enable habit sync.`:`Saved on this device; habit sync paused: ${e?.message??'connection unavailable'}`;}
const merge=<T extends {id:string}>(remote:T[],local:T[],pending:Record<string,T>,seed:boolean)=>{
  const rows=new Map(remote.map(row=>[row.id,row]));
  // Import old browser records once; existing cloud rows win over stale caches.
  if(seed)for(const row of local)if(!rows.has(row.id))rows.set(row.id,row);
  for(const row of Object.values(pending))rows.set(row.id,row);
  return [...rows.values()];
};
export function reconcileHabits(cache:Cache,remote:HabitRemote):Cache{
  const pendingHabits={...cache.pendingHabits},pendingChecks={...cache.pendingChecks};
  if(!cache.seeded){
    const habits=new Set(remote.habits.map(h=>h.id)),checks=new Set(remote.checks.map(c=>c.id));
    for(const h of cache.habits)if(!habits.has(h.id))pendingHabits[h.id]=h;
    for(const c of cache.checks)if(!checks.has(c.id))pendingChecks[c.id]=c;
  }
  return {habits:merge(remote.habits,cache.habits,pendingHabits,!cache.seeded),checks:merge(remote.checks,cache.checks,pendingChecks,!cache.seeded),pendingHabits,pendingChecks,seeded:true};
}
export function checkActivities(activities:Activity[],checks:HabitCheck[]):Activity[]{
  const ids=new Set(checks.map(c=>c.id));
  return [...activities.filter(a=>!ids.has(a.id)&&!checks.some(c=>a.kind==='habit'&&a.date===c.date&&a.sourceTaskId===c.habitId)),...checks.filter(c=>c.checked).map(c=>({id:c.id,date:c.date,label:c.label,category:c.category,kind:'habit' as const}))];
}
export function createHabitStore(account:string,storage:Storage){
  const key=`daylight.habits.${account}`,syncKey=`${key}.sync`;
  const read=(name:string,fallback:unknown)=>{try{return JSON.parse(storage.getItem(name)??'null')??fallback;}catch{return fallback;}};
  const old=read(key,[]) as Habit[],saved=read(syncKey,null) as Cache|null;
  let cache:Cache=saved??{habits:old,checks:[],pendingHabits:{},pendingChecks:{},seeded:false};
  let snapshot={...cache,status:account==='local'?'Saved on this device':'Connecting habit sync…'};
  const listeners=new Set<()=>void>();let running:AbortSignal|undefined;
  function publish(status=snapshot.status){storage.setItem(key,JSON.stringify(cache.habits));storage.setItem(syncKey,JSON.stringify(cache));snapshot={...cache,status};for(const listener of listeners)listener();}
  function save(habit:Habit){cache={...cache,habits:[...cache.habits.filter(h=>h.id!==habit.id),habit],pendingHabits:{...cache.pendingHabits,[habit.id]:habit}};publish(account==='local'?'Saved on this device':'Saving habits…');}
  function seed(tasks:Task[],rules:Record<string,Recurrence>,activities:Activity[]){
    const migrated=migrateHabits(cache.habits,tasks,rules);
    for(const habit of migrated)if(!cache.habits.some(h=>h.id===habit.id))save(habit);
    const checks=[...cache.checks];
    for(const habit of cache.habits)for(const activity of activities){
      if(activity.kind!=='habit'||(activity.id!==habitCheckId(habit.id,activity.date)&&!(habit.legacyTaskId&&activity.sourceTaskId===habit.legacyTaskId)))continue;
      const id=habitCheckId(habit.id,activity.date);
      if(!checks.some(c=>c.id===id))checks.push({id,habitId:habit.id,date:activity.date,checked:true,label:activity.label,category:activity.category});
    }
    if(checks.length!==cache.checks.length){const added=checks.filter(c=>!cache.checks.some(old=>old.id===c.id));cache={...cache,checks,pendingChecks:{...cache.pendingChecks,...Object.fromEntries(added.map(c=>[c.id,c]))}};publish();}
  }
  function check(habit:Habit,date:string,checked:boolean){const row:HabitCheck={id:habitCheckId(habit.id,date),habitId:habit.id,date,checked,label:habit.title,category:habit.category};cache={...cache,checks:[...cache.checks.filter(c=>c.id!==row.id),row],pendingChecks:{...cache.pendingChecks,[row.id]:row}};publish(account==='local'?'Saved on this device':'Saving habits…');}
  async function sync(remote:HabitTransport,signal:AbortSignal,seedLocal:()=>void){
    if(running&&!running.aborted)return;running=signal;
    try{
      const rows=await remote.read(signal);if(signal.aborted)return;
      cache=reconcileHabits(cache,rows);publish();seedLocal();
      while(!signal.aborted){
        const habits=Object.values(cache.pendingHabits),checks=Object.values(cache.pendingChecks);
        if(!habits.length&&!checks.length)break;
        await remote.write(habits,checks,signal);if(signal.aborted)return;
        const pendingHabits={...cache.pendingHabits},pendingChecks={...cache.pendingChecks};
        // An edit made during this upload must stay queued.
        for(const h of habits)if(pendingHabits[h.id]===h)delete pendingHabits[h.id];
        for(const c of checks)if(pendingChecks[c.id]===c)delete pendingChecks[c.id];
        cache={...cache,pendingHabits,pendingChecks};publish();
      }
      if(!signal.aborted)publish('Habits and daily checks synced');
    }catch(error){if(!signal.aborted)publish(habitSyncError(error));}
    finally{if(running===signal)running=undefined;}
  }
  return {getSnapshot:()=>snapshot,subscribe:(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener);};},save,check,seed,sync};
}
