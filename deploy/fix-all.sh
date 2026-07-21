#!/bin/bash
# ============================================================================
# 综合修复脚本 — 修复登录+数据库+bcrypt问题
# ============================================================================

set -e
cd /root/equipment-system

echo "===== 1. 拉取最新代码 ====="
git pull

echo "===== 2. 重新构建前端 ====="
cd frontend && npm run build 2>&1 | tail -3 && cd ..

echo "===== 3. 停止所有容器并删除数据卷 ====="
docker compose -f docker-compose.prod.yml down -v 2>&1

echo "===== 4. 重新构建并启动（会重新安装 bcrypt 3.2.2）====="
docker compose -f docker-compose.prod.yml up -d --build 2>&1 | tail -10

echo "===== 5. 等待 MySQL 初始化（30秒）====="
sleep 30

echo "===== 6. 验证数据库数据 ====="
ROOT_PW=$(grep MYSQL_ROOT_PASSWORD .env | cut -d= -f2)
echo "--- 用户表 ---"
docker exec equip-mysql mysql -u root -p"$ROOT_PW" equipment_db -e "SELECT id,student_id,name,role FROM users;" 2>/dev/null
echo "--- 设备表 ---"
docker exec equip-mysql mysql -u root -p"$ROOT_PW" equipment_db -e "SELECT id,code,name,category,status FROM equipment;" 2>/dev/null
echo "--- 内存卡表 ---"
docker exec equip-mysql mysql -u root -p"$ROOT_PW" equipment_db -e "SELECT id,code,name,status FROM cards;" 2>/dev/null

echo "===== 7. 验证后端健康 ====="
sleep 5
curl -s http://localhost/health 2>&1 || echo "后端启动中..."

echo ""
echo "===== 修复完成 ====="
echo "访问: http://47.116.101.102"
echo "管理员登录: 范雨欣/黄禹博/陈玥杉/牛婉慈 + 密码 40thxmtzx"
echo "用户登录: 姓名 + 学号(202开头)"
