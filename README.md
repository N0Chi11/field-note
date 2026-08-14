

```markdown
# FIELD NOTE

> **SUFE 校学联新媒体器材档案**  
> **SUFE Student Union Media Equipment Archive**

面向上海财经大学校学联新媒体中心的器材借用与创作档案平台。系统管理相机、灯光、收音等设备的借用、审批、归还、维护与反馈，让每一次校园创作都有迹可循。

## ✨ 功能特性

### 👤 用户端
- **设备浏览**：快速查看可借用设备列表，支持分类与状态筛选。
- **在线借用**：填写借用理由与时间，提交借用申请。
- **冲突检测**：提交前自动检测设备在该时间段是否已被借用。
- **我的借阅**：查看当前借用状态、申请历史以及待归还提醒。
- **归还操作**：上传归还照片，提交归还申请。

### 👑 管理端
- **仪表盘概览**：实时统计设备总数、借用率、系统活跃度等关键指标。
- **审批管理**：对借用申请进行“通过”、“拒绝”、“待取货”、“已归还”等状态流转。
- **设备管理**：维护设备基础信息（名称、型号、分类），更新设备状态，上传设备图片。
- **卡片管理**：管理关联设备的电子标签或识别卡。
- **日志审计**：记录所有关键操作日志，支持按时间、动作、用户筛选，便于追溯。

## 🛠️ 技术栈

| 层级 | 技术选型 |
| :--- | :--- |
| **后端框架** | Python 3.12 + [FastAPI](https://fastapi.tiangolo.com/) |
| **ORM** | [SQLAlchemy](https://www.sqlalchemy.org/) (Database toolkit) |
| **数据验证** | [Pydantic](https://pydantic-docs.helpmanual.io/) |
| **前端框架** | Vue 3 + TypeScript |
| **构建工具** | [Vite](https://vitejs.dev/) |
| **状态管理** | Pinia |
| **HTTP 客户端** | Axios |
| **数据库** | MySQL (生产环境推荐) / SQLite (开发环境) |
| **部署架构** | Docker + Docker Compose + Nginx |

## 📂 项目结构

```
equipment-system/
├── backend/                # 后端服务代码
│   ├── app/                # 应用核心逻辑
│   │   ├── api/            # API 路由控制器 (auth, borrow, equipment, admin 等)
│   │   ├── core/           # 核心配置 (安全依赖、跨域设置)
│   │   ├── models/         # 数据库模型定义 (User, Equipment, BorrowRequest 等)
│   │   ├── schemas/        # Pydantic 数据模式 (请求/响应模型)
│   │   ├── services/       # 业务逻辑服务层 (冲突检测、日志记录)
│   │   └── main.py         # FastAPI 入口文件
│   ├── sql/                # 数据库初始化脚本
│   ├── Dockerfile          # Docker 构建文件
│   └── requirements.txt    # Python 依赖列表
│
├── frontend/               # 前端 Vue 应用代码
│   ├── src/
│   │   ├── api/            # 前端 API 请求封装
│   │   ├── views/          # 页面视图组件 (Login, BorrowForm, Admin 等)
│   │   ├── stores/         # Pinia 状态管理 (用户认证信息等)
│   │   └── components/     # 通用 UI 组件
│   └── package.json
│
├── deploy/                 # 部署配置
│   ├── deploy.sh           # 一键部署脚本
│   ├── nginx.prod.conf     # Nginx 生产配置
│   └── docker-compose.prod.yml # Docker Compose 生产配置
│
└── docker-compose.yml      # 开发环境 Docker Compose 编排
```

## 🚀 快速开始

### 方式一：使用 Docker Compose (推荐)

确保宿主机已安装 [Docker](https://www.docker.com/) 和 [Docker Compose](https://docs.docker.com/compose/)。

1. **克隆项目**
   ```bash
   git clone https://github.com/N0Chi11/field-note.git
   cd field-note
   ```

2. **启动服务**
   ```bash
   docker-compose up -d
   ```

3. **访问应用**
   - **前端页面**: http://localhost:80
   - **后端 API 文档**: http://localhost:8000/docs

4. **初始化数据库**
   进入 `backend/sql/` 目录，执行 SQL 脚本初始化数据库结构。

### 方式二：本地开发环境

**后端 (Python)**

1. 进入后端目录并创建虚拟环境：
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

2. 配置数据库：
   复制 `.env.example` 为 `.env` 并配置数据库连接字符串。

3. 启动服务：
   ```bash
   uvicorn app.main:app --reload
   ```

**前端 (Node.js)**

1. 进入前端目录：
   ```bash
   cd frontend
   npm install
   ```

2. 启动开发服务器：
   ```bash
   npm run dev
   ```

## 📖 API 文档

启动后端服务后，可通过 Swagger UI 查阅详细的 API 接口说明：
[http://localhost:8000/docs](http://localhost:8000/docs)

主要模块包括：
- **Auth**: 登录、刷新令牌、获取用户信息。
- **Equipment**: 设备列表查询、详情获取、图片上传、状态更新。
- **Borrow**: 借用申请创建、冲突检测、归还提交。
- **Admin**: 审批处理、统计数据、日志查询。

## 📜 许可证

本项目为内部/私有系统，源码仅供学习与内部使用。如有疑问，请联系项目管理员。

```

<function=query_code>
<parameter=language></parameter>
<parameter=maxResults>20</parameter>
<parameter=path>/data/skyline/skyline-repo-cache/87/09889e06a9bd9750abb7d018c512ecf81a91be16c6545eaa4e36925da2166b</parameter>
<parameter=pattern>class.*License</parameter>
<parameter=withContext>false</parameter>
</function>
