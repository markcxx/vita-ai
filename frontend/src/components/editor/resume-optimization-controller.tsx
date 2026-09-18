'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CircleAlert, LoaderCircle, Sparkles } from 'lucide-react';
import { ResumeEditApprovalDialog, type ResumeEditProposal } from '@/components/chat/ResumeEditApprovalDialog';
import { AppDialog } from '@/components/ui/AppDialog';
import { useEditorStore } from '@/stores/editor-store';
import { useResumeStore } from '@/stores/resume-store';

type OptimizeResponse = {
  proposal?: ResumeEditProposal;
  error?: string;
};

export function ResumeOptimizationController({ resumeId }: { resumeId: string }) {
  const optimizationRequest = useEditorStore((state) => state.optimizationRequest);
  const clearAiOptimizationRequest = useEditorStore((state) => state.clearAiOptimizationRequest);
  const setResume = useResumeStore((state) => state.setResume);
  const [proposal, setProposal] = useState<ResumeEditProposal | null>(null);
  const [applying, setApplying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const handledRequestsRef = useRef(new Set<string>());

  useEffect(() => {
    if (!optimizationRequest || handledRequestsRef.current.has(optimizationRequest.id)) return;
    handledRequestsRef.current.add(optimizationRequest.id);

    const controller = new AbortController();
    const run = async () => {
      setErrorMessage(null);
      try {
        await useResumeStore.getState().save();

        const response = await fetch('/api/ai/resume-edit/optimize', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',

          },
          body: JSON.stringify({
            resumeId,
            sectionId: optimizationRequest.sectionId,
          }),
          signal: controller.signal,
        });
        const data = (await response.json()) as OptimizeResponse;
        if (!response.ok) throw new Error(data.error || 'AI 优化失败');

        if (data.proposal) {
          setProposal(data.proposal);
        } else {
          setErrorMessage('AI 未生成可应用的修改建议，请重新尝试');
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setErrorMessage(error instanceof Error ? error.message : 'AI 优化失败');
        }
      } finally {
        if (!controller.signal.aborted) clearAiOptimizationRequest();
      }
    };

    void run();
    return () => controller.abort();
  }, [clearAiOptimizationRequest, optimizationRequest, resumeId]);

  const handleApply = useCallback(async (nextProposal: ResumeEditProposal) => {
    setApplying(true);
    try {

      const response = await fetch('/api/ai/resume-edit/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',

        },
        body: JSON.stringify({ proposal: nextProposal, resumeId }),
      });
      const data = (await response.json()) as {
        resume?: Parameters<typeof setResume>[0];
        error?: string;
      };
      if (!response.ok || !data.resume) throw new Error(data.error || '应用修改失败');

      setResume(data.resume);
      setProposal(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '应用修改失败');
    } finally {
      setApplying(false);
    }
  }, [resumeId, setResume]);

  return (
    <>
      <AppDialog
        closable={false}
        maskClosable={false}
        onClose={() => undefined}
        open={Boolean(optimizationRequest)}
        panelClassName="max-w-[340px]"
        title={false}
        width={340}
        zIndex={1500}
      >
        <div className="flex items-center gap-3 px-5 py-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
            <LoaderCircle className="h-5 w-5 animate-spin" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-900 dark:text-gray-100">
              <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
              AI 正在分析
            </div>
            <p className="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">
              {optimizationRequest?.sectionTitle
                ? `正在审阅「${optimizationRequest.sectionTitle}」并生成修改建议…`
                : '正在审阅整份简历并生成修改建议…'}
            </p>
          </div>
        </div>
      </AppDialog>

      <ResumeEditApprovalDialog
        applying={applying}
        onApply={handleApply}
        onClose={() => setProposal(null)}
        proposal={proposal}
      />

      <AppDialog
        maskClosable
        onClose={() => setErrorMessage(null)}
        open={Boolean(errorMessage)}
        panelClassName="max-w-[420px]"
        title="AI 优化未完成"
        width={420}
        zIndex={1700}
      >
        <div className="px-5 py-5">
          <div className="flex items-start gap-3">
            <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
            <p className="text-sm leading-6 text-gray-600 dark:text-gray-300">{errorMessage}</p>
          </div>
          <div className="mt-5 flex justify-end">
            <button
              className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-white dark:text-gray-900"
              onClick={() => setErrorMessage(null)}
              type="button"
            >
              知道了
            </button>
          </div>
        </div>
      </AppDialog>
    </>
  );
}
