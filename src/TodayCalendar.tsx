import {useLayoutEffect,useRef,useState} from 'react';
import {Check} from 'lucide-react';
import type {Plan,Task} from './scheduler';
import {time} from './scheduler';
import {layoutDayCalendar} from './dayCalendarLayout';

export function TodayCalendar({plan,tasks,onComplete}:{plan:Plan;tasks:Task[];onComplete:(id:string,blockId:string)=>void}){
 const viewport=useRef<HTMLDivElement>(null),[height,setHeight]=useState(500);
 useLayoutEffect(()=>{const element=viewport.current;if(!element)return;const measure=()=>setHeight(element.clientHeight);measure();const observer=new ResizeObserver(measure);observer.observe(element);return()=>observer.disconnect();},[]);
 const layout=layoutDayCalendar(plan.blocks,height);
 return <div className="day-grid" ref={viewport}><div className="day-grid-track" style={{height:layout.height}}><div className="day-grid-labels">{layout.ticks.map(tick=><span key={tick.minute} style={{top:tick.top}}>{time(tick.minute)}</span>)}</div><div className="day-grid-canvas">{layout.ticks.map(tick=><i key={tick.minute} style={{top:tick.top}}/>)}{layout.placements.map(({block,top,height:cardHeight,size})=><article key={block.id} className={`day-event ${block.kind} size-${size}`} title={`${block.title} · ${time(block.start)} – ${time(block.end)}`} style={{top,height:cardHeight}}><div><span>{block.kind==='calendar'?'CALENDAR':block.kind==='break'?'PAUSE':'TASK'}</span><strong>{block.title}</strong><small>{time(block.start)} – {time(block.end)}</small></div>{block.taskId&&<button className="complete" aria-label={`Complete ${block.title}`} disabled={tasks.find(task=>task.id===block.taskId)?.done} onClick={()=>onComplete(block.taskId!,block.id)}><Check size={15}/></button>}</article>)}</div></div></div>;
}
