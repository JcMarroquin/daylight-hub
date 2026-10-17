export function quarterHour(value:string){
  const [hours,minutes]=value.split(':').map(Number);
  const rounded=(Math.round((hours*60+minutes)/15)*15)%1440;
  return `${String(Math.floor(rounded/60)).padStart(2,'0')}:${String(rounded%60).padStart(2,'0')}`;
}
export const quarterHourOptions=Array.from({length:96},(_,index)=>`${String(Math.floor(index/4)).padStart(2,'0')}:${String(index%4*15).padStart(2,'0')}`);
