import {test} from 'node:test';
import assert from 'node:assert/strict';
import {outlookDays,outlookItems,plannerDayKey} from './outlookModel.ts';
import {recurringWeek} from './recurrence.ts';
import type {Task} from './scheduler';

const task:Task={id:'one',title:'Task',minutes:30,project:'Personal',priority:2,done:false,selected:true,required:false};
test('three-day outlook crosses week, month and year boundaries using local dates',()=>{
  const dates=outlookDays(new Date(2026,11,31,12)).map(plannerDayKey);
  assert.deepEqual(dates,['2026-12-31','2027-01-01','2027-01-02']);
});
test('selected tasks appear today once and dated tasks appear on their assigned day',()=>{
  const blocks=[{id:'block',taskId:task.id,date:'2026-10-17',start:'10:00'}];
  assert.equal(outlookItems('2026-10-17','2026-10-17',[task],blocks).length,1);
  assert.equal(outlookItems('2026-10-18','2026-10-17',[task],blocks).length,0);
  assert.equal(outlookItems('2026-10-17','2026-10-17',[task],[])[0].block,undefined);
  assert.equal(outlookItems('2026-10-17','2026-10-17',[{...task,done:true}],blocks).length,0);
});
test('recurrences remain visible when a three-day range crosses Sunday into Monday',()=>{
  const start=new Date(2026,9,18,12);
  const blocks=recurringWeek(start,[task],{one:{frequency:'daily',timesPerWeek:7,monthlyDay:1}},[],[]);
  for(const day of outlookDays(start))assert.equal(outlookItems(plannerDayKey(day),'2026-10-18',[task],blocks).length,1);
});
