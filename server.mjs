import {createServer} from 'node:http';
import {randomBytes,createCipheriv,createDecipheriv,timingSafeEqual} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync,renameSync,existsSync} from 'node:fs';
import {resolve,dirname,extname} from 'node:path';
import {createClient} from '@supabase/supabase-js';

const origin=process.env.APP_URL?.replace(/\/$/,'');
const clientId=process.env.HUE_CLIENT_ID;
const clientSecret=process.env.HUE_CLIENT_SECRET;
const appId=process.env.HUE_APP_ID;
const owner=process.env.HUE_OWNER_EMAIL?.toLowerCase();
const key=process.env.HUE_ENCRYPTION_KEY;
const storePath=process.env.HUE_STORE_PATH;
const configured=Boolean(origin&&clientId&&clientSecret&&appId&&owner&&key&&storePath);
if(configured&&(!/^[a-f\d]{64}$/i.test(key)||!origin.startsWith('https://')))throw new Error('APP_URL must use HTTPS and HUE_ENCRYPTION_KEY must contain 64 hexadecimal characters.');
const db=process.env.VITE_SUPABASE_URL&&process.env.VITE_SUPABASE_PUBLISHABLE_KEY?createClient(process.env.VITE_SUPABASE_URL,process.env.VITE_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}}):null;
const pending=new Map();
const refreshes=new Map();
const root=resolve('dist');
function json(res,status,data){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));}
function fail(message,status=400){const e=new Error(message);e.status=status;throw e;}
function readStore(){if(!existsSync(storePath))return {};const envelope=JSON.parse(readFileSync(storePath,'utf8'));const decipher=createDecipheriv('aes-256-gcm',Buffer.from(key,'hex'),Buffer.from(envelope.iv,'base64'));decipher.setAuthTag(Buffer.from(envelope.tag,'base64'));return JSON.parse(Buffer.concat([decipher.update(Buffer.from(envelope.data,'base64')),decipher.final()]).toString());}
function saveStore(data){mkdirSync(dirname(storePath),{recursive:true});const iv=randomBytes(12);const cipher=createCipheriv('aes-256-gcm',Buffer.from(key,'hex'),iv);const encrypted=Buffer.concat([cipher.update(JSON.stringify(data)),cipher.final()]);writeFileSync(`${storePath}.tmp`,JSON.stringify({iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),data:encrypted.toString('base64')}),{mode:0o600});renameSync(`${storePath}.tmp`,storePath);}
function save(user,data){const store=readStore();store[user]=data;saveStore(store);}
async function body(req){let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>8192)fail('Request too large.',413);}try{return JSON.parse(raw||'{}');}catch{fail('Invalid JSON.');}}
async function identity(req){const bearer=req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];if(!db||!bearer)fail('Sign in to Daylight first.',401);const {data,error}=await db.auth.getUser(bearer);if(error||!data.user)fail('Please sign in again.',401);if(data.user.email?.toLowerCase()!==owner)fail('This Hue connection belongs to another account.',403);return data.user.id;}
async function api(url,init={}){const response=await fetch(url,{...init,signal:AbortSignal.timeout(15000)});let data;try{data=await response.json();}catch{fail('Hue returned an unreadable response.',502);}if(!response.ok)fail(`Hue returned HTTP ${response.status}. Please check the app registration or reconnect.`,502);const error=Array.isArray(data)&&data.find(item=>item.error)?.error;if(error)fail(error.description??'Hue could not complete this request.',502);return data;}
async function tokens(params){const data=await api('https://api.meethue.com/v2/oauth2/token',{method:'POST',headers:{Authorization:`Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(params).toString()});if(!data.access_token||!data.refresh_token)fail('Hue did not return valid credentials.',502);return {access:data.access_token,refresh:data.refresh_token,expires:Date.now()+Number(data.expires_in??data.access_token_expires_in??3600)*1000};}
async function connection(user){let data=readStore()[user];if(!data)fail('Connect your Hue account first.',409);if(data.expires<Date.now()+60000){if(!refreshes.has(user))refreshes.set(user,(async()=>{const next={...data,...await tokens({grant_type:'refresh_token',refresh_token:data.refresh})};save(user,next);return next;})().finally(()=>refreshes.delete(user)));data=await refreshes.get(user);}return data;}
async function bridge(data,path,method='GET',payload){return api(`https://api.meethue.com/bridge${path}`,{method,headers:{Authorization:`Bearer ${data.access}`,'Content-Type':'application/json'},body:payload?JSON.stringify(payload):undefined});}

const server=createServer(async(req,res)=>{const url=new URL(req.url,'http://localhost');try{
  if(url.pathname==='/health')return json(res,200,{ok:true});
  if(url.pathname==='/api/hue/callback'){
    const state=url.searchParams.get('state');const attempt=pending.get(state);pending.delete(state);
    const cookie=req.headers.cookie?.split(';').map(x=>x.trim()).find(x=>x.startsWith('hue_state='))?.slice(10);
    res.setHeader('Set-Cookie','hue_state=; Path=/api/hue; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
    if(!attempt||attempt.expires<Date.now()||!cookie||cookie.length!==state?.length||!timingSafeEqual(Buffer.from(cookie),Buffer.from(state)))fail('Hue sign-in expired. Return to Daylight and connect again.');
    if(url.searchParams.has('error')||!url.searchParams.get('code'))fail('Hue sign-in was cancelled.');
    const data=await tokens({grant_type:'authorization_code',code:url.searchParams.get('code'),redirect_uri:`${origin}/api/hue/callback`});
    await bridge(data,'/0/config','PUT',{linkbutton:true});
    const created=await bridge(data,'','POST',{devicetype:'daylight_hub#web'});const username=created?.[0]?.success?.username;
    if(!username)fail('Hue could not register Daylight on the Bridge.',502);
    const lights=await bridge(data,`/${username}/lights`);const ids=Object.keys(lights);
    save(attempt.user,{...data,username,lightId:ids.length===1?ids[0]:undefined});
    res.writeHead(303,{Location:`${origin}/?hue=connected`});return res.end();
  }
  if(url.pathname.startsWith('/api/hue/')){
    if(!configured)fail('Remote Hue is not configured. Add the server environment settings in Render.',503);
    if(req.method==='POST'&&req.headers.origin!==origin)fail('Request origin is not allowed.',403);
    const user=await identity(req);
    if(url.pathname==='/api/hue/connect'&&req.method==='POST'){
      for(const [state,value] of pending)if(value.expires<Date.now())pending.delete(state);
      const state=randomBytes(32).toString('hex');pending.set(state,{user,expires:Date.now()+600000});
      res.setHeader('Set-Cookie',`hue_state=${state}; Path=/api/hue; HttpOnly; Secure; SameSite=Lax; Max-Age=600`);
      const consent=new URL('https://api.meethue.com/v2/oauth2/authorize');consent.search=new URLSearchParams({client_id:clientId,response_type:'code',redirect_uri:`${origin}/api/hue/callback`,state,appid:appId,deviceid:'daylight-web',devicename:'Daylight Hub'}).toString();
      return json(res,200,{url:consent.toString()});
    }
    if(url.pathname==='/api/hue/status'&&req.method==='GET'&&!readStore()[user])return json(res,200,{connected:false,mode:'remote'});
    const data=await connection(user);
    const lights=await bridge(data,`/${data.username}/lights`);
    if(url.pathname==='/api/hue/status'&&req.method==='GET'){const light=lights[data.lightId];return json(res,200,{connected:true,mode:'remote',lightId:data.lightId,light:light?{name:light.name,on:light.state.on,brightness:light.state.bri}:undefined});}
    if(url.pathname==='/api/hue/lights'&&req.method==='GET')return json(res,200,Object.entries(lights).map(([id,light])=>({id,name:light.name})));
    const input=await body(req);
    if(url.pathname==='/api/hue/select'&&req.method==='POST'){if(!lights[String(input.lightId)])fail('Choose an available light.');save(user,{...data,lightId:String(input.lightId)});return json(res,200,{ok:true});}
    if(url.pathname==='/api/hue/state'&&req.method==='POST'){if(!data.lightId||!lights[data.lightId])fail('Choose a light first.');const state={};if(typeof input.on==='boolean')state.on=input.on;if(Number.isFinite(input.brightness))state.bri=Math.max(1,Math.min(254,Math.round(input.brightness)));if(!Object.keys(state).length)fail('No valid light controls supplied.');await bridge(data,`/${data.username}/lights/${data.lightId}/state`,'PUT',state);return json(res,200,{ok:true});}
    fail('Unknown Hue request.',404);
  }
  if(url.pathname.startsWith('/api/'))fail('Unknown endpoint.',404);
  if(req.method!=='GET'&&req.method!=='HEAD')fail('Method not allowed.',405);
  const path=resolve(root,`.${decodeURIComponent(url.pathname)}`);if(path!==root&&!path.startsWith(`${root}/`)&&!path.startsWith(`${root}\\`))fail('Not found.',404);
  const file=existsSync(path)&&extname(path)?path:resolve(root,'index.html');
  const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon'};
  res.writeHead(200,{'Content-Type':mime[extname(file)]??'application/octet-stream','Cache-Control':extname(file)==='.html'?'no-cache':'public, max-age=3600'});res.end(req.method==='HEAD'?undefined:readFileSync(file));
}catch(error){if(url.pathname==='/api/hue/callback'){res.writeHead(error.status??502,{'Content-Type':'text/plain','Cache-Control':'no-store'});res.end(`${error.message}\nReturn to Daylight Settings and try connecting again.`);}else json(res,error.status??502,{error:error.status?error.message:'The Hue connection is unavailable. Try again or reconnect.'});}});
server.listen(Number(process.env.PORT??3000),'0.0.0.0',()=>console.log('Daylight web server started.'));
