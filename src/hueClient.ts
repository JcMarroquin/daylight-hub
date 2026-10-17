import {supabase} from './supabase';
export const remoteHue=!['localhost','127.0.0.1','[::1]'].includes(window.location.hostname);
export async function hueRequest<T=any>(path:string,body?:unknown,signal?:AbortSignal):Promise<T>{
  const headers:Record<string,string>={};
  if(body)headers['Content-Type']='application/json';
  if(remoteHue){const session=await supabase?.auth.getSession();const token=session?.data.session?.access_token;if(!token)throw new Error('Sign in to Daylight first.');headers.Authorization=`Bearer ${token}`;}
  const request=()=>fetch(`/api/hue${path}`,{method:body?'POST':'GET',headers,body:body?JSON.stringify(body):undefined,cache:'no-store',signal:signal?AbortSignal.any([signal,AbortSignal.timeout(20000)]):AbortSignal.timeout(20000)});
  let response=await request();
  // A suspended tab can wake with an expired Daylight access token.
  if(response.status===401&&remoteHue&&supabase){const {data,error}=await supabase.auth.refreshSession();if(!error&&data.session){headers.Authorization=`Bearer ${data.session.access_token}`;response=await request();}}
  let data;try{data=await response.json();}catch{throw new Error(remoteHue?'Hue needs the Daylight Web Service. Check the Render deployment.':'Restart the local Daylight server to load Hue.');}
  if(!response.ok)throw new Error(data.error??'Hue request failed.');return data;
}
