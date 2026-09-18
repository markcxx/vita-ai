import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ResumeEditProposal } from "./ResumeEditApprovalDialog";
import { ResumeEditToolCard } from "./ResumeEditToolCard";

const proposal: ResumeEditProposal = {
  changes: [{
    field: "description",
    oldValue: "负责项目开发",
    newValue: "负责核心功能开发与交付",
    reason: "突出具体贡献",
  }],
  reason: "让项目贡献更清晰",
  requiresApproval: true,
  title: "优化项目经历",
  toolCallId: "tool-1",
  toolName: "rewriteText",
};

describe("ResumeEditToolCard", () => {
  it("expands a pending proposal and renders approval actions", () => {
    const html = renderToStaticMarkup(
      <ResumeEditToolCard
        onApply={vi.fn()}
        onReject={vi.fn()}
        proposal={proposal}
        status="pending"
      />,
    );

    expect(html).toContain("修改前");
    expect(html).toContain("修改后");
    expect(html).toContain("暂不应用");
    expect(html).toContain("应用修改");
  });

  it("collapses a handled proposal and removes approval actions", () => {
    const html = renderToStaticMarkup(
      <ResumeEditToolCard
        onApply={vi.fn()}
        onReject={vi.fn()}
        proposal={proposal}
        status="approved"
      />,
    );

    expect(html).toContain("已应用");
    expect(html).not.toContain("修改前");
    expect(html).not.toContain("暂不应用");
    expect(html).not.toContain("应用修改");
  });
});
