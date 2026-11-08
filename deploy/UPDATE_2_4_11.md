# FIELD NOTE v2.4.11

- 更新冬夜相机与雪山画报，增加窗霜、冰晶和雪松细节，并调整电脑与手机的画面裁切。
- 在登录、器材清单和借用页面加入简短冬日文字，保留现有诗歌与操作布局。
- 本次只更新前端展示，不改变后端、数据库或已有数据。

## 服务器轻量更新

```bash
cd /root/equipment-system && git pull --ff-only origin main && (cd frontend && npm run build)
```

完成后强制刷新浏览器；不需要重新下载 Docker 镜像。此前尚未部署的后端改动仍需另行部署。
