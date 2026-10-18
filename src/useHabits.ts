import {useEffect,useState} from 'react';
import type {Task} from './scheduler';
import type {Recurrence} from './recurrence';
import {migrateHabits,type Habit} from './habitModel';
const key=(account:string)=>`daylight.habits.${account}`;
function read(account:string):Habit[]{try{const value=JSON.parse(localStorage.getItem(key(account))??'[]');return Array.isArray(value)?value:[];}catch{return [];}}
export function useHabits(account:string,tasks:Task[],rules:Record<string,Recurrence>,ready:boolean){
  const [state,setState]=useState(()=>({account,habits:read(account)}));
  const habits=state.account===account?state.habits:read(account);
  useEffect(()=>{setState(previous=>{const current=previous.account===account?previous.habits:read(account),next=ready?migrateHabits(current,tasks,rules):current;if(next===current&&previous.account===account)return previous;if(next!==current)localStorage.setItem(key(account),JSON.stringify(next));return {account,habits:next};});},[account,tasks,rules,ready]);
  const save=(change:Habit|((previous:Habit[])=>Habit[]))=>setState(previous=>{const current=previous.account===account?previous.habits:read(account);const next=typeof change==='function'?change(current):current.some(habit=>habit.id===change.id)?current.map(habit=>habit.id===change.id?change:habit):[...current,change];localStorage.setItem(key(account),JSON.stringify(next));return {account,habits:next};});
  return {habits,save};
}
