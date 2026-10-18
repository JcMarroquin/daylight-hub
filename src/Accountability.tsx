import {useEffect,useState} from 'react';
import {ListChecks,Plus,History,Check,ArrowRight,Pencil} from 'lucide-react';
import type {Activity} from './hubTypes';
import {recordDailyEntry,type DailyEntry} from './accountabilityModel';
import {habitChecks,type Habit} from './habitModel';
import {HabitIcon} from './HabitIcon';
import {ForegroundDialog} from './ForegroundDialog';
import './accountability.css';

type Props={date:string;habits:Habit[];activities:Activity[];account:string;ready:boolean;onCheck:(id:string,checked:boolean)=>void;onAdd:(title:string)=>void;onManage:()=>void;onEdit:(id:string)=>void};
const dateLabel=(date:string)=>new Intl.DateTimeFormat('en',{weekday:'long',month:'short',day:'numeric'}).format(new Date(`${date}T12:00:00`));
export function Accountability({date,habits,activities,account,ready,onCheck,onAdd,onManage,onEdit}:Props){
  const storageKey=`daylight.accountability.${account}`;
  const [history,setHistory]=useState<DailyEntry[]>(()=>{try{const value=JSON.parse(localStorage.getItem(storageKey)??'[]');return Array.isArray(value)?value:[];}catch{return [];}});
  const [showHistory,setShowHistory]=useState(false),[adding,setAdding]=useState(false),[title,setTitle]=useState('');
  const items=habitChecks(date,habits,activities),completed=items.filter(item=>item.checked).length;
  const signature=JSON.stringify(items);
  useEffect(()=>{if(!ready)return;setHistory(previous=>{const next=recordDailyEntry(previous,date,items);if(next!==previous)localStorage.setItem(storageKey,JSON.stringify(next));return next;});},[date,signature,ready,storageKey]);
  const entries=recordDailyEntry(history,date,items);
  return <section className="panel accountability" aria-label="Today's accountability"><div className="accountability-heading"><div className="accountability-heading-icon"><ListChecks size={21}/></div><div className="accountability-heading-copy"><span className="eyebrow">DAILY ENTRY · {new Intl.DateTimeFormat('en',{month:'short',day:'numeric'}).format(new Date(`${date}T12:00:00`))}</span><h2>Accountability</h2></div><span className="accountability-count" aria-live="polite">{completed}<small> / {items.length}</small></span><button className="icon-button" aria-label="Open accountability history" title="Daily history" onClick={()=>setShowHistory(true)}><History size={19}/></button></div>
    <div className="accountability-progress" role="progressbar" aria-label="Daily checks completed" aria-valuemin={0} aria-valuemax={items.length||1} aria-valuenow={completed}><span style={{width:`${items.length?completed/items.length*100:0}%`}}/></div>
    <div className="accountability-checks">{items.map(item=>{return <div className="accountability-row" key={item.taskId}><label className={`accountability-check ${item.checked?'is-checked':''}`}><input type="checkbox" aria-label={`Daily check: ${item.title}`} checked={item.checked} disabled={!ready} onChange={event=>onCheck(item.taskId,event.target.checked)}/><span className="accountability-box" aria-hidden="true">{item.checked&&<Check size={15}/>}</span><HabitIcon kind={item.icon} size={16}/><span>{item.title}</span></label><button className="accountability-edit" aria-label={`Edit ${item.title}`} onClick={()=>onEdit(item.taskId)}><Pencil size={15}/></button></div>;})}{!items.length&&<div className="accountability-empty"><p>Your daily checks, all in one place.</p><small>Add a permanent habit or routine. Only the checks due today appear here.</small></div>}</div>
    {items.length>0&&<p className="accountability-caption">{completed===items.length?'All checked for today. A fresh entry starts tomorrow.':'Check what you did today. Each day keeps its own record.'}</p>}
    <div className="accountability-actions"><button onClick={()=>setAdding(!adding)} aria-expanded={adding}><Plus size={15}/> Add habit</button><button onClick={onManage}>Habits & routines <ArrowRight size={14}/></button></div>
    {adding&&<form className="accountability-add" onSubmit={event=>{event.preventDefault();if(!title.trim())return;onAdd(title.trim());setTitle('');setAdding(false);}}><input aria-label="Daily check name" autoFocus placeholder="e.g. Read 5 pages" maxLength={200} required value={title} onChange={event=>setTitle(event.target.value)}/><button className="button primary" type="submit" disabled={!ready||!title.trim()}>Add</button><button type="button" onClick={()=>setAdding(false)}>Cancel</button></form>}
    {showHistory&&<ForegroundDialog title="Accountability history" onClose={()=>setShowHistory(false)}><p className="dialog-description">A daily card for each day you used your checklist. Past entries keep their original task names and checks.</p><div className="accountability-history">{entries.map(entry=><article className="accountability-history-card" key={entry.date}><div className="accountability-history-heading"><h3>{entry.date===date?'Today':dateLabel(entry.date)}</h3><span>{entry.items.filter(item=>item.checked).length}/{entry.items.length}</span></div><time dateTime={entry.date}>{entry.date}</time><ul>{entry.items.map(item=><li className={item.checked?'is-checked':''} key={item.taskId}><span className="accountability-box" aria-label={item.checked?'Checked':'Unchecked'}>{item.checked&&<Check size={13}/>}</span><span>{item.title}</span></li>)}</ul>{!entry.items.length&&<p>No checks on this day.</p>}</article>)}</div>{!entries.length&&<p className="empty">Add your first daily check to start your history.</p>}<p className="accountability-history-note">Daily cards are saved in this browser.</p></ForegroundDialog>}
  </section>;
}
