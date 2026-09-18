"use client";

import { useEffect, useRef, useState } from "react";
import { Atom, ChevronDown, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { MarkdownContent } from "./MarkdownContent";

export function ThinkingPanel({
  content,
  thinking,
}: {
  content?: string;
  thinking?: boolean;
}) {
  const [showDetail, setShowDetail] = useState(Boolean(thinking));
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasContent = Boolean(content?.trim());
  const expanded = Boolean(thinking || showDetail);

  useEffect(() => {
    if (thinking && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [content, thinking]);

  if (!thinking && !hasContent) return null;

  return (
    <div className="mb-4 text-sm">
      <button
        aria-expanded={expanded}
        className="flex items-center gap-1.5 rounded-lg px-1 py-1 text-left text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
        onClick={() => setShowDetail((value) => !value)}
        type="button"
      >
        <span
          className={cn(
            "flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-400 dark:border-gray-600 dark:bg-gray-800",
            expanded && !thinking && "border-primary/25 bg-primary/5 text-primary dark:border-primary/30 dark:bg-primary/10",
          )}
        >
          {thinking ? <Loader2 className="animate-spin" size={14} /> : <Atom size={14} />}
        </span>
        <span className={cn("text-sm", thinking ? "animate-pulse text-gray-500 dark:text-gray-300" : "text-gray-500 dark:text-gray-400")}>
          {thinking ? "正在深度思考..." : "已深度思考"}
        </span>
        <ChevronDown
          className={cn("text-gray-400 transition-transform", expanded && "rotate-180")}
          size={14}
        />
      </button>

      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-200 ease-out",
          expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div
            className="chat-solid-scrollbar mt-1 max-h-[min(40vh,320px)] overflow-y-auto px-2 pb-2 text-[13px] leading-relaxed text-gray-500 dark:text-gray-400"
            ref={scrollRef}
          >
            {hasContent ? (
              <div className="[&_*]:!text-gray-500 dark:[&_*]:!text-gray-400">
                <MarkdownContent>{content || ""}</MarkdownContent>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
