# FIELD NOTE v2.4.0

## 本次更新

- 登录页、侧栏和页面刊头统一为 FIELD NOTE / SUFE 校学联新媒体中心。
- 器材目录增加名称、编号、类别搜索，状态筛选和直接预约入口；保留原有诗歌与画报图标。
- 手机目录改为单列，图片完整显示；损坏图片回退到类别图标，清单加载失败可以重试。
- 修复同时收藏多件器材时结果相互覆盖，以及旧冲突检测结果覆盖新选择的问题。
- 借用草稿按用户隔离，阻止重复提交、空白理由与过去的借用时间。
- 维修中的设备无法领取，借用时段结束后无法继续审批或领取。
- 修复会话刷新失败后排队请求不结束，以及访问登录页意外清除登录状态的问题。
- Server酱测试尝试所有接收人；部分失败不再报告全体成功；错误日志不输出包含 SendKey 的 URL。
- 反馈处理时间使用 UTC，与网页的时区转换保持一致。

## 更新现有服务器

不涉及数据库结构变更，不需要手动迁移，不修改现有 `.env`。

```bash
cd /root/equipment-system
git pull origin main
docker compose -f docker-compose.prod.yml up -d --build backend
cd frontend
npm ci
npm run build
cd ..
docker compose -f docker-compose.prod.yml restart nginx
```

完成后在浏览器强制刷新。生产服务器无需运行浏览器测试。

## 验证

后端（先安装 `backend/requirements.txt`，从 backend 目录运行）：

```bash
python -m unittest discover -s tests -v
```

前端：

```bash
cd frontend
npm ci
npm run build
npx playwright install chromium
npm run dev -- --host 127.0.0.1 --port 5173
```

另一个终端从 frontend 目录运行 `npm run verify:ui`。该检查使用虚拟用户和虚拟器材，所有业务 API 请求均拦截，不接触线上数据库或真实通知服务。截图保存在 `frontend/.ui-artifacts/`，该目录不提交。

可设置 `FIELD_NOTE_QA_BROWSER` 使用本机已有 Chromium 浏览器。验证范围包括搜索、筛选、并发收藏、草稿、过时的冲突预检、刷新失败时的请求队列、320–1440px 界面和移动导航。

## 已知边界

- 自动通知在本地只验证请求行为；管理员的真实微信送达仍需服务器和接收人实际测试。
- 前端依赖已完成兼容范围内的安全更新。`npm audit` 仍报告 Vite 5 / esbuild 开发服务的 2 项告警；清除全部告警需要升级构建工具大版本，此次保留现有服务器的构建兼容性。开发服务仅用于本地，生产仍由 Nginx 提供静态文件。
- 本次没有对生产 MySQL 做多管理员同时操作的压力测试，不能视为全面并发审计。
