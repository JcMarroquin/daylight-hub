import {useState} from 'react';
import {Pencil,Plus,Check,RotateCcw} from 'lucide-react';
import type {Task} from './scheduler';
import {recurrenceLabel,type Recurrence} from './recurrence';

type Props={tasks:Task[];rule:(id:string)=>Recurrence;edit:(task:Task)=>void;toggle:(task:Task)=>void;select:(task:Task)=>void};
export function TaskManager({tasks,rule,edit,toggle,select}:Props){
 const [query,setQuery]=useState('');
 const matching=tasks.filter(task=>`${task.title} ${task.category??''} ${task.project??''}`.toLowerCase().includes(query.toLowerCase().trim()));
 const sections=[
  {key:'recurring',label:'Recurring',items:matching.filter(t=>!t.done&&rule(t.id).frequency!=='none')},
  {key:'active',label:'Active',items:matching.filter(t=>!t.done&&rule(t.id).frequency==='none')},
  {key:'completed',label:'Completed',items:matching.filter(t=>t.done)},
 ];
 return <div className="task-management"><div className="task-management-toolbar"><input aria-label="Search tasks" placeholder="Search tasks, categories or projects" value={query} onChange={event=>setQuery(event.target.value)}/><span>{matching.length} tasks</span></div>
  {sections.map(section=><section className="task-table-section panel" key={section.key}><div className="task-table-heading"><h2>{section.label} <span>{section.items.length}</span></h2>{section.key==='recurring'&&<p>Use Edit to change the days, frequency, and preferred time.</p>}</div>{section.items.length>0&&<div className="task-table-scroll"><table className="task-table"><thead><tr><th scope="col">Task</th><th scope="col">Type / project</th><th scope="col">Estimate</th><th scope="col">Due</th><th scope="col">Repeat</th><th scope="col">Today</th><th scope="col">Manage</th></tr></thead><tbody>{section.items.map(task=><tr key={task.id} className={task.done?'is-done':''}><th scope="row"><button className="task-table-name" onClick={()=>edit(task)}>{task.title}</button></th><td><strong>{task.category??'Personal'}</strong>{task.project&&<small>{task.project}</small>}</td><td>{task.minutes} min</td><td>{task.dueDate||'—'}</td><td><span className="task-table-repeat">{rule(task.id).frequency!=='none'&&<RotateCcw size={14}/>} {recurrenceLabel(rule(task.id))}</span></td><td>{task.done?'Done':task.selected?'Selected':'Backlog'}</td><td><div className="task-table-actions"><button aria-label={`Edit ${task.title}`} title="Edit task and recurrence" onClick={()=>edit(task)}><Pencil size={17}/></button><button aria-label={`${task.done?'Reopen':'Complete'} ${task.title}`} title={task.done?'Reopen':'Complete'} onClick={()=>toggle(task)}><Check size={17}/></button>{!task.done&&!task.selected&&<button aria-label={`Add ${task.title} to Today`} title="Add to Today" onClick={()=>select(task)}><Plus size={17}/></button>}</div></td></tr>)}</tbody></table></div>}{section.items.length===0&&<p className="task-table-empty">{query?'No matching tasks here.':section.key==='recurring'?'Set a recurrence rule in any task’s Edit menu.':section.key==='completed'?'Completed tasks will appear here.':'No active tasks in the backlog.'}</p>}</section>)}
 </div>;
}
