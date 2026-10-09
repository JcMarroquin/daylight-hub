import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generate, type Task} from './scheduler.ts';
const task=(id:string,minutes:number,required=false):Task=>({id,title:id,minutes,required,selected:true,done:false,priority:2,project:'Test'});
test('respects appointments, hours and task durations',()=>{const p=generate([task('a',60),task('b',90)],[{id:'meeting',title:'Meeting',start:600,end:660}],'Focus',540,780); for(let i=0;i<p.blocks.length;i++){assert.ok(p.blocks[i].start>=540&&p.blocks[i].end<=780);if(i)assert.ok(p.blocks[i].start>=p.blocks[i-1].end);}assert.equal(p.blocks.filter(b=>b.kind==='task').reduce((n,b)=>n+b.end-b.start,0),150);});
test('required tasks precede optional tasks and overload is explicit',()=>{const p=generate([task('optional',60),task('required',60,true)],[],'Focus',540,610);assert.equal(p.blocks[0].taskId,'required');assert.equal(p.omitted[0].task.id,'optional');});
test('overlapping appointments do not create false free time',()=>{const p=generate([task('a',40)],[{id:'a',title:'A',start:540,end:600},{id:'b',title:'B',start:570,end:660}],'Balanced',540,690);assert.equal(p.omitted.length,1);assert.equal(p.free,30);});
test('Essentials preserves optional capacity, completed work is excluded',()=>{const p=generate([task('optional',30),{...task('done',30,true),done:true},task('required',30,true)],[],'Essentials');assert.equal(p.blocks.filter(b=>b.kind==='task').length,1);assert.equal(p.omitted[0].task.id,'optional');});
