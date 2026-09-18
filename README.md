<div align="center">
  <img src="frontend/public/vitaai-icon-transparent.png" width="96" alt="VitaAI Logo" />
  <h1>VitaAI · 简历与面试助手</h1>
  <p>从整理经历、打磨简历，到准备下一场面试。</p>
  <p>Next.js · FastAPI · PostgreSQL · Better Auth · LangGraph</p>
</div>

VitaAI 是面向桌面浏览器的中文求职工作台，将简历编辑、模板预览、AI 辅助修改、简历分析和模拟面试放在同一个项目中。支持邮箱验证码注册、邮箱密码登录和 GitHub 登录，注册后即可使用，无需等候名单。

用户自行选择模型服务，在设置中填写 API Key、Base URL 和模型名称。模型与语音密钥保存在当前浏览器，按账户区分，不写入数据库。未配置时显示提示，不会强制弹出设置；简历的手动编辑、浏览和管理不依赖模型密钥。

## 界面预览

登录页采用与工作台插图一致的浅蓝折纸 Logo，支持邮箱和 GitHub 两种入口。下图为本地桌面端实际截图。

![VitaAI 桌面端登录页](docs/screenshots/login.png)

## 功能介绍

| 模块 | 能做什么 |
| --- | --- |
| 简历工作台 | 创建、复制、删除和管理多份简历，按不同岗位分别维护内容 |
| 简历编辑器 | 分节编辑、拖拽排序、实时预览、自动保存、主题与配色调整 |
| 模板库 | 多种简历版式、模板预览与换色，支持在编辑时切换模板 |
| 导入与导出 | 导入简历内容；导出 PDF、Word、HTML、TXT、JSON，支持分享链接 |
| AI 简历助手 | 分析岗位描述、检查语法、生成求职信、翻译、生成简历和面向岗位定制简历；修改方案可审阅后应用 |
| 候选人画像 | 维护个人经历与能力信息，为简历生成和优化提供上下文 |
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

- **保存在 PostgreSQL**：账户与会话、简历及分节、候选人画像、用户设置、分享记录、分析结果、面试及报告等业务数据。
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
│   │   ├── (workspace)/            简历、模板、画像、分析和面试页面
│   │   ├── (public)/               公开分享页
│   │   └── api/auth/               Better Auth 与邮箱验证码接口
│   ├── src/components/             页面组件、编辑器、聊天、面试和设置
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
│   ├── app/api/routes/             业务 API、SSE 和文件响应
│   ├── app/api/dependencies.py     会话认证与用户归属依赖
│   ├── app/services/               简历、分析、导出等业务服务
│   ├── app/ai/                     模型适配、提示词、工具与工作流
│   ├── app/domain/                 工具契约与分页规则
│   ├── app/db/                     ORM 模型、表初始化与认证表迁移
│   ├── app/runtime_credentials.py  请求级模型与语音凭据
│   ├── app/config.py               环境变量配置
│   └── tests/                     单元测试与 PostgreSQL 集成测试
├── docs/                          认证说明与 README 截图
├── deploy/nginx.conf               容器部署同源路由
├── scripts/dev.mjs                 前后端联合启动
├── docker-compose.yml              网关、前端与后端服务
├── .env.example                    环境变量模板，不含真实密钥
└── pnpm-workspace.yaml              pnpm 工作区定义
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

已有 `.env` 时跳过复制。项目不读取 `config.json`，前后端都从根目录 `.env` 或进程环境读取配置，进程环境优先。

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

上线时将 OAuth 应用中的回调地址与 `APP_URL` 同步改为正式域名。当前不接入 Google 登录。验证码有效期、发送限额及超时等配置见 [.env.example](.env.example) 和 [认证说明](docs/authentication.md)。

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

生产服务器部署采用 GitHub Actions + GHCR，自动构建前后端镜像并进行健康检查与失败回滚。部署目录 `/opt/vitaai`，内部入口 `127.0.0.1:3003`。完整说明见 [生产部署](deploy/README.md)。


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

正式部署需要配置 HTTPS、正式域名和 OAuth 回调；将 `APP_URL`、`PUBLIC_BASE_URL` 及 Compose 中的 `APP_CORS_ORIGINS` 改成实际来源。内部 `AUTH_SERVER_URL` 使用 `http://frontend:3000`。Nginx 保留 `/api/auth/*` 到前端认证服务，其余业务 API 转发到后端，流式响应不能启用缓冲。

`.env` 不提交到 Git，也不复制进镜像构建上下文。不要用 `NEXT_PUBLIC_*` 暴露数据库、SMTP 或 OAuth 密钥。

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
