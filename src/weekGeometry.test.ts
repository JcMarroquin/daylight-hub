import {test} from 'node:test';
import assert from 'node:assert/strict';
import {snapWeekTime,weekPosition} from './weekGeometry.ts';
test('week drops snap to quarter hours and reserve the full task duration before midnight',()=>{
  assert.equal(snapWeekTime(300,600,60),'12:00');
  assert.equal(snapWeekTime(600,600,60),'23:00');
  assert.equal(snapWeekTime(-50,600,30),'00:00');
  assert.equal(snapWeekTime(600,600,1440),'00:00');
  assert.equal(snapWeekTime(233,600,30),'09:15');
});
test('week block geometry preserves actual start and duration without a minimum percentage',()=>{
  const block=weekPosition('12:00',30);assert.equal(block.top,'50%');assert.equal(parseFloat(block.height),30/1440*100);
  const late=weekPosition('23:45',60);assert.ok(Math.abs(parseFloat(late.top)+parseFloat(late.height)-100)<1e-9);
});
