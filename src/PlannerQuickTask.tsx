import {useEffect,useRef,useState} from 'react';
import {ForegroundDialog} from './ForegroundDialog';
import type {CalendarDraft,CalendarTask} from './calendarInteraction';
export function PlannerQuickTask({draft,onCreate,onClose}:{draft:CalendarDraft;onCreate:(task:CalendarTask)=>void;onClose:()=>void}){
 const [title,setTitle]=useState(''),[date,setDate]=useState(draft.date),[start,setStart]=useState(draft.start),[minutes,setMinutes]=useState(draft.minutes);const input=useRef<HTMLInputElement>(null);
 useEffect(()=>{const frame=requestAnimationFrame(()=>input.current?.focus());return()=>cancelAnimationFrame(frame);},[]);
 const remaining=1440-(Number(start.slice(0,2))*60+Number(start.slice(3))),valid=title.trim()&&date&&start&&minutes>=15&&minutes<=remaining;
 return <ForegroundDialog title="New scheduled task" onClose={onClose}><form className="planner-quick-task" onSubmit={event=>{event.preventDefault();if(valid){onCreate({title:title.trim(),date,start,minutes});onClose();}}}>
 <input ref={input} aria-label="Task title" className="planner-quick-title" placeholder="Add a title" required maxLength={200} value={title} onChange={event=>setTitle(event.target.value)}/>
 <label>Date<input type="date" required value={date} onChange={event=>setDate(event.target.value)}/></label>
 <div className="task-editor-pair"><label>Start time<input type="time" step="900" required value={start} onInput={event=>setStart(event.currentTarget.value)} onChange={event=>setStart(event.target.value)}/></label><label>Duration (minutes)<input type="number" required min="15" max={remaining} step="15" value={minutes} onChange={event=>setMinutes(Number(event.target.value))}/></label></div>
 <div className="planner-duration-options" role="group" aria-label="Task duration">{[15,30,60].map(value=><button type="button" key={value} disabled={value>remaining} aria-pressed={minutes===value} onClick={()=>setMinutes(value)}>{value} min</button>)}</div>
 {minutes>remaining&&<p role="status">Shorten this task to finish before midnight.</p>}
 <button className="button primary" type="submit" disabled={!valid}>Save task</button><p>Saved directly to this time slot. You can add more details later.</p>
 </form></ForegroundDialog>;
}
