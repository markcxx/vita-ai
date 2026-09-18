'use client';

import { useEffect } from 'react';

// One capture listener also covers nested scroll areas and portalled dialogs.
export function ScrollActivity() {
  useEffect(() => {
    const active = new Map<Element, ReturnType<typeof setTimeout>>();
    let pointerHeld = false;
    function scheduleHide(element: Element) {
      clearTimeout(active.get(element));
      active.set(element, setTimeout(() => {
        if (pointerHeld) { scheduleHide(element); return; }
        element.removeAttribute('data-scroll-active');
        active.delete(element);
      }, 900));
    }
    function onScroll(event: Event) {
      const element = event.target === document ? document.documentElement : event.target;
      if (!(element instanceof Element)) return;
      if (element.scrollHeight <= element.clientHeight && element.scrollWidth <= element.clientWidth) return;
      element.setAttribute('data-scroll-active', '');
      scheduleHide(element);
    }
    const onDown = () => { pointerHeld = true; };
    const onUp = () => { pointerHeld = false; };
    document.addEventListener('scroll', onScroll, { capture: true, passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    window.addEventListener('pointerup', onUp, { passive: true });
    window.addEventListener('pointercancel', onUp, { passive: true });
    window.addEventListener('blur', onUp);
    return () => {
      document.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      window.removeEventListener('blur', onUp);
      active.forEach((timer, element) => { clearTimeout(timer); element.removeAttribute('data-scroll-active'); });
    };
  }, []);
  return null;
}
