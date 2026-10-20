import type {MuscleGroup} from './gymModel';
import {HeartPulse,PersonStanding} from 'lucide-react';
export function MuscleIcon({group,size=24}:{group:MuscleGroup;size?:number}){
 if(group==='cardio')return <HeartPulse size={size} aria-hidden="true"/>;
 if(group==='full')return <PersonStanding size={size} aria-hidden="true"/>;
 return <svg viewBox="0 0 28 36" width={size} height={size} fill="none" aria-hidden="true"><circle cx="14" cy="5" r="3" stroke="currentColor" opacity=".45"/><path d="M10 10 6 13 4 24M18 10l4 3 2 11M9 13l1 11-2 10M19 13l-1 11 2 10M10 24h8M14 25v9M10 10h8l1 13H9z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity=".4"/>
 {group==='chest'&&<path d="m10 11-1 6 5-1 5 1-1-6h-8z" fill="currentColor"/>}
 {group==='back'&&<path d="m10 11-1 6 5 6 5-6-1-6-4 3z" fill="currentColor"/>}
 {group==='shoulders'&&<><path d="M10 10 6 12l-1 5 4-1 2-5M18 10l4 2 1 5-4-1-2-5" fill="currentColor"/></>}
 {group==='arms'&&<path d="m5 16-2 8 3 1 3-10M23 16l2 8-3 1-3-10" fill="currentColor"/>}
 {group==='legs'&&<path d="m10 23-3 11h4l3-9 3 9h4l-3-11z" fill="currentColor"/>}
 {group==='core'&&<path d="M11 17h6l1 6h-8z" fill="currentColor"/>}
 </svg>;
}
