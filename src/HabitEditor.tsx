import {useState} from 'react';
import {ForegroundDialog} from './ForegroundDialog';
import {HabitIcon} from './HabitIcon';
import {habitSchedule,weekdayNames,type Habit} from './habitModel';
export function HabitEditor({habit,onSave,onClose}:{habit:Habit;onSave:(habit:Habit)=>void;onClose:()=>void}){
  const [draft,setDraft]=useState(habit);
  const change=(values:Partial<Habit>)=>setDraft(previous=>({...previous,...values}));
  const validDays=draft.frequency!=='weekly'||draft.weekdays.length>0;
  return <ForegroundDialog title={habit.title?'Edit habit or routine':'New habit or routine'} onClose={onClose}><form className="habit-editor" onSubmit={event=>{event.preventDefault();if(!validDays||!draft.title.trim())return;onSave({...draft,title:draft.title.trim(),autoSchedule:draft.frequency==='flexible'?false:draft.autoSchedule});}}>
    <label>Name<input autoFocus required maxLength={200} value={draft.title} onChange={event=>change({title:event.target.value})} placeholder="Read 5 pages, take out the trash…"/></label>
    <div className="habit-editor-pair"><label>Category<input value={draft.category} onChange={event=>change({category:event.target.value})}/></label><label>Icon<select value={draft.icon} onChange={event=>change({icon:event.target.value as Habit['icon']})}><option value="repeat">Routine</option><option value="book">Reading</option><option value="gym">Fitness</option><option value="trash">Trash & recycling</option><option value="home">Home</option></select></label></div>
    <label>Repeats<select value={draft.frequency} onChange={event=>change({frequency:event.target.value as Habit['frequency']})}><option value="daily">Every day</option><option value="weekly">On selected weekdays</option><option value="monthly">On a day of the month</option><option value="flexible">Flexible · choose each week</option></select></label>
    {draft.frequency==='weekly'&&<fieldset className="habit-weekdays"><legend>Which days?</legend><div>{weekdayNames.map((name,index)=><button type="button" key={name} aria-label={name} aria-pressed={draft.weekdays.includes(index)} onClick={()=>change({weekdays:draft.weekdays.includes(index)?draft.weekdays.filter(day=>day!==index):[...draft.weekdays,index].sort()})}>{name.slice(0,3)}</button>)}</div>{!validDays&&<p>Choose at least one day, such as your trash collection days.</p>}</fieldset>}
    {draft.frequency==='monthly'&&<label>Day of the month<input type="number" required min="1" max="31" value={draft.monthlyDay} onChange={event=>change({monthlyDay:Number(event.target.value)})}/><small>Months with fewer days use their last day.</small></label>}
    {draft.frequency==='flexible'&&<label>Usual sessions per week<input type="number" required min="0" max="21" value={draft.weeklyGoal} onChange={event=>change({weeklyGoal:Number(event.target.value)})}/><small>A guide, not a fixed schedule. Adjust individual weeks in Planner.</small></label>}
    <label>Time (optional)<input type="time" value={draft.time} required={draft.autoSchedule} onInput={event=>change({time:event.currentTarget.value})} onChange={event=>change({time:event.target.value})}/></label>
    <label className="habit-editor-check"><input type="checkbox" checked={draft.showOnToday} onChange={event=>change({showOnToday:event.target.checked})}/> Show a check on Today when due</label>
    <details className="habit-planning-settings"><summary>Optional Planner settings</summary><label>Session duration (minutes)<input type="number" required min="5" max="1440" step="5" value={draft.minutes} onChange={event=>change({minutes:Number(event.target.value)})}/></label>{draft.frequency!=='flexible'&&<label className="habit-editor-check"><input type="checkbox" checked={draft.autoSchedule} onChange={event=>change({autoSchedule:event.target.checked})}/> Reserve this time in Planner automatically</label>}<p>You can always drag a habit into Planner to arrange individual sessions.</p></details>
    <div className="habit-save-preview"><HabitIcon kind={draft.icon}/><span>{draft.title||'Your routine'}<small>{habitSchedule(draft)||'Choose your days'}{draft.time?` · ${draft.time}`:''}</small></span></div>
    <button className="button primary wide" type="submit" disabled={!validDays||!draft.title.trim()}>Save habit or routine</button>
  </form></ForegroundDialog>;
}
