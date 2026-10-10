import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHueStore} from './hue-store.mjs';

function mockDatabase(){
  const rows=new Map();let broken=false;
  return {rows,break(){broken=true;},from(table){assert.equal(table,'hue_connections');return {
    select(){return {eq(column,user){assert.equal(column,'user_id');return {async maybeSingle(){return {data:rows.get(user)??null,error:broken?{message:'failure'}:null};}};}};},
    async upsert(row){if(broken)return {error:{message:'failure'}};rows.set(row.user_id,row);return {error:null};}
  };}};
}
test('tokens survive new store instances and updates without plaintext storage',async()=>{
  const db=mockDatabase();const store=createHueStore(db,'a'.repeat(64));
  assert.equal(await store.read('owner'),null);
  await store.save('owner',{access:'private-token',refresh:'private-refresh',lightId:'1'});
  assert.ok(!JSON.stringify(db.rows.get('owner')).includes('private-token'));
  assert.ok(!JSON.stringify(db.rows.get('owner')).includes('private-refresh'));
  const restarted=createHueStore(db,'a'.repeat(64));
  assert.deepEqual(await restarted.read('owner'),{access:'private-token',refresh:'private-refresh',lightId:'1'});
  await restarted.save('owner',{access:'new-token',lightId:'2'});
  assert.deepEqual(await store.read('owner'),{access:'new-token',lightId:'2'});
  assert.equal(await store.read('another-owner'),null);
});
test('encrypted credentials cannot be swapped between users or read with another key',async()=>{
  const db=mockDatabase();const store=createHueStore(db,'a'.repeat(64));await store.save('owner',{access:'secret'});
  db.rows.set('another-owner',db.rows.get('owner'));
  await assert.rejects(store.read('another-owner'),/cannot be decrypted/);
  await assert.rejects(createHueStore(db,'b'.repeat(64)).read('owner'),/cannot be decrypted/);
});
test('storage failures surface actionable errors instead of losing credentials',async()=>{
  const db=mockDatabase();const store=createHueStore(db,'a'.repeat(64));db.break();
  await assert.rejects(store.read('owner'),/SQL migration/);
  await assert.rejects(store.save('owner',{access:'secret'}),/SQL migration/);
  assert.equal(db.rows.size,0);
});
