"use client";

import { useState } from "react";
import { BriefcaseBusiness } from "lucide-react";
import { AppDialog } from "@/components/ui/AppDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function JobDescriptionDialog({ mode = "edit", open, onClose, onSubmit }: {
  mode?: "edit" | "generate";
  open: boolean;
  onClose: () => void;
  onSubmit: (value: { targetRole: string; jobDescription: string }) => void;
}) {
  const [targetRole, setTargetRole] = useState("");
  const [jobDescription, setJobDescription] = useState("");

  const close = () => {
    setTargetRole("");
    setJobDescription("");
    onClose();
  };

  return (
    <AppDialog open={open} onClose={close} title={<span className="flex items-center gap-2"><BriefcaseBusiness size={18} />上传岗位招聘信息</span>} width={680}>
      <div className="space-y-4 px-5 py-4">
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-gray-500">
            {mode === "generate" ? "目标岗位" : "目标岗位（可选）"}
          </span>
          <Input value={targetRole} onChange={(event) => setTargetRole(event.target.value)} placeholder="例如：产品运营" />
        </label>
        <label className="block space-y-1.5"><span className="text-xs font-medium text-gray-500">岗位招聘信息</span><Textarea className="min-h-64 resize-y" value={jobDescription} onChange={(event) => setJobDescription(event.target.value)} placeholder="粘贴岗位职责、任职要求、公司介绍等内容……" /></label>
        <p className="text-xs leading-5 text-gray-400">
          {mode === "generate"
            ? "提交后会像附件一样加入输入框。发送消息时，模型会结合个人资料库和岗位信息生成专项简历，并请你选择模板。"
            : "提交后会像附件一样加入输入框。发送消息时，模型会同时读取个人资料库、岗位信息和当前简历。"}
        </p>
      </div>
      <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-3 dark:border-white/10"><Button variant="outline" onClick={close}>取消</Button><Button disabled={!jobDescription.trim() || (mode === "generate" && !targetRole.trim())} onClick={() => { onSubmit({ targetRole: targetRole.trim(), jobDescription: jobDescription.trim() }); close(); }}>添加到对话</Button></div>
    </AppDialog>
  );
}
