# LT Employ Assistant Architecture

项目采用前后端分离架构：Next.js 只负责页面和浏览器交互，FastAPI 是唯一服务端业务边界，并负责持久化、AI、文件处理、导出和面试编排。

## 请求边界

```text
Browser
  │
  ▼
Gateway / Next proxy
  ├─ /api/* ───────────────► FastAPI :8000
  │                            ├─ SQLAlchemy persistence
  │                            ├─ LangChain model adapter
  │                            ├─ LangGraph workflows
  │                            ├─ file parsing and export
  │                            └─ DashScope realtime TTS
  └─ /* ────────────────────► Next.js :3000
                               ├─ App Router pages
                               ├─ React components
                               └─ Zustand client state
```

`frontend/src/proxy.ts` 在本地开发时把全部 `/api/*` 请求流式转发到 FastAPI；容器部署由 Nginx 完成同样的同源路由。前端不包含 Route Handler、数据库访问、模型凭据或服务端领域逻辑。

## 后端

- `backend/app/api/routes`：HTTP API、SSE 和文件响应。
- `backend/app/services`：资源读写、归一化和领域应用服务。
- `backend/app/db`：SQLAlchemy 模型、会话和数据库初始化。
- `backend/app/domain`：与框架解耦的工具契约。
- `backend/app/ai/provider.py`：OpenAI、Anthropic、Gemini 和兼容服务的统一模型端口。
- `backend/app/ai/tools.py`：LangChain 工具及简历 proposal 构造。
- `backend/app/ai/workflows.py`：LangGraph 的完成、结构化生成、图片生成、聊天工具路由和流式输出图。

FastAPI 从根目录 `.env` 或进程环境变量读取配置。数据库使用 PostgreSQL 和 psycopg 异步驱动，`DATABASE_URL` 指定连接；首次启动创建缺失表、版本记录及本地工作区归属记录。现有表不会被清空或覆盖。数据归属详见 [数据库与归属](backend/DATABASE.md)。

## 前端

- `frontend/src/app/(workspace)`：页面和布局，不承载 API Route Handler。
- `frontend/src/components`：简历编辑、预览、聊天、画像和面试界面。
- `frontend/src/stores`：浏览器状态和编辑器自动保存状态。
- `frontend/src/hooks`：API 聊天、分页、语音识别和实时音频播放。
- `frontend/src/lib/api-proxy.ts`：开发环境的无缓冲流式代理。

客户端只通过 `/api/*` 调用后端。涉及持久化的 AI 修改采用 proposal/approval 边界：模型生成可审阅方案，用户批准后由应用服务校验并写入；批准结果回到 LangGraph 的文本总结节点，不允许重复工具调用。

## 主要领域

### 简历与画像

简历、section、候选人画像、分享记录和聊天记录均由 FastAPI/SQLAlchemy 管理。编辑器先更新 Zustand 副本，再通过后端接口保存。导入、附件解析、GitHub 数据读取、PDF/DOCX/HTML/TXT/JSON 导出都由后端实现。

### AI 助手

AI SDK 负责浏览器 UI message stream；FastAPI 将模型事件转换为对应 SSE 协议。LangGraph 明确区分普通聊天、工具选择、工具执行和界面工作流确认。当前模型上下文每次从数据库读取最新简历或画像，工具结果不会拼接到可见正文。

### 模拟面试

文字由 LangGraph/模型增量输出。语音模式在同一次面试响应中建立一个 DashScope 双工 WebSocket：模型文本 delta 连续发送为 `continue-task`，返回的音频帧通过瞬态 SSE data part 传到浏览器，并由 MediaSource 追加播放；模型结束后才发送 `finish-task`。

### 模板、分享与导出

模板元数据由 `frontend/src/lib/template-catalog.ts` 管理，预览映射位于 `frontend/src/components/preview/template-registry.ts`。服务端导出位于 `backend/app/api/routes/files.py`，分享资源接口位于 `backend/app/api/routes/resources.py`。

## 本地工作区与数据归属

当前页面和 API 不需要登录、Cookie、SSO 或浏览器指纹。后端通过固定本地工作区归属记录提供业务所需的用户 ID；`users`、业务表中的 `user_id`、外键和资源归属检查仍然保留。原有账号的数据不会自动合并到本地工作区。

启动时幂等初始化 PostgreSQL 表和本地工作区记录，保留 `users`、`user_id` 和外键归属关系。无需导入旧数据。AI 和 DashScope 密钥仍只在后端使用。配置只通过环境变量及根目录 `.env` 读取。

## 构建与验证

```bash
pnpm build
pnpm type-check
pnpm test
pnpm lint
pnpm test:api
pnpm check:api
```

前端生产镜像只包含 Next.js standalone 运行时和静态资源；后端镜像包含 Python 运行时、数据库驱动、文件处理和导出依赖。

## 扩展原则

- 所有新 API 和服务端业务进入 FastAPI。
- LangGraph 负责编排，写操作由应用服务执行。
- 工具输入必须经过 schema 和真实资源 ID 校验。
- 流式响应经过代理时必须保留响应体并禁用缓冲。
- React 组件负责展示和交互，纯消息转换放入独立模块并单测。
- 删除能力时同步删除路由、依赖、容器配置、测试与文档。
