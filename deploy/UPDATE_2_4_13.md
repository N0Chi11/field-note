# FIELD NOTE v2.4.13

- 圣诞特刊调整为更鲜明的红绿对版，保留拿相机的版画圣诞老人，配上松枝、红结、糖杖、礼盒和双色印边。
- 器材清单新增「相机许愿」：写一句心愿、按下虚拟快门，即可生成并保存一张圣诞照片。不开启摄像头、不上传、不保存心愿到浏览器存储。
- 本次只更新前端；不影响借用流程、后端和数据库。

```bash
cd /root/equipment-system && git pull --ff-only origin main && (cd frontend && npm run build)
```

构建成功后强制刷新页面。不需要重建 Docker 镜像。
