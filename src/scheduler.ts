export type Task = { id: string; title: string; project: string; category?: string; dueDate?: string; minutes: number; priority: number; selected: boolean; required: boolean; done: boolean; };
export type Commitment = { id: string; title: string; start: number; end: number; };
export type Block = Commitment & { taskId?: string; kind: 'task' | 'calendar' | 'break' };
export type Strategy = 'Focus' | 'Balanced' | 'Essentials';
export type Plan = { strategy: Strategy; blocks: Block[]; omitted: { task: Task; reason: string }[]; free: number; };
export const strategies: Strategy[] = ['Focus', 'Balanced', 'Essentials'];
export function generate(tasks: Task[], commitments: Commitment[], strategy: Strategy, start = 540, end = 1080): Plan {
  const busy = commitments.filter(c => c.end > start && c.start < end).map(c => ({...c, start: Math.max(start,c.start),end: Math.min(end,c.end)})).sort((a,b)=>a.start-b.start);
  const windows: {start:number; end:number}[] = [];
  let cursor = start;
  for (const c of busy) { if(c.start>cursor) windows.push({start:cursor,end:c.start}); cursor=Math.max(cursor,c.end); }
  if(cursor<end) windows.push({start:cursor,end});
  const blocks: Block[] = busy.map(c=>({...c,kind:'calendar'}));
  const omitted: Plan['omitted'] = [];
  const candidates = tasks.filter(t=>t.selected&&!t.done);
  for(const task of candidates) {
    if(!Number.isFinite(task.minutes)||task.minutes<=0) {omitted.push({task,reason:'Add a positive duration estimate.'}); continue;}
    const index = windows.findIndex(w=>w.end-w.start>=task.minutes);
    if(index<0) {omitted.push({task,reason:'No uninterrupted window is long enough.'});continue;}
    const w = windows[index];
    blocks.push({id:`task-${task.id}`,taskId:task.id,title:task.title,start:w.start,end:w.start+task.minutes,kind:'task'});
    w.start+=task.minutes;
  }
  return {strategy,blocks:blocks.sort((a,b)=>a.start-b.start),omitted,free:windows.reduce((sum,w)=>sum+w.end-w.start,0)};
}
export function time(minutes:number) {return `${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}`;}
