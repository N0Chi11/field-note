# FIELD NOTE v2.4.5

- 照片审核服务默认全局并发提升至 4，可通过 `.env` 的 `PHOTO_REVIEW_CONCURRENCY` 设置为 1–4。
- 对 Kimi 返回的 HTTP 429、500、502、503、504 增加最多三次指数退避重试，并尊重 `Retry-After`。网络超时不自动重发，避免可能的重复计费。
- 审核运行时改为轻量进度轮询；照片结果逐张保存，整批分组和批量持久化集中在任务结束时执行。
- 不改借用业务数据表，无需数据库迁移。

更新命令：

```bash
cd /root/equipment-system
bash deploy/quick-update.sh
```

如果 `.env` 中已经显式设置了 `PHOTO_REVIEW_CONCURRENCY=2`，需要改为 `4` 才会使用新的默认并发；未设置时 Compose 默认使用 4。
