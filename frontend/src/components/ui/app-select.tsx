'use client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
export function AppSelect({value,onValueChange,options,disabled,label,placeholder='请选择'}:{value:string;onValueChange:(value:string)=>void;options:{value:string;label:string}[];disabled?:boolean;label:string;placeholder?:string}) {
 return <Select value={value} onValueChange={onValueChange} disabled={disabled}><SelectTrigger aria-label={label} className="w-full"><SelectValue placeholder={placeholder}/></SelectTrigger><SelectContent>{options.map(o=><SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select>;
}
