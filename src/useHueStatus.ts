import {useCallback,useEffect,useRef,useState} from 'react';
import {hueRequest} from './hueClient';
import {foregroundRefresh} from './foregroundRefresh';

export type HueStatus={connected:boolean;lightId?:string;light?:{name:string;on:boolean;brightness:number}};
export function useHueStatus(){
  const [status,setStatus]=useState<HueStatus>({connected:false});
  const [error,setError]=useState('');
  const revision=useRef(0);
  const refresh=useCallback(async(signal?:AbortSignal)=>{
    const request=++revision.current;
    try{const next=await hueRequest<HueStatus>('/status',undefined,signal);if(!signal?.aborted&&request===revision.current){setStatus(next);setError('');}}
    catch(error){if(!signal?.aborted&&request===revision.current)setError(error instanceof Error?error.message:'Could not reach Hue. Retrying automatically.');}
  },[]);
  useEffect(()=>{const stop=foregroundRefresh(refresh);return()=>{stop();revision.current++;};},[refresh]);
  return {status,setStatus,error,setError,refresh};
}
