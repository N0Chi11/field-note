# FIELD NOTE v2.4.9

- 在冬日主题中加入雪松枝、雪晶与细雪装饰，细化登录页、刊头、导航和器材清单。
- 封面加入轻柔飘雪，并尊重设备的减少动态效果设置。
- 调整手机上的装饰布局，保留现有功能和 ISSUE 107，不添加额外页面文案。
- 本次只调整前端样式，不修改数据库、借用记录或照片。

## 已有服务器的轻量更新

如果服务器已有可用的前端构建环境，可避免重新下载或构建 Docker 镜像：

```bash
cd /root/equipment-system && git pull --ff-only origin main && (cd frontend && npm run build)
```

如果照片审核页尚未同步 v2.4.8 的冬日配色，可在前端构建成功后将样式同步到现有容器：

```bash
docker cp /root/equipment-system/backend/photo_review/web/editorial.css equip-photo-review:/app/photo_review/web/editorial.css
```

然后强制刷新浏览器。复制到容器内的样式会在容器重新创建时丢失，日后以当前版本代码完整构建镜像即可保留。轻量更新只更新界面；此前未成功部署的后端功能仍需单独部署。
