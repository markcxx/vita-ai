'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useRuntimeConfig } from '@/components/providers/runtime-config-provider';

export function BrandLogo({
  className,
  priority = false,
  size = 'md',
}: {
  className?: string;
  priority?: boolean;
  size?: 'sm' | 'md';
}) {
  const iconSize = size === 'sm' ? 28 : 32;
  const { appName } = useRuntimeConfig();

  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <Image
        alt=""
        aria-hidden="true"
        className={cn('shrink-0 rounded-[8px]', size === 'sm' ? 'h-7 w-7' : 'h-8 w-8')}
        height={iconSize}
        priority={priority}
        src="/vitaai-icon-transparent.png"
        unoptimized
        width={iconSize}
      />
      <span
        className={cn(
          'font-bold tracking-[-0.035em] text-zinc-950 dark:text-white',
          size === 'sm' ? 'text-lg' : 'text-xl',
        )}
      >
        {appName}
      </span>
    </span>
  );
}
