import {useCallback,useEffect,useRef,useState} from 'react';
import type {Session} from '@supabase/supabase-js';
import {supabase} from './supabase';
import type {WorkShift} from './WorkSchedule';

const storageKey='daylight.workShifts';
const ownerKey='daylight.workShifts.owner';
function localShifts():WorkShift[]{try{const data=JSON.parse(localStorage.getItem(storageKey)??'[]');return Array.isArray(data)?data:[];}catch{return [];}}
function validShifts(data:unknown):WorkShift[]{return Array.isArray(data)?data.filter((shift):shift is WorkShift=>Boolean(shift&&typeof shift.id==='string'&&typeof shift.date==='string'&&typeof shift.start==='string'&&typeof shift.end==='string')):[];}

export function useWorkShiftSync(session:Session|null,enabled:boolean){
 const [shifts,setShifts]=useState<WorkShift[]>(localShifts);
 const [status,setStatus]=useState('Saved on this device');
 const current=useRef(shifts),pending=useRef<WorkShift[]|null>(null),ready=useRef(false),saving=useRef(false),refreshing=useRef(false);
 const account=useRef<string|null>(null);
 const store=(next:WorkShift[])=>{current.current=next;setShifts(next);localStorage.setItem(storageKey,JSON.stringify(next));};
 const flush=useCallback(async()=>{
  if(!supabase||!session||!ready.current||saving.current)return;
  saving.current=true;
  while(pending.current){
   const next=pending.current;
   setStatus('Saving work schedule…');
   const {error}=await supabase.from('work_schedules').upsert({user_id:session.user.id,shifts:next},{onConflict:'user_id'});
   if(error){setStatus(`Work schedule saved here; cloud sync failed: ${error.message}`);break;}
   if(pending.current===next)pending.current=null;
   setStatus('Work schedule synced across devices');
  }
  saving.current=false;
 },[session]);
 const save=useCallback((next:WorkShift[])=>{store(next);pending.current=next;setStatus(session?'Saving work schedule…':'Saved on this device');void flush();},[session,flush]);
 const refresh=useCallback(async()=>{
  if(!supabase||!session||!ready.current||pending.current||saving.current||refreshing.current)return;
  refreshing.current=true;
  const {data,error}=await supabase.from('work_schedules').select('shifts').eq('user_id',session.user.id).maybeSingle();
  refreshing.current=false;
  if(error){setStatus(`Could not refresh work schedule: ${error.message}`);return;}
  if(data&&!pending.current){const next=validShifts(data.shifts);if(JSON.stringify(next)!==JSON.stringify(current.current))store(next);setStatus('Work schedule synced across devices');}
 },[session]);
 useEffect(()=>{
  if(!supabase||!session||!enabled){ready.current=false;return;}
  const userId=session.user.id;let cancelled=false;
  if(account.current!==userId){
   account.current=userId;pending.current=null;ready.current=false;
   const priorOwner=localStorage.getItem(ownerKey);
   if(priorOwner&&priorOwner!==userId)store([]);
   localStorage.setItem(ownerKey,userId);
  }
  setStatus('Loading work schedule…');
  void (async()=>{
   const {data,error}=await supabase.from('work_schedules').select('shifts').eq('user_id',userId).maybeSingle();
   if(cancelled)return;
   if(error){setStatus(error.code==='42P01'||error.code==='PGRST205'?'Apply the work schedule migration in Supabase to enable device sync.':`Work schedule saved here; cloud sync failed: ${error.message}`);return;}
   if(data){if(!pending.current)store(validShifts(data.shifts));}
   else pending.current=pending.current??current.current;
   ready.current=true;
   if(pending.current)void flush();else setStatus('Work schedule synced across devices');
  })();
  return()=>{cancelled=true;ready.current=false;};
 },[session?.user.id,enabled,flush]);
 useEffect(()=>{
  if(!supabase||!session||!enabled)return;
  const client=supabase;
  const onFocus=()=>{void refresh();if(pending.current)void flush();};
  const onVisible=()=>{if(document.visibilityState==='visible')onFocus();};
  const timer=window.setInterval(onFocus,30000);
  window.addEventListener('focus',onFocus);document.addEventListener('visibilitychange',onVisible);
  const channel=client.channel(`work-schedule-${session.user.id}`).on('postgres_changes',{event:'*',schema:'public',table:'work_schedules',filter:`user_id=eq.${session.user.id}`},()=>{void refresh();}).subscribe();
  return()=>{window.clearInterval(timer);window.removeEventListener('focus',onFocus);document.removeEventListener('visibilitychange',onVisible);void client.removeChannel(channel);};
 },[session?.user.id,enabled,refresh,flush]);
 return {shifts,save,status};
}
