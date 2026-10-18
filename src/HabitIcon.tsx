import {BookOpen,Dumbbell,Home,Repeat2,Trash2} from 'lucide-react';
const icons:Record<string,typeof Repeat2>={book:BookOpen,gym:Dumbbell,home:Home,repeat:Repeat2,trash:Trash2};
export function HabitIcon({kind,size=20}:{kind?:string;size?:number}){const Icon=icons[kind??'repeat']??Repeat2;return <Icon size={size}/>;}
