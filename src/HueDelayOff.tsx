import {useEffect,useRef,useState} from 'react';
import {hueRequest} from './hueClient';

export function HueDelayOff({onDone,compact=false}:{onDone:()=>void;compact?:boolean}){
  const [endsAt,setEndsAt]=useState<number|null>(null),[now,setNow]=useState(Date.now()),[busy,setBusy]=useState(false),[error,setError]=useState(''),[amount,setAmount]=useState('1'),[unit,setUnit]=useState('minutes');
  const done=useRef(onDone);done.current=onDone;
  useEffect(()=>{let active=true;void hueRequest<{endsAt:number|null}>('/delay-off').then(data=>{if(active)setEndsAt(data.endsAt);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[]);
  useEffect(()=>{if(!endsAt)return;const tick=()=>{const current=Date.now();setNow(current);if(current>=endsAt){setEndsAt(null);done.current();}};tick();const id=window.setInterval(tick,1000);return()=>clearInterval(id);},[endsAt]);
  async function set(seconds:number|null){setBusy(true);setError('');try{const data=await hueRequest<{endsAt:number|null}>('/delay-off',seconds===null?{cancel:true}:{seconds});setNow(Date.now());setEndsAt(data.endsAt);}catch(e){setError(e instanceof Error?e.message:'Could not set timer.');}finally{setBusy(false);}}
  const remaining=Math.max(0,Math.ceil(((endsAt??now)-now)/1000));const minutes=Math.floor(remaining/60),seconds=remaining%60;
  return <div className={`hue-delay ${compact?'hue-delay-compact':''}`}><span className="hue-delay-title">Turn off in</span><div className="hue-delay-presets">{(compact?[[30,'30 sec']]:[[30,'30 sec'],[300,'5 min'],[1800,'30 min']]).map(([value,label])=><button key={value} disabled={busy} onClick={()=>void set(Number(value))}>{label}</button>)}</div>
    {!compact&&<form className="hue-delay-custom" onSubmit={e=>{e.preventDefault();void set(Number(amount)*(unit==='minutes'?60:1));}}><label>Custom<input aria-label="Custom light-off delay" type="number" min="1" max={unit==='minutes'?1439:86399} step="1" value={amount} onChange={e=>setAmount(e.target.value)} required/></label><select aria-label="Delay unit" value={unit} onChange={e=>setUnit(e.target.value)}><option value="seconds">Seconds</option><option value="minutes">Minutes</option></select><button disabled={busy||!amount} type="submit">{busy?'Saving…':'Set timer'}</button></form>}
    {endsAt&&<div className="hue-delay-active" role="status"><strong>Off in {minutes}:{String(seconds).padStart(2,'0')}</strong><button disabled={busy} onClick={()=>void set(null)}>Cancel timer</button></div>}
    {error&&<p className="hue-delay-error" role="status">{error}</p>}
  </div>;
}
