#!/bin/bash
# ============================================================================
# 器材设备管理系统 — 阿里云 ECS 一键部署脚本
# 
# 使用方法：
#   1. 将整个 equipment-system 文件夹上传到服务器
#   2. SSH 登录服务器，cd 到项目目录
#   3. chmod +x deploy/deploy.sh && ./deploy/deploy.sh
#
# 脚本会自动：
#   - 检查/安装 Docker 和 Docker Compose
#   - 生成自签名 HTTPS 证书
#   - 创建 .env 配置文件（首次）
#   - 构建并启动全部服务
# ============================================================================

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  器材设备管理系统 — 一键部署${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 获取脚本所在目录（项目根目录）
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"
echo -e "项目目录: ${GREEN}$PROJECT_DIR${NC}"

# ===== 1. 检查 Docker =====
echo ""
echo -e "${YELLOW}[1/5] 检查 Docker 环境...${NC}"
if command -v docker &> /dev/null; then
    echo -e "  Docker 已安装: ${GREEN}$(docker --version)${NC}"
else
    echo -e "  ${YELLOW}Docker 未安装，正在安装...${NC}"
    curl -fsSL https://get.docker.com | sh
    systemctl start docker
    systemctl enable docker
    echo -e "  ${GREEN}Docker 安装完成${NC}"
fi

# 检查 Docker Compose
if docker compose version &> /dev/null; then
    echo -e "  Docker Compose: ${GREEN}$(docker compose version)${NC}"
else
    echo -e "  ${YELLOW}Docker Compose 未安装，正在安装...${NC}"
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    echo -e "  ${GREEN}Docker Compose 安装完成${NC}"
fi

# 确认 Docker 运行中
if ! docker info &> /dev/null; then
    echo -e "  ${YELLOW}启动 Docker 服务...${NC}"
    systemctl start docker
    sleep 3
fi
echo -e "  ${GREEN}Docker 环境就绪${NC}"

# ===== 2. 创建 .env 配置文件 =====
echo ""
echo -e "${YELLOW}[2/5] 检查配置文件...${NC}"
if [ ! -f "$PROJECT_DIR/.env" ]; then
    cp "$PROJECT_DIR/deploy/.env.prod" "$PROJECT_DIR/.env"
    echo -e "  ${YELLOW}已从模板创建 .env 文件${NC}"
    echo -e "  ${RED}⚠️  请编辑 .env 修改默认密码后再运行！${NC}"
    echo -e "  ${RED}   命令: nano $PROJECT_DIR/.env${NC}"
    echo -e "  ${RED}   修改完重新运行此脚本${NC}"
    exit 1
else
    echo -e "  ${GREEN}.env 配置文件已存在${NC}"
fi

# ===== 3. 生成自签名 HTTPS 证书 =====
echo ""
echo -e "${YELLOW}[3/5] 检查 SSL 证书...${NC}"
SSL_DIR="$PROJECT_DIR/deploy/ssl"
if [ ! -f "$SSL_DIR/cert.pem" ] || [ ! -f "$SSL_DIR/key.pem" ]; then
    mkdir -p "$SSL_DIR"
    echo -e "  ${YELLOW}生成自签名 SSL 证书...${NC}"
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout "$SSL_DIR/key.pem" \
        -out "$SSL_DIR/cert.pem" \
        -subj "/C=CN/ST=Zhejiang/L=Hangzhou/O=EquipmentSystem/CN=47.116.101.102" 2>/dev/null
    echo -e "  ${GREEN}SSL 证书已生成（有效期 365 天）${NC}"
else
    echo -e "  ${GREEN}SSL 证书已存在${NC}"
fi

# ===== 4. 检查前端构建产物 =====
echo ""
echo -e "${YELLOW}[4/5] 检查前端构建产物...${NC}"
if [ ! -d "$PROJECT_DIR/frontend/dist" ] || [ ! -f "$PROJECT_DIR/frontend/dist/index.html" ]; then
    echo -e "  ${YELLOW}前端未构建，尝试在服务器上构建...${NC}"
    if ! command -v node &> /dev/null; then
        echo -e "  ${YELLOW}安装 Node.js...${NC}"
        curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
        apt-get install -y nodejs
    fi
    cd "$PROJECT_DIR/frontend"
    npm install
    npm run build
    cd "$PROJECT_DIR"
    echo -e "  ${GREEN}前端构建完成${NC}"
else
    echo -e "  ${GREEN}前端构建产物已存在${NC}"
fi

# ===== 5. 构建并启动服务 =====
echo ""
echo -e "${YELLOW}[5/5] 构建并启动服务...${NC}"
echo -e "  正在拉取镜像和构建（首次可能需要几分钟）..."
docker compose -f docker-compose.prod.yml down 2>/dev/null || true
docker compose -f docker-compose.prod.yml up -d --build

# 等待服务启动
echo -e "  ${YELLOW}等待服务启动...${NC}"
sleep 10

# 检查服务状态
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  部署完成！服务状态：${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
docker compose -f docker-compose.prod.yml ps
echo ""

# 获取服务器 IP
SERVER_IP=$(hostname -I | awk '{print $1}')
if [ -z "$SERVER_IP" ]; then
    SERVER_IP="47.116.101.102"
fi

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  访问地址：${NC}"
echo -e "${GREEN}  HTTP:  http://$SERVER_IP${NC}"
echo -e "${GREEN}  HTTPS: https://$SERVER_IP${NC}"
echo -e "${GREEN}  API 文档: http://$SERVER_IP/docs${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}注意事项：${NC}"
echo -e "  1. HTTPS 使用自签名证书，浏览器会警告，点击「继续前往」即可"
echo -e "  2. 首次访问可能需要 30 秒等待数据库初始化"
echo -e "  3. 默认管理员账号: admin / admin123（请在 init.sql 中修改密码哈希）"
echo -e "  4. 查看日志: docker compose -f docker-compose.prod.yml logs -f"
echo -e "  5. 停止服务: docker compose -f docker-compose.prod.yml down"
echo ""

# 健康检查
echo -e "${YELLOW}健康检查...${NC}"
sleep 5
if curl -s http://localhost/health | grep -q "healthy"; then
    echo -e "  ${GREEN}后端服务: 正常${NC}"
else
    echo -e "  ${YELLOW}后端服务: 启动中（请稍等片刻再访问）${NC}"
    echo -e "  查看日志: docker compose -f docker-compose.prod.yml logs backend"
fi
