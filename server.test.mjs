import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';

test('hosted Hue requires authentication and rejects unsolicited callbacks',async()=>{
  const port=32000+Math.floor(Math.random()*10000);
  const child=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:String(port),APP_URL:'https://example.com',HUE_CLIENT_ID:'test',HUE_CLIENT_SECRET:'test',HUE_APP_ID:'test',HUE_OWNER_EMAIL:'owner@example.com',HUE_ENCRYPTION_KEY:'a'.repeat(64),SUPABASE_SECRET_KEY:'test-secret',VITE_SUPABASE_URL:'https://example.supabase.co',VITE_SUPABASE_PUBLISHABLE_KEY:'test'},stdio:['ignore','pipe','pipe']});
  try{
    await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(new Error('Server startup timed out')),5000);child.stdout.once('data',()=>{clearTimeout(timeout);resolve();});child.once('error',reject);});
    const base=`http://127.0.0.1:${port}`;
    assert.equal((await fetch(`${base}/health`)).status,200);
    const status=await fetch(`${base}/api/hue/status`);assert.equal(status.status,401);
    assert.equal((await fetch(`${base}/api/hue/connect`,{method:'POST',headers:{Origin:'https://evil.example','Content-Type':'application/json'},body:'{}'})).status,403);
    assert.equal((await fetch(`${base}/api/hue/callback?code=fake&state=fake`)).status,400);
    assert.equal((await fetch(`${base}/api/unknown`)).status,404);
  }finally{child.kill();}
});
