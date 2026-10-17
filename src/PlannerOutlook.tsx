import {useState,type DragEvent} from 'react';
import {ChevronLeft,ChevronRight,GripVertical,Pencil,ArrowRight} from 'lucide-react';
import type {Task} from './scheduler';
import {recurrenceLabel,type Recurrence,type WeekBlock} from './recurrence';
import {outlookDays,outlookItems,plannerDayKey} from './outlookModel';
import {useWeekTouchDrag} from './useWeekTouchDrag';

type Props={start:Date;onStart:(date:Date)=>void;tasks:Task[];blocks:WeekBlock[];shifts:{date:string;start:string;end:string}[];rule:(id:string)=>Recurrence;edit:(task:Task)=>void;place:(payload:string,date:string)=>void;onTime:(block:WeekBlock,time:string)=>void;openToday:()=>void};
export function PlannerOutlook({start,onStart,tasks,blocks,shifts,rule,edit,place,onTime,openToday}:Props){
  const [query,setQuery]=useState('');
  const days=outlookDays(start),today=plannerDayKey(new Date());
  const touch=useWeekTouchDrag((payload,date)=>place(payload,date),'.outlook-drop');
  const backlog=tasks.filter(task=>!task.done&&!task.selected&&!blocks.some(block=>block.taskId===task.id&&days.some(day=>plannerDayKey(day)===block.date))&&`${task.title} ${task.category??''} ${task.project}`.toLowerCase().includes(query.toLowerCase()));
  function shift(amount:number){const next=new Date(start);next.setDate(next.getDate()+amount);onStart(next);}
  function drop(event:DragEvent<HTMLElement>,date:string){event.preventDefault();place(event.dataTransfer.getData('text/plain'),date);}
  const card=(task:Task,block?:WeekBlock,date='backlog')=>{
    const payload=block?`block:${block.id}`:`task:${task.id}`;
    return <article className="outlook-card" key={block?.id??task.id} draggable onDragStart={event=>{event.dataTransfer.setData('text/plain',payload);event.dataTransfer.effectAllowed='move';}}>
      <div className="outlook-card-top"><span className="outlook-grip" title="Drag task to a day" aria-hidden="true" onPointerDown={event=>touch.start(event,payload,task.minutes)} onPointerMove={touch.move} onPointerUp={touch.end} onPointerCancel={touch.cancel}><GripVertical size={20}/></span><span className="tag">{task.category??task.project}</span><button className="task-edit-icon" aria-label={`Edit ${task.title}`} onClick={()=>edit(task)}><Pencil size={17}/></button></div>
      <h3>{task.title}</h3>
      {task.project&&task.project!==task.category&&<p className="outlook-project">{task.project}</p>}
      <dl className="outlook-facts"><div><dt>Estimate</dt><dd>{task.minutes} min</dd></div><div><dt>Priority</dt><dd>{task.priority===3?'High':task.priority===2?'Normal':'Low'}</dd></div>{task.dueDate&&<div><dt>Due</dt><dd>{task.dueDate}</dd></div>}</dl>
      {rule(task.id).frequency!=='none'&&<p className="outlook-repeat">{recurrenceLabel(rule(task.id))}</p>}
      {block?<label className="outlook-time">Start time<input type="time" required aria-label={`Start time for ${task.title} on ${date}`} value={block.start} onChange={event=>{if(event.target.value)onTime(block,event.target.value);}}/></label>:date===today&&<p className="outlook-repeat">Fills available time today</p>}
      <label className="outlook-move">{date==='backlog'?'Plan for':'Move to'}<select aria-label={`Plan day for ${task.title}${date==='backlog'?'':` on ${date}`}`} value={date} onChange={event=>place(payload,event.target.value)}><option value="backlog">Backlog</option>{days.map(day=><option key={plannerDayKey(day)} value={plannerDayKey(day)}>{plannerDayKey(day)===today?'Today':new Intl.DateTimeFormat('en',{weekday:'short',month:'short',day:'numeric'}).format(day)}</option>)}</select></label>
    </article>;
  };
  return <div className="planner-outlook"><div className="outlook-toolbar"><div className="outlook-range"><button className="icon-button" aria-label="Previous three days" onClick={()=>shift(-3)}><ChevronLeft size={20}/></button><h2>{new Intl.DateTimeFormat('en',{month:'short',day:'numeric'}).format(days[0])} – {new Intl.DateTimeFormat('en',{month:'short',day:'numeric',year:'numeric'}).format(days[2])}</h2><button className="icon-button" aria-label="Next three days" onClick={()=>shift(3)}><ChevronRight size={20}/></button></div><button className="button secondary" onClick={()=>onStart(new Date())}>Today</button><button className="button secondary" onClick={openToday}>Today's calendar <ArrowRight size={16}/></button></div>
    <p className="outlook-instructions">Drag cards between days, or use “Plan for” and “Move to”. On a phone, drag using the grip beside the task type.</p>
    <div className="outlook-layout"><section className="panel outlook-backlog outlook-drop" data-date="backlog" onDragOver={event=>event.preventDefault()} onDrop={event=>drop(event,'backlog')}><div className="panel-title"><h2>Backlog</h2><span>{backlog.length}</span></div><input className="search" aria-label="Search backlog" placeholder="Search tasks or projects…" value={query} onChange={event=>setQuery(event.target.value)}/><div className="outlook-cards">{backlog.map(task=>card(task))}{!backlog.length&&<p className="empty">{query?'No matching tasks.':'Your backlog is clear.'}</p>}</div></section>
      <div className="outlook-days">{days.map(day=>{const date=plannerDayKey(day),items=outlookItems(date,today,tasks,blocks),duration=items.reduce((total,item)=>total+item.task.minutes,0);return <section key={date} className={`panel outlook-day outlook-drop ${date===today?'is-today':''}`} data-date={date} onDragOver={event=>event.preventDefault()} onDrop={event=>drop(event,date)}><div className="outlook-day-heading"><span>{date===today?'Today':new Intl.DateTimeFormat('en',{weekday:'long'}).format(day)}</span><h2>{new Intl.DateTimeFormat('en',{month:'short',day:'numeric'}).format(day)}</h2><p>{items.length} tasks · {Math.floor(duration/60)}h {duration%60}m</p></div>{shifts.filter(shift=>shift.date===date).map((shift,index)=><p className="outlook-shift" key={index}>Work · {shift.start}–{shift.end}</p>)}<div className="outlook-cards">{items.map(({task,block})=>card(task,block,date))}</div>{!items.length&&<div className="drop-zone">Drop a task here or choose this day from a card.</div>}</section>;})}</div>
    </div>
  </div>;
}
