#!/bin/bash
# ============================================================================
# 器材设备管理系统 — 阿里云 ECS 远程部署脚本（国内镜像版）
# ============================================================================

set -e

echo "========================================"
echo "  器材设备管理系统 — 开始部署"
echo "========================================"

# ===== 1. 安装 Docker（使用阿里云镜像） =====
echo "[1/6] 安装 Docker..."
if ! command -v docker &> /dev/null; then
    # 安装必要工具
    yum install -y yum-utils 2>/dev/null || dnf install -y dnf-utils 2>/dev/null
    
    # 添加阿里云 Docker 镜像源（国内能用）
    yum-config-manager --add-repo https://mirrors.aliyun.com/docker-ce/linux/centos/docker-ce.repo 2>/dev/null || \
    dnf config-manager --add-repo https://mirrors.aliyun.com/docker-ce/linux/centos/docker-ce.repo 2>/dev/null
    
    # 安装 Docker
    yum install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin 2>/dev/null || \
    dnf install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    
    # 启动 Docker
    systemctl start docker
    systemctl enable docker
    
    # 配置 Docker 镜像加速器（拉镜像更快）
    mkdir -p /etc/docker
    cat > /etc/docker/daemon.json <<'EOF'
{
  "registry-mirrors": [
    "https://docker.1ms.run",
    "https://docker.xuanyuan.me"
  ]
}
EOF
    systemctl daemon-reload
    systemctl restart docker
    echo "  Docker 安装完成: $(docker --version)"
else
    echo "  Docker 已安装: $(docker --version)"
    systemctl start docker 2>/dev/null || true
fi

# 检查 Docker Compose
if docker compose version &> /dev/null; then
    echo "  Docker Compose: $(docker compose version)"
else
    echo "  安装 Docker Compose 插件..."
    yum install -y docker-compose-plugin 2>/dev/null || dnf install -y docker-compose-plugin 2>/dev/null
fi

# ===== 2. 下载代码 =====
echo "[2/6] 下载项目代码..."
cd /root
rm -rf equipment-system 2>/dev/null || true
git clone https://gitee.com/fanyuxinnn107/equipment-system.git 2>&1 || {
    echo "  安装 git..."
    yum install -y git 2>/dev/null || dnf install -y git 2>/dev/null
    git clone https://gitee.com/fanyuxinnn107/equipment-system.git
}
cd equipment-system
echo "  代码下载完成"

# ===== 3. 构建前端 =====
echo "[3/6] 构建前端..."
cd frontend
if ! command -v node &> /dev/null; then
    echo "  安装 Node.js 20..."
    curl -fsSL https://rpm.nodesource.com/setup_20.x | bash - 2>/dev/null
    yum install -y nodejs 2>/dev/null || dnf install -y nodejs 2>/dev/null
fi
npm install --registry=https://registry.npmmirror.com 2>&1 | tail -3
npm run build 2>&1 | tail -3
cd ..
echo "  前端构建完成"

# ===== 4. 配置环境 =====
echo "[4/6] 配置环境变量..."
cp deploy/.env.prod .env

# 生成随机 JWT 密钥
JWT_SECRET=$(openssl rand -hex 32)
sed -i "s|ChangeMe_JWT_Secret_Key_2026_Replace_With_Random_String|$JWT_SECRET|g" .env
echo "  配置完成"

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
echo "[6/6] 启动服务（构建镜像需要几分钟，请耐心等待）..."
docker compose -f docker-compose.prod.yml down 2>/dev/null || true
docker compose -f docker-compose.prod.yml up -d --build 2>&1 | tail -15

# 等待数据库初始化
echo "  等待数据库初始化..."
sleep 20

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
