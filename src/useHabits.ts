import {useEffect,useMemo,useRef,useSyncExternalStore} from 'react';
import type {Task} from './scheduler';
import type {Recurrence} from './recurrence';
import type {Activity} from './hubTypes';
import type {Habit} from './habitModel';
import {createHabitStore,checkActivities,type HabitTransport,type HabitCheck} from './habitSync';
import {supabase} from './supabase';
import {foregroundRefresh} from './foregroundRefresh';

export function useHabits(account:string,tasks:Task[],rules:Record<string,Recurrence>,ready:boolean,activities:Activity[]){
  const store=useMemo(()=>createHabitStore(account,localStorage),[account]);
  const state=useSyncExternalStore(store.subscribe,store.getSnapshot);
  const inputs=useRef({tasks,rules,activities});inputs.current={tasks,rules,activities};
  const wake=useRef<()=>void>(()=>{});
  useEffect(()=>{
    if(!ready)return;
    const seed=()=>store.seed(inputs.current.tasks,inputs.current.rules,inputs.current.activities);
    if(account==='local'||!supabase){seed();return;}
    const client=supabase;
    const transport:HabitTransport={
      async read(signal){
        const results=await Promise.all(['habits','habit_checks'].map(table=>client.from(table).select('id,data').eq('user_id',account).abortSignal(signal)));
        for(const result of results)if(result.error)throw result.error;
        return {habits:(results[0].data??[]).map(row=>({...row.data,id:row.id}) as Habit),checks:(results[1].data??[]).map(row=>({...row.data,id:row.id}) as HabitCheck)};
      },
      async write(habits,checks,signal){
        for(const [table,items] of [['habits',habits],['habit_checks',checks]] as const){
          if(!items.length)continue;
          const {error}=await client.from(table).upsert(items.map(data=>({user_id:account,id:data.id,data})),{onConflict:'user_id,id'}).abortSignal(signal);
          if(error)throw error;
        }
      }
    };
    let currentSignal:AbortSignal|undefined;
    const run=()=>{if(currentSignal&&!currentSignal.aborted)void store.sync(transport,currentSignal,seed);};wake.current=run;
    const stop=foregroundRefresh(async signal=>{currentSignal=signal;await store.sync(transport,signal,seed);});
    const channel=client.channel(`habit-sync-${account}`).on('postgres_changes',{event:'*',schema:'public',table:'habits',filter:`user_id=eq.${account}`},run).on('postgres_changes',{event:'*',schema:'public',table:'habit_checks',filter:`user_id=eq.${account}`},run).subscribe();
    return()=>{stop();wake.current=()=>{};void client.removeChannel(channel);};
  },[account,ready,store]);
  useEffect(()=>{if(ready&&account==='local')store.seed(tasks,rules,activities);},[ready,account,store,tasks,rules,activities]);
  const save=(habit:Habit)=>{store.save(habit);wake.current();};
  const check=(habit:Habit,date:string,checked:boolean)=>{store.check(habit,date,checked);wake.current();};
  return {habits:state.habits,save,check,activities:checkActivities(activities,state.checks),status:state.status};
}
