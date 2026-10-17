export function quarterHour(value:string){
  const [hours,minutes]=value.split(':').map(Number);
  const rounded=(Math.round((hours*60+minutes)/15)*15)%1440;
  return `${String(Math.floor(rounded/60)).padStart(2,'0')}:${String(rounded%60).padStart(2,'0')}`;
}
