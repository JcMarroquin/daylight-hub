export type DailyCheck={taskId:string;title:string;category:string;icon?:string;checked:boolean};
export type DailyEntry={date:string;items:DailyCheck[]};
export function recordDailyEntry(history:DailyEntry[],date:string,items:DailyCheck[]):DailyEntry[]{
  const existing=history.find(entry=>entry.date===date);
  if(existing&&JSON.stringify(existing.items)===JSON.stringify(items))return history;
  if(!existing&&!items.length)return history;
  return [...history.filter(entry=>entry.date!==date),{date,items:items.map(item=>({...item}))}].sort((a,b)=>b.date.localeCompare(a.date));
}
