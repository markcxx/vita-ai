import { DEFAULT_RESUME_AVATAR } from './resume/avatar-defaults';
import type { Resume } from '@/types/resume';
import { isReferenceTemplate, referenceTheme } from '@/lib/reference-templates';

const MOCK_DATE = new Date('2025-01-01T00:00:00Z');

export function buildMockResume(template: string, color?: string): Resume {
  return ({
    id: 'mock',
    userId: 'mock',
    title: '中文简历示例',
    template,
    themeConfig: isReferenceTemplate(template) ? referenceTheme(template, color) : {
      avatarStyle: 'circle',
      primaryColor: '#1a1a1a',
      accentColor: color || '#18181b',
      fontFamily: 'Inter',
      fontSize: 'medium',
      lineSpacing: 1.5,
      margin: { top: 20, right: 20, bottom: 20, left: 20 },
      sectionSpacing: 16,
    },
    isDefault: false,
    language: 'zh',
    sections: [
      {
        id: 's1',
        resumeId: 'mock',
        type: 'personal_info',
        title: '个人信息',
        sortOrder: 0,
        visible: true,
        content: {
          fullName: '陈一鸣',
          avatar: DEFAULT_RESUME_AVATAR,
          jobTitle: '高级前端工程师',
          email: 'alex@example.com',
          phone: '+1 (555) 123-4567',
          location: '上海',
          website: 'https://example.dev',
          linkedin: 'linkedin.com/in/example',
          github: 'github.com/example',
        },
        createdAt: MOCK_DATE,
        updatedAt: MOCK_DATE,
      },
      {
        id: 's2',
        resumeId: 'mock',
        type: 'summary',
        title: '职业总结',
        sortOrder: 1,
        visible: true,
        content: {
          text: '8 年以上 Web 产品研发经验，擅长构建稳定、可扩展的业务系统，关注工程质量、协作效率与用户体验。',
        },
        createdAt: MOCK_DATE,
        updatedAt: MOCK_DATE,
      },
      {
        id: 's3',
        resumeId: 'mock',
        type: 'work_experience',
        title: '工作经历',
        sortOrder: 2,
        visible: true,
        content: {
          items: [
            {
              id: 'w1',
              company: '星河科技',
              position: '高级前端工程师',
              location: '上海',
              startDate: '2021-03',
              endDate: null,
              current: true,
              description: '负责核心业务平台前端架构与复杂交互模块建设。',
              highlights: [
                '通过代码拆分与性能治理将页面加载耗时降低 40%',
                '推动组件规范落地，提升多人协作下的交付稳定性',
              ],
            },
            {
              id: 'w2',
              company: '青石网络',
              position: '前端工程师',
              location: '远程',
              startDate: '2018-06',
              endDate: '2021-02',
              current: false,
              description: '参与产品从 0 到 1 的核心功能研发。',
              highlights: [
                '基于 WebSocket 实现实时协作能力',
                '优化 CI/CD 流程，将部署耗时减少 60%',
              ],
            },
          ],
        },
        createdAt: MOCK_DATE,
        updatedAt: MOCK_DATE,
      },
      {
        id: 's4',
        resumeId: 'mock',
        type: 'education',
        title: '教育经历',
        sortOrder: 3,
        visible: true,
        content: {
          items: [
            {
              id: 'e1',
              institution: '浙江大学',
              degree: '本科',
              field: '计算机科学与技术',
              location: '杭州',
              startDate: '2014-09',
              endDate: '2018-05',
              gpa: '3.8',
              highlights: ['优秀毕业生', '程序设计竞赛校队成员'],
            },
          ],
        },
        createdAt: MOCK_DATE,
        updatedAt: MOCK_DATE,
      },
      {
        id: 's5',
        resumeId: 'mock',
        type: 'skills',
        title: '专业技能',
        sortOrder: 4,
        visible: true,
        content: {
          categories: [
            { id: 'sk1', name: '前端', skills: ['React', 'TypeScript', 'Next.js', 'Tailwind CSS'] },
            { id: 'sk2', name: '后端', skills: ['Node.js', 'Python', 'PostgreSQL', 'Redis'] },
            { id: 'sk3', name: '工程化', skills: ['Docker', 'CI/CD', '性能优化', '组件设计'] },
          ],
        },
        createdAt: MOCK_DATE,
        updatedAt: MOCK_DATE,
      },
      {
        id: 's6',
        resumeId: 'mock',
        type: 'projects',
        title: '项目经历',
        sortOrder: 5,
        visible: true,
        content: {
          items: [
            {
              id: 'p1',
              name: '内容管理平台',
              url: 'https://github.com/example/cms',
              description: '基于 Next.js 与 GraphQL 构建的企业内容管理平台。',
              technologies: ['Next.js', 'GraphQL', 'PostgreSQL'],
              highlights: ['支持多角色协同编辑', '服务 50+ 业务团队'],
            },
          ],
        },
        createdAt: MOCK_DATE,
        updatedAt: MOCK_DATE,
      },
      {
        id: 's7',
        resumeId: 'mock',
        type: 'certifications',
        title: '证书',
        sortOrder: 6,
        visible: true,
        content: {
          items: [
            { id: 'c1', name: '前端工程化认证', issuer: '技术认证中心', date: '2023-05' },
          ],
        },
        createdAt: MOCK_DATE,
        updatedAt: MOCK_DATE,
      },
      {
        id: 's8',
        resumeId: 'mock',
        type: 'languages',
        title: '语言能力',
        sortOrder: 7,
        visible: true,
        content: {
          items: [
            { id: 'l1', language: '中文', proficiency: '母语' },
            { id: 'l2', language: '英语', proficiency: '熟练' },
          ],
        },
        createdAt: MOCK_DATE,
        updatedAt: MOCK_DATE,
      },
    ],
    createdAt: MOCK_DATE,
    updatedAt: MOCK_DATE,
  }) as Resume;
}

