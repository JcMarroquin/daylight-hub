import {test} from 'node:test';
import assert from 'node:assert/strict';
import {foregroundRefresh} from './foregroundRefresh.ts';

test('polls every 30 seconds, stops while hidden, and resumes on wake/reconnect',async context=>{
  context.mock.timers.enable({apis:['setInterval']});
  const page=Object.assign(new EventTarget(),{visibilityState:'visible' as DocumentVisibilityState});
  const host=new EventTarget();
  const signals:AbortSignal[]=[];
  const stop=foregroundRefresh(async signal=>{signals.push(signal);},page,host);
  await Promise.resolve();assert.equal(signals.length,1);
  context.mock.timers.tick(30000);await Promise.resolve();assert.equal(signals.length,2);
  page.visibilityState='hidden';page.dispatchEvent(new Event('visibilitychange'));
  context.mock.timers.tick(90000);await Promise.resolve();assert.equal(signals.length,2);
  page.visibilityState='visible';page.dispatchEvent(new Event('visibilitychange'));
  await Promise.resolve();assert.equal(signals.length,3);
  for(const event of ['online','focus','pageshow']){host.dispatchEvent(new Event(event));await Promise.resolve();}
  assert.equal(signals.length,6);
  stop();context.mock.timers.tick(30000);host.dispatchEvent(new Event('online'));assert.equal(signals.length,6);
});

test('abandons a suspended request so it cannot block a fresh wake request',async()=>{
  const page=Object.assign(new EventTarget(),{visibilityState:'visible' as DocumentVisibilityState});
  const signals:AbortSignal[]=[];
  const stop=foregroundRefresh(signal=>{signals.push(signal);return new Promise(()=>{});},page,new EventTarget());
  page.visibilityState='hidden';page.dispatchEvent(new Event('visibilitychange'));
  assert.equal(signals[0].aborted,true);
  page.visibilityState='visible';page.dispatchEvent(new Event('visibilitychange'));
  assert.equal(signals.length,2);assert.equal(signals[1].aborted,false);
  stop();assert.equal(signals[1].aborted,true);
});
