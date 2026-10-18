import type {Task} from './scheduler';
import type {Recurrence} from './recurrence';
import type {Activity} from './hubTypes';
import type {DailyCheck} from './accountabilityModel';

export type Habit={id:string;title:string;category:string;icon:'repeat'|'book'|'gym'|'trash'|'home';frequency:'daily'|'weekly'|'monthly'|'flexible';weekdays:number[];monthlyDay:number;time:string;minutes:number;weeklyGoal:number;paused:boolean;archived:boolean;showOnToday:boolean;autoSchedule:boolean;startDate?:string;endDate?:string;legacyTaskId?:string};
export const weekdayNames=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
export function newHabit(id:string,values:Partial<Habit>={}):Habit{return {id,title:'',category:'Personal',icon:'repeat',frequency:'daily',weekdays:[],monthlyDay:1,time:'',minutes:15,weeklyGoal:3,paused:false,archived:false,showOnToday:true,autoSchedule:false,...values};}
export function migrateHabits(existing:Habit[],tasks:Task[],rules:Record<string,Recurrence>){
  const known=new Set(existing.map(habit=>habit.id));
  const additions=tasks.filter(task=>!known.has(task.id)&&rules[task.id]&&rules[task.id].frequency!=='none').map(task=>{const rule=rules[task.id];return newHabit(task.id,{title:task.title,category:task.category??task.project,icon:task.category==='Fitness'?'gym':'repeat',frequency:rule.frequency as Habit['frequency'],weekdays:rule.weekdays??Array.from({length:Math.min(7,rule.timesPerWeek)},(_,index)=>index),monthlyDay:rule.monthlyDay,time:rule.time??(rule.frequency==='flexible'?'':'09:00'),minutes:task.minutes,weeklyGoal:rule.timesPerWeek,archived:task.done,showOnToday:rule.accountability!==false,autoSchedule:rule.frequency!=='flexible',startDate:rule.startDate,endDate:rule.endDate,legacyTaskId:task.id});});
  return additions.length?[...existing,...additions]:existing;
}
export function habitDue(habit:Habit,date:string){
  if(habit.paused||habit.archived||!habit.showOnToday||(habit.startDate&&date<habit.startDate)||(habit.endDate&&date>habit.endDate))return false;
  const day=new Date(`${date}T12:00:00`);
  if(habit.frequency==='daily'||habit.frequency==='flexible')return true;
  if(habit.frequency==='weekly')return habit.weekdays.includes((day.getDay()+6)%7);
  return day.getDate()===Math.min(habit.monthlyDay,new Date(day.getFullYear(),day.getMonth()+1,0).getDate());
}
export function habitSchedule(habit:Habit){return habit.frequency==='daily'?'Every day':habit.frequency==='flexible'?`Flexible · aim for ${habit.weeklyGoal} / week`:habit.frequency==='monthly'?`Monthly · day ${habit.monthlyDay}`:habit.weekdays.length===7?'Every day':habit.weekdays.map(day=>weekdayNames[day].slice(0,3)).join(' · ');}
/** Stable check-in UUIDs need no link to the one-off tasks table. */
export function habitCheckId(habitId:string,date:string){
  const [year,month,day]=date.split('-').map(Number),ordinal=Date.UTC(year,month-1,day)/86400000;
  const tail=((parseInt(habitId.slice(-8),16)^ordinal)>>>0).toString(16).padStart(8,'0');
  return habitId.slice(0,-8)+tail;
}
export function habitChecked(habit:Habit,date:string,activities:Activity[]){return activities.some(activity=>activity.kind==='habit'&&activity.date===date&&(activity.id===habitCheckId(habit.id,date)||Boolean(habit.legacyTaskId&&activity.sourceTaskId===habit.legacyTaskId)));}
export function habitChecks(date:string,habits:Habit[],activities:Activity[]):DailyCheck[]{return habits.filter(habit=>habitDue(habit,date)).map(habit=>({taskId:habit.id,title:habit.title,category:habit.category,icon:habit.icon,checked:habitChecked(habit,date,activities)}));}
export function setHabitCheck(activities:Activity[],habit:Habit,date:string,checked:boolean):Activity[]{
  const id=habitCheckId(habit.id,date),matches=(activity:Activity)=>activity.kind==='habit'&&activity.date===date&&(activity.id===id||Boolean(habit.legacyTaskId&&activity.sourceTaskId===habit.legacyTaskId));
  const existing=activities.find(matches),remaining=activities.filter(activity=>!matches(activity));
  return checked?[...remaining,{id:existing?.id??id,date,category:habit.category,label:habit.title,kind:'habit',sourceTaskId:habit.legacyTaskId}]:remaining;
}
export function habitTask(habit:Habit):Task{return {id:habit.id,title:habit.title,project:'',category:habit.category,minutes:habit.minutes,priority:2,selected:false,required:false,done:habit.paused||habit.archived};}
export function habitPlanRule(habit:Habit):Recurrence{return {frequency:habit.autoSchedule?habit.frequency:'flexible',timesPerWeek:habit.frequency==='weekly'?habit.weekdays.length:habit.weeklyGoal,monthlyDay:habit.monthlyDay,weekdays:habit.weekdays,time:habit.time||undefined,startDate:habit.startDate,endDate:habit.endDate,accountability:false};}
