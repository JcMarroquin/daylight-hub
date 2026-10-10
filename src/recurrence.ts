export type Recurrence={frequency:'none'|'daily'|'weekly'|'monthly';timesPerWeek:number;monthlyDay:number;time?:string;startDate?:string;endDate?:string;weekdays?:number[]};
export type WeekBlock={id:string;taskId:string;date:string;start:string};
const key=(d:Date)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
export function recurringWeek(start:Date,tasks:{id:string;done:boolean}[],rules:Record<string,Recurrence>,manual:WeekBlock[],skipped:string[]){
  const additions:WeekBlock[]=[];
  for(let i=0;i<7;i++){const date=new Date(start);date.setDate(date.getDate()+i);const day=key(date);for(const task of tasks){const r=rules[task.id];if(!r||task.done||r.frequency==='none'||(r.startDate&&day<r.startDate)||(r.endDate&&day>r.endDate)||skipped.includes(`${task.id}:${day}`)||manual.some(b=>b.taskId===task.id&&b.date===day))continue;
    const weekdays=r.weekdays?.length?r.weekdays:Array.from({length:Math.min(7,r.timesPerWeek)},(_,n)=>n);
    if(r.frequency==='daily'||r.frequency==='weekly'&&weekdays.includes((date.getDay()+6)%7)||r.frequency==='monthly'&&date.getDate()===Math.min(r.monthlyDay,new Date(date.getFullYear(),date.getMonth()+1,0).getDate()))additions.push({id:`rec:${task.id}:${day}`,taskId:task.id,date:day,start:r.time??'09:00'});
  }}return [...manual,...additions];
}
export const recurrenceLabel=(r:Recurrence)=>r.frequency==='daily'?'Daily':r.frequency==='weekly'?`${r.weekdays?.length||r.timesPerWeek}× / week`:r.frequency==='monthly'?`Monthly · day ${r.monthlyDay}`:'One-time';
