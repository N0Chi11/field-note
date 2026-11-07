# FIELD NOTE v2.4.8

- 将万圣节主题更换为冬日画报主题，统一登录页、器材清单、导航和照片审核页的配色。
- 增加原创雪景相机封面和雪花标记，优化移动端的封面展示。
- 保留现有的器材借用、照片审核和账号数据，不更改数据库。

## 已有服务器的轻量更新

本次只修改界面；如果服务器上现有的前端构建工具和照片审核容器可用，可以不重新下载或构建 Docker 镜像：

```bash
cd /root/equipment-system && git pull --ff-only origin main && (cd frontend && npm run build)
```

前端构建成功后，将照片审核页的样式同步到现有容器：

```bash
docker cp /root/equipment-system/backend/photo_review/web/editorial.css equip-photo-review:/app/photo_review/web/editorial.css
```

然后强制刷新浏览器。此方法不会启动、停止或重建容器，也不会修改数据库或照片。复制到容器内的样式会在容器被重新创建时丢失；日后使用当前版本的代码完整构建镜像时，冬日样式会随镜像一起保存。如果照片审核容器不存在或命令报错，请先检查容器状态，不要删除任何数据。

轻量更新只覆盖本次界面；之前没有成功部署的后端功能仍需要在镜像网络恢复后单独完成部署。
