import { z } from 'zod/v4';
import type { CandidateProfileData } from '@/types/candidate-profile';

const text = z.string().max(5000);
const stringList = z.array(z.string().max(300)).max(100);

export const candidateProfileSchema = z.object({
  isSample: z.boolean().default(false),
  personalInfo: z.object({
    fullName: text,
    jobTitle: text,
    email: text,
    phone: text,
    wechat: text,
    location: text,
    website: text,
    github: text,
    linkedin: text,
    links: z.array(z.object({ id: z.string().min(1), label: text, url: text })).max(100).optional(),
  }),
  summary: text,
  experiences: z.array(z.object({
    id: z.string().min(1),
    type: z.enum(['internship', 'work']),
    company: text,
    position: text,
    location: text,
    startDate: text,
    endDate: text,
    current: z.boolean(),
    description: text,
    highlights: stringList,
  })).max(50),
  education: z.array(z.object({
    id: z.string().min(1),
    institution: text,
    degree: text,
    field: text,
    startDate: text,
    endDate: text,
    gpa: text,
    description: text,
  })).max(30),
  projects: z.array(z.object({
    id: z.string().min(1),
    name: text,
    role: text,
    startDate: text,
    endDate: text,
    description: text,
    technologies: stringList,
    highlights: stringList,
    url: text,
  })).max(50),
  skills: z.array(z.object({ id: z.string().min(1), name: text, skills: stringList })).max(30),
  certifications: z.array(z.object({ id: z.string().min(1), name: text, issuer: text, date: text })).max(30),
  languages: z.array(z.object({
    id: z.string().min(1), language: text, proficiency: text, description: text,
  })).max(30),
  preferences: z.object({
    targetRoles: stringList,
    targetIndustries: stringList,
    preferredLocations: stringList,
  }),
});

export const EMPTY_CANDIDATE_PROFILE: CandidateProfileData = {
  isSample: false,
  personalInfo: {
    fullName: '', jobTitle: '', email: '', phone: '', wechat: '', location: '',
    website: '', github: '', linkedin: '',
  },
  summary: '',
  experiences: [],
  education: [],
  projects: [],
  skills: [],
  certifications: [],
  languages: [],
  preferences: { targetRoles: [], targetIndustries: [], preferredLocations: [] },
};

export const SAMPLE_CANDIDATE_PROFILE: CandidateProfileData = {
  isSample: true,
  personalInfo: {
    fullName: '林晓雨',
    jobTitle: '产品运营 / 用户运营',
    email: 'xiaoyu.lin@example.com',
    phone: '138-0000-2468',
    wechat: 'linxiaoyu_demo',
    location: '杭州',
    website: '',
    github: '',
    linkedin: '',
  },
  summary: '我性格比较开朗，也比较喜欢互联网，平时做事情还算认真。之前做过运营实习，也做过学校项目，希望找一个产品运营或者用户运营的工作，愿意学习新东西。',
  experiences: [
    {
      id: 'sample-exp-1', type: 'internship', company: '杭州星桥网络科技有限公司',
      position: '产品运营实习生', location: '杭州', startDate: '2025-03', endDate: '2025-07', current: false,
      description: '平时主要就是帮忙做活动、整理数据，还有回复用户的问题。领导安排什么就做什么，也会跟产品和设计沟通。',
      highlights: ['做过几次拉新活动', '整理过每周的数据表格', '在社群里回答用户问题'],
    },
    {
      id: 'sample-exp-2', type: 'internship', company: '宁波青禾文化传媒工作室',
      position: '新媒体运营实习生', location: '宁波', startDate: '2024-07', endDate: '2024-09', current: false,
      description: '负责公众号和小红书，主要工作是想选题、写文案和发内容，有时候也会看一下阅读量。',
      highlights: ['写了很多篇推文', '帮忙维护账号', '和同事一起做内容'],
    },
  ],
  education: [{
    id: 'sample-edu-1', institution: '浙江工商大学', degree: '本科', field: '市场营销',
    startDate: '2022-09', endDate: '2026-06', gpa: '3.4/4.0',
    description: '学过市场营销、消费者行为、数据分析之类的课程，也参加过一些学校活动。',
  }],
  projects: [{
    id: 'sample-project-1', name: '校园二手交易小程序运营方案', role: '项目负责人',
    startDate: '2024-10', endDate: '2024-12',
    description: '这是课程作业，我们几个人一起做了一个校园二手平台的运营方案，我主要负责调研和最后汇报。',
    technologies: ['问卷星', 'Excel', 'PowerPoint'],
    highlights: ['发了问卷', '分析了一些同学的需求', '最后做了课堂汇报'],
    url: '',
  }],
  skills: [
    { id: 'sample-skill-1', name: '办公与数据', skills: ['Excel', 'PowerPoint', '基础数据分析'] },
    { id: 'sample-skill-2', name: '运营工具', skills: ['微信公众号', '小红书', '问卷星'] },
  ],
  certifications: [{ id: 'sample-cert-1', name: '大学英语六级', issuer: '教育部教育考试院', date: '2024-06' }],
  languages: [{ id: 'sample-lang-1', language: '英语', proficiency: 'CET-6', description: '可以阅读一般英文资料' }],
  preferences: {
    targetRoles: ['产品运营', '用户运营'],
    targetIndustries: ['互联网', '消费科技'],
    preferredLocations: ['杭州', '上海'],
  },
};

export const LLM_ENGINEER_SAMPLE_CANDIDATE_PROFILE: CandidateProfileData = {
  isSample: true,
  personalInfo: {
    fullName: '周启航',
    jobTitle: '大模型应用开发工程师',
    email: 'qihang.zhou@example.com',
    phone: '139-0000-5173',
    wechat: 'zhouqihang_demo',
    location: '杭州',
    website: 'https://qihang-ai.example.com',
    github: 'https://github.com/qihang-demo',
    linkedin: '',
  },
  summary: '我对大模型应用开发比较感兴趣，平时主要用 Python 做后端，也接过好几个模型 API。做过知识库问答、智能客服和一些工作流，了解 RAG、向量数据库这些东西。希望继续找大模型应用开发相关的工作，多做一些真正能上线的 AI 产品。',
  experiences: [
    {
      id: 'sample-llm-exp-1', type: 'work', company: '杭州云栈智能科技有限公司',
      position: 'AI 应用开发工程师', location: '杭州', startDate: '2024-07', endDate: '', current: true,
      description: '主要负责公司里面几个大模型项目的开发，产品提需求后我会接模型接口、写后端接口、弄知识库，有问题就调提示词或者查日志。也会跟前端和算法同事一起联调。',
      highlights: ['做了公司内部知识库问答', '接过通义千问和 OpenAI 兼容接口', '处理过模型回答不稳定和响应比较慢的问题'],
    },
    {
      id: 'sample-llm-exp-2', type: 'internship', company: '上海栖智数据科技有限公司',
      position: 'Python 开发实习生', location: '上海', startDate: '2023-12', endDate: '2024-05', current: false,
      description: '实习时主要写 Python 接口和数据处理脚本，后来团队开始做 AI 客服，我帮忙整理文档、切分数据，还做了一个简单的检索接口。',
      highlights: ['写过 FastAPI 接口', '整理和清洗过产品文档', '参与过 AI 客服的早期版本'],
    },
  ],
  education: [{
    id: 'sample-llm-edu-1', institution: '杭州电子科技大学', degree: '本科', field: '软件工程',
    startDate: '2020-09', endDate: '2024-06', gpa: '3.5/4.0',
    description: '学过数据结构、数据库、计算机网络、软件工程和机器学习基础。毕业设计做的是基于大模型的课程问答助手。',
  }],
  projects: [
    {
      id: 'sample-llm-project-1', name: '企业知识库问答助手', role: '后端与 AI 应用开发',
      startDate: '2024-08', endDate: '2025-02',
      description: '给公司内部同事用的知识库，可以上传 PDF 和 Word，然后在网页里问问题。我负责文档处理、向量检索、模型调用和接口这部分，也改过很多次提示词。',
      technologies: ['Python', 'FastAPI', 'LangChain', 'PostgreSQL', 'pgvector', 'Redis', 'Docker'],
      highlights: ['支持 PDF 和 Word 文档上传', '回答会显示引用的文档片段', '加了缓存和超时重试'],
      url: '',
    },
    {
      id: 'sample-llm-project-2', name: 'AI 面试复盘助手', role: '个人项目',
      startDate: '2025-03', endDate: '2025-05',
      description: '自己做的一个小项目，把面试录音转成文字，再让大模型总结问题和回答，还会给一些建议。目前主要功能能跑通，但是界面和评估效果还可以继续改。',
      technologies: ['Next.js', 'FastAPI', '通义千问', '语音识别', 'Docker'],
      highlights: ['支持录音转写', '自动整理面试问题', '可以生成复盘建议'],
      url: 'https://github.com/qihang-demo/interview-review',
    },
  ],
  skills: [
    { id: 'sample-llm-skill-1', name: '开发语言与后端', skills: ['Python', 'FastAPI', 'JavaScript', 'TypeScript', 'REST API'] },
    { id: 'sample-llm-skill-2', name: '大模型应用', skills: ['LangChain', 'LlamaIndex', 'Dify', 'RAG', 'Prompt Engineering', 'Function Calling'] },
    { id: 'sample-llm-skill-3', name: '模型与平台', skills: ['通义千问', 'OpenAI API', 'Ollama', 'Hugging Face'] },
    { id: 'sample-llm-skill-4', name: '数据与部署', skills: ['PostgreSQL', 'pgvector', 'Redis', 'Docker', 'Git', 'Linux'] },
  ],
  certifications: [{ id: 'sample-llm-cert-1', name: '大学英语六级', issuer: '教育部教育考试院', date: '2023-12' }],
  languages: [{ id: 'sample-llm-lang-1', language: '英语', proficiency: 'CET-6', description: '可以阅读英文技术文档和 API 文档' }],
  preferences: {
    targetRoles: ['大模型应用开发工程师', 'AI 应用工程师', 'RAG 开发工程师'],
    targetIndustries: ['人工智能', '企业服务', '开发者工具'],
    preferredLocations: ['杭州', '上海', '远程'],
  },
};

export const SAMPLE_CANDIDATE_PROFILES = [
  SAMPLE_CANDIDATE_PROFILE,
  LLM_ENGINEER_SAMPLE_CANDIDATE_PROFILE,
] as const;
