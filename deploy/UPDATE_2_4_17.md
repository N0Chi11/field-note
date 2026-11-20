# FIELD NOTE v2.4.17

- 普通用户和管理员登录成功后，在原本的落地页面自动打开相机抽奖。仍需点击「开始抽奖」才开奖。
- 关闭、刷新或在系统内切换页面不会重复弹出。想再玩，可以从器材首页手动打开。
- 开奖提示加大加粗，旁边放上用户提供的圣诞奶蛙表情图。

在云服务器终端更新前端：

```bash
cd /root/equipment-system && git pull --ff-only origin main && (cd frontend && npm run build)
```

构建成功后刷新。退出再登录即可验证自动弹窗，不需要重建 Docker 镜像。
