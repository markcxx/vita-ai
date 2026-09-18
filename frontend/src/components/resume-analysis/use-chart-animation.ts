"use client";

import { useEffect, type RefObject } from "react";

/** Animate the actual SVG marks once, when each chart enters the scroll viewport. */
export function useChartAnimation(root: RefObject<HTMLElement | null>, identity: string) {
  useEffect(() => {
    const element = root.current;
    if (!element || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const animations: Animation[] = [];
    const seen = new WeakSet<Element>();
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        const marks = entry.target.querySelectorAll<SVGGraphicsElement>("path, circle, rect, polygon, line, text[data-cloud-word]");
        let order = 0;
        for (const mark of marks) {
          const fill = mark.getAttribute("fill") || "none";
          const stroke = mark.getAttribute("stroke") || "none";
          const color = fill === "none" ? stroke : fill;
          // Leave grid lines, empty tracks, axes and labels stationary.
          if (!mark.hasAttribute("data-cloud-word") && !/^(#[234567abf]|url\()/i.test(color)) continue;
          const options = { duration: 850, delay: Math.min(order++ * 45, 400), easing: "cubic-bezier(.22,1,.36,1)", fill: "backwards" as const };
          if (fill === "none" && mark instanceof SVGGeometryElement) {
            const length = mark.getTotalLength();
            animations.push(mark.animate([{ strokeDasharray: `${length}`, strokeDashoffset: length, opacity: 0.3 }, { strokeDasharray: `${length}`, strokeDashoffset: 0, opacity: 1 }], options));
          } else {
            const horizontal = mark.tagName === "rect" && Number(mark.getAttribute("width")) > Number(mark.getAttribute("height"));
            animations.push(mark.animate([
              { transform: horizontal ? "scaleX(0)" : "scaleY(0)", opacity: 0, transformOrigin: horizontal ? "left center" : "center bottom", transformBox: "fill-box" },
              { transform: "scale(1)", opacity: 1, transformOrigin: horizontal ? "left center" : "center bottom", transformBox: "fill-box" },
            ], options));
          }
        }
      }
    }, { threshold: 0.18 });
    const observe = () => element.querySelectorAll("svg[role='img']").forEach((svg) => {
      if (!seen.has(svg)) { seen.add(svg); observer.observe(svg); }
    });
    observe();
    // Word layout is asynchronous; observe its new SVG once fonts/layout are ready.
    const mutations = new MutationObserver(observe);
    mutations.observe(element, { childList: true, subtree: true });
    const finish = () => animations.forEach((animation) => animation.finish());
    window.addEventListener("beforeprint", finish);
    return () => {
      observer.disconnect(); mutations.disconnect();
      animations.forEach((animation) => animation.cancel());
      window.removeEventListener("beforeprint", finish);
    };
  }, [root, identity]);
}
