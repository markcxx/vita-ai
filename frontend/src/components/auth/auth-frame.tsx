'use client';
import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';
import { AgentAvatar } from './AgentAvatar';
import { BrandLogo } from '@/components/layout/brand-logo';
function AuthGuide({ compact = false }: { compact?: boolean }) {
  const [arriving, setArriving] = useState(true);
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduceMotion(media.matches);
    const timer = window.setTimeout(() => setArriving(false), 1300);
    return () => window.clearTimeout(timer);
  }, []);
  return <div className={compact ? 'mb-7 flex items-center gap-3 md:hidden' : 'max-w-sm'}>
    <div className={compact ? 'flex h-14 w-14 shrink-0 items-center justify-center' : 'flex h-28 w-28 items-center justify-center'}>
      <AgentAvatar ambient={!arriving} animate expression="mefiant" followPointer interactive playful reduceMotion={reduceMotion} size={compact ? 52 : 104} state={arriving ? 'swirl' : 'idle'} />
    </div><div><p className={compact ? 'text-sm font-semibold' : 'text-2xl font-semibold'}>很高兴见到你</p><p className="mt-1 text-sm leading-6 text-gray-500 dark:text-gray-400">登录后继续你的对话、文件与工具。</p></div>
  </div>;
}
export function AuthFrame({ children }: { children: React.ReactNode }) {
  const { resolvedTheme, setTheme } = useTheme();
  return <div className="h-dvh bg-gray-100 p-2 dark:bg-black"><div className="flex h-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/10 dark:bg-[#111]">
    <header className="flex h-16 shrink-0 items-center justify-between px-4 md:px-6"><BrandLogo priority /><button type="button" aria-label="切换主题" className="rounded-md p-2 hover:bg-gray-100 dark:hover:bg-white/10" onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}><Sun size={18} className="hidden dark:block"/><Moon size={18} className="dark:hidden"/></button></header>
    <main className="grid min-h-0 flex-1 overflow-y-auto md:grid-cols-[minmax(280px,0.9fr)_minmax(440px,1.1fr)]"><aside className="hidden items-center justify-center border-r border-gray-100 bg-gray-50/70 px-10 dark:border-white/[0.07] dark:bg-white/[0.02] md:flex"><AuthGuide /></aside><section className="flex items-center justify-center px-4 py-8 sm:px-8"><div className="w-full max-w-[440px]"><AuthGuide compact />{children}</div></section></main>
  </div></div>;
}
