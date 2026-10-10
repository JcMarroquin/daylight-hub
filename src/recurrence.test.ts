import {test} from 'node:test';
import assert from 'node:assert/strict';
import {recurringWeek,type Recurrence} from './recurrence.ts';
const task={id:'task',done:false};
const rule:Recurrence={frequency:'weekly',timesPerWeek:3,monthlyDay:1,time:'18:30',weekdays:[0,2,4]};
test('recurring tasks appear on chosen weekdays and respect occurrence overrides',()=>{
  const start=new Date(2026,9,5);const blocks=recurringWeek(start,[task],{task:rule},[],[]);
  assert.deepEqual(blocks.map(b=>b.date),['2026-10-05','2026-10-07','2026-10-09']);assert.ok(blocks.every(b=>b.start==='18:30'));
  const manual={id:'override',taskId:'task',date:'2026-10-07',start:'20:00'};
  const next=recurringWeek(start,[task],{task:rule},[manual],['task:2026-10-05']);assert.equal(next.length,2);assert.equal(next.filter(b=>b.date==='2026-10-07').length,1);assert.equal(next[0].start,'20:00');
});
test('daily date boundaries, completion and disabled recurrence are respected',()=>{
  const start=new Date(2026,9,5);assert.equal(recurringWeek(start,[task],{task:{...rule,frequency:'daily',startDate:'2026-10-07',endDate:'2026-10-09'}},[],[]).length,3);
  assert.equal(recurringWeek(start,[{...task,done:true}],{task:rule},[],[]).length,0);
  assert.equal(recurringWeek(start,[task],{task:{...rule,frequency:'none'}},[],[]).length,0);
});
