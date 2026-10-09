import {useEffect,useState} from 'react';
import {Lightbulb,Power,RefreshCw} from 'lucide-react';

type Status={connected:boolean;light?:{name:string;on:boolean;brightness:number}};
async function hue(path:string,body?:unknown){
  const response=await fetch(`/api/hue${path}`,body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:undefined);
  const data=await response.json();
  if(!response.ok)throw new Error(data.error??'Could not reach room light.');
  return data;
}
export function HueStrip(){
  const [status,setStatus]=useState<Status>({connected:false});
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  async function refresh(){try{setStatus(await hue('/status'));setError('');}catch{setError('Light unavailable');}}
  useEffect(()=>{void refresh();},[]);
  async function change(body:unknown){setBusy(true);try{await hue('/state',body);await refresh();}catch(e){setError(e instanceof Error?e.message:'Light unavailable');}finally{setBusy(false);}}
  const light=status.light;
  return <section className="panel hue-strip" aria-label="Room light controls">
    <Lightbulb size={22}/><h2>Room light</h2>
    {light?<><span className="hue-strip-name" title={light.name}>{light.name}</span>
      <button className={`hue-power ${light.on?'on':''}`} disabled={busy} aria-label={light.on?'Turn room light off':'Turn room light on'} onClick={()=>void change({on:!light.on})}><Power size={22}/><span>{light.on?'On':'Off'}</span></button>
      <label className="hue-strip-brightness"><span>Brightness</span><input aria-label="Room light brightness" type="range" min="1" max="254" value={light.brightness} disabled={busy} onChange={e=>setStatus({...status,light:{...light,brightness:Number(e.target.value)}})} onPointerUp={e=>void change({brightness:Number(e.currentTarget.value)})} onKeyUp={e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Home','End','PageUp','PageDown'].includes(e.key))void change({brightness:Number(e.currentTarget.value)});}}/><strong>{Math.round(light.brightness/254*100)}%</strong></label>
    </>:<p>{status.connected?'Select your room light in Settings.':'Connect your light in Settings.'}</p>}
    <button className="icon-button" aria-label="Refresh room light" onClick={()=>void refresh()}><RefreshCw size={16}/></button>
    {error&&<span role="status" className="hue-strip-error">{error}</span>}
  </section>;
}
