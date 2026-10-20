export type CalendarDraft={date:string;start:string;minutes:number};
export type CalendarTask=CalendarDraft&{title:string};
export type CalendarDrag={payload:string;minutes:number;offset:number};
const label=(minute:number)=>`${String(Math.floor(minute/60)).padStart(2,'0')}:${String(minute%60).padStart(2,'0')}`;
export function calendarMinute(y:number,height:number){return Math.max(0,Math.min(1425,Math.floor(y/Math.max(1,height)*1440/15)*15));}
export function calendarSelection(anchor:number,current:number,moved:boolean){const start=Math.min(anchor,current),end=moved?Math.max(anchor,current)+15:Math.min(1440,start+30);return {start:label(start),minutes:end-start};}
export function calendarDrop(y:number,height:number,duration:number,offset=0){const latest=Math.floor((1440-duration)/15)*15;return label(Math.max(0,Math.min(latest,Math.round((y/Math.max(1,height)*1440-Math.max(0,offset))/15)*15)));}
