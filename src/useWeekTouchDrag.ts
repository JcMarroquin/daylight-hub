import {useEffect,useRef,type PointerEvent} from 'react';
import {snapWeekTime} from './weekGeometry';

export function useWeekTouchDrag(drop:(payload:string,date:string,start:string)=>void,selector='.week-drop'){
  const gesture=useRef<{payload:string;duration:number;x:number;y:number;moved:boolean;target:HTMLElement|null;start:string}|null>(null);
  function clear(){const g=gesture.current;if(g?.target){g.target.classList.remove('touch-drop-target');g.target.removeAttribute('data-drop-time');}gesture.current=null;}
  useEffect(()=>clear,[]);
  return {
    start(e:PointerEvent<HTMLElement>,payload:string,duration:number){
      if(e.pointerType==='mouse'||(e.target as HTMLElement).closest('input,button,select'))return;
      e.currentTarget.setPointerCapture(e.pointerId);
      gesture.current={payload,duration,x:e.clientX,y:e.clientY,moved:false,target:null,start:'00:00'};
    },
    move(e:PointerEvent<HTMLElement>){
      const g=gesture.current;if(!g)return;
      if(Math.hypot(e.clientX-g.x,e.clientY-g.y)<8&&!g.moved)return;g.moved=true;
      const target=document.elementFromPoint(e.clientX,e.clientY)?.closest<HTMLElement>(selector)??null;
      if(g.target!==target){g.target?.classList.remove('touch-drop-target');g.target?.removeAttribute('data-drop-time');g.target=target;}
      if(target){const rect=target.getBoundingClientRect();g.start=snapWeekTime(e.clientY-rect.top,rect.height,g.duration);target.classList.add('touch-drop-target');target.dataset.dropTime=g.start;target.style.setProperty('--drop-top',`${Math.max(0,Math.min(100,(e.clientY-rect.top)/rect.height*100))}%`);}
    },
    end(){const g=gesture.current;if(g?.moved&&g.target?.dataset.date)drop(g.payload,g.target.dataset.date,g.start);clear();},
    cancel:clear
  };
}
