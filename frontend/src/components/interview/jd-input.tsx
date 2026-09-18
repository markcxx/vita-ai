'use client';

import { getCopy } from '@/lib/copy';
import { Textarea } from '@/components/ui/textarea';

const MAX_JD_LENGTH = 5000;

interface JDInputProps {
  value: string;
  onChange: (value: string) => void;
}

export function JDInput({ value, onChange }: JDInputProps) {
  const t = getCopy('interview.setup');

  return (
    <div>
      <label htmlFor="interview-jd" className="mb-2 block text-sm font-medium text-zinc-800 dark:text-zinc-200">{t('jdLabel')}</label>
      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-background shadow-xs transition-[border-color,box-shadow] focus-within:border-brand focus-within:ring-[3px] focus-within:ring-brand-ring dark:border-zinc-700">
        <Textarea
          id="interview-jd"
          value={value}
          onChange={(e) => onChange(e.target.value.slice(0, MAX_JD_LENGTH))}
          placeholder={t('jdPlaceholder')}
          className="jd-textarea h-[clamp(120px,19vh,190px)] min-h-0 resize-none overflow-x-hidden overflow-y-auto rounded-none border-0 bg-transparent px-3 py-3 pr-2 leading-6 shadow-none outline-none focus-visible:border-0 focus-visible:ring-0 dark:bg-transparent"
        />
      </div>
      <p className="mt-2 text-right text-[11px] text-zinc-400 dark:text-zinc-500">
        {t('jdCharCount', { count: value.length })}
      </p>
    </div>
  );
}
