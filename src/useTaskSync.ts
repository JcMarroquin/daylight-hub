import {useEffect,useRef,type Dispatch,type SetStateAction} from 'react';
import type {Session} from '@supabase/supabase-js';
import {supabase} from './supabase';
import type {Task} from './scheduler';
import {uuidPattern} from './cloudSync';
const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
const row=(t:Task,user:string)=>({id:t.id,user_id:user,title:t.title,category:t.category??'Personal',project:t.project||null,due_date:t.dueDate||null,estimate_minutes:t.minutes,priority:t.priority,planning_date:t.selected?today():null,required_today:t.selected&&t.required,is_done:t.done});
export function useTaskSync(tasks:Task[],setTasks:Dispatch<SetStateAction<Task[]>>,session:Session|null,ready:boolean,onMessage:(message:string)=>void){
  const saved=useRef(new Map<string,string>()),initialized=useRef(false),pending=useRef(0),revision=useRef(0),queue=useRef(Promise.resolve()),failed=useRef(false);
  const current=useRef({tasks,onMessage});current.current={tasks,onMessage};
  useEffect(()=>{saved.current.clear();initialized.current=false;failed.current=false;revision.current++;},[session?.user.id,ready]);
  useEffect(()=>{
    if(!supabase||!session||!ready)return;
    const rows=tasks.filter(t=>uuidPattern.test(t.id)).map(t=>row(t,session.user.id));
    if(!initialized.current){for(const r of rows)saved.current.set(r.id,JSON.stringify(r));initialized.current=true;return;}
    const changes=rows.filter(r=>saved.current.get(r.id)!==JSON.stringify(r));if(!changes.length)return;
    const user=session.user.id;revision.current++;pending.current++;
    for(const r of changes)saved.current.set(r.id,JSON.stringify(r));
    queue.current=queue.current.then(async()=>{try{const {error}=await supabase!.from('tasks').upsert(changes.map(r=>({...r,done_at:r.is_done?new Date().toISOString():null})),{onConflict:'id'});if(error)throw error;failed.current=false;current.current.onMessage('Task changes synced.');}catch(e){failed.current=true;for(const r of changes)if(saved.current.get(r.id)===JSON.stringify(r))saved.current.delete(r.id);current.current.onMessage(`Task saved locally; cloud sync failed: ${e instanceof Error?e.message:'Try again later.'}`);}finally{pending.current--;}});
  },[tasks,session,ready]);
  useEffect(()=>{
    if(!supabase||!session||!ready)return;const client=supabase;let active=true,reading=false;let refreshTimer:ReturnType<typeof setTimeout>|undefined;
    async function refresh(){
      if(!active||reading||pending.current||document.visibilityState!=='visible')return;if(failed.current){setTasks(previous=>[...previous]);return;}reading=true;const version=revision.current;
      try{const {data,error}=await client.from('tasks').select('*').eq('user_id',session!.user.id).eq('is_archived',false).order('created_at');if(error)throw error;if(!active||pending.current||version!==revision.current)return;
        const remote:Task[]=(data??[]).map(t=>({id:t.id,title:t.title,category:t.category,project:t.project??'',dueDate:t.due_date??undefined,minutes:t.estimate_minutes??30,priority:t.priority,selected:t.planning_date===today(),required:t.planning_date===today()&&t.required_today,done:t.is_done}));
        const next=new Map(remote.map(t=>[t.id,JSON.stringify(row(t,session!.user.id))]));
        if(next.size===saved.current.size&&Array.from(next).every(([id,value])=>saved.current.get(id)===value))return;
        saved.current=next;localStorage.setItem('daylight.tasks',JSON.stringify(remote));setTasks(remote);current.current.onMessage('Tasks updated from your other devices.');
      }catch{/* Existing tasks remain usable while offline; local save failures are reported separately. */}finally{reading=false;}
    }
    function schedule(){clearTimeout(refreshTimer);refreshTimer=setTimeout(()=>void refresh(),300);}
    const channel=client.channel(`task-updates-${session.user.id}`).on('postgres_changes',{event:'*',schema:'public',table:'tasks',filter:`user_id=eq.${session.user.id}`},schedule).subscribe();
    const poll=setInterval(()=>void refresh(),30000);window.addEventListener('focus',schedule);document.addEventListener('visibilitychange',schedule);
    return()=>{active=false;clearInterval(poll);clearTimeout(refreshTimer);window.removeEventListener('focus',schedule);document.removeEventListener('visibilitychange',schedule);void client.removeChannel(channel);};
  },[session?.user.id,ready,setTasks]);
}
