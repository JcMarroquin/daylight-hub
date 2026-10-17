import {test} from 'node:test';
import assert from 'node:assert/strict';
import {quarterHour,quarterHourOptions} from './quarterHour.ts';
test('sleep times offer 96 quarter-hour choices and round wake defaults across midnight',()=>{
  assert.equal(quarterHourOptions.length,96);
  assert.equal(new Set(quarterHourOptions).size,96);
  assert.equal(quarterHourOptions[0],'00:00');assert.equal(quarterHourOptions[95],'23:45');
  assert.equal(quarterHour('07:08'),'07:15');assert.equal(quarterHour('07:07'),'07:00');
  assert.equal(quarterHour('23:59'),'00:00');
});
