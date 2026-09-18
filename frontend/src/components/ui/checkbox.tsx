'use client';
import type { ComponentProps } from 'react';
import { Checkbox as Primitive } from 'radix-ui';
import { Check, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
export function Checkbox({className,checked,...props}:ComponentProps<typeof Primitive.Root>) {
 return <Primitive.Root checked={checked} className={cn('inline-flex size-4 shrink-0 items-center justify-center rounded-[5px] border border-input bg-background shadow-xs transition-colors data-[state=checked]:border-brand data-[state=checked]:bg-brand data-[state=checked]:text-white data-[state=indeterminate]:bg-brand data-[state=indeterminate]:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 disabled:cursor-not-allowed disabled:opacity-50',className)} {...props}><Primitive.Indicator>{checked==='indeterminate'?<Minus size={12}/>:<Check size={12} strokeWidth={3}/>}</Primitive.Indicator></Primitive.Root>;
}
