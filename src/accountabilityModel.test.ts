import {test} from 'node:test';
import assert from 'node:assert/strict';
import {recordDailyEntry} from './accountabilityModel.ts';
import {newHabit,habitDue,habitChecks,habitCheckId,habitChecked,setHabitCheck,migrateHabits,habitTask,habitPlanRule,habitSchedule} from './habitModel.ts';
import type {Task} from './scheduler';
import type {Activity} from './hubTypes';
const id='3bed328a-f061-4b45-b893-ff723a8c1cd1';
const habit=newHabit(id,{title:'Read 5 pages',icon:'book'});
const task:Task={id,title:habit.title,project:'',category:'Personal',minutes:15,priority:2,selected:false,required:false,done:false};

test('permanent habits produce independent daily checks without a one-off task record',()=>{
 const activities=setHabitCheck([],habit,'2026-10-17',true);
 assert.equal(habitChecks('2026-10-17',[habit],activities)[0].checked,true);
 assert.equal(habitChecks('2026-10-18',[habit],activities)[0].checked,false);
 assert.equal(activities[0].sourceTaskId,undefined);
 assert.match(activities[0].id,/^[a-f\d]{8}-[a-f\d]{4}-4[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i);
 assert.equal(habitCheckId(id,'2026-10-17'),habitCheckId(id,'2026-10-17'));
 assert.notEqual(habitCheckId(id,'2026-10-17'),habitCheckId(id,'2026-10-18'));
});
test('trash routines appear only on their chosen collection days',()=>{
 const trash=newHabit(id,{title:'Take out the trash',icon:'trash',frequency:'weekly',weekdays:[1,4],time:'19:00'});
 assert.equal(habitDue(trash,'2026-10-20'),true);
 assert.equal(habitDue(trash,'2026-10-23'),true);
 assert.equal(habitDue(trash,'2026-10-21'),false);
 assert.equal(habitSchedule(trash),'Tue · Fri');
 assert.equal(habitChecks('2026-10-20',[trash],[])[0].icon,'trash');
});
test('monthly routines clamp short months and respect date bounds and pause settings',()=>{
 const monthly={...habit,frequency:'monthly' as const,monthlyDay:31};
 assert.equal(habitDue(monthly,'2026-02-28'),true);
 assert.equal(habitDue(monthly,'2028-02-29'),true);
 assert.equal(habitDue(monthly,'2026-02-27'),false);
 for(const values of [{paused:true},{archived:true},{showOnToday:false},{startDate:'2026-10-18'},{endDate:'2026-10-16'}])assert.equal(habitDue({...habit,...values},'2026-10-17'),false);
});
test('repeatable task migration is idempotent and preserves checks, IDs, sessions, and later edits',()=>{
 const rule={frequency:'weekly' as const,timesPerWeek:2,monthlyDay:1,weekdays:[1,4],time:'19:00'};
 const migrated=migrateHabits([],[task],{[id]:rule});
 assert.equal(migrated[0].id,id);assert.equal(migrated[0].legacyTaskId,id);assert.deepEqual(migrated[0].weekdays,[1,4]);assert.equal(migrated[0].autoSchedule,true);
 const oldActivity:Activity={id:'saved-check',date:'2026-10-17',label:task.title,category:'Personal',kind:'habit',sourceTaskId:id};
 assert.equal(habitChecked(migrated[0],'2026-10-17',[oldActivity]),true);
 const edited=[{...migrated[0],title:'Read 10 pages',archived:true}];
 assert.equal(migrateHabits(edited,[task],{[id]:rule}),edited);
 assert.equal(habitTask(migrated[0]).id,id);assert.equal(habitPlanRule(migrated[0]).frequency,'weekly');
 assert.equal(migrateHabits([],[task],{}).length,0);
});
test('checking and unchecking are idempotent and preserve other days and planned session logs',()=>{
 const migrated={...habit,legacyTaskId:id};
 const original:Activity[]=[{id:'previous',date:'2026-10-16',label:task.title,category:'Personal',sourceTaskId:id,kind:'habit'},{id:'planned',date:'2026-10-17',label:task.title,category:'Personal',sourceTaskId:id,kind:'task_completed'}];
 let activities=setHabitCheck(original,migrated,'2026-10-17',true);
 activities=setHabitCheck(activities,migrated,'2026-10-17',true);
 assert.equal(activities.length,3);
 assert.deepEqual(setHabitCheck(activities,migrated,'2026-10-17',false),original);
});
test('habit schedule alone does not reserve calendar time unless explicitly enabled',()=>{
 assert.equal(habitPlanRule({...habit,frequency:'weekly',weekdays:[1,4]}).frequency,'flexible');
 assert.equal(habitPlanRule({...habit,frequency:'weekly',weekdays:[1,4],time:'19:00',autoSchedule:true}).frequency,'weekly');
 assert.equal(habitPlanRule(habit).time,undefined);
 assert.equal(habitTask(habit).selected,false);
 assert.equal(habitTask({...habit,paused:true}).done,true);
});
test('daily history preserves past names and checks after schedules change or habits are archived',()=>{
 const checked=habitChecks('2026-10-17',[habit],setHabitCheck([],habit,'2026-10-17',true));
 let history=recordDailyEntry([],'2026-10-17',checked);
 const tomorrow=habitChecks('2026-10-18',[{...habit,title:'Read 10 pages'}],[]);
 history=recordDailyEntry(history,'2026-10-18',tomorrow);
 assert.equal(history[1].items[0].title,'Read 5 pages');assert.equal(history[1].items[0].checked,true);
 assert.equal(history[0].items[0].title,'Read 10 pages');assert.equal(history[0].items[0].checked,false);
 assert.equal(recordDailyEntry(history,'2026-10-18',tomorrow),history);
 assert.equal(recordDailyEntry(history,'2026-10-19',[]),history);
});
