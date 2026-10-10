export const localDay=(date:Date)=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
export function shouldAskSleep(last:number,now:Date,logged:boolean,dismissed:string|null){
  const gap=now.getTime()-last;
  if(!Number.isFinite(last)||gap<4*3600000||gap>24*3600000||logged||dismissed===localDay(now)||now.getHours()<4||now.getHours()>14)return false;
  const previous=new Date(last);
  return previous.getHours()>=20||previous.getHours()<6||localDay(previous)!==localDay(now);
}
