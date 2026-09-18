export type DimensionKey =
  "trust" | "reading" | "information" | "match" | "get";
export type Score = number | null;
export interface Dimension {
  score: Score;
  values: Score[];
  summary: string;
  tags: string[];
}
export interface AnalysisReport {
  id: string;
  title: string;
  createdAt: string;
  resumeId?: string | null;
  target: string;
  basics: { charCount: number; pageCount: number | null; sections: string[] };
  dimensions: Record<DimensionKey, Dimension>;
  strengths: string[];
  issues: {
    id: string;
    dimension: DimensionKey;
    title: string;
    evidence: string;
    suggestion: string;
    rewrite: string;
    priority: "high" | "medium" | "low";
  }[];
  warnings: string[];
}
export const dimensionInfo = [
  {
    key: "trust",
    english: "Trust",
    name: "人事信任指数",
    color: "#3985ff",
    labels: ["综合印象", "专业度", "经验深度", "稳定性"],
    description: "从表达证据与时间线一致性，观察简历内容的可信表达。",
  },
  {
    key: "reading",
    english: "Reading",
    name: "HR 阅读指数",
    color: "#fa9c61",
    labels: ["设计感", "文字设计", "阅读体验", "逻辑性"],
    description: "从信息组织与文字表达，观察简历是否便于快速阅读。",
  },
  {
    key: "information",
    english: "Information",
    name: "个人信息指数",
    color: "#6c70ff",
    labels: ["信息完整性", "信息丰富性", "信息准确性"],
    description: "求职相关信息的完整程度、丰富程度与前后一致性。",
  },
  {
    key: "match",
    english: "Match",
    name: "岗位匹配度",
    color: "#fa8082",
    labels: ["机会评估", "岗位能力", "业务能力", "素质能力"],
    description: "简历中的经历与目标岗位要求的匹配程度。",
  },
  {
    key: "get",
    english: "Get",
    name: "求职能量值",
    color: "#4bb6b4",
    labels: [
      "阅读体验",
      "信息传达能力",
      "能力评估情况",
      "候选人可靠性",
      "求职能量标签",
    ],
    description: "基于简历表达与岗位要求覆盖情况的综合参考，不代表录用概率。",
  },
] as const;
export const scoreText = (n: Score) => (n === null ? "待评估" : String(n));
export const demoReport: AnalysisReport = {
  id: "example",
  title: "产品设计师 · 示例简历分析报告",
  createdAt: "2026-09-17T06:25:23Z",
  target: "产品设计师",
  basics: {
    charCount: 1946,
    pageCount: 2,
    sections: ["基础信息", "教育经历", "项目经验", "工作经历"],
  },
  dimensions: {
    trust: {
      score: 46,
      values: [76, 35, 25, 40],
      summary:
        "经历时间线清晰，已呈现主要职责。部分项目缺少具体的决策过程与结果证据，补充个人贡献可以让经历更有说服力。",
      tags: ["时间线清晰", "职责明确", "成果待补充"],
    },
    reading: {
      score: 68,
      values: [88, 71, 81, 34],
      summary:
        "页面层次清楚，配色统一，重点信息易于寻找。建议缩短较长的描述，将职责与成果分开表达，帮助阅读者快速抓住重点。",
      tags: ["叙述精炼", "配色和谐", "层次清晰"],
    },
    information: {
      score: 67,
      values: [64, 30, 100],
      summary:
        "基本求职信息完整，工作与项目经历均有覆盖。可以进一步补充项目背景、使用的方法和最终结果，完善内容细节。",
      tags: ["信息完整", "时间合理", "1 段工作经历", "2 段项目经历"],
    },
    match: {
      score: 60,
      values: [72, 40, 36, 61],
      summary:
        "已有经历覆盖目标岗位的基础要求。建议在项目中明确呈现用户研究、设计决策和跨团队协作的实际案例。",
      tags: ["设计经验", "协作能力", "研究证据待补充"],
    },
    get: {
      score: 64,
      values: [68, 67, 60, 46, 25],
      summary:
        "简历已建立清晰的内容框架。优先补充项目成果与个人贡献，再调整岗位相关关键词，让优势更容易被发现。",
      tags: ["表达清晰", "具备项目经验", "持续完善"],
    },
  },
  strengths: [
    "表达清晰",
    "设计经验",
    "项目思维",
    "跨团队协作",
    "目标明确",
    "信息完整",
    "用户研究",
    "原型设计",
    "产品思维",
    "逻辑清晰",
    "复盘意识",
    "细节意识",
  ],
  issues: [
    {
      id: "example-1",
      dimension: "trust",
      title: "项目成果需要更具体的证据",
      evidence: "负责产品界面设计，优化用户体验。",
      suggestion:
        "补充你负责的范围、具体解决的问题和可验证的结果；没有数据时可以说明交付与反馈。",
      rewrite:
        "负责 [具体模块] 的界面设计，通过 [实际采用的方法] 解决 [具体问题]，最终交付 [可验证的成果]。",
      priority: "high",
    },
    {
      id: "example-2",
      dimension: "reading",
      title: "把长段落拆成职责与成果",
      evidence: "负责产品界面设计，优化用户体验。",
      suggestion: "每条围绕一个重点，优先呈现与目标岗位相关的贡献。",
      rewrite: "",
      priority: "medium",
    },
  ],
  warnings: ["这是效果示例，分数与内容不代表你的简历。"],
};
