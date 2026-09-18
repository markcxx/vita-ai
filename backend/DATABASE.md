# PostgreSQL 与数据归属

在根目录 `.env` 配置 `DATABASE_URL=postgresql://用户:URL编码密码@主机:5432/数据库`。也支持 `postgres://` 和 `postgresql+psycopg://`。运行时使用 psycopg 异步连接，进程环境变量优先于 `.env`，兼容 `APP_DATABASE_URL` 别名。不再读取 JSON 配置或使用 MySQL 驱动。

## 初始化

目标数据库须已创建，连接账号需要目标 schema 的建表和读写权限。`pnpm dev` 或单独启动 Uvicorn 时，后端在事务中创建缺失表、版本记录和认证表。事务级 advisory lock 避免多个进程同时首次建表。重复启动不会清空、覆盖或导入旧数据；后续字段变更需单独迁移，`create_all` 不负责修改已有表结构。

使用 PostgreSQL TEXT、JSON 和 TIMESTAMP WITH TIME ZONE 存储文本、结构化数据与时间，时间统一按 UTC 处理。

## 数据归属

`users`、业务表中的 `user_id`、外键及资源归属校验继续保留。业务接口从 Better Auth 登录会话获取真实用户 ID，并按资源所有者隔离读写。简历、分节、画像、分享、分析、面试、报告和界面偏好保存到 PostgreSQL。当前 AI 聊天界面不启用对话持久化；模拟面试记录单独保存。原有数据不迁移，旧库不访问。

## 测试

在进程环境中设置 `TEST_DATABASE_URL` 后运行 `pnpm test:api`。集成测试在指定 PostgreSQL 数据库中创建随机命名的 `vita_test_*` schema，所有测试表及记录都限制在这个 schema；结束后仅删除该 schema。测试连接需要创建 schema 的权限，不需要创建数据库权限。未配置时跳过集成测试，其余单元测试照常运行。

根目录 `.env` 已被 Git 和 Docker 构建上下文忽略；容器通过 Compose `env_file` 注入配置。Next.js 服务端需要数据库、认证和邮件配置，FastAPI 需要业务配置；这些变量不传给浏览器。不要把数据库密码或模型密钥放入 `NEXT_PUBLIC_*`。
