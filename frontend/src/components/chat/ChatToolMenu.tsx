"use client";

import { BriefcaseBusiness, ChartNoAxesCombined, FileUp, Globe, Paperclip, Plus, ShieldCheck } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent,
  DropdownMenuRadioGroup, DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { ToggleSwitch } from "./ui/ToggleSwitch";
import type { ApprovalMode } from "./ChatInput";

export function ChatToolMenu({
  disabled,
  webSearchEnabled, onToggleWebSearch, onAttachment, onJobDescription,
  attachmentDisabled, jobDescriptionDisabled, showJobDescriptionControl,
  showApprovalControl, approvalMode, onApprovalModeChange,
  onStudentStrengths,
}: {
  disabled: boolean;
  webSearchEnabled: boolean;
  onToggleWebSearch: () => void;
  onAttachment: () => void;
  onJobDescription: () => void;
  attachmentDisabled: boolean;
  jobDescriptionDisabled: boolean;
  showJobDescriptionControl: boolean;
  showApprovalControl: boolean;
  approvalMode: ApprovalMode;
  onApprovalModeChange: (mode: ApprovalMode) => void;
  onStudentStrengths?: () => void;
}) {
  return <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <button type="button" aria-label="添加附件与工具" title="添加附件与工具" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted/60 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary">
        <Plus size={20} strokeWidth={1.6} />
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start" side="top" sideOffset={10} className="w-64 rounded-xl p-1.5 shadow-xl">
      {onStudentStrengths && <DropdownMenuItem className="min-h-10 gap-2.5 rounded-lg px-3" disabled={disabled} onSelect={onStudentStrengths}><ChartNoAxesCombined size={16} /><span>学生个人优势特点分析</span></DropdownMenuItem>}
      <DropdownMenuSub>
        <DropdownMenuSubTrigger className="min-h-10 gap-2.5 rounded-lg px-3"><Paperclip size={16} /><span>附件</span></DropdownMenuSubTrigger>
        <DropdownMenuSubContent className="w-56 rounded-xl p-1.5">
          <DropdownMenuItem className="min-h-10 gap-2.5 rounded-lg" disabled={attachmentDisabled} onSelect={onAttachment}><FileUp size={16} /><span>上传文件或图片</span></DropdownMenuItem>
          {showJobDescriptionControl && <DropdownMenuItem className="min-h-10 gap-2.5 rounded-lg" disabled={jobDescriptionDisabled} onSelect={onJobDescription}><BriefcaseBusiness size={16} /><span>添加岗位信息</span></DropdownMenuItem>}
        </DropdownMenuSubContent>
      </DropdownMenuSub>
      <DropdownMenuSeparator className="mx-2 my-1" />
      <DropdownMenuItem role="menuitemcheckbox" aria-checked={webSearchEnabled} disabled={disabled} className="min-h-10 gap-2.5 rounded-lg px-3" onSelect={event => { event.preventDefault(); onToggleWebSearch(); }}>
        <Globe size={16} /><span className="flex-1">联网搜索</span><span aria-hidden="true"><ToggleSwitch checked={webSearchEnabled} /></span>
      </DropdownMenuItem>
      {showApprovalControl && <>
        <DropdownMenuSeparator className="mx-2 my-1" />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="min-h-10 gap-2.5 rounded-lg px-3"><ShieldCheck size={16} /><span>简历修改权限</span></DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-52 rounded-xl p-1.5">
            <DropdownMenuRadioGroup value={approvalMode} onValueChange={v => onApprovalModeChange(v as ApprovalMode)}>
              <DropdownMenuRadioItem value="always">每次请求批准</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="unrestricted">允许直接修改</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </>}
    </DropdownMenuContent>
  </DropdownMenu>;
}
