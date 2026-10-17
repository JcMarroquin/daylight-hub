import {test} from 'node:test';
import assert from 'node:assert/strict';
import {outlookDays,outlookItems,plannerDayKey,timelineLanes,planningBlocks} from './outlookModel.ts';
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
test('overlapping and short calendar sessions get visible separate lanes',()=>{
  const items=[{task,block:{id:'one',taskId:task.id,date:'2026-10-17',start:'09:00'}},{task,block:{id:'two',taskId:task.id,date:'2026-10-17',start:'09:30'}},{task,block:{id:'three',taskId:task.id,date:'2026-10-17',start:'11:00'}}];
  const lanes=timelineLanes(items);assert.equal(lanes.get('one')?.lanes,2);assert.notEqual(lanes.get('one')?.lane,lanes.get('two')?.lane);assert.equal(lanes.get('three')?.lanes,1);
});
test('planner includes the entire goal week and the next week without duplicating manual sessions',()=>{
  const manual={id:'manual',taskId:task.id,date:'2026-10-18',start:'10:00'};
  const blocks=planningBlocks(new Date(2026,9,18,12),[task],{one:{frequency:'daily',timesPerWeek:7,monthlyDay:1}},[manual],[]);
  assert.equal(blocks.filter(block=>block.date>='2026-10-12'&&block.date<='2026-10-18').length,7);
  assert.equal(blocks.filter(block=>block.id==='manual').length,1);
  assert.equal(blocks.filter(block=>block.date==='2026-10-19').length,1);
});
