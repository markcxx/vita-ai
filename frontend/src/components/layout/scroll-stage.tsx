'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import s from './scroll-stage.module.css';

/** A single viewport, with an overlay toolbar that never shifts page content. */
export function ScrollStage({ children, title, actions, controls, sections = [] }: { children: ReactNode; title: string; actions: ReactNode; controls?: ReactNode; sections?: { id: string; label: string }[] }) {
  const viewport = useRef<HTMLDivElement>(null);
  const toolbar = useRef<HTMLDivElement>(null);
  const [activeSection, setActiveSection] = useState('');
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const node = viewport.current;
    const bar = toolbar.current;
    const hero = node?.querySelector<HTMLElement>('[data-scroll-hero]');
    if (!node || !hero || !bar) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const height = bar.offsetHeight;
      const heroBottom = hero.getBoundingClientRect().bottom - node.getBoundingClientRect().top + node.scrollTop;
      const maxScroll = Math.max(0, node.scrollHeight - node.clientHeight);
      // A short page may never scroll its whole hero out of view.
      const threshold = Math.min(140, Math.max(1, heroBottom - height), Math.max(1, maxScroll * .45));
      const progress = maxScroll > 0 ? Math.min(1, node.scrollTop / threshold) : 0;
      node.style.setProperty('--intro-opacity', String(1 - progress));
      node.style.setProperty('--intro-shift', `${progress * -32}px`);
      node.style.setProperty('--intro-scale', String(1 - progress * .12));
      bar.style.setProperty('--reading-progress', String(maxScroll ? node.scrollTop / maxScroll : 0));
      const chapters = [...node.querySelectorAll<HTMLElement>('[data-scroll-section]')];
      const current = chapters.filter(section => section.getBoundingClientRect().top <= node.getBoundingClientRect().top + height + 60).at(-1);
      setActiveSection(current?.id || chapters[0]?.id || '');
      node.style.scrollPaddingTop = `${height + 20}px`;
      // Focused controls stay available while keyboard users move through the page.
      setCompact((maxScroll > 0 && node.scrollTop >= threshold) || bar.contains(document.activeElement));
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const observer = new ResizeObserver(schedule);
    observer.observe(hero);
    observer.observe(bar);
    observer.observe(node);
    if (node.firstElementChild) observer.observe(node.firstElementChild);
    node.addEventListener('scroll', schedule, { passive: true });
    bar.addEventListener('focusout', schedule);
    update();
    return () => { observer.disconnect(); node.removeEventListener('scroll', schedule); bar.removeEventListener('focusout', schedule); cancelAnimationFrame(frame); };
  }, []);
  return <div className={s.frame}>
    <div ref={toolbar} className={s.toolbar} data-visible={compact} inert={!compact} aria-hidden={!compact}>
      <div className={s.toolbarMain}><strong>{title}</strong><div className={s.actions}>{actions}</div></div>
      {controls && <div className={s.controls}>{controls}</div>}
      {sections.length > 0 && <nav className={s.chapters} aria-label="报告章节">{sections.map(section => <button key={section.id} type="button" aria-current={activeSection === section.id ? 'location' : undefined} onClick={() => {
        const node = viewport.current;
        const target = node?.querySelector<HTMLElement>(`[id="${section.id}"]`);
        if (node && target) node.scrollTo({ top: node.scrollTop + target.getBoundingClientRect().top - node.getBoundingClientRect().top - (toolbar.current?.offsetHeight || 0) - 20, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      }}>{section.label}</button>)}</nav>}
      <div className={s.readingProgress} aria-hidden="true"/>
    </div>
    <div ref={viewport} className={`${s.viewport} workspace-scroll`}>{children}</div>
  </div>;
}
