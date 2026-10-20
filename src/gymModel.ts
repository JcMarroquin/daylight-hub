import type {Activity} from './hubTypes';
export const muscleGroups=[{id:'chest',name:'Chest'},{id:'back',name:'Back'},{id:'shoulders',name:'Shoulders'},{id:'arms',name:'Arms'},{id:'legs',name:'Legs'},{id:'core',name:'Core'},{id:'cardio',name:'Cardio'},{id:'full',name:'Full body'}] as const;
export type MuscleGroup=typeof muscleGroups[number]['id'];
export type WeightUnit='kg'|'lb';
export type ExerciseSet={id:string;reps:number;kg:number;done:boolean};
export type GymExercise={id:string;name:string;type:'strength'|'cardio';sets:ExerciseSet[];minutes:number};
export type Workout={id:string;kind:'workout';date:string;trained:boolean;rest:boolean;groups:MuscleGroup[];exercises:GymExercise[];notes:string};
export type BodyWeight={id:string;kind:'weight';date:string;kg:number};
export type GymRecord=Workout|BodyWeight;
export const gymDate=(date=new Date())=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
export const workoutId=(date:string)=>`workout:${date}`;
export const weightId=(date:string)=>`weight:${date}`;
export function newWorkout(date:string):Workout{return {id:workoutId(date),kind:'workout',date,trained:false,rest:false,groups:[],exercises:[],notes:''};}
export function fromKg(kg:number,unit:WeightUnit){return Math.round(kg*(unit==='lb'?2.20462262185:1)*10)/10;}
export function toKg(value:number,unit:WeightUnit){return unit==='lb'?value/2.20462262185:value;}
export function workoutVolume(workout:Workout){return workout.exercises.reduce((sum,exercise)=>sum+(exercise.type==='strength'?exercise.sets.filter(set=>set.done).reduce((n,set)=>n+set.reps*set.kg,0):0),0);}
export function workoutSets(workout:Workout){return workout.exercises.reduce((sum,exercise)=>sum+(exercise.type==='strength'?exercise.sets.filter(set=>set.done).length:0),0);}
export function legacyGymDays(activities:Activity[]){return [...new Set(activities.filter(a=>a.kind==='gym_visit'||a.label==='Gym visit'&&a.category==='Fitness').map(a=>a.date))];}
export function withLegacyGymRecords(records:GymRecord[],activities:Activity[]){const ids=new Set(records.map(r=>r.id)),missing=legacyGymDays(activities).filter(date=>!ids.has(workoutId(date)));return missing.length?[...records,...missing.map(date=>({...newWorkout(date),trained:true}))]:records;}
export function gymAttendance(records:GymRecord[],activities:Activity[]){const days=new Set(legacyGymDays(activities));for(const record of records)if(record.kind==='workout'){if(record.trained)days.add(record.date);else days.delete(record.date);}return days;}
export function weightTrend(records:GymRecord[]){const weights=records.filter((r):r is BodyWeight=>r.kind==='weight').sort((a,b)=>a.date.localeCompare(b.date));const latest=weights.at(-1),first=weights[0];return {weights,latest,change:latest&&first&&weights.length>1?latest.kg-first.kg:null};}
export function validGymRecord(value:unknown):value is GymRecord{
 if(!value||typeof value!=='object')return false;const r=value as GymRecord;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(r.date)||gymDate(new Date(`${r.date}T12:00:00`))!==r.date)return false;
 if(r.kind==='weight')return r.id===weightId(r.date)&&Number.isFinite(r.kg)&&r.kg>=10&&r.kg<=500;
 if(r.kind!=='workout'||r.id!==workoutId(r.date)||typeof r.trained!=='boolean'||typeof r.rest!=='boolean'||r.rest&&r.trained||!Array.isArray(r.groups)||r.groups.some(group=>!muscleGroups.some(g=>g.id===group))||!Array.isArray(r.exercises)||typeof r.notes!=='string')return false;
 return r.exercises.every(e=>typeof e.id==='string'&&typeof e.name==='string'&&Boolean(e.name.trim())&&['strength','cardio'].includes(e.type)&&Number.isFinite(e.minutes)&&e.minutes>=(e.type==='cardio'?1:0)&&e.minutes<=1440&&Array.isArray(e.sets)&&e.sets.every(set=>typeof set.id==='string'&&Number.isFinite(set.kg)&&set.kg>=0&&set.kg<=1000&&Number.isInteger(set.reps)&&set.reps>=1&&set.reps<=200&&typeof set.done==='boolean'));
}
