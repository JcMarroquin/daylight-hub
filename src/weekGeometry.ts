export function snapWeekTime(y:number,height:number,duration:number){
  const length=Math.max(1,Math.min(1440,duration));
  const latest=Math.floor((1440-length)/15)*15;
  const minute=Math.max(0,Math.min(latest,Math.round(Math.max(0,Math.min(1,y/Math.max(1,height)))*1440/15)*15));
  return `${String(Math.floor(minute/60)).padStart(2,'0')}:${String(minute%60).padStart(2,'0')}`;
}
export function weekPosition(start:string,duration:number){
  const [h,m]=start.split(':').map(Number);const minute=Number.isFinite(h*60+m)?Math.max(0,Math.min(1439,h*60+m)):0;
  return {top:`${minute/1440*100}%`,height:`${Math.max(1,Math.min(duration,1440-minute))/1440*100}%`};
}
