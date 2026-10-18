export type Activity={id:string;date:string;category:string;label:string;sourceTaskId?:string;kind?:'gym_visit'|'task_completed'|'workout'|'habit'};
export type Alarm={id:string;time:string;label:string;enabled:boolean};
export type SleepLog={id:string;wakeDate:string;bedTime:string;wakeTime:string;quality:number};
