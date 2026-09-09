# 海外部署

推荐使用 Render 或 Railway，从 GitHub 导入本项目。

1. 将项目推送到 GitHub。
2. 在 Render 新建 **Web Service**，选择 Docker，Dockerfile 填 `server/Dockerfile`。
3. 端口使用 `3000`，健康检查路径使用 `/`。
4. 绑定海外域名并开启 HTTPS。
5. 发布后访问平台分配的域名即可。

当前前端默认使用同域 `/api/v1`，不需要修改 localhost 地址。

注意：当前数据库仍是内存数据库，服务重启会丢失数据。正式上线前应接入 PostgreSQL（如 Supabase），并配置对象存储保存图片。
