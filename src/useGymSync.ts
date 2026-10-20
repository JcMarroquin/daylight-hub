import {useEffect,useMemo,useRef,useSyncExternalStore} from 'react';
import type {Activity} from './hubTypes';
import {withLegacyGymRecords,type GymRecord} from './gymModel';
import {createGymStore,type GymTransport} from './gymSync';
import {supabase} from './supabase';
import {foregroundRefresh} from './foregroundRefresh';
export function useGymSync(account:string,enabled:boolean,activities:Activity[]){
 const store=useMemo(()=>createGymStore(account,localStorage),[account]),state=useSyncExternalStore(store.subscribe,store.getSnapshot);
 const legacy=useRef(activities);legacy.current=activities;const wake=useRef<()=>void>(()=>{});
 useEffect(()=>{
  if(!enabled)return;
  const seed=()=>store.seed(legacy.current);
  if(account==='local'||!supabase){seed();return;}
  const client=supabase;
  const transport:GymTransport={async read(signal){const {data,error}=await client.from('gym_records').select('data').eq('user_id',account).abortSignal(signal);if(error)throw error;return (data??[]).map(row=>row.data as GymRecord);},async write(records,signal){const {error}=await client.from('gym_records').upsert(records.map(data=>({user_id:account,id:data.id,data})),{onConflict:'user_id,id'}).abortSignal(signal);if(error)throw error;}};
  let signal:AbortSignal|undefined;const run=()=>{if(signal&&!signal.aborted)void store.sync(transport,signal,seed);};wake.current=run;
  const stop=foregroundRefresh(async next=>{signal=next;await store.sync(transport,next,seed);});
  const channel=client.channel(`gym-${account}`).on('postgres_changes',{event:'*',schema:'public',table:'gym_records',filter:`user_id=eq.${account}`},run).subscribe();
  return()=>{stop();wake.current=()=>{};void client.removeChannel(channel);};
 },[account,enabled,store]);
 useEffect(()=>{if(enabled&&account==='local')store.seed(activities);},[account,enabled,activities,store]);
 return {records:enabled?withLegacyGymRecords(state.records,activities):state.records,status:state.status,save:(record:GymRecord)=>{store.save(record);wake.current();}};
}
