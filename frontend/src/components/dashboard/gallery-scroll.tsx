'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import Image from 'next/image';
import styles from './gallery-scroll.module.css';

/** One scroll container keeps the artwork stationary and the controls sticky. */
export function GalleryScroll({ children, background, variant }: { children: ReactNode; background: string; variant: 'dashboard' | 'templates' }) {
  const viewport = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = viewport.current;
    const hero = node?.querySelector<HTMLElement>('[data-gallery-hero]');
    const controls = node?.querySelector<HTMLElement>('[data-gallery-controls]');
    if (!node || !hero || !controls) return;
    let frame = 0;
    let distance = 180;
    const update = () => {
      frame = 0;
      const progress = Math.min(1, Math.max(0, node.scrollTop / distance));
      node.style.setProperty('--collapse-progress', String(progress));
      node.style.setProperty('--intro-opacity', String(Math.max(0, 1 - progress * 1.6)));
      node.style.setProperty('--intro-scale', String(1 - progress * .12));
      node.dataset.collapsed = String(progress >= .99);
    };
    const measure = () => {
      distance = Math.max(1, controls.getBoundingClientRect().top - hero.getBoundingClientRect().top - 12);
      node.style.setProperty('--collapse-distance', `${distance}px`);
      update();
    };
    const scroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    const observer = new ResizeObserver(measure);
    observer.observe(hero); observer.observe(controls);
    node.addEventListener('scroll', scroll, { passive: true });
    measure();
    return () => { observer.disconnect(); node.removeEventListener('scroll', scroll); cancelAnimationFrame(frame); };
  }, []);
  return <div className={styles.frame} data-gallery-variant={variant}>
    <div className={styles.backdrop} aria-hidden="true"><Image src={background} alt="" fill priority sizes="100vw" /></div>
    <div ref={viewport} className={`${styles.viewport} workspace-scroll`}>{children}</div>
  </div>;
}
