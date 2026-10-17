import {useState} from 'react';
import {Lightbulb,Power} from 'lucide-react';

import {useHueStatus} from './useHueStatus';
import {hueRequest as hue} from './hueClient';
import {HueDelayOff} from './HueDelayOff';
import {ForegroundDialog} from './ForegroundDialog';
export function HueStrip(){
  const {status,setStatus,error,setError,refresh}=useHueStatus();
  const [busy,setBusy]=useState(false);
  const [menu,setMenu]=useState(false),[timerRevision,setTimerRevision]=useState(0);
  async function change(body:unknown){setBusy(true);try{await hue('/state',body);await refresh();}catch(e){setError(e instanceof Error?e.message:'Light unavailable');}finally{setBusy(false);}}
  const light=status.light;
  return <><section className="panel hue-strip" aria-label="Room light controls" onClick={e=>{if(!(e.target as HTMLElement).closest('button,input,label,select,form'))setMenu(true);}}>
    <Lightbulb size={22}/><h2>Room light</h2>
    {light?<><span className="hue-strip-name" title={light.name}>{light.name}</span>
      <button className={`hue-power ${light.on?'on':''}`} disabled={busy} aria-label={light.on?'Turn room light off':'Turn room light on'} onClick={()=>void change({on:!light.on})}><Power size={22}/><span>{light.on?'On':'Off'}</span></button>
      <label className="hue-strip-brightness"><span>Brightness</span><input aria-label="Room light brightness" type="range" min="1" max="254" value={light.brightness} disabled={busy} onChange={e=>setStatus({...status,light:{...light,brightness:Number(e.target.value)}})} onPointerUp={e=>void change({brightness:Number(e.currentTarget.value)})} onKeyUp={e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Home','End','PageUp','PageDown'].includes(e.key))void change({brightness:Number(e.currentTarget.value)});}}/><strong>{Math.round(light.brightness/254*100)}%</strong></label>
      <HueDelayOff key={timerRevision} compact onDone={()=>void refresh()}/>
    </>:<p>{status.connected?'Select your room light in Settings.':'Connect your light in Settings.'}</p>}
    <button className="hue-menu-button" aria-label="Open room light menu" onClick={()=>setMenu(true)}>More controls</button>
    {error&&<span role="status" className="hue-strip-error">{error}</span>}
  </section>{menu&&<ForegroundDialog title="Room light" onClose={()=>{setMenu(false);setTimerRevision(r=>r+1);void refresh();}}>{light?<><p className="dialog-description">{light.name}</p><button className={`hue-power ${light.on?'on':''}`} disabled={busy} onClick={()=>void change({on:!light.on})}><Power size={20}/>{light.on?'Turn off':'Turn on'}</button><HueDelayOff onDone={()=>void refresh()}/></>:<p>Connect and select your light in Settings.</p>}</ForegroundDialog>}</>;
}
