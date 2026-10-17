import type {Task} from './scheduler';
import type {WeekBlock} from './recurrence';
export const plannerDayKey=(date:Date)=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
export function outlookDays(start:Date){return Array.from({length:3},(_,index)=>{const date=new Date(start);date.setDate(date.getDate()+index);return date;});}
export function outlookItems(date:string,today:string,tasks:Task[],blocks:WeekBlock[]){
  return tasks.filter(task=>!task.done).flatMap(task=>{
    const scheduled=blocks.filter(block=>block.taskId===task.id&&block.date===date);
    if(scheduled.length)return scheduled.map(block=>({task,block:block as WeekBlock|undefined}));
    return date===today&&task.selected?[{task,block:undefined}]:[];
  }).sort((a,b)=>(a.block?.start??'24:00').localeCompare(b.block?.start??'24:00')||b.task.priority-a.task.priority);
}
