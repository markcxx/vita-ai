# 登录、邮箱与本地模型配置

认证由 Next.js 中的 Better Auth 负责；FastAPI 负责业务接口。两者共享 PostgreSQL 的 users 表，业务 user_id 和外键保持不变。Python 启动时负责建表和增量迁移，Next.js 不单独维护迁移。

## 使用

- `/register`：邮箱 → 6 位验证码 → 设置密码 → 工作台。无等候名单。
- `/login`：邮箱密码或 GitHub 登录。
- `/reset-password`：发送重置链接，打开链接设置新密码；重置后撤销旧会话。
- 工作台侧栏底部可以退出登录。
- 设置 → 模型与语音：输入模型服务、Base URL、模型名、API Key，以及固定 DashScope 服务的 API Key。

模型和语音密钥仅写入浏览器 localStorage，并以用户 ID 隔离。请求时通过请求头传到后端，在该请求及其流式响应期间使用，不写入用户设置或业务数据表。退出后清除内存中的用户绑定，本地配置仍保留，用户可以点击“清除”删除。

所有 Web 请求（包括本地开发）都必须使用用户在「设置 → 模型与语音」中填写的密钥，不回退到根 .env 的 AI_API_KEY、DASHSCOPE_API_KEY。这两个环境变量仅供离线开发脚本使用。首次登录尚未配置模型时自动打开设置，调用 AI 功能前检查 API Key、Base URL 和模型名称。语音地址仅由服务端 DASHSCOPE_WEBSOCKET_URL 指定，前端不能覆盖。

## 服务端环境变量

根 `.env` 同时供 Next.js 和 Python 读取；部署时可直接注入同名环境变量。敏感变量不能加 NEXT_PUBLIC_ 前缀。

- DATABASE_URL：PostgreSQL。
- APP_URL：浏览器实际访问的完整 origin，本地为 http://localhost:3000。
- AUTH_SECRET：每个部署独立的随机长字符串，不要共享 mark-ai 的认证密钥。
- AUTH_SERVER_URL：FastAPI 访问 Next.js 的内部地址，本地为 http://127.0.0.1:3000；Compose 自动设置为 http://frontend:3000。
- AUTH_GITHUB_ID、AUTH_GITHUB_SECRET：GitHub OAuth 应用凭据。
- SMTP_HOST、SMTP_PORT_SSL（默认 465）、SMTP_USERNAME、SMTP_PASSWORD、SMTP_FROM_EMAIL、SMTP_TIMEOUT_SECONDS。
- EMAIL_VERIFICATION_TTL_SECONDS：验证码有效期，默认 600 秒，限定 60–900 秒。
- AUTH_EMAIL_HOURLY_LIMIT：每小时全站注册邮件发送上限，默认 100。

GitHub 回调必须包含 APP_URL + `/api/auth/callback/github`。本地配置已核对现有 MarkAI-development 应用；正式上线建议使用独立的 VitaAI OAuth 应用并更新两项 GitHub 环境变量。

验证码只保存 HMAC，60 秒重发冷却、每邮箱 10 分钟 5 次发送、每个验证码最多 5 次尝试。验证成功后签发 10 分钟一次性注册凭证。SMTP 发送失败返回错误，不会假报成功。注册凭证提交后即消费，提交失败需重新验证邮箱。

FastAPI 从固定 AUTH_SERVER_URL 获取真实会话，不接受客户端 user_id 声明。修改请求检查 Origin；会话续期 Cookie 同时支持普通和流式响应。公开分享页仍允许匿名访问。

## 验证

`pnpm --dir frontend test`、`pnpm --dir frontend type-check`、`pnpm --dir frontend build`。

Python 回归测试使用 TEST_DATABASE_URL 中的临时 schema，测试结束删除该 schema。未设置时数据库集成测试跳过。`uv run --directory backend pytest -q tests/test_local_workspace.py tests/test_runtime_credentials.py` 验证匿名拒绝、归属、生产密钥禁用及请求隔离。

Node 26 启动命令使用 `--use-env-proxy`，因此 GitHub OAuth 会读取已有 HTTP_PROXY/HTTPS_PROXY/NO_PROXY 网络配置；没有代理环境变量时直接连接。
