# VitaAI 生产部署

与 MarkAI 一样，由 GitHub Actions 构建镜像、推送 GHCR，再通过 SSH 更新服务器。独立目录 `/opt/vitaai`，Compose 项目名 `vitaai`，唯一宿主机监听为 `127.0.0.1:3003`。

## 工作流

`.github/workflows/deploy.yml` 在 `main` 推送或手动触发时执行：

1. TypeScript、前端测试、Python 单元测试。
2. 并行构建 `linux/amd64` 的前端和后端镜像，标记完整提交 SHA 与 `latest`。
3. 上传 Compose、内部 Nginx 和部署脚本。
4. 使用短期 `GITHUB_TOKEN` 拉取对应 SHA 镜像，启动并等待健康检查。
5. 失败时恢复上一版本的镜像和部署配置；成功后更新 `current-release`。

自动回滚不回滚数据库迁移；数据库变更必须保持向后兼容。首次部署没有可回滚版本，失败会保留现场以便检查。部署脚本不会清理其他项目镜像或容器。

GitHub `production` 环境使用五个 Secrets：`DEPLOY_HOST`、`DEPLOY_PORT`、`DEPLOY_USER`、`DEPLOY_SSH_KEY`、`DEPLOY_KNOWN_HOSTS`。服务器临时密码不用于持续部署，使用独立 SSH 密钥。GHCR 登录使用临时 Docker 配置目录，退出时清理。

## 服务器配置

`/opt/vitaai/.env.production` 由运维单独配置，权限 `600`，不会通过 Git 或镜像分发。需要 PostgreSQL、认证密钥、邮件、正式应用 URL 及固定语音地址。Web 用户的模型/语音 API Key 不写入此文件。

与本地 `.env` 的区别：

```dotenv
APP_ENV=production
APP_URL=https://your-domain.example
PUBLIC_BASE_URL=https://your-domain.example
APP_CORS_ORIGINS=["https://your-domain.example"]
AUTH_SERVER_URL=http://frontend:3000
```

GitHub OAuth 回调必须是 `https://your-domain.example/api/auth/callback/github`。不要修改其他应用正在使用的 OAuth 应用来迁就本项目，应使用独立的生产 OAuth 应用。

## 外层反向代理（由域名管理方配置）

将整个站点反向代理至 `http://127.0.0.1:3003`，启用 HTTPS。必须保留 `Host`，并设置 `X-Forwarded-Proto: https`。关闭响应缓冲以支持 AI / 面试流式输出，读取超时建议 300 秒，上传上限建议 25 MB。示例：

```nginx
location / {
    proxy_pass http://127.0.0.1:3003;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_buffering off;
    proxy_read_timeout 300s;
    client_max_body_size 25m;
}
```

无需将前端 3000、后端 8000 或数据库端口暴露公网。内部网关负责 `/api/auth/*` 与业务 API 的区分。

## 日常操作

```sh
cd /opt/vitaai
docker compose ps
docker compose logs --tail 100
curl -I http://127.0.0.1:3003/login
curl http://127.0.0.1:3003/api/v1/health/live
# 修改环境变量后重新创建容器；仅 restart 不会加载新环境
docker compose up -d --force-recreate --wait
# 手动部署或回退（需有 GHCR 拉取权限）
./deploy.sh <完整的40位提交SHA>
```

容器日志轮转限制为每服务 3 × 10 MB。应用持久化数据位于 PostgreSQL，不依赖容器可写层。
