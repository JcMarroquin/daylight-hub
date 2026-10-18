import {useState} from 'react';
import type {Task} from './scheduler';
import type {Recurrence} from './recurrence';
import {ForegroundDialog} from './ForegroundDialog';
export function TaskEditor({task,onSave,onDelete,onClose}:{task:Task;rule:Recurrence;onSave:(task:Task,rule:Recurrence)=>void;onDelete:()=>void;onClose:()=>void}){
 const [draft,setDraft]=useState(task),[confirm,setConfirm]=useState(false);
 const field=(change:Partial<Task>)=>setDraft({...draft,...change});
 return <ForegroundDialog title="Edit task" onClose={onClose}><form className="task-editor" onSubmit={event=>{event.preventDefault();onSave({...draft,title:draft.title.trim()},{frequency:'none',timesPerWeek:1,monthlyDay:1});}}>
 <label>Task name<input required value={draft.title} onChange={event=>field({title:event.target.value})}/></label><div className="task-editor-pair"><label>Category<input value={draft.category??draft.project} onChange={event=>field({category:event.target.value})}/></label><label>Project<input value={draft.project} onChange={event=>field({project:event.target.value})}/></label></div>
 <div className="task-editor-pair"><label>Duration (minutes)<input type="number" required min="5" max="1440" step="5" value={draft.minutes} onChange={event=>field({minutes:Number(event.target.value)})}/></label><label>Due date<input type="date" value={draft.dueDate??''} onChange={event=>field({dueDate:event.target.value||undefined})}/></label></div>
 <p className="task-editor-hint">Tasks are one-off things to finish. Manage permanent habits and repeating household responsibilities in Habits & routines.</p>
 <label className="task-editor-check"><input type="checkbox" checked={draft.selected} onChange={event=>field({selected:event.target.checked})}/> Include in Today</label><label className="task-editor-check"><input type="checkbox" checked={draft.done} onChange={event=>field({done:event.target.checked})}/> Completed</label>
 <button className="button primary" type="submit">Save task</button><button className="button secondary danger" type="button" onClick={()=>setConfirm(true)}>Delete task</button>
 {confirm&&<div className="delete-task-confirm"><p>Delete this task and its scheduled blocks?</p><button className="button danger" type="button" onClick={onDelete}>Delete task</button><button className="button secondary" type="button" onClick={()=>setConfirm(false)}>Keep task</button></div>}
 </form></ForegroundDialog>;
}
