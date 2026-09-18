'use client';

import { useLayoutEffect, useRef } from 'react';
import { PROFILE_TABS } from './profile-overview';
import styles from './profile.module.css';

export function ProfileNavigation({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const navRef = useRef<HTMLElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const nav = navRef.current;
    const indicator = indicatorRef.current;
    if (!nav || !indicator) return;
    const active = nav.querySelector<HTMLButtonElement>('[aria-current="page"]');
    if (!active) return;
    const measure = () => {
      const bounds = nav.getBoundingClientRect();
      const tab = active.getBoundingClientRect();
      indicator.style.width = `${tab.width}px`;
      indicator.style.transform = `translateX(${tab.left - bounds.left + nav.scrollLeft}px)`;
      indicator.style.opacity = '1';
    };
    measure();
    // Enable transitions only after the first position has been painted.
    const frame = requestAnimationFrame(() => { indicator.dataset.ready = 'true'; });
    const observer = new ResizeObserver(measure);
    observer.observe(nav);
    nav.querySelectorAll('button').forEach(button => observer.observe(button));
    const tab = active.getBoundingClientRect();
    const bounds = nav.getBoundingClientRect();
    const delta = tab.left < bounds.left + 16 ? tab.left - bounds.left - 16
      : tab.right > bounds.right - 16 ? tab.right - bounds.right + 16 : 0;
    if (delta) nav.scrollTo({ left: nav.scrollLeft + delta, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, [value]);

  return <nav ref={navRef} className={styles.tabs} aria-label="资料分类">
    {PROFILE_TABS.map(([key, label]) => <button key={key} type="button" aria-current={value === key ? 'page' : undefined} onClick={() => onChange(key)}>{label}</button>)}
    <span ref={indicatorRef} className={styles.tabIndicator} aria-hidden="true" />
  </nav>;
}
