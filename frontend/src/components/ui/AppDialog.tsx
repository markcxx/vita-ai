"use client";

import { X } from "lucide-react";
import { type ReactNode } from "react";
import { Dialog as DialogPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

export function AppDialog({
  bodyClassName,
  children,
  closable = true,
  closeDisabled = false,
  headerClassName,
  height,
  maskClassName,
  maskClosable = true,
  onClose,
  open,
  panelClassName,
  title,
  width,
  wrapperClassName,
  zIndex = 1200,
}: {
  bodyClassName?: string;
  children: ReactNode;
  closable?: boolean;
  closeDisabled?: boolean;
  headerClassName?: string;
  height?: number | string;
  maskClassName?: string;
  maskClosable?: boolean;
  onClose: () => void;
  open: boolean;
  panelClassName?: string;
  title?: ReactNode | false;
  width?: number | string;
  wrapperClassName?: string;
  zIndex?: number;
}) {
  const showTitle = title !== undefined && title !== null && title !== false;
  const showHeader = showTitle || closable;

  return (
    <DialogPrimitive.Root
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !closeDisabled) onClose();
      }}
      open={open}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn("markai-dialog-backdrop", maskClassName)}
          style={{ zIndex }}
        />
        <div
          className={cn("markai-dialog-viewport", wrapperClassName)}
          style={{ zIndex: zIndex + 1 }}
        >
          <DialogPrimitive.Content
            aria-describedby={undefined}
            className={cn(
              "markai-dialog-panel bg-white shadow-[0_24px_80px_rgba(15,23,42,0.22)] dark:bg-[#191919] dark:shadow-[0_28px_90px_rgba(0,0,0,0.58)]",
              panelClassName,
            )}
            onEscapeKeyDown={(event) => {
              if (closeDisabled) event.preventDefault();
            }}
            onInteractOutside={(event) => {
              if (!maskClosable || closeDisabled) event.preventDefault();
            }}
            style={{ height, maxWidth: width }}
          >
            {!showTitle && (
              <DialogPrimitive.Title className="sr-only">对话框</DialogPrimitive.Title>
            )}
            {showHeader && (
              <header
                className={cn(
                  "flex min-h-14 shrink-0 items-center justify-between px-4 py-3 shadow-[0_1px_0_rgba(15,23,42,0.05)] dark:shadow-[0_1px_0_rgba(255,255,255,0.06)]",
                  headerClassName,
                )}
              >
                {showTitle ? (
                  <DialogPrimitive.Title className="m-0 min-w-0 flex-1 text-[17px] font-semibold leading-[1.4] text-gray-900 dark:text-gray-100">
                    {title}
                  </DialogPrimitive.Title>
                ) : (
                  <span />
                )}
                {closable && (
                  <DialogPrimitive.Close
                    aria-label="关闭"
                    className="ml-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-gray-400 transition-all duration-150 hover:scale-[1.04] hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 disabled:pointer-events-none disabled:opacity-40 dark:hover:bg-white/[0.08] dark:hover:text-gray-100"
                    disabled={closeDisabled}
                  >
                    <X size={16} />
                  </DialogPrimitive.Close>
                )}
              </header>
            )}
            <div
              className={cn(
                "min-h-0 overflow-y-auto",
                height !== undefined && "flex-1",
                bodyClassName,
              )}
            >
              {children}
            </div>
          </DialogPrimitive.Content>
        </div>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
