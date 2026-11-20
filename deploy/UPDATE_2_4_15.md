# FIELD NOTE v2.4.15

- 登录后的首页可以打开「圣诞礼盒抽奖」。四台相机完全随机抽取，胶片滚动减速，停在抽中的型号后开盒。
- 开奖后可保存相机礼物卡，或再抽一次。开奖页显示「仅供娱乐，抽到了也不会真送你。」
- 尊重系统的减少动态效果设置；开启后直接开奖。抽奖不发放实物，也不影响器材和借用记录。

只更新前端。在云服务器终端执行：

```bash
cd /root/equipment-system && git pull --ff-only origin main && (cd frontend && npm run build)
```

构建成功后刷新网站，不用重建 Docker 镜像。
