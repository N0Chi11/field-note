# FIELD NOTE v2.4.18

- 左侧菜单和退出登录按钮换上 15 枚圣诞版图标。器材用相机挂饰，审批用花环与勾，归还用礼盒；设备管理、管理员和账户菜单都使用同一套红绿描金画法。
- 桌面和手机侧栏同步更新。菜单位置、待处理数字和相机抽奖不变。

在云服务器终端更新前端：

```bash
cd /root/equipment-system && git pull --ff-only origin main && (cd frontend && npm run build)
```

构建成功后刷新网站即可，不需要重建 Docker 镜像。
