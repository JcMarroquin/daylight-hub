import type {SleepLog} from './hubTypes';
import {localDay} from './sleepPrompt.ts';
export const minutesOf=(time:string)=>Number(time.slice(0,2))*60+Number(time.slice(3,5));
export const sleepMinutes=(log:Pick<SleepLog,'bedTime'|'wakeTime'>)=>(minutesOf(log.wakeTime)-minutesOf(log.bedTime)+1440)%1440;
export function durationLabel(minutes:number){const rounded=Math.round(minutes);return `${Math.floor(rounded/60)}h${rounded%60?` ${rounded%60}m`:''}`;}
export function sleepDraft(logs:SleepLog[],date:string){return logs.find(log=>log.wakeDate===date)??[...logs].sort((a,b)=>b.wakeDate.localeCompare(a.wakeDate)).find(log=>log.wakeDate<=date)??{bedTime:'23:00',wakeTime:'07:00',quality:3};}
export function nightDates(log:SleepLog){const wake=new Date(`${log.wakeDate}T12:00:00`),bed=new Date(wake);if(minutesOf(log.bedTime)>=minutesOf(log.wakeTime))bed.setDate(bed.getDate()-1);return {bed:localDay(bed),wake:log.wakeDate};}
export function sleepSegments(log:Pick<SleepLog,'bedTime'|'wakeTime'>){const start=(minutesOf(log.bedTime)-720+1440)%1440,length=sleepMinutes(log);return start+length<=1440?[{start,length}]:[{start,length:1440-start},{start:0,length:start+length-1440}];}
export function sleepTrends(logs:SleepLog[],now:Date,days=7){
  const end=localDay(now),start=new Date(now);start.setDate(start.getDate()-days+1);const startKey=localDay(start),previous=new Date(start);previous.setDate(previous.getDate()-days);
  const unique=Array.from(new Map(logs.map(log=>[log.wakeDate,log])).values()).filter(log=>sleepMinutes(log)>0);
  const current=unique.filter(log=>log.wakeDate>=startKey&&log.wakeDate<=end),prior=unique.filter(log=>log.wakeDate>=localDay(previous)&&log.wakeDate<startKey);
  const average=(entries:SleepLog[])=>entries.length?entries.reduce((sum,log)=>sum+sleepMinutes(log),0)/entries.length:null;
  const wakes=current.map(log=>minutesOf(log.wakeTime));const anchor=wakes[0]??0;
  const offsets=wakes.map(wake=>(wake-anchor+2160)%1440-720);
  const wakeSpread=offsets.length>1?Math.max(...offsets)-Math.min(...offsets):null;
  const series=Array.from({length:days},(_,index)=>{const date=new Date(start);date.setDate(date.getDate()+index);return {date:localDay(date),log:current.find(log=>log.wakeDate===localDay(date))};});
  const mean=average(current),previousMean=average(prior);
  return {current,prior,series,average:mean,previousAverage:previousMean,change:mean!==null&&previousMean!==null?mean-previousMean:null,wakeSpread,quality:current.length?current.reduce((sum,log)=>sum+log.quality,0)/current.length:null};
}
