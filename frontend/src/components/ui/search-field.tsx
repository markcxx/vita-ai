'use client';

import type { ComponentProps } from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

type SearchFieldProps = Omit<ComponentProps<'input'>, 'type' | 'onChange'> & {
  onValueChange: (value: string) => void;
  containerClassName?: string;
};

/** Shared search appearance for resume galleries. */
export function SearchField({ onValueChange, containerClassName, className, ...props }: SearchFieldProps) {
  return (
    <label className={cn('relative block w-full max-w-md', containerClassName)}>
      <Search aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        {...props}
        type="search"
        aria-label={props['aria-label'] || props.placeholder || '搜索'}
        onChange={event => onValueChange(event.target.value)}
        className={cn('h-12 w-full rounded-xl border border-black/5 bg-background/90 pl-11 pr-4 text-sm text-foreground shadow-sm outline-none transition focus:border-brand/30 focus:ring-4 focus:ring-brand-ring dark:border-white/10', className)}
      />
    </label>
  );
}
