import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHabitStore,checkActivities,habitSyncError,type HabitTransport,type HabitRemote} from './habitSync.ts';
import {newHabit,habitCheckId} from './habitModel.ts';
const id='3bed328a-f061-4b45-b893-ff723a8c1cd1',date='2026-10-18';
const habit=newHabit(id,{title:'Gym',frequency:'weekly',weekdays:[0,2,4],icon:'gym'});
const storage=()=>{const map=new Map<string,string>();return {getItem:(k:string)=>map.get(k)??null,setItem:(k:string,v:string)=>{map.set(k,v);}};};
function cloud(){const rows:HabitRemote={habits:[],checks:[]};const api:HabitTransport={async read(){return structuredClone(rows);},async write(habits,checks){for(const h of habits)rows.habits=[...rows.habits.filter(r=>r.id!==h.id),structuredClone(h)];for(const c of checks)rows.checks=[...rows.checks.filter(r=>r.id!==c.id),structuredClone(c)];}};return {rows,api};}
const sync=(store:ReturnType<typeof createHabitStore>,api:HabitTransport,seed=()=>{})=>store.sync(api,new AbortController().signal,seed);

test('two devices sync creation, schedule edits, pause, archive and restore without a task record',async()=>{
 const {api}=cloud(),a=createHabitStore('user',storage()),b=createHabitStore('user',storage());
 a.save(habit);await sync(a,api);await sync(b,api);assert.deepEqual(b.getSnapshot().habits,[habit]);
 b.save({...habit,weekdays:[1,5],time:'18:00',paused:true,archived:true});await sync(b,api);await sync(a,api);
 assert.deepEqual(a.getSnapshot().habits[0].weekdays,[1,5]);assert.equal(a.getSnapshot().habits[0].archived,true);
 a.save({...a.getSnapshot().habits[0],paused:false,archived:false});await sync(a,api);await sync(b,api);assert.equal(b.getSnapshot().habits[0].archived,false);
});
test('first upgrade imports missing local habits while existing cloud edits win over stale caches',async()=>{
 const {api,rows}=cloud(),local=storage();rows.habits=[{...habit,title:'Edited on phone'}];local.setItem('daylight.habits.user',JSON.stringify([habit]));
 const a=createHabitStore('user',local);await sync(a,api);assert.equal(a.getSnapshot().habits[0].title,'Edited on phone');assert.equal(rows.habits[0].title,'Edited on phone');
 const other=newHabit('4bed328a-f061-4b45-b893-ff723a8c1cd1',{title:'Trash'});const old=storage();old.setItem('daylight.habits.user',JSON.stringify([other]));await sync(createHabitStore('user',old),api);assert.equal(rows.habits.length,2);
});
test('daily checks and explicit unchecks sync and do not resurrect from old activities',async()=>{
 const {api}=cloud(),a=createHabitStore('user',storage()),b=createHabitStore('user',storage());a.save(habit);a.check(habit,date,true);await sync(a,api);await sync(b,api);assert.equal(b.getSnapshot().checks[0].checked,true);
 b.check(habit,date,false);await sync(b,api);await sync(a,api);assert.equal(a.getSnapshot().checks[0].checked,false);
 const legacy={id:habitCheckId(id,date),date,label:'Gym',category:'Fitness',kind:'habit' as const};
 await sync(a,api,()=>a.seed([],{},[legacy]));assert.equal(a.getSnapshot().checks[0].checked,false);assert.deepEqual(checkActivities([legacy],a.getSnapshot().checks),[]);
});
test('offline outbox survives reload, imports existing checks, and retries after missing migration',async()=>{
 const local=storage(),a=createHabitStore('user',local);a.save(habit);a.check(habit,date,true);
 await sync(a,{async read(){throw {code:'PGRST205'};},async write(){throw Error('unexpected');}});assert.match(a.getSnapshot().status,/202610180001_habit_sync.sql/);
 const b=createHabitStore('user',local),{api,rows}=cloud();await sync(b,api);assert.equal(rows.habits.length,1);assert.equal(rows.checks[0].checked,true);assert.equal(Object.keys(b.getSnapshot().pendingChecks).length,0);
});
test('legacy checks only migrate to their own habit and retain previous dates',async()=>{
 const {api,rows}=cloud(),a=createHabitStore('user',storage());a.save(habit);a.save(newHabit('4bed328a-f061-4b45-b893-ff723a8c1cd1',{title:'Read'}));
 const old={id:habitCheckId(id,'2026-10-17'),date:'2026-10-17',label:'Gym',category:'Fitness',kind:'habit' as const};await sync(a,api,()=>a.seed([],{},[old]));assert.equal(rows.checks.length,1);assert.equal(rows.checks[0].habitId,id);assert.equal(rows.checks[0].date,'2026-10-17');
});
test('new edits during a slow upload are not cleared with the older outbox batch',async()=>{
 const {api,rows}=cloud(),a=createHabitStore('user',storage());a.save(habit);let finish!:()=>void,started!:()=>void;const began=new Promise<void>(resolve=>{started=resolve;});let first=true;
 const slow:HabitTransport={read:api.read,async write(h,c,s){if(first){first=false;started();await new Promise<void>(resolve=>{finish=resolve;});}await api.write(h,c,s);}};
 const syncing=sync(a,slow);await began;a.save({...habit,title:'Latest edit'});finish();await syncing;assert.equal(rows.habits[0].title,'Latest edit');assert.equal(Object.keys(a.getSnapshot().pendingHabits).length,0);
});
test('account caches and pending edits stay separate',()=>{const local=storage(),a=createHabitStore('a',local),b=createHabitStore('b',local);a.save(habit);assert.equal(b.getSnapshot().habits.length,0);assert.equal(createHabitStore('b',local).getSnapshot().habits.length,0);assert.equal(createHabitStore('a',local).getSnapshot().habits.length,1);});
test('cancelled account requests cannot replace the cache or acknowledge queued edits',async()=>{
 const a=createHabitStore('user',storage());a.save(habit);const controller=new AbortController();const api:HabitTransport={async read(){controller.abort();return {habits:[],checks:[]};},async write(){throw Error('unexpected');}};await a.sync(api,controller.signal,()=>{});assert.equal(a.getSnapshot().habits.length,1);assert.equal(Object.keys(a.getSnapshot().pendingHabits).length,1);
 assert.match(habitSyncError({message:'offline'}),/offline/);
});
test('devices editing different habits never overwrite the other cached rows',async()=>{
 const {api,rows}=cloud(),a=createHabitStore('user',storage()),b=createHabitStore('user',storage()),other=newHabit('4bed328a-f061-4b45-b893-ff723a8c1cd1',{title:'Read'});
 a.save(habit);a.save(other);await sync(a,api);await sync(b,api);a.save({...habit,title:'Gym on Monday'});b.save({...other,title:'Read a chapter'});await sync(a,api);await sync(b,api);assert.equal(rows.habits.find(h=>h.id===id)?.title,'Gym on Monday');assert.equal(rows.habits.find(h=>h.id===other.id)?.title,'Read a chapter');
});
test('failed writes retain both edits and check tombstones until a successful retry',async()=>{
 const {api,rows}=cloud(),a=createHabitStore('user',storage());a.save(habit);a.check(habit,date,false);await sync(a,{read:api.read,async write(){throw Error('offline');}});assert.equal(Object.keys(a.getSnapshot().pendingHabits).length,1);assert.equal(Object.keys(a.getSnapshot().pendingChecks).length,1);assert.match(a.getSnapshot().status,/offline/);await sync(a,api);assert.equal(rows.checks[0].checked,false);assert.equal(Object.keys(a.getSnapshot().pendingChecks).length,0);
});
