import {test} from 'node:test';
import assert from 'node:assert/strict';
import {setDelay,readDelay} from './hue-delay.mjs';
function mock(){const schedules={other:{name:'Other automation',command:{address:'/api/key/lights/1/state'}}};const calls=[];return {schedules,calls,async request(path,method='GET',body){calls.push({path,method,body});if(method==='GET')return schedules;if(method==='DELETE'){delete schedules[path.split('/').at(-1)];return [{success:true}];}schedules.new=body;return [{success:{id:'new'}}];}};}
test('all presets and custom delays create native one-shot off timers',async()=>{
  for(const [seconds,pattern] of [[30,'PT00:00:30'],[300,'PT00:05:00'],[1800,'PT00:30:00'],[60,'PT00:01:00']]){const m=mock();const result=await setDelay(m.request.bind(m),'key','1',seconds);assert.ok(result.endsAt>Date.now());assert.equal(m.schedules.new.localtime,pattern);assert.equal(m.schedules.new.autodelete,true);assert.deepEqual(m.schedules.new.command,{address:'/api/key/lights/1/state',method:'PUT',body:{on:false}});assert.equal((await readDelay(m.request.bind(m),'key','1')).endsAt,result.endsAt);}
});
test('replacing and cancelling timers preserves unrelated automations',async()=>{
  const m=mock();await setDelay(m.request.bind(m),'key','1',300);await setDelay(m.request.bind(m),'key','1',30);assert.equal(m.schedules.new.localtime,'PT00:00:30');await setDelay(m.request.bind(m),'key','1',null);assert.ok(m.schedules.other);assert.equal(m.schedules.new,undefined);assert.equal((await readDelay(m.request.bind(m),'key','1')).endsAt,null);
});
test('invalid delays do not modify the Bridge and Hue errors are reported',async()=>{
  const m=mock();for(const value of [0,-1,86400,1.5,undefined,'30'])await assert.rejects(setDelay(m.request.bind(m),'key','1',value),/Choose a delay/);assert.equal(m.calls.length,0);
  await assert.rejects(setDelay(async()=>[{error:{description:'Schedule storage full'}}],'key','1',30),/storage full/);
});
