import {test} from 'node:test';
import assert from 'node:assert/strict';
import {shouldAskSleep,localDay} from './sleepPrompt.ts';
test('overnight return prompts once, without treating daytime breaks as sleep',()=>{
  const wake=new Date(2026,9,10,8);
  assert.equal(shouldAskSleep(new Date(2026,9,9,23).getTime(),wake,false,null),true);
  assert.equal(shouldAskSleep(new Date(2026,9,10,7).getTime(),wake,false,null),false);
  assert.equal(shouldAskSleep(new Date(2026,9,10,8).getTime(),new Date(2026,9,10,13),false,null),false);
  assert.equal(shouldAskSleep(new Date(2026,9,9,23).getTime(),wake,true,null),false);
  assert.equal(shouldAskSleep(new Date(2026,9,9,23).getTime(),wake,false,localDay(wake)),false);
  assert.equal(shouldAskSleep(new Date(2026,9,8,23).getTime(),wake,false,null),false);
});
