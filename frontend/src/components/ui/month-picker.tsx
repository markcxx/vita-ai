'use client';

import { useMemo, useState } from 'react';
import { getCopy } from '@/lib/copy';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface MonthPickerProps {
  disabled?: boolean;
  label: string;
  value: string; // "YYYY-MM" format
  onChange: (value: string) => void;
}

const MONTHS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'] as const;

export function MonthPicker({ label, value, onChange, disabled }: MonthPickerProps) {
  const t = getCopy('editor.fields');
  const [open, setOpen] = useState(false);

  const [selectedYear, selectedMonth] = useMemo(() => {
    if (!value) return ['', ''];
    const parts = value.replace(/[./年]/g, '-').replace('月', '').split('-');
    return [/^\d{4}$/.test(parts[0]) ? parts[0] : '', parts[1]?.padStart(2,'0') || ''];
  }, [value]);

  const [browseYear, setBrowseYear] = useState(() => {
    return selectedYear ? Number(selectedYear) : new Date().getFullYear();
  });

  const displayText = useMemo(() => {
    if (!selectedYear || !selectedMonth) return '';
    return t('dateDisplay', { year: selectedYear, month: t(`months.${selectedMonth}` as Parameters<typeof t>[0]) });
  }, [selectedYear, selectedMonth, t]);

  const handleMonthClick = (month: string) => {
    onChange(`${browseYear}-${month}`);
    setOpen(false);
  };

  const handleClear = () => {
    onChange('');
    setOpen(false);
  };

  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</label>
      <Popover open={open} onOpenChange={(v) => {
        setOpen(v);
        if (v) {
          setBrowseYear(selectedYear ? Number(selectedYear) : new Date().getFullYear());
        }
      }}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            disabled={disabled}
            aria-label={label}
            className="h-10 w-full cursor-pointer justify-start rounded-xl text-sm font-normal"
          >
            <CalendarDays className="mr-2 h-3.5 w-3.5 text-zinc-400" />
            {displayText ? (
              <span>{displayText}</span>
            ) : (
              <span className="text-zinc-400">{label}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-3" align="start">
          <div className="space-y-3">
            {/* Year navigation */}
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 cursor-pointer p-0"
                aria-label="上一年"
                onClick={() => setBrowseYear((y) => y - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium">{browseYear}</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 cursor-pointer p-0"
                aria-label="下一年"
                onClick={() => setBrowseYear((y) => y + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Month grid 4×3 */}
            <div className="grid grid-cols-4 gap-1">
              {MONTHS.map((m) => {
                const isSelected = selectedYear === String(browseYear) && selectedMonth === m;
                return (
                  <Button
                    key={m}
                    variant="ghost"
                    size="sm"
                    className={`h-8 cursor-pointer text-xs ${
                      isSelected
                        ? 'bg-brand-muted text-brand hover:bg-brand-muted dark:bg-brand-muted dark:text-brand dark:hover:bg-brand-muted'
                        : ''
                    }`}
                    onClick={() => handleMonthClick(m)}
                  >
                    {t(`months.${m}` as Parameters<typeof t>[0])}
                  </Button>
                );
              })}
            </div>

            {/* Clear button */}
            {value && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-full cursor-pointer text-xs text-zinc-400"
                onClick={handleClear}
              >
                {t('clear')}
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
