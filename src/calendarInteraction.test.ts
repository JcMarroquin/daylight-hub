import {test} from 'node:test';
import assert from 'node:assert/strict';
import {calendarMinute,calendarSelection,calendarDrop} from './calendarInteraction.ts';
test('clicking empty time creates a half-hour task, clamped to midnight',()=>{assert.equal(calendarMinute(618,1440),615);assert.deepEqual(calendarSelection(615,615,false),{start:'10:15',minutes:30});assert.deepEqual(calendarSelection(1425,1425,false),{start:'23:45',minutes:15});});
test('drawing a time range works in either direction and includes the final quarter hour',()=>{assert.deepEqual(calendarSelection(540,585,true),{start:'09:00',minutes:60});assert.deepEqual(calendarSelection(585,540,true),{start:'09:00',minutes:60});assert.deepEqual(calendarSelection(0,1425,true),{start:'00:00',minutes:1440});});
test('desktop moves preserve the position grabbed within the event',()=>{assert.equal(calendarDrop(640,1440,60,40),'10:00');assert.equal(calendarDrop(320,720,60,40),'10:00');assert.equal(calendarDrop(640,1440,60,0),'10:45');});
test('dragging outside calendar clamps the entire task before midnight',()=>{assert.equal(calendarMinute(-30,1440),0);assert.equal(calendarMinute(1600,1440),1425);assert.equal(calendarDrop(-20,1440,60,30),'00:00');assert.equal(calendarDrop(1600,1440,60,30),'23:00');assert.equal(calendarDrop(1600,1440,90),'22:30');});
test('short events keep the grabbed position within their readable visual height',()=>{assert.equal(calendarDrop(635,1440,15,35),'10:00');});
