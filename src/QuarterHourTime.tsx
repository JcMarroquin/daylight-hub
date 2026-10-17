import {quarterHour,quarterHourOptions} from './quarterHour';

export function QuarterHourTime({value,onChange,label}:{value:string;onChange:(value:string)=>void;label:string}){
  return <select aria-label={label} value={quarterHour(value)} onChange={event=>onChange(event.target.value)}>
    {quarterHourOptions.map(time=><option key={time} value={time}>{new Intl.DateTimeFormat('en',{hour:'numeric',minute:'2-digit'}).format(new Date(`2000-01-01T${time}`))}</option>)}
  </select>;
}
