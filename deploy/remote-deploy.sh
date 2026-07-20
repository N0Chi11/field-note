#!/bin/bash
# ============================================================================
# 器材设备管理系统 — 阿里云 ECS 远程部署脚本
# 
# 使用方法：
#   1. 在阿里云控制台点「远程连接」打开终端
#   2. 复制下面整段命令粘贴执行即可
# ============================================================================

set -e

echo "========================================"
echo "  器材设备管理系统 — 开始部署"
echo "========================================"

# ===== 1. 安装 Docker =====
echo "[1/6] 检查 Docker..."
if ! command -v docker &> /dev/null; then
    echo "  安装 Docker..."
    curl -fsSL https://get.docker.com | sh
    systemctl start docker
    systemctl enable docker
    echo "  Docker 安装完成"
else
    echo "  Docker 已安装: $(docker --version)"
fi

# 确保 Docker 运行
systemctl start docker 2>/dev/null || true
sleep 2

# ===== 2. 下载代码 =====
echo "[2/6] 下载项目代码..."
cd /root
rm -rf equipment-system 2>/dev/null || true
git clone https://gitee.com/fanyuxinnn107/equipment-system.git 2>&1 || {
    # 如果 git 未安装，先安装 git
    echo "  安装 git..."
    yum install -y git 2>/dev/null || apt-get update && apt-get install -y git 2>/dev/null || apk add git 2>/dev/null
    git clone https://gitee.com/fanyuxinnn107/equipment-system.git
}
cd equipment-system
echo "  代码下载完成: $(pwd)"

# ===== 3. 构建前端 =====
echo "[3/6] 构建前端..."
cd frontend
if ! command -v node &> /dev/null; then
    echo "  安装 Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - 2>/dev/null
    apt-get install -y nodejs 2>/dev/null || yum install -y nodejs 2>/dev/null
fi
npm install --registry=https://registry.npmmirror.com 2>&1 | tail -3
npm run build 2>&1 | tail -3
cd ..
echo "  前端构建完成"

# ===== 4. 配置环境 =====
echo "[4/6] 配置环境变量..."
cp deploy/.env.prod .env

# 生成随机 JWT 密钥并替换
JWT_SECRET=$(openssl rand -hex 32)
sed -i "s|ChangeMe_JWT_Secret_Key_2026_Replace_With_Random_String|$JWT_SECRET|g" .env

echo "  配置完成（JWT 密钥已自动生成）"

# ===== 5. 生成 SSL 证书 =====
echo "[5/6] 生成 SSL 证书..."
mkdir -p deploy/ssl
if [ ! -f deploy/ssl/cert.pem ]; then
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout deploy/ssl/key.pem \
        -out deploy/ssl/cert.pem \
        -subj "/C=CN/ST=Zhejiang/L=Hangzhou/O=EquipmentSystem/CN=47.116.101.102" 2>/dev/null
    echo "  SSL 证书已生成"
else
    echo "  SSL 证书已存在"
fi

# ===== 6. 启动服务 =====
echo "[6/6] 启动服务（需要几分钟构建镜像）..."
docker compose -f docker-compose.prod.yml down 2>/dev/null || true
docker compose -f docker-compose.prod.yml up -d --build 2>&1 | tail -10

# 等待服务启动
echo "  等待数据库初始化..."
sleep 15

# ===== 完成 =====
echo ""
echo "========================================"
echo "  部署完成！"
echo "========================================"
echo ""
docker compose -f docker-compose.prod.yml ps
echo ""
echo "访问地址："
echo "  HTTP:  http://47.116.101.102"
echo "  HTTPS: https://47.116.101.102"
echo "  API文档: http://47.116.101.102/docs"
echo ""
echo "默认账号："
echo "  管理员: admin / admin123"
echo "  用户: 2024010 / admin123"
echo ""
echo "查看日志: docker compose -f docker-compose.prod.yml logs -f backend"
