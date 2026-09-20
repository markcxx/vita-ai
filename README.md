<div align="center">
  <img src="frontend/public/vitaai-icon-transparent.png" width="96" alt="VitaAI Logo" />
  <h1>VitaAI · 简历与面试助手</h1>
  <p>从整理经历、打磨简历，到准备下一场面试。</p>
  <p>Next.js · FastAPI · PostgreSQL · Better Auth · LangGraph</p>
  <p><a href="https://vitaai.markqq.com">在线使用</a> · <a href="#本地运行">本地运行</a> · <a href="deploy/README.md">部署指南</a></p>
</div>

VitaAI 是面向桌面浏览器的中文求职工作台，将简历编辑、模板预览、AI 辅助修改、简历分析和模拟面试放在同一个项目中。支持邮箱验证码注册、邮箱密码登录和 GitHub 登录，注册后即可使用，无需等候名单。

用户自行选择模型服务，在设置中填写 API Key、Base URL 和模型名称。模型与语音密钥保存在当前浏览器，按账户区分，不写入数据库。未配置时显示提示，不会强制弹出设置；简历的手动编辑、浏览和管理不依赖模型密钥。

## 从经历到面试

1. **整理资料**：在个人资料库维护基础信息、教育、工作与实习、项目与校园经历、技能与偏好、证书与语言。一份资料可以用于多份岗位简历。
2. **制作简历**：从模板开始手动编辑，或配置自己的模型后，让 AI 结合资料与岗位描述生成简历；生成结果保存到“我的简历”，可继续编辑。
3. **打磨内容**：在编辑器中调整内容、版式与配色，审阅 AI 修改建议，再按需应用；通过简历分析查看不足。
4. **准备投递**：导出文档或创建分享链接，再进入模拟面试练习回答、回顾记录与报告。

## 界面预览

以下为桌面端实际组件截图，重点展示简历编辑、分析报告和面试体验。报告与语音面试中的内容为虚构示例数据，用于展示界面，并非真实用户的评测结果。更多配置界面见 [界面画廊](docs/screenshots/README.md)。

### 简历工作台与编辑器

| 我的简历 | AI 对话 |
| --- | --- |
| ![简历工作台](docs/screenshots/dashboard.png) | ![AI 对话](docs/screenshots/ai-chat.png) |

![分节编辑与实时预览](docs/screenshots/editor.png)

### 简历模板

模板支持分类浏览、效果预览和配色切换。下面选取两种版式展示。

| 晴空林语 | 侧页书签 |
| --- | --- |
| ![晴空林语模板预览](docs/screenshots/template-sky.png) | ![侧页书签蓝色预览](docs/screenshots/template-bookmark-blue.png) |

### 个人资料库

集中管理教育、工作、实习、项目和技能，为不同岗位的简历提供素材。

![个人资料库](docs/screenshots/profile.png)

点击“附件智能填入”，可同时上传简历、成绩单、证书、项目说明等材料。支持 PDF、DOCX、XLS/XLSX、TXT、Markdown、CSV、JSON 和 JPG/PNG/WebP，每次最多 6 份，单份 10 MB、合计 25 MB。图片需配置支持视觉的 OpenAI 兼容模型；扫描版 PDF 需转为图片上传。

AI 分析期间展示扫描归档动画，可随时取消。识别结果先按栏目核对、编辑，再确认保存：追加会保留已有非空字段并合并补充经历；覆盖会整份替换，包括清空材料中缺失的栏目。原始附件不写入业务数据库，内容会发送给用户配置的模型服务；资料在分析期间发生更新时，保存会拒绝覆盖较新版本。

### 简历分析报告

报告展示求职能量、五维指数、简历优势及逐项改进建议。下图使用项目内置的示例报告。

![简历分析报告：评分与指数分布](docs/screenshots/resume-report.png)

### 语音模拟面试

正式面试界面包含面试官、问题字幕、实时转写、麦克风控制与对话记录。下图由现有语音面试组件渲染，问答为虚构示例。

![语音面试：面试官、字幕与对话记录](docs/screenshots/voice-interview.png)

### 面试报告

练习结束后可查看综合评分、能力分布、面试官评价、逐题复盘和提升建议。下图为现有报告组件配合虚构示例数据的展示。

![面试报告：综合表现与能力雷达图](docs/screenshots/interview-report.png)

<details>
<summary>查看面试官选择与模型配置</summary>

![面试官选择](docs/screenshots/interview-personas.png)

![模型与语音配置](docs/screenshots/settings-models.png)

</details>

## 功能介绍

| 模块 | 能做什么 |
| --- | --- |
| 简历工作台 | 创建、复制、删除和管理多份简历，按不同岗位分别维护内容 |
| 简历编辑器 | 分节编辑、拖拽排序、实时预览、自动保存、主题与配色调整 |
| 模板库 | 多种简历版式、模板预览与换色，支持在编辑时切换模板 |
| 导入与导出 | 导入简历内容；导出 PDF、Word、HTML、TXT、JSON，支持分享链接 |
| AI 简历助手 | 分析岗位描述、检查语法、生成求职信、翻译、生成简历和面向岗位定制简历；修改方案可审阅后应用 |
| 个人资料库 | 从多份附件智能填入，核对后选择追加或覆盖；分类维护教育、工作、项目与技能，支持 AI 优化表达 |
| 简历分析 | 生成结构化分析报告，查看历史报告并导出 PDF；提供学生优势分析能力 |
| 模拟面试 | 配置面试、进行文字或语音交互、保存面试记录、生成和导出面试报告 |
| 分享 | 创建公开访问的简历链接，支持密码保护、有效期和停用 |
| 账户与设置 | 邮箱验证码注册、密码重置、GitHub OAuth；主题、自动保存和本地模型配置 |

### 模型与语音配置

登录后打开侧栏的 **设置 → 模型与语音**，填写：

| 配置项 | 说明 |
| --- | --- |
| 模型服务 | OpenAI 兼容接口、Anthropic 或 Gemini |
| Base URL | 对应服务商的 API 地址；生产环境要求 HTTPS 公网地址 |
| 模型名称 | 服务商支持的实际模型标识 |
| 模型 API Key | 用户自己的模型访问密钥 |
| 语音 API Key | 用户自己的 DashScope 密钥，仅使用语音能力时需要 |

语音服务地址由部署方统一配置，用户不能覆盖。模型调用通过后端转发，因此密钥会随调用请求传至后端和对应服务商，但不会写入 PostgreSQL。更换浏览器、设备或清除浏览器存储后，需要重新配置。Web 请求在开发和生产环境中都不会回退使用部署者的模型密钥。

### 数据保存与用户边界

- **保存在 PostgreSQL**：账户与会话、简历及分节、个人资料、用户设置、分享记录、分析结果、面试及报告等业务数据。
- **保存在浏览器**：按账户隔离的模型与语音密钥，以及当前界面的临时状态。
- **AI 助手对话**：当前界面不启用聊天记录持久化；这与需要保存的模拟面试记录是两项独立能力。
- **用户隔离**：受保护 API 从登录会话解析用户身份，按资源归属校验读写权限，不信任客户端传入的用户 ID。公开分享通过独立的分享令牌与密码规则访问。

当前权限模型是用户之间的数据归属隔离，不包含管理员后台或多级角色权限系统。

## 技术架构

```mermaid
flowchart TD
    Browser[桌面浏览器 / React + Zustand]
    Routing[开发：Next.js Proxy / 部署：Nginx]
    Next[Next.js App Router]
    Auth[Better Auth + 自定义邮箱验证]
    API[FastAPI 业务 API / SSE]
    DB[(PostgreSQL)]
    AI[LangGraph 工作流 + LangChain 模型适配]
    Provider[用户选择的模型服务]
    Voice[DashScope 语音服务]
    Renderer[私有 Node 简历渲染器 / Chromium]
    SMTP[SMTP 邮件服务]
    OAuth[GitHub OAuth]

    Browser --> Routing
    Routing -->|页面与静态资源| Next
    Routing -->|/api/auth/*| Auth
    Routing -->|其他 /api/*| API
    Next -->|服务端会话检查| Auth
    API -->|校验登录会话| Auth
    Auth --> DB
    Auth --> SMTP
    Auth --> OAuth
    API -->|SQLAlchemy + psycopg| DB
    API --> AI
    AI --> Provider
    API --> Voice
    API --> Renderer
```

### 技术栈与职责

| 层次 | 技术 | 职责 |
| --- | --- | --- |
| 页面与交互 | Next.js 16、React 19、TypeScript | App Router 页面、服务端登录检查和交互组件 |
| 样式与状态 | Tailwind CSS 4、Radix UI、Zustand | 桌面工作台、主题、编辑器状态与自动保存 |
| 登录与邮件 | Better Auth、pg、Nodemailer | 账户、Cookie 会话、GitHub OAuth、注册验证码与密码重置 |
| 业务 API | FastAPI、Pydantic、SQLAlchemy 2、psycopg | 资源归属校验、业务持久化、文件处理与流式响应 |
| AI 编排 | LangChain、LangGraph、AI SDK | 模型适配、工具调用、可审阅的修改方案和 SSE 消息流 |
| 文档导出 | Node、React 渲染器、Chromium、docx | 与模板对应的 HTML、PDF 及可编辑 Word 文档 |
| 部署 | Docker Compose、Nginx | 同源路由、服务隔离和流式代理 |

Next.js 同时承担页面和认证服务，FastAPI 承担业务接口。两者连接同一个 PostgreSQL 数据库，分别通过 `pg` 与 SQLAlchemy 访问。认证接口保留在 Next.js，不能将整个 `/api/*` 无差别转发给 Python。

PDF / Word 导出先由 FastAPI 检查简历归属，再通过标准输入调用私有 Node 渲染器。渲染器不开放 HTTP 端口，也不直接连接数据库。复杂装饰的还原以 PDF / HTML 为准，Word 侧重内容可编辑。

## 代码结构

```text
vita-ai/
├── frontend/
│   ├── src/app/
│   │   ├── (auth)/                 登录、注册、密码重置
│   │   ├── (workspace)/            简历、模板、资料库、分析和面试页面
│   │   ├── (public)/               公开分享页
│   │   └── api/auth/               Better Auth 与邮箱验证码接口
│   ├── src/components/            页面组件、资料库、编辑器、聊天、面试和设置
│   ├── src/hooks/                  聊天、语音、编辑器等交互逻辑
│   ├── src/stores/                 Zustand 状态与简历自动保存
│   ├── src/lib/
│   │   ├── auth.ts                 认证配置
│   │   ├── auth/                   邮件、注册校验和认证数据库连接
│   │   ├── local-credentials.ts    浏览器本地密钥与请求头
│   │   └── resume-export/          简历导出模板与布局
│   ├── src/content/copy.json       中文界面文案
│   ├── src/proxy.ts                同源 API 转发与路由处理
│   ├── scripts/render-resume.tsx   私有文档渲染器入口
│   └── public/                    Logo、插图、字体与模板资源
├── backend/
│   ├── app/api/routes/            业务 API、SSE 和文件响应
│   ├── app/api/dependencies.py     会话认证与用户归属依赖
│   ├── app/services/              简历、分析、导出等业务服务
│   ├── app/ai/                    模型适配、提示词、工具与工作流
│   ├── app/domain/                工具契约与分页规则
│   ├── app/db/                    ORM 模型、表初始化与认证表迁移
│   ├── app/runtime_credentials.py  请求级模型与语音凭据
│   ├── app/config.py              环境变量配置
│   └── tests/                     单元测试与 PostgreSQL 集成测试
├── docs/                          认证说明与 README 截图
├── .github/workflows/deploy.yml    检查、构建 GHCR 镜像与服务器部署
├── deploy/
│   ├── compose.yaml               生产容器编排，绑定本机 3003 端口
│   ├── nginx.conf                 页面、认证与业务 API 同源路由
│   ├── deploy.sh                  按提交 SHA 部署、健康检查与失败回滚
│   └── README.md                  服务器配置与运维指南
├── scripts/dev.mjs                前后端联合启动
├── docker-compose.yml             从源码构建的本地容器编排
├── .env.example                   环境变量模板，不含真实密钥
└── pnpm-workspace.yaml             pnpm 工作区定义
```

## 本地运行

### 1. 准备环境

- Node.js **26+**、pnpm **10.29.2**。
- Python **3.12**（仓库默认开发版本）和 uv。
- 已创建的 PostgreSQL 数据库，连接账号具备建表与读写权限。
- SMTP 邮件服务，用于注册验证码与密码重置。
- Chrome / Chromium，用于 PDF 导出；必要时通过 `CHROME_PATH` 指定可执行文件。

### 2. 安装依赖

```bash
git clone https://github.com/markcxx/vita-ai.git
cd vita-ai
pnpm install
uv sync --directory backend
cp .env.example .env
```

已有 `.env` 时跳过复制。前后端都从根目录 `.env` 或进程环境读取配置，进程环境优先。

### 3. 配置服务

编辑根目录 `.env`：

| 环境变量 | 用途 |
| --- | --- |
| `DATABASE_URL` | PostgreSQL 连接串，例如 `postgresql://user:password@localhost:5432/vita_ai` |
| `AUTH_SECRET` | 每个部署独立的认证密钥，可通过 `openssl rand -base64 32` 生成 |
| `APP_NAME` | 界面及邮件中的应用名称 |
| `APP_URL` | 浏览器访问地址，本地为 `http://localhost:3000` |
| `PUBLIC_BASE_URL` | 对外分享链接的应用地址 |
| `AUTH_SERVER_URL` | FastAPI 访问 Next.js 认证服务的内部地址，本地为 `http://127.0.0.1:3000` |
| `APP_CORS_ORIGINS` | 允许的前端来源，JSON 数组格式 |
| `SMTP_HOST`、`SMTP_PORT_SSL` | 邮件服务器和端口，默认 465 |
| `SMTP_USERNAME`、`SMTP_PASSWORD`、`SMTP_FROM_EMAIL` | 邮件账号、密码与发件地址 |
| `AUTH_GITHUB_ID`、`AUTH_GITHUB_SECRET` | GitHub OAuth 应用凭据，使用 GitHub 登录时配置 |
| `DASHSCOPE_WEBSOCKET_URL`、`DASHSCOPE_TTS_MODEL`、`DASHSCOPE_TTS_VOICE` | 统一的语音服务地址、模型与音色配置 |

GitHub OAuth 本地回调地址为：

```text
http://localhost:3000/api/auth/callback/github
```

本地和生产环境建议使用两个独立的 OAuth 应用。生产应用的回调为 `https://你的域名/api/auth/callback/github`，其首页地址与 `APP_URL` 使用同一正式域名；将对应 Client ID 和 Client Secret 写入生产环境变量。当前不接入 Google 登录。验证码有效期、发送限额及超时等配置见 [.env.example](.env.example) 和 [认证说明](docs/authentication.md)。

`.env` 中的 `AI_API_KEY` 与 `DASHSCOPE_API_KEY` 仅供离线开发脚本使用，不是注册用户的共享额度。用户在浏览器设置里填写自己的密钥后，才能调用相应服务。

### 4. 启动

```bash
pnpm dev
```

命令会先构建文档渲染器，再同时启动前后端：

- 工作台：<http://localhost:3000>
- FastAPI：<http://localhost:8000>

也可以在两个终端分别运行 `pnpm dev:api` 和 `pnpm dev:web`。首次启动会创建缺失的业务表及认证表；不会导入旧库数据或清空已有记录。已有表结构的后续变更需要对应迁移，不能仅依赖 `create_all`。详见 [数据库说明](backend/DATABASE.md)。

## 构建与部署

### GitHub Actions 自动部署

仓库的 [部署工作流](.github/workflows/deploy.yml) 在推送到 `main` 或手动触发时执行：

```text
类型检查与测试 → 前后端镜像构建 → GHCR 推送 → SSH 部署 → 服务健康检查
                                                        └─ 失败：回滚上一版本镜像与部署配置
```

镜像分别为 `ghcr.io/markcxx/vita-ai-frontend` 和 `ghcr.io/markcxx/vita-ai-backend`，生产部署使用完整提交 SHA 标签。镜像面向 `linux/amd64`；回滚不撤销数据库迁移。

GitHub 的 `production` Environment 需要配置 `DEPLOY_HOST`、`DEPLOY_PORT`、`DEPLOY_USER`、`DEPLOY_SSH_KEY`、`DEPLOY_KNOWN_HOSTS` 五个 Secrets。应用配置保存在服务器 `/opt/vitaai/.env.production`，不会由工作流覆盖。生产编排为 `deploy/compose.yaml`，网关只监听 `127.0.0.1:3003`，外层反向代理负责域名和 HTTPS。完整步骤见 [生产部署](deploy/README.md)。

### 从源码构建


```bash
# 前端生产构建
pnpm build

# 独立构建文档渲染器；修改导出模板后需要重新构建
pnpm --dir frontend build:renderer

# 使用根目录 .env 启动完整容器服务
# 本地开发服务占用 3000 端口时，先停止开发服务
docker compose up -d --build
```

Compose 包含 Nginx、Next.js 和 FastAPI，不内置 PostgreSQL；数据库由 `DATABASE_URL` 指向外部实例。后端镜像包含 Node、Chromium 和中文字体。

正式部署需要配置 HTTPS、正式域名和 OAuth 回调；生产 `.env.production` 中的 `APP_URL`、`PUBLIC_BASE_URL` 与 `APP_CORS_ORIGINS` 应与浏览器实际访问来源一致。根目录 Compose 用于本地容器运行，若将其用于其他域名，需要同时修改其覆盖的 `APP_CORS_ORIGINS`。内部 `AUTH_SERVER_URL` 使用 `http://frontend:3000`。Nginx 保留 `/api/auth/*` 到前端认证服务，其余业务 API 转发到后端，流式响应不能启用缓冲。

`.env` 不提交到 Git，也不复制进镜像构建上下文。不要用 `NEXT_PUBLIC_*` 暴露数据库、SMTP 或 OAuth 密钥。

## 常见问题

| 现象 | 检查位置 |
| --- | --- |
| 接口返回 `403 请求来源无效` | `APP_URL` 是否与浏览器地址的协议、域名、端口一致；反向代理是否保留 `Host` 与原始 HTTPS 协议；修改容器环境后需要重新创建容器 |
| GitHub 登录不可用或回调错误 | 是否同时设置 `AUTH_GITHUB_ID` 和 `AUTH_GITHUB_SECRET`；OAuth 应用回调是否为当前站点的 `/api/auth/callback/github` |
| 无法发送注册验证码 | SMTP 账号、发件地址、SSL 端口与网络是否可用；是否触发发送频率限制 |
| 提示缺少模型配置 | 在当前账户的“设置 → 模型与语音”填写自己的配置；服务器 `.env` 不向用户提供共享密钥 |
| PDF 导出失败 | 本地 Chromium / `CHROME_PATH` 是否可用，文档渲染器是否已构建；容器部署使用包含 Chromium 的后端镜像 |

修改生产环境变量后，在 `/opt/vitaai` 执行 `docker compose up -d --force-recreate --wait`。单独执行 `restart` 不会加载新的环境变量。可通过 `/api/v1/health/live` 检查存活，通过 `/api/v1/health/ready` 检查数据库就绪状态。

## 开发检查

```bash
pnpm type-check       # TypeScript
pnpm test             # 前端 Vitest
pnpm lint             # 前端 ESLint
pnpm test:api         # 后端 pytest
pnpm check:api        # 后端 Ruff
pnpm build            # Next.js 生产构建
```

PostgreSQL 集成测试通过**进程环境变量** `TEST_DATABASE_URL` 指定测试数据库；仅写入 `.env` 不会让 pytest 自动读取该变量。测试创建随机 `vita_test_*` schema，结束后删除该 schema，需要创建 schema 的权限。未提供连接时跳过相关集成测试。建议使用独立测试数据库。

## 文档与许可证

- [架构与请求边界](ARCHITECTURE.md)
- [认证、邮件和模型配置](docs/authentication.md)
- [PostgreSQL 与数据归属](backend/DATABASE.md)
- [Apache-2.0 许可证](LICENSE)

界面以中文维护，主要面向桌面浏览器。优秀案例、案例管理、职业照和等候名单不属于当前功能范围。
