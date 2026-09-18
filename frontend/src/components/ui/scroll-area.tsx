"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

// Use the same native scrollbar as the resume preview and chat everywhere.
function ScrollArea({ className, children, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="scroll-area" className={cn("relative flex min-h-0 flex-col overflow-hidden", className)} {...props}>
      <div data-slot="scroll-area-viewport" className="min-h-0 flex-1 overflow-auto rounded-[inherit]" style={{ maxHeight: "inherit" }}>
        {children}
      </div>
    </div>
  )
}

export { ScrollArea }
