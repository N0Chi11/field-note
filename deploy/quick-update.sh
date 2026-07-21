#!/bin/bash
# 快速更新前端（不需要重建数据库）
cd /root/equipment-system
git pull
cd frontend && npm run build 2>&1 | tail -3 && cd ..
docker compose -f docker-compose.prod.yml restart nginx
echo "===== 后端响应速度测试 ====="
echo "--- 登录API耗时 ---"
time curl -s -o /dev/null -w "HTTP状态: %{http_code}, 总耗时: %{time_total}s\n" \
  -X POST http://localhost/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"login_type":"admin","name":"范雨欣","password":"40thxmtzx"}'
echo ""
echo "--- /auth/me 耗时 ---"
TOKEN=$(curl -s -X POST http://localhost/api/v1/auth/login -H "Content-Type: application/json" -d '{"login_type":"admin","name":"范雨欣","password":"40thxmtzx"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['access_token'])")
time curl -s -o /dev/null -w "HTTP状态: %{http_code}, 总耗时: %{time_total}s\n" \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost/api/v1/auth/me
echo ""
echo "--- 设备列表耗时 ---"
time curl -s -o /dev/null -w "HTTP状态: %{http_code}, 总耗时: %{time_total}s\n" \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost/api/v1/equipment
echo ""
echo "===== 完成 ====="
