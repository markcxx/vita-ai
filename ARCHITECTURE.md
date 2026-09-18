# VitaAI 架构与请求边界

VitaAI 由 Next.js、FastAPI 与 PostgreSQL 组成。Next.js 负责界面和 Better Auth 认证；FastAPI 负责简历、画像、分析、面试、导出等业务。桌面端功能概览和完整目录见 [README](README.md)。

## 请求边界

```text
浏览器
  └─ 同源入口（开发：Next.js Proxy；生产：Nginx）
       ├─ 页面、静态资源 → Next.js App Router
       ├─ /api/auth/*   → Next.js Better Auth / 邮箱验证码 Route Handlers
       └─ 其他 /api/*   → FastAPI
                           ├─ 会话检查 → Next.js Better Auth
                           ├─ SQLAlchemy → PostgreSQL
                           ├─ LangChain / LangGraph → 模型服务
                           ├─ DashScope → 语音合成
                           └─ 私有 Node 渲染器 → HTML / PDF / Word
```

认证接口不能转发到 FastAPI。流式业务接口经过网关时保留响应体并关闭缓冲。外层 HTTPS 代理必须保留 Host 和原始协议，否则会影响认证及回调地址。

## 认证与数据归属

Better Auth 使用 `pg` 访问同一个 PostgreSQL 数据库。邮箱注册先完成验证码校验，拿到短期、单次使用的注册凭证后创建账户；GitHub 使用 OAuth。FastAPI 从请求 Cookie 向内部认证服务核对会话，以真实登录用户 ID 查询资源，不采用客户端声明的用户归属。

简历、画像、面试、报告、分享管理和设置接口均校验所有者。公开分享是独立入口，校验分享令牌、有效期及可选密码，不暴露原始账户信息。当前没有管理员或组织角色体系。

## 持久化与密钥

PostgreSQL 保存账户、会话、简历及分节、画像、设置、分享、分析、模拟面试和报告。当前聊天界面不启用 AI 对话持久化，模拟面试记录单独保存。

模型与语音 API Key 按用户保存在浏览器 localStorage。调用时随请求头发送到 FastAPI，以 ContextVar 隔离当前请求的模型配置；HTTP 请求不回退使用服务器环境里的 Key。语音地址由部署环境固定。用户 Key 不写数据库，也不放入 NEXT_PUBLIC 环境变量。

## 编辑和 AI 工作流

简历编辑首先修改 Zustand 状态，再通过 API 自动保存。服务端通过版本号检查和行锁处理并发修改，保存失败时保留未保存状态。

AI SDK 处理前端消息流；LangGraph 编排模型、工具和流式结果。涉及简历写入的 AI 方案经过用户确认后再由业务服务执行。模型上下文可以包含历史工具调用，但不代表用户已确认或界面操作已经完成。

## 导出与语音

FastAPI 校验归属后通过标准输入调用私有 Node 渲染器，渲染器不连接数据库、不开放 HTTP 端口。后端 Docker 镜像包含 Node、Chromium、字体和构建好的渲染器；模板改变后需重新构建。

语音面试将模型文本增量提交 DashScope WebSocket，再将音频片段通过 SSE 传回浏览器播放。语音需要用户自己的 Key；文字面试与语音播放属于不同能力。

## 部署

GitHub Actions 验证代码并构建前后端镜像，以提交 SHA 推送 GHCR。服务器 `/opt/vitaai` 使用独立 Compose 项目，只监听 `127.0.0.1:3003`；健康检查失败回滚上一组镜像和配置。数据库位于外部 PostgreSQL 实例，环境文件不进入镜像或 Git。部署细节见 [deploy/README.md](deploy/README.md)。

## 扩展原则

- 认证扩展放在 Next.js 认证模块；其他服务端业务放在 FastAPI。
- 新业务资源的每个读写入口必须检查归属，包括导出、分享管理及嵌套子资源。
- AI 编排不直接绕过服务层修改数据，输入需经过 schema 和真实资源校验。
- 数据库变更提供幂等、向后兼容的迁移，不依赖 create_all 修改已有列。
- 删除功能时同步检查静态资源、动态路径、导出渲染器、测试和文档。
