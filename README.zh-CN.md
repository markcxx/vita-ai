# LT Employ Assistant

LT Employ Assistant 是一个前后端分离的求职助手，提供简历创建、AI 修改、候选人画像、分享导出和模拟面试。

## 技术栈

- 前端：Next.js 16、React 19、TypeScript、Tailwind CSS、Zustand、AI SDK
- 后端：FastAPI、SQLAlchemy、LangChain、LangGraph
- 模型传输：OpenAI 兼容接口、Anthropic、Gemini
- 语音面试：浏览器语音识别、阿里云 DashScope 双向流式 TTS
- 持久化：PostgreSQL，通过根目录 `.env` 中的 `DATABASE_URL` 配置，首次启动自动建表。详见 [数据库与归属](backend/DATABASE.md)。

Next.js 只负责界面。全部 `/api/*` 请求由 FastAPI 实现；本地开发时 `frontend/src/proxy.ts` 负责同源、无缓冲的流式转发。

## 本地开发

需要 Node.js 26+、pnpm 10.29.2、Python 3.12+ 和 uv。

```bash
cp .env.example .env # 已有本地配置时跳过
pnpm install
uv sync --directory backend
pnpm dev
```

前端地址为 `http://localhost:3000`，FastAPI 地址为 `http://localhost:8000`。
`pnpm dev` 同时启动两个服务；也可在两个终端分别运行 `pnpm dev:api` 和 `pnpm dev:web`。

复制 `.env.example` 为根目录下已忽略的 `.env`，配置 PostgreSQL 和模型服务。前后端共用根目录 `.env`，进程环境变量优先；后端兼容 `APP_*` 别名。AI 和 DashScope 密钥只能保存在后端。当前直接进入本地工作区，无需登录；用户归属字段、外键和资源归属检查保留。

## 验证

```bash
pnpm type-check
pnpm test
pnpm lint
pnpm test:api
pnpm check:api
pnpm build
```

## 目录

```text
frontend/                 Next.js 页面、组件、Hooks 和客户端状态
backend/                  FastAPI 路由、服务、持久化和 AI 工作流
deploy/nginx.conf         生产环境同源路由
docker-compose.yml        gateway、frontend 和 backend 服务
.env.example              环境变量配置模板
ARCHITECTURE.md           当前架构边界和设计规则
```

详细设计见 [ARCHITECTURE.md](./ARCHITECTURE.md)。

### 简历模板与导出渲染器

- `folio-*` 六款模板按参考布局实现，支持图库预览换色、编辑和保存配色。图库首次显示 12 款，每次「加载更多」增加 12 款。
- PDF / HTML / Word 导出由 FastAPI 先校验简历归属，再通过标准输入调用私有 Node 渲染器。渲染器没有公开 HTTP 端口，也不连接数据库。
- 原有模板的 HTML、Word 构建器和 Chromium PDF 排版器已从拆分前的版本恢复；PDF 保留文字、头像、颜色和分页，不再逐行输出纯文本。
- 首次安装或修改渲染代码后运行 `pnpm --dir frontend build:renderer`。`pnpm dev` 和 `pnpm dev:api` 会自动构建。单独运行 Uvicorn 时需要先手动构建。
- 本地 PDF 渲染需要 Chrome / Chromium，可用 `CHROME_PATH` 指定。容器构建已包含 Node、Chromium 与中文字体；部署此更新需要重建后端镜像。
- 可用环境变量 `RESUME_RENDERER_PATH` 指定构建文件，`RESUME_PUBLIC_DIR` 指定静态资源目录，`NODE_BINARY` 指定 Node 可执行文件。
- 修改模板布局后，运行 `pnpm --dir frontend build:renderer` 让导出同步；Word 使用可编辑的文档布局，复杂剪影和几何装饰以 PDF / HTML 为准。

## 中文界面文案

项目仅提供中文界面，不再使用国际化框架或维护英文文案。界面文案统一放在 `frontend/src/content/copy.json`，通过 `getCopy` 读取并替换数量、日期等占位符。模板名称直接维护在模板目录中。

页面地址不带语言前缀；历史 `/zh/...`、`/en/...` 链接会跳转至对应页面，查询参数保持不变。简历内容的翻译功能与界面文案独立。

