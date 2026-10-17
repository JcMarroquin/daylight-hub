import {quarterHour} from './quarterHour';

export function QuarterHourTime({value,onChange,label}:{value:string;onChange:(value:string)=>void;label:string}){
  const wake=/wake|woke/i.test(label);
  const adjust=(delta:number)=>{const [h,m]=value.split(':').map(Number);const minutes=(h*60+m+delta+1440)%1440;onChange(`${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}`);};
  return <div className={`sleep-time-picker ${wake?'wake-picker':'bed-picker'}`}>
    <div className="sleep-time-control"><button type="button" aria-label={`${label} 15 minutes earlier`} onClick={()=>adjust(-15)}>−</button><input type="time" step="60" required aria-label={label} value={value} onInput={event=>{if(event.currentTarget.value)onChange(event.currentTarget.value);}} onChange={event=>{if(event.target.value)onChange(event.target.value);}} onBlur={event=>{if(event.target.value)onChange(quarterHour(event.target.value));}}/><button type="button" aria-label={`${label} 15 minutes later`} onClick={()=>adjust(15)}>+</button></div>
    <div className="sleep-time-presets">{(wake?['06:00','07:00','08:00','09:00']:['21:00','22:00','23:00','00:00']).map(choice=><button type="button" key={choice} aria-pressed={value===choice} aria-label={`${label} ${choice}`} onClick={()=>onChange(choice)}>{new Intl.DateTimeFormat('en',{hour:'numeric',hour12:true}).format(new Date(`2000-01-01T${choice}`))}</button>)}</div>
    <small>Type a time · + / − adjusts 15 minutes</small>
  </div>;
}
