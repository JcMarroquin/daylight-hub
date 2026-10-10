import test from 'node:test';
import assert from 'node:assert/strict';
import {daySize,layoutDayCalendar} from './dayCalendarLayout.ts';
import type {Block} from './scheduler.ts';

test('three task sizes stay readable and ordered even when short tasks cluster',()=>{
 const blocks:Block[]=[
  {id:'a',title:'Hour',start:540,end:600,kind:'task'},
  {id:'b',title:'Half hour',start:600,end:630,kind:'task'},
  {id:'c',title:'Quick one',start:630,end:640,kind:'task'},
  {id:'d',title:'Quick two',start:640,end:650,kind:'task'},
  {id:'e',title:'Quick three',start:650,end:660,kind:'task'},
 ];
 const layout=layoutDayCalendar(blocks,520);
 assert.deepEqual(layout.placements.map(p=>p.size),['large','medium','small','small','small']);
 assert.deepEqual(layout.placements.map(p=>p.height),[98,68,46,46,46]);
 for(let index=1;index<layout.placements.length;index++)assert.ok(layout.placements[index].top>=layout.placements[index-1].top+layout.placements[index-1].height);
 assert.equal(layout.start,480);
 assert.equal(layout.end,720);
 assert.ok(layout.height>=520);
 assert.ok(layout.ticks.every((tick,index)=>index===0||tick.top>=layout.ticks[index-1].top));
});

test('busy days can scroll within the calendar without shrinking task cards',()=>{
 const blocks:Block[]=Array.from({length:20},(_,index)=>({id:String(index),title:`Task ${index}`,start:480+index*10,end:490+index*10,kind:'task'}));
 const layout=layoutDayCalendar(blocks,500);
 assert.ok(layout.height>500);
 assert.ok(layout.placements.every(p=>p.height===46));
 assert.equal(daySize(30),'medium');
 assert.equal(daySize(60),'large');
});
