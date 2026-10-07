# FIELD NOTE v2.4.1

- 新申请默认明天 09:00 借用、明天 18:00 归还；清空草稿后同样恢复这组默认时间。
- 过期或缺少有效时间的旧草稿恢复为明天的时段，设备与理由保留。
- 从预约日历进入，默认选择当天 09:00–18:00；若该日期的 09:00 已过去，则使用明天的默认时段。
- 选择跨日期的借用时间会弹出提示，并显示持续的表单警告、禁止提交；前后端均按北京时间的日期判断。
- 新申请及冲突检测接口均校验“归还晚于借用、且当天归还”。历史记录不改动。

不涉及 Python 依赖或数据库结构变更。正常部署仍可参考 [v2.4.0 更新说明](UPDATE_2_4_0.md)。

如果 Docker Hub 下载卡住，可以先更新已有容器的代码，再构建前端：

```bash
cd /root/equipment-system
git pull --ff-only origin main
docker cp backend/app/. equip-backend:/app/app/
docker compose -f docker-compose.prod.yml restart backend
cd frontend
npm ci --registry=https://registry.npmmirror.com
npm run build
cd ..
docker compose -f docker-compose.prod.yml restart nginx
```

这属于临时容器更新：重启保留，容器重新创建会回到原镜像代码。网络恢复后需执行正式构建。
