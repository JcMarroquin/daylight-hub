import {useEffect,useRef,useState} from 'react';
import type {SleepLog} from './hubTypes';
import {ForegroundDialog} from './ForegroundDialog';
import {localDay,shouldAskSleep} from './sleepPrompt';
import {QuarterHourTime} from './QuarterHourTime';
import {quarterHour} from './quarterHour';
export function MorningSleepPrompt({logs,onSave,blocked=false}:{logs:SleepLog[];onSave:(log:SleepLog)=>void;blocked?:boolean}){
  const [open,setOpen]=useState(false),[bed,setBed]=useState('23:00'),[wake,setWake]=useState('07:00'),[date,setDate]=useState(localDay(new Date())),[quality,setQuality]=useState(3);
  const latest=useRef({logs,blocked});latest.current={logs,blocked};
  const resumeCheck=useRef(()=>{});
  useEffect(()=>{
    const stored=Number(localStorage.getItem('daylight.last-active'));let last=stored||Date.now();
    function check(){const now=new Date();if(!latest.current.blocked&&shouldAskSleep(last,now,latest.current.logs.some(s=>s.wakeDate===localDay(now)),localStorage.getItem('daylight.sleep-prompt-dismissed'))){setDate(localDay(now));setWake(quarterHour(`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`));setOpen(true);}}
    function activity(){if(latest.current.blocked)return;check();const now=Date.now();if(now-last>30000){last=now;localStorage.setItem('daylight.last-active',String(last));}}
    function resume(){if(document.visibilityState==='visible')activity();}
    resumeCheck.current=activity;check();if(!stored)localStorage.setItem('daylight.last-active',String(last));
    window.addEventListener('pointerdown',activity);window.addEventListener('keydown',activity);window.addEventListener('focus',resume);document.addEventListener('visibilitychange',resume);
    return()=>{window.removeEventListener('pointerdown',activity);window.removeEventListener('keydown',activity);window.removeEventListener('focus',resume);document.removeEventListener('visibilitychange',resume);};
  },[]);
  useEffect(()=>{if(!blocked)resumeCheck.current();},[blocked]);
  function close(){localStorage.setItem('daylight.sleep-prompt-dismissed',localDay(new Date()));setOpen(false);}
  if(!open||blocked)return null;
  return <ForegroundDialog title="How did you sleep?" onClose={close}><p className="dialog-description">Welcome back. Confirm your approximate sleep times—we noticed a long overnight break, but inactivity isn’t a sleep measurement.</p><form className="sleep-prompt-form" onSubmit={e=>{e.preventDefault();onSave({id:crypto.randomUUID(),wakeDate:date,bedTime:bed,wakeTime:wake,quality});close();}}><label>Wake-up date<input type="date" required max={localDay(new Date())} value={date} onChange={e=>setDate(e.target.value)}/></label><div className="sleep-prompt-times"><label>Went to sleep<QuarterHourTime label="Went to sleep" value={bed} onChange={setBed}/></label><label>Woke up<QuarterHourTime label="Woke up" value={wake} onChange={setWake}/></label></div><label>How rested do you feel?<div className="quality-buttons">{[1,2,3,4,5].map(n=><button type="button" key={n} aria-pressed={quality===n} aria-label={`${n} out of 5`} className={quality===n?'quality-active':''} onClick={()=>setQuality(n)}>{n}</button>)}</div></label><button className="button primary" type="submit">Save sleep log</button><button className="button secondary" type="button" onClick={close}>Skip today</button></form></ForegroundDialog>;
}
