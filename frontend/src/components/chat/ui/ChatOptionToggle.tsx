"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ToggleSwitch } from "./ToggleSwitch";

export function ChatOptionToggle({ label, checked, onChange, icon, disabled = false, hint }: {
  label: string;
  checked: boolean;
  onChange: () => void;
  icon: ReactNode;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <button
      className={cn(
        "flex h-11 shrink-0 items-center gap-1.5 rounded-lg px-2 text-sm transition-colors md:h-9 disabled:cursor-not-allowed disabled:opacity-50",
        checked
          ? "text-primary hover:bg-primary/5 dark:hover:bg-primary/10"
          : "text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200",
      )}
      onClick={onChange}
      disabled={disabled}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={hint || `${checked ? "关闭" : "开启"}${label}`}
      type="button"
    >
      {icon}
      <span className="hidden text-sm sm:inline">{label}</span>
      <span className="hidden sm:inline-flex" aria-hidden="true"><ToggleSwitch checked={checked} /></span>
    </button>
  );
}
