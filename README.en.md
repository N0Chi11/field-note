# Equipment Borrowing System

This project is a web-based equipment borrowing and management system designed to simplify the processes of borrowing, returning, approving, and tracking equipment in laboratory or office environments. The system adopts a modern frontend-backend separated architecture, supports containerized deployment, and ensures high performance and availability.

## ✨ Features

### 👤 User Side
- **Equipment Browsing**: Quickly view the list of borrowable equipment, supporting filtering by category and status.
- **Online Borrowing**: Fill in the reason and duration for borrowing and submit a borrowing request.
- **Conflict Detection**: Automatically detect whether the equipment has already been borrowed during the selected time period before submission.
- **My Loans**: View current borrowing status, application history, and pending return reminders.
- **Return Operation**: Upload photos of returned items and submit a return request.

### 👑 Admin Side
- **Dashboard Overview**: Real-time statistics on key metrics such as total equipment count, borrowing rate, and system activity.
- **Approval Management**: Manage the status flow of borrowing requests including "Approved", "Rejected", "Pending Pickup", and "Returned".
- **Equipment Management**: Maintain basic equipment information (name, model, category), update equipment status, and upload equipment images.
- **Card Management**: Manage electronic tags or identification cards associated with equipment.
- **Log Audit**: Record all critical operation logs, supporting filtering by time, action, and user for traceability.

## 🛠️ Tech Stack

| Layer | Technology Selection |
| :--- | :--- |
| **Backend Framework** | Python 3.12 + [FastAPI](https://fastapi.tiangolo.com/) |
| **ORM** | [SQLAlchemy](https://www.sqlalchemy.org/) (Database toolkit) |
| **Data Validation** | [Pydantic](https://pydantic-docs.helpmanual.io/) |
| **Frontend Framework** | Vue 3 + TypeScript |
| **Build Tool** | [Vite](https://vitejs.dev/) |
| **State Management** | Pinia |
| **HTTP Client** | Axios |
| **Database** | MySQL (Recommended for Production) / SQLite (Development) |
| **Deployment Architecture** | Docker + Docker Compose + Nginx |

## 📂 Project Structure

```
equipment-system/
├── backend/                # Backend service code
│   ├── app/                # Application core logic
│   │   ├── api/            # API route controllers (auth, borrow, equipment, admin, etc.)
│   │   ├── core/           # Core configuration (security dependencies, CORS settings)
│   │   ├── models/         # Database model definitions (User, Equipment, BorrowRequest, etc.)
│   │   ├── schemas/        # Pydantic data schemas (Request/Response models)
│   │   ├── services/       # Business logic service layer (conflict detection, logging)
│   │   └── main.py         # FastAPI entry file
│   ├── sql/                # Database initialization scripts
│   ├── Dockerfile          # Docker build file
│   └── requirements.txt    # Python dependency list
│
├── frontend/               # Frontend Vue application code
│   ├── src/
│   │   ├── api/            # Frontend API request wrappers
│   │   ├── views/          # Page view components (Login, BorrowForm, Admin, etc.)
│   │   ├── stores/         # Pinia state management (user authentication info, etc.)
│   │   └── components/     # Common UI components
│   └── package.json
│
├── deploy/                 # Deployment configuration
│   ├── deploy.sh           # One-click deployment script
│   ├── nginx.prod.conf     # Nginx production configuration
│   └── docker-compose.prod.yml # Docker Compose production configuration
│
└── docker-compose.yml      # Development environment Docker Compose orchestration
```

## 🚀 Quick Start

### Method 1: Using Docker Compose (Recommended)

Ensure [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/) are installed on the host machine.

1. **Clone the Project**
   ```bash
   git clone https://gitee.com/fanyuxinnn107/equipment-system.git
   cd equipment-system
   ```

2. **Start Services**
   ```bash
   docker-compose up -d
   ```

3. **Access the Application**
   - **Frontend Page**: http://localhost:80
   - **Backend API Documentation**: http://localhost:8000/docs

4. **Initialize Database**
   Enter the `backend/sql/` directory and execute the SQL script to initialize the database schema.

### Method 2: Local Development Environment

**Backend (Python)**

1. Enter the backend directory and create a virtual environment:
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

2. Configure Database:
   Copy `.env.example` to `.env` and configure the database connection string.

3. Start Service:
   ```bash
   uvicorn app.main:app --reload
   ```

**Frontend (Node.js)**

1. Enter the frontend directory:
   ```bash
   cd frontend
   npm install
   ```

2. Start Development Server:
   ```bash
   npm run dev
   ```

## 📖 API Documentation

After starting the backend service, you can consult detailed API interface documentation via Swagger UI:
[http://localhost:8000/docs](http://localhost:8000/docs)

Main modules include:
- **Auth**: Login, refresh token, get user information.
- **Equipment**: Equipment list query, detail retrieval, image upload, status update.
- **Borrow**: Borrow request creation, conflict detection, return submission.
- **Admin**: Approval processing, statistics data, log query.

## 📜 License

This project is an internal/private system; source code is for learning and internal use only. If you have any questions, please contact the project administrator.