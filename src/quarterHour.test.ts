import {test} from 'node:test';
import assert from 'node:assert/strict';
import {quarterHour} from './quarterHour.ts';
test('sleep time adjustments round to quarter hours across midnight',()=>{
  assert.equal(quarterHour('07:08'),'07:15');assert.equal(quarterHour('07:07'),'07:00');
  assert.equal(quarterHour('23:59'),'00:00');
});
