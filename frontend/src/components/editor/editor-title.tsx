'use client';

import { useRef, useState } from 'react';
import { Pencil } from 'lucide-react';
import { useResumeStore } from '@/stores/resume-store';

export function EditorTitle() {
  const title = useResumeStore(state => state.currentResume?.title || '未命名简历');
  const setTitle = useResumeStore(state => state.setTitle);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const cancelled = useRef(false);
  const commit = () => {
    if (!cancelled.current && draft.trim() && draft.trim() !== title) setTitle(draft.trim());
    setEditing(false);
  };

  return editing ? <input
    autoFocus
    aria-label="简历名称"
    className="h-8 w-48 min-w-0 rounded-md border border-input bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
    value={draft}
    maxLength={200}
    onFocus={event => event.currentTarget.select()}
    onChange={event => setDraft(event.target.value)}
    onBlur={commit}
    onKeyDown={event => {
      if (event.nativeEvent.isComposing) return;
      if (event.key === 'Enter') event.currentTarget.blur();
      if (event.key === 'Escape') { cancelled.current = true; setEditing(false); }
    }}
  /> : <button type="button" aria-label="修改简历名称" title="修改简历名称" className="group flex min-w-0 max-w-[8rem] items-center gap-1.5 rounded-md px-1 py-1 text-sm font-medium hover:bg-muted sm:max-w-64" onClick={() => { cancelled.current = false; setDraft(title); setEditing(true); }}>
    <span className="truncate">{title}</span><Pencil size={12} className="shrink-0 text-muted-foreground" />
  </button>;
}
