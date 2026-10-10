const name='Daylight delayed off';
function matching(schedules,username,lightId){return Object.entries(schedules).filter(([,s])=>s.name===name&&s.command?.address===`/api/${username}/lights/${lightId}/state`);}
function checked(result){const error=Array.isArray(result)&&result.find(item=>item.error)?.error;if(error){const e=new Error(error.description??'The Bridge could not save the timer.');e.status=502;throw e;}return result;}
export async function readDelay(request,username,lightId){
  const schedules=checked(await request('/schedules'));
  const timers=matching(schedules,username,lightId).filter(([,s])=>s.status==='enabled');
  const ends=timers.map(([,s])=>Number(s.description?.split(':').at(-1))).filter(t=>Number.isFinite(t)&&t>Date.now());
  return {endsAt:ends.length?Math.min(...ends):null};
}
export async function setDelay(request,username,lightId,seconds){
  if(seconds!==null&&(!Number.isInteger(seconds)||seconds<1||seconds>86399)){const e=new Error('Choose a delay from 1 second to 23 hours 59 minutes.');e.status=400;throw e;}
  const old=matching(checked(await request('/schedules')),username,lightId);
  for(const [id] of old)checked(await request(`/schedules/${id}`,'DELETE'));
  if(seconds===null)return {endsAt:null};
  const endsAt=Date.now()+seconds*1000;
  const h=String(Math.floor(seconds/3600)).padStart(2,'0'),m=String(Math.floor(seconds/60)%60).padStart(2,'0'),s=String(seconds%60).padStart(2,'0');
  const result=checked(await request('/schedules','POST',{name,description:`Daylight off:${endsAt}`,command:{address:`/api/${username}/lights/${lightId}/state`,method:'PUT',body:{on:false}},localtime:`PT${h}:${m}:${s}`,status:'enabled',autodelete:true}));
  if(!result?.[0]?.success?.id){const e=new Error('The Bridge did not confirm the timer.');e.status=502;throw e;}
  return {endsAt};
}
