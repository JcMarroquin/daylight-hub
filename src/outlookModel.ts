import type {Task} from './scheduler';
import {recurringWeek,type WeekBlock,type Recurrence} from './recurrence.ts';
export const plannerDayKey=(date:Date)=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
export function outlookDays(start:Date){return Array.from({length:3},(_,index)=>{const date=new Date(start);date.setDate(date.getDate()+index);return date;});}
export function planningBlocks(start:Date,tasks:Task[],rules:Record<string,Recurrence>,manual:WeekBlock[],skipped:string[]){
  const monday=new Date(start);monday.setDate(monday.getDate()-(monday.getDay()+6)%7);const next=new Date(monday);next.setDate(next.getDate()+7);
  return Array.from(new Map([...recurringWeek(monday,tasks,rules,manual,skipped),...recurringWeek(next,tasks,rules,manual,skipped)].map(block=>[block.id,block])).values());
}
export function outlookItems(date:string,today:string,tasks:Task[],blocks:WeekBlock[]){
  return tasks.filter(task=>!task.done).flatMap(task=>{
    const scheduled=blocks.filter(block=>block.taskId===task.id&&block.date===date);
    if(scheduled.length)return scheduled.map(block=>({task,block:block as WeekBlock|undefined}));
    return date===today&&task.selected?[{task,block:undefined}]:[];
  }).sort((a,b)=>(a.block?.start??'24:00').localeCompare(b.block?.start??'24:00')||b.task.priority-a.task.priority);
}

/** Give overlapping events separate lanes, including their minimum readable height. */
export function timelineLanes(items:{task:Task;block:WeekBlock|undefined}[]){
  const positions=new Map<string,{lane:number;lanes:number}>();
  const events=items.filter(item=>item.block).map(item=>{const [h,m]=item.block!.start.split(':').map(Number);return {id:item.block!.id,start:h*60+m,end:h*60+m+Math.max(44,item.task.minutes)};}).sort((a,b)=>a.start-b.start);
  let index=0;
  while(index<events.length){const group=[events[index++]];let end=group[0].end;while(index<events.length&&events[index].start<end){end=Math.max(end,events[index].end);group.push(events[index++]);}const laneEnds:number[]=[];for(const event of group){let lane=laneEnds.findIndex(value=>value<=event.start);if(lane<0)lane=laneEnds.length;laneEnds[lane]=event.end;positions.set(event.id,{lane,lanes:0});}for(const event of group)positions.get(event.id)!.lanes=laneEnds.length;}
  return positions;
}
