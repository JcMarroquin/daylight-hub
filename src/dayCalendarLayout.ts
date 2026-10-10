import type {Block} from './scheduler';

export type DaySize='small'|'medium'|'large';
export type DayPlacement={block:Block;top:number;height:number;size:DaySize};
export type DayTick={minute:number;top:number};
export type DayLayout={height:number;start:number;end:number;placements:DayPlacement[];ticks:DayTick[]};

export function daySize(minutes:number):DaySize{return minutes<30?'small':minutes<60?'medium':'large';}
const heightFor=(size:DaySize)=>size==='small'?46:size==='medium'?68:98;

export function layoutDayCalendar(blocks:Block[],viewportHeight:number):DayLayout{
 const ordered=blocks.filter(block=>Number.isFinite(block.start)&&Number.isFinite(block.end)&&block.end>block.start).sort((a,b)=>a.start-b.start||a.end-b.end||a.id.localeCompare(b.id));
 const first=ordered[0]?.start??540,last=Math.max(...ordered.map(block=>block.end),600);
 const start=Math.max(0,Math.floor(first/60)*60-60),end=Math.min(1440,Math.ceil(last/60)*60+60);
 type Segment={kind:'gap'|'block';minuteStart:number;minuteEnd:number;height:number;block?:Block;size?:DaySize;top?:number};
 const segments:Segment[]=[];
 let cursor=start;
 for(const block of ordered){
  if(block.start>cursor){const minutes=block.start-cursor;segments.push({kind:'gap',minuteStart:cursor,minuteEnd:block.start,height:Math.max(6,minutes*.4)});cursor=block.start;}
  const size=daySize(block.end-block.start);
  segments.push({kind:'block',minuteStart:cursor,minuteEnd:Math.max(cursor,block.end),height:heightFor(size),block,size});
  cursor=Math.max(cursor,block.end);
 }
 if(cursor<end){const minutes=end-cursor;segments.push({kind:'gap',minuteStart:cursor,minuteEnd:end,height:Math.max(6,minutes*.4)});}
 const base=segments.reduce((sum,segment)=>sum+segment.height,0);
 const extra=Math.max(0,viewportHeight-base),gapMinutes=segments.filter(segment=>segment.kind==='gap').reduce((sum,segment)=>sum+segment.minuteEnd-segment.minuteStart,0);
 if(gapMinutes>0)for(const segment of segments)if(segment.kind==='gap')segment.height+=extra*(segment.minuteEnd-segment.minuteStart)/gapMinutes;
 let top=0;for(const segment of segments){segment.top=top;top+=segment.height;}
 const height=Math.max(viewportHeight,top);
 const placements=segments.filter((segment):segment is Segment&{block:Block;size:DaySize;top:number}=>segment.kind==='block'&&!!segment.block&&!!segment.size&&segment.top!==undefined).map(segment=>({block:segment.block,top:segment.top,height:segment.height,size:segment.size}));
 const ticks:DayTick[]=[];
 for(let minute=Math.ceil(start/60)*60;minute<=end;minute+=60){
  const segment=segments.find(item=>minute>=item.minuteStart&&minute<=item.minuteEnd);
  if(!segment)continue;
  const fraction=segment.minuteEnd>segment.minuteStart?(minute-segment.minuteStart)/(segment.minuteEnd-segment.minuteStart):0;
  ticks.push({minute,top:(segment.top??0)+segment.height*fraction});
 }
 return {height,start,end,placements,ticks};
}
