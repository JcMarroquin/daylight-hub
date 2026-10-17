/** Refresh after wake/reconnect; discard any request that was suspended in the background. */
export function foregroundRefresh(refresh:(signal:AbortSignal)=>Promise<void>,
  page:Pick<Document,'visibilityState'|'addEventListener'|'removeEventListener'>=document,
  host:Pick<Window,'addEventListener'|'removeEventListener'>=window){
  let controller:AbortController|undefined;
  let stopped=false;
  async function run(){
    if(stopped||page.visibilityState!=='visible'||controller)return;
    const request=new AbortController();controller=request;
    try{await refresh(request.signal);}catch{/* The consumer presents recoverable errors. */}
    finally{if(controller===request)controller=undefined;}
  }
  function resume(){
    controller?.abort();controller=undefined;
    void run();
  }
  const timer=setInterval(()=>void run(),30000);
  page.addEventListener('visibilitychange',resume);
  for(const event of ['focus','online','pageshow'])host.addEventListener(event,resume);
  void run();
  return()=>{stopped=true;controller?.abort();clearInterval(timer);page.removeEventListener('visibilitychange',resume);for(const event of ['focus','online','pageshow'])host.removeEventListener(event,resume);};
}
