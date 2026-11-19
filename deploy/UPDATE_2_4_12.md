# FIELD NOTE v2.4.12

- 圣诞特刊使用松绿、浆果红、旧金和暖纸色。器材清单与登录页采用手工版画风的圣诞老人插画，分别为电脑与手机调整构图。
- 新增圣诞火漆印章、松枝线纹和相机挂球，保留 ISSUE 107、现有诗歌、搜索与预约等操作。
- 仅更新设备系统前端，不改后端、照片审核工作台或数据库。

在服务器运行：

```bash
cd /root/equipment-system && git pull --ff-only origin main && (cd frontend && npm run build)
```

构建成功后刷新页面。此版本无需重新构建 Docker 镜像。
