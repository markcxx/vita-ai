'use client';

import { AccountMenu } from '@/components/providers/account-provider';
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import {
  BriefcaseBusiness,
  ChartNoAxesCombined,
  ContactRound,
  FileText,
  LayoutTemplate,
  type LucideIcon,
  Menu,
  MessagesSquare,
  MessageSquareText,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SettingsDialog } from '@/components/settings/settings-dialog';
import { useUIStore } from '@/stores/ui-store';
import { cn } from '@/lib/utils';
import { getPreference, setPreference } from '@/lib/user-preferences';
import { useRuntimeConfig } from '@/components/providers/runtime-config-provider';

const SIDEBAR_MIN_WIDTH = 220;
const SIDEBAR_MAX_WIDTH = 360;
const SIDEBAR_DEFAULT_WIDTH = 260;
const SIDEBAR_COLLAPSE_OVERDRAG = 56;
const SIDEBAR_WIDTH_STORAGE_KEY = 'vitaai:sidebar-width';

const NAV_ITEMS = [
  { href: '/', label: 'AI 对话', icon: MessagesSquare, match: ['/'] },
  { href: '/dashboard', label: '我的简历', icon: FileText, match: ['/dashboard'] },
  { href: '/resume-analysis', label: '简历分析', icon: ChartNoAxesCombined, match: ['/resume-analysis'] },
  { href: '/profile', label: '个人资料库', icon: ContactRound, match: ['/profile'] },
  { href: '/templates', label: '简历模板', icon: LayoutTemplate, match: ['/templates'] },
  { href: '/interview', label: '模拟面试', icon: MessageSquareText, match: ['/interview'] },
];

function clampSidebarWidth(width: number) {
  return Math.min(Math.max(width, SIDEBAR_MIN_WIDTH), SIDEBAR_MAX_WIDTH);
}

function getInitialSidebarWidth() {
  if (typeof window === 'undefined') return SIDEBAR_DEFAULT_WIDTH;
  const stored = getPreference(SIDEBAR_WIDTH_STORAGE_KEY);
  const parsed = stored ? Number(stored) : SIDEBAR_DEFAULT_WIDTH;
  return Number.isFinite(parsed) ? clampSidebarWidth(parsed) : SIDEBAR_DEFAULT_WIDTH;
}

function AppSidebarNavItem({
  active,
  href,
  icon: Icon,
  label,
  onSelect,
}: {
  active: boolean;
  href: string;
  icon: LucideIcon;
  label: string;
  onSelect: () => void;
}) {
  return (
    <Link
      className={cn(
        'flex h-9 w-full min-w-0 items-center gap-2 rounded-lg px-1 text-left text-sm transition-colors',
        active
          ? 'bg-[#eceef0] font-medium text-gray-900 dark:bg-gray-800 dark:text-gray-100'
          : 'text-gray-700 hover:bg-[#f0f1f2] dark:text-gray-300 dark:hover:bg-gray-800/60'
      )}
      href={href}
      onClick={onSelect}
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center text-gray-400">
        <Icon size={15} />
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </Link>
  );
}

export function AppShell({
  children,
  contentClassName,
  contentScrollable = true,
  immersive = false,
  showHeader = false,
}: {
  children: ReactNode;
  contentClassName?: string;
  contentScrollable?: boolean;
  immersive?: boolean;
  showHeader?: boolean;
}) {
  const pathname = usePathname();
  const { appName } = useRuntimeConfig();
  const navItems = NAV_ITEMS;
  const { openModal } = useUIStore();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT_WIDTH);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);

  const activeItem = useMemo(
    () =>
      [...navItems].reverse().find((item) =>
        item.match.some((match) => (match === '/' ? pathname === '/' : pathname.startsWith(match)))
      ) ?? navItems[0],
    [pathname, navItems]
  );

  const mobileSidebarOffset = `min(${sidebarWidth}px, 86vw)`;
  const ActiveIcon = activeItem.icon;

  useLayoutEffect(() => {
    setSidebarWidth(getInitialSidebarWidth());
  }, []);

  useEffect(() => {
    const query = window.matchMedia('(max-width: 767px)');
    const syncMobileViewport = () => {
      const mobile = query.matches;
      setIsMobileViewport(mobile);
      if (mobile) setSidebarOpen(false);
    };

    syncMobileViewport();
    query.addEventListener('change', syncMobileViewport);
    return () => query.removeEventListener('change', syncMobileViewport);
  }, []);

  useEffect(() => {
    if (!isMobileViewport || !sidebarOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobileViewport, sidebarOpen]);

  useEffect(() => {
    if (!isResizingSidebar) return;

    const previousCursor = document.body.style.cursor;
    const previousSelect = document.body.style.userSelect;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    return () => {
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousSelect;
    };
  }, [isResizingSidebar]);

  const handleSidebarResizePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsResizingSidebar(true);

    const startX = event.clientX;
    const startWidth = sidebarWidth;
    let currentWidth = startWidth;
    let finished = false;

    const cleanup = () => {
      window.removeEventListener('blur', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    const finishResize = (collapse = false) => {
      if (finished) return;
      finished = true;
      setIsResizingSidebar(false);
      if (collapse) {
        setSidebarOpen(false);
        setSidebarWidth(startWidth);
        setPreference(SIDEBAR_WIDTH_STORAGE_KEY, String(startWidth));
      } else {
        setPreference(SIDEBAR_WIDTH_STORAGE_KEY, String(currentWidth));
      }
      cleanup();
    };

    const handlePointerMove = (pointerEvent: PointerEvent) => {
      pointerEvent.preventDefault();
      const rawWidth = startWidth + pointerEvent.clientX - startX;
      if (rawWidth <= SIDEBAR_MIN_WIDTH - SIDEBAR_COLLAPSE_OVERDRAG) {
        finishResize(true);
        return;
      }
      const nextWidth = clampSidebarWidth(rawWidth);
      currentWidth = nextWidth;
      setSidebarWidth(nextWidth);
    };

    const handlePointerUp = () => {
      finishResize();
    };

    window.addEventListener('blur', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  return (
    <div
      className={cn(
        'chat-app-bg flex h-dvh w-screen overflow-hidden p-0 font-sans text-gray-900 antialiased dark:text-gray-100 md:p-2',
        isResizingSidebar && 'cursor-col-resize select-none'
      )}
    >
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex h-dvh max-w-[86vw] shrink-0 flex-col bg-[#f8f8f8] shadow-[16px_0_40px_rgba(15,23,42,0.16)] will-change-transform dark:bg-[#000000] md:static md:z-30 md:h-full md:max-w-none md:shadow-none md:will-change-auto',
          !isResizingSidebar &&
            'transition-[width,margin,transform,opacity,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] md:duration-200',
          sidebarOpen
            ? 'translate-x-0 opacity-100 md:mr-2'
            : '-translate-x-[calc(100%+24px)] opacity-0 md:mr-0 md:w-0 md:translate-x-0 md:overflow-hidden md:opacity-100'
        )}
        style={sidebarOpen ? { width: sidebarWidth } : undefined}
      >
        <div className="flex h-full w-full flex-col">
          <div className="mb-2 flex items-center justify-between p-3">
            <Link className="ml-2 mt-1 flex min-w-0 items-center gap-3" href="/">
              <Image
                alt={appName}
                className="h-9 w-9 object-contain"
                height={36}
                priority
                src="/vitaai-icon-transparent.png"
                unoptimized
                width={36}
              />
              <div className="min-w-0">
                <h1 className="truncate text-lg font-bold leading-tight text-gray-900 dark:text-gray-100">
                  {appName}
                </h1>
              </div>
            </Link>
            <button
              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-[#eceef0] hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
              onClick={() => setSidebarOpen(false)}
              title="收起侧栏"
              type="button"
            >
              <PanelLeftClose size={18} />
            </button>
          </div>

          <div className="mb-4 px-3 pt-2">
            <div className="mb-2 px-3 text-xs font-semibold text-gray-400">工作区</div>
            <nav className="flex flex-col gap-1">
              {navItems.map((item) => (
                <AppSidebarNavItem
                  active={item === activeItem}
                  href={item.href}
                  icon={item.icon}
                  key={item.href}
                  label={item.label}
                  onSelect={() => {
                    if (isMobileViewport) setSidebarOpen(false);
                  }}
                />
              ))}
            </nav>
          </div>

          <div className="mt-auto border-t border-gray-200/50 p-3 dark:border-gray-700/50">
            <button
              className="flex h-9 w-full items-center gap-2 rounded-lg px-1 text-left text-sm text-gray-700 transition-colors hover:bg-[#f0f1f2] dark:text-gray-300 dark:hover:bg-gray-800/60"
              onClick={() => openModal('settings')}
              type="button"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center text-gray-400">
                <Settings size={15} />
              </span>
              <span className="min-w-0 flex-1 truncate">设置</span>
            </button>
            <AccountMenu />
          </div>
        </div>
      </aside>

      {isMobileViewport && sidebarOpen && (
        <button
          aria-label="收起侧栏"
          className="fixed inset-y-0 right-0 z-30 bg-transparent"
          onClick={() => setSidebarOpen(false)}
          style={{ left: mobileSidebarOffset }}
          type="button"
        />
      )}

      <main
        className="grid min-w-0 flex-1 transition-[transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] md:duration-300 md:ease-out"
        style={{
          transform: isMobileViewport && sidebarOpen ? `translateX(${mobileSidebarOffset})` : undefined,
        }}
      >
        <section
          className={cn(
            'chat-panel-bg relative flex min-w-0 flex-col overflow-hidden border-0 shadow-none transition-[border-color] duration-300 ease-out dark:border-gray-700',
            immersive
              ? 'bg-transparent md:border-0 md:bg-transparent'
              : 'md:rounded-xl md:border md:border-[#e5e5e5]'
          )}
        >
          {sidebarOpen && (
            <div
              aria-label="调整侧栏宽度"
              className="group absolute inset-y-0 left-0 z-30 hidden w-3 -translate-x-1/2 touch-none cursor-col-resize md:block"
              onPointerDown={handleSidebarResizePointerDown}
              role="separator"
            >
              <div
                className={cn(
                  'absolute inset-y-0 left-1/2 w-0.5 bg-transparent transition-colors duration-150 group-hover:bg-primary/70',
                  isResizingSidebar && 'bg-primary'
                )}
              />
            </div>
          )}

          {showHeader && (
            <div className="chat-header-bg flex h-14 shrink-0 items-center justify-between border-b border-gray-200/70 px-3 backdrop-blur dark:border-gray-700/60 md:px-4">
              <div className="flex min-w-0 items-center gap-2">
                {!sidebarOpen && (
                  <button
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-[#eceef0] hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
                    onClick={() => setSidebarOpen(true)}
                    title="展开侧栏"
                    type="button"
                  >
                    {isMobileViewport ? <Menu size={18} /> : <PanelLeftOpen size={18} />}
                  </button>
                )}
                <ActiveIcon className="h-4 w-4 text-gray-400" />
                <span className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                  {activeItem.label}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <BriefcaseBusiness className="h-4 w-4" />
                <span className="hidden sm:inline">求职管理</span>
              </div>
            </div>
          )}

          {!showHeader && !sidebarOpen && (
            <button
              className="absolute left-3 top-3 z-40 flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-[#eceef0] hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
              onClick={() => setSidebarOpen(true)}
              title="展开侧栏"
              type="button"
            >
              {isMobileViewport ? <Menu size={18} /> : <PanelLeftOpen size={18} />}
            </button>
          )}

          <div
            className={cn(
              'min-h-0 flex-1',
              contentScrollable ? 'workspace-scroll overflow-y-auto' : 'overflow-hidden',
            )}
          >
            <div
              className={cn(
                'px-4 py-5 md:px-6 md:py-6',
                contentScrollable ? 'min-h-full' : 'h-full min-h-0',
                contentClassName,
              )}
            >
              {children}
            </div>
          </div>
        </section>
      </main>

      <SettingsDialog />
    </div>
  );
}
