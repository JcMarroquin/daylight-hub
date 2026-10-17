import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sleepDraft,sleepMinutes,nightDates,sleepSegments,sleepTrends} from './sleepInsights.ts';
import type {SleepLog} from './hubTypes';
const night=(wakeDate:string,bedTime='23:00',wakeTime='07:00',quality=3):SleepLog=>({id:wakeDate,wakeDate,bedTime,wakeTime,quality});
test('sleep menu uses the saved wake-up entry and retains exact historical minutes',()=>{
  const logs=[night('2026-10-16','22:45','06:55'),night('2026-10-17','00:15','08:30',4)];
  assert.equal(sleepDraft(logs,'2026-10-17').bedTime,'00:15');assert.equal(sleepDraft(logs,'2026-10-17').wakeTime,'08:30');assert.equal(sleepDraft(logs,'2026-10-17').quality,4);
  assert.equal(sleepDraft(logs,'2026-10-16').wakeTime,'06:55');assert.equal(sleepDraft(logs,'2026-10-18').wakeTime,'08:30');
});
test('overnight, same-day and noon-crossing sleep windows keep their dates and lengths',()=>{
  assert.equal(sleepMinutes(night('2026-10-17')),480);
  assert.deepEqual(nightDates(night('2026-01-01')),{bed:'2025-12-31',wake:'2026-01-01'});
  assert.deepEqual(nightDates(night('2026-10-17','01:00','08:00')),{bed:'2026-10-17',wake:'2026-10-17'});
  assert.equal(sleepSegments(night('2026-10-17','10:00','15:00')).reduce((sum,segment)=>sum+segment.length,0),300);
  assert.equal(sleepSegments(night('2026-10-17','10:00','15:00')).length,2);
});
test('trends exclude missing/future/zero-duration nights and compare separate date windows',()=>{
  const logs=[night('2026-10-09','23:00','06:00'),night('2026-10-13'),night('2026-10-17','22:00','08:00',5),night('2026-10-18'),night('2026-10-16','07:00','07:00')];
  const stats=sleepTrends(logs,new Date(2026,9,17,12));
  assert.equal(stats.current.length,2);assert.equal(stats.average,540);assert.equal(stats.previousAverage,420);assert.equal(stats.change,120);assert.equal(stats.quality,4);
  assert.equal(stats.series.length,7);assert.equal(stats.series.filter(item=>!item.log).length,5);
});
test('wake-time variation wraps across midnight rather than reporting a whole day',()=>{
  const stats=sleepTrends([night('2026-10-16','16:00','23:45'),night('2026-10-17','17:00','00:15')],new Date(2026,9,17,12));
  assert.equal(stats.wakeSpread,30);
  assert.equal(sleepTrends([],new Date()).average,null);
});
