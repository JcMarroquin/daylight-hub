import type {SupabaseClient} from '@supabase/supabase-js';
import type {Activity, Alarm, SleepLog} from './hubTypes';
import type {Plan, Task} from './scheduler';

type DbTask={id:string;title:string;category:string;project:string|null;due_date:string|null;estimate_minutes:number;priority:number;planning_date:string|null;required_today:boolean;is_done:boolean;is_archived?:boolean};
type DbActivity={id:string;activity_date:string;kind:'gym_visit'|'task_completed'|'workout'|'habit';label:string;category:string|null;task_id:string|null};
type DbSleep={id:string;wake_date:string;bedtime:string;wake_time:string;quality:number};
type DbAlarm={id:string;alarm_time:string;label:string;is_enabled:boolean};
type DbPlan={id:string;plan_date:string;strategy:Plan['strategy'];status:'accepted';time_zone:string};
export const uuidPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
function isoAt(date:string,minute:number){const [y,m,d]=date.split('-').map(Number);const local=new Date(y,m-1,d,Math.floor(minute/60),minute%60);return local.toISOString();}

export async function checkHubSchema(client:SupabaseClient){
 const {error}=await client.from('tasks').select('id',{head:true,count:'exact'});
 if(!error)return {ready:true,message:'Hub tables are ready. Checking your cloud data…'};
 if(error.code==='42P01'||error.code==='PGRST205')return {ready:false,message:'Hub tables are missing or the migration is still applying. Check the Supabase Table Editor and reload.'};
 return {ready:false,message:`Could not access the hub tables: ${error.message}`};
}

export async function loadHub(client:SupabaseClient,userId:string){
 const [taskResult,activityResult,sleepResult,alarmResult,planResult,preferenceResult]=await Promise.all([
  client.from('tasks').select('*').eq('user_id',userId).order('created_at'),
  client.from('activity_logs').select('*').eq('user_id',userId).order('activity_date'),
  client.from('sleep_logs').select('*').eq('user_id',userId).order('wake_date'),
  client.from('alarms').select('*').eq('user_id',userId).order('created_at'),
  client.from('daily_plans').select('*').eq('user_id',userId).eq('plan_date',today()).eq('status','accepted').maybeSingle(),
  client.from('planner_preferences').select('*').eq('user_id',userId).maybeSingle(),
 ]);
 for(const result of [taskResult,activityResult,sleepResult,alarmResult,planResult,preferenceResult])if(result.error)throw result.error;
 const allRemoteTasks=(taskResult.data??[]) as DbTask[];
 const remoteTasks=allRemoteTasks.filter(t=>!t.is_archived);
 const remoteActivities=(activityResult.data??[]) as DbActivity[];
 const localTasks=JSON.parse(localStorage.getItem('daylight.tasks')??'[]') as Task[];
 // Keep embedded demo rows local. UUID rows represent tasks created by the user.
 const localUserTasks=localTasks.filter(t=>uuidPattern.test(t.id));
 const remoteIds=new Set(allRemoteTasks.map(t=>t.id));
 const taskUploads=localUserTasks.filter(t=>!remoteIds.has(t.id)).map(t=>({id:t.id,user_id:userId,title:t.title,category:t.category??'Personal',project:t.project||null,due_date:t.dueDate||null,estimate_minutes:t.minutes,priority:t.priority,planning_date:t.selected?today():null,required_today:t.selected&&t.required,is_done:t.done,done_at:t.done?new Date().toISOString():null}));
 if(taskUploads.length){const {error}=await client.from('tasks').upsert(taskUploads,{onConflict:'id'});if(error)throw error;}
 const mappedTasks:Task[]=remoteTasks.map(t=>({id:t.id,title:t.title,category:t.category,project:t.project??'',dueDate:t.due_date??undefined,minutes:t.estimate_minutes??30,priority:t.priority,selected:t.planning_date===today(),required:t.planning_date===today()&&t.required_today,done:t.is_done}));
 const presentIds=new Set(mappedTasks.map(t=>t.id));
 for(const t of localUserTasks)if(!presentIds.has(t.id)&&!remoteIds.has(t.id)){mappedTasks.push(t);}
 // Once a user is connected, the cloud is the task source of truth. The six
 // non-UUID preview tasks are deliberately excluded from their workspace.
 const mergedTasks=mappedTasks;
 localStorage.setItem('daylight.tasks',JSON.stringify(mergedTasks));
 const localActivities=JSON.parse(localStorage.getItem('daylight.activities')??'[]') as Activity[];
 const remoteActivityIds=new Set(remoteActivities.map(a=>a.id));
 const activityUploads=localActivities.filter(a=>uuidPattern.test(a.id)&&!remoteActivityIds.has(a.id)).map(a=>({id:a.id,user_id:userId,activity_date:a.date,kind:a.label==='Gym visit'?'gym_visit':a.sourceTaskId?'task_completed':a.category==='Fitness'?'workout':'habit',label:a.label,category:a.category||null,task_id:a.sourceTaskId&&uuidPattern.test(a.sourceTaskId)?a.sourceTaskId:null}));
 if(activityUploads.length){const {error}=await client.from('activity_logs').upsert(activityUploads,{onConflict:'id'});if(error)throw error;}
 const mergedActivities=[...remoteActivities.map(a=>({id:a.id,date:a.activity_date,category:a.category??(a.kind==='gym_visit'?'Fitness':'Personal'),label:a.label,sourceTaskId:a.task_id??undefined})),...localActivities.filter(a=>!uuidPattern.test(a.id))];
 localStorage.setItem('daylight.activities',JSON.stringify(mergedActivities));
 const localSleep=JSON.parse(localStorage.getItem('daylight.sleepLogs')??'[]') as SleepLog[];
 const sleepUploads=localSleep.map(s=>({user_id:userId,wake_date:s.wakeDate,bedtime:s.bedTime,wake_time:s.wakeTime,quality:s.quality}));
 if(sleepUploads.length){const {error}=await client.from('sleep_logs').upsert(sleepUploads,{onConflict:'user_id,wake_date'});if(error)throw error;}
 const mergedSleepByDate=new Map<string,SleepLog>((sleepResult.data??[] as DbSleep[]).map(s=>[s.wake_date,{id:s.id,wakeDate:s.wake_date,bedTime:s.bedtime.slice(0,5),wakeTime:s.wake_time.slice(0,5),quality:s.quality}]));
 for(const sleep of localSleep)mergedSleepByDate.set(sleep.wakeDate,sleep);
 const mergedSleep=[...mergedSleepByDate.values()];
 localStorage.setItem('daylight.sleepLogs',JSON.stringify(mergedSleep));
 const localAlarms=JSON.parse(localStorage.getItem('daylight.alarms')??'[]') as Alarm[];
 const remoteAlarms=(alarmResult.data??[]) as DbAlarm[];
 const remoteAlarmIds=new Set(remoteAlarms.map(a=>a.id));
 const alarmUploads=localAlarms.filter(a=>uuidPattern.test(a.id)&&!remoteAlarmIds.has(a.id)).map(a=>({id:a.id,user_id:userId,label:a.label,alarm_time:a.time,is_enabled:a.enabled}));
 if(alarmUploads.length){const {error}=await client.from('alarms').upsert(alarmUploads,{onConflict:'id'});if(error)throw error;}
 localStorage.setItem('daylight.alarms',JSON.stringify([...remoteAlarms.map(a=>({id:a.id,time:a.alarm_time.slice(0,5),label:a.label,enabled:a.is_enabled})),...localAlarms.filter(a=>!uuidPattern.test(a.id))]));
 let plan:Plan|null=null;
 const dbPlan=planResult.data as DbPlan|null;
 if(dbPlan){const {data,error}=await client.from('plan_blocks').select('*').eq('user_id',userId).eq('plan_id',dbPlan.id).order('starts_at');if(error)throw error;plan={strategy:dbPlan.strategy,blocks:(data??[]).map(b=>{const startAt=new Date(b.starts_at),endAt=new Date(b.ends_at);return {id:b.id,title:b.title,start:startAt.getHours()*60+startAt.getMinutes(),end:endAt.getHours()*60+endAt.getMinutes(),kind:b.block_type==='calendar'?'calendar':b.block_type==='break'?'break':'task',taskId:b.task_id??undefined};}),omitted:[],free:0};localStorage.setItem('daylight.plan',JSON.stringify(plan));}
 const preference=preferenceResult.data as {workday_start:string;workday_end:string}|null;
 return {tasks:mergedTasks,activities:mergedActivities,sleepLogs:mergedSleep,alarms:JSON.parse(localStorage.getItem('daylight.alarms')??'[]') as Alarm[],plan,preference};
}

export async function saveAcceptedPlan(client:SupabaseClient,userId:string,plan:Plan){
 const day=today();
 const {data:oldPlans,error:oldError}=await client.from('daily_plans').select('id').eq('user_id',userId).eq('plan_date',day).eq('status','accepted');if(oldError)throw oldError;
 if(oldPlans?.length){const {error}=await client.from('daily_plans').update({status:'superseded'}).eq('user_id',userId).eq('plan_date',day).eq('status','accepted');if(error)throw error;}
 const {data:created,error}=await client.from('daily_plans').insert({user_id:userId,plan_date:day,strategy:plan.strategy,status:'accepted',accepted_at:new Date().toISOString(),time_zone:Intl.DateTimeFormat().resolvedOptions().timeZone}).select('id').single();if(error)throw error;
 const rows=plan.blocks.map(b=>({user_id:userId,plan_id:created.id,task_id:b.taskId&&uuidPattern.test(b.taskId)?b.taskId:null,block_type:b.kind,title:b.title,starts_at:isoAt(day,b.start),ends_at:isoAt(day,b.end)}));
 if(rows.length){const {error:blockError}=await client.from('plan_blocks').insert(rows);if(blockError)throw blockError;}
}

export async function savePreference(client:SupabaseClient,userId:string,start:number,end:number){
 const {error}=await client.from('planner_preferences').upsert({user_id:userId,time_zone:Intl.DateTimeFormat().resolvedOptions().timeZone,workday_start:`${String(Math.floor(start/60)).padStart(2,'0')}:${String(start%60).padStart(2,'0')}`,workday_end:`${String(Math.floor(end/60)).padStart(2,'0')}:${String(end%60).padStart(2,'0')}`},{onConflict:'user_id'});if(error)throw error;
}

export async function removeDeletedOwnedRows(client:SupabaseClient,table:'activity_logs'|'alarms',userId:string,localIds:string[]){
 const {data,error}=await client.from(table).select('id').eq('user_id',userId);if(error)throw error;
 const keep=new Set(localIds.filter(id=>uuidPattern.test(id)));
 const removed=(data??[]).map(row=>row.id as string).filter(id=>!keep.has(id));
 if(removed.length){const {error:deleteError}=await client.from(table).delete().eq('user_id',userId).in('id',removed);if(deleteError)throw deleteError;}
}
