'use client';

import { useRef, useState, type CSSProperties, type ReactNode } from 'react';
import styles from './editor-workspace.module.css';

const DEFAULT_RATIO = 52.4;

export function EditorSplitLayout({ collapsed, children }: { collapsed: boolean; children: [ReactNode, ReactNode] }) {
  const container = useRef<HTMLDivElement>(null);
  const [ratio, setRatio] = useState(DEFAULT_RATIO);
  const [dragging, setDragging] = useState(false);
  const limits = () => {
    const width = Math.max(1, (container.current?.clientWidth || 1000) - 48);
    return {
      min: Math.min(collapsed ? 320 : 480, width * .6) / width * 100,
      max: 100 - Math.min(320, width * .4) / width * 100,
    };
  };
  const resize = (value: number) => {
    const { min, max } = limits();
    setRatio(Math.max(min, Math.min(max, value)));
  };
  return <div ref={container} className={styles.workspace} data-collapsed={collapsed} data-resizing={dragging} style={{ '--editor-left': `${ratio}fr`, '--editor-right': `${100 - ratio}fr` } as CSSProperties}>
    {children[0]}
    <div
      className={styles.resizeHandle}
      role="separator"
      aria-label="调整编辑区与预览区宽度"
      aria-orientation="vertical"
      aria-controls="resume-editing-area"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(ratio)}
      aria-valuetext={`编辑区 ${Math.round(ratio)}%`}
      tabIndex={0}
      title="拖动调整宽度，双击恢复默认"
      onPointerDown={event => {
        if (event.button !== 0) return;
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        setDragging(true);
      }}
      onPointerMove={event => {
        if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
        const bounds = container.current?.getBoundingClientRect();
        if (bounds) resize((event.clientX - bounds.left - 24) / (bounds.width - 48) * 100);
      }}
      onPointerUp={event => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
        setDragging(false);
      }}
      onLostPointerCapture={() => setDragging(false)}
      onPointerCancel={() => setDragging(false)}
      onDoubleClick={() => setRatio(DEFAULT_RATIO)}
      onKeyDown={event => {
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          event.preventDefault(); resize(ratio + (event.key === 'ArrowLeft' ? -2 : 2));
        } else if (event.key === 'Home' || event.key === 'End') {
          event.preventDefault(); resize(event.key === 'Home' ? 0 : 100);
        } else if (event.key === 'Enter') { setRatio(DEFAULT_RATIO); }
      }}
    ><span /></div>
    {children[1]}
  </div>;
}
