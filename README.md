# Multi-Tenant SaaS Project Management Tool

A comprehensive project management system built with Spring Boot 3.2, designed for multi-tenant SaaS environments. Features real-time collaboration, AI-powered task suggestions, sprint planning, and comprehensive analytics.

## 🎯 Key Features

### ✨ Core Functionality
- **Multi-Tenancy**: Complete isolation using schema-per-tenant architecture
- **Dynamic Subdomains**: Each tenant gets their own subdomain (e.g., `company.yourapp.com`)
- **Project Management**: Create and manage unlimited projects
- **Sprint Planning**: Organize work into sprints with velocity tracking
- **Task Management**: Comprehensive task tracking with priorities, types, and assignments
- **Team Collaboration**: Real-time comments, mentions, and activity tracking
- **Time Tracking**: Log hours spent on tasks
- **Audit Logs**: Complete audit trail of all actions

### 🤖 AI Features
- **Smart Task Assignment**: AI suggests best person to assign based on workload
- **Hour Estimation**: AI estimates task hours based on complexity keywords
- **Priority Suggestions**: Intelligent priority determination
- **Sprint Summaries**: AI-generated sprint retrospective reports

### 📊 Analytics & Reporting
- **Sprint Velocity Tracking**: Historical velocity trends
- **Burndown Charts**: Visual sprint progress
- **Team Workload Heatmaps**: See who's overloaded
- **Project Health Scores**: Overall project status
- **Task Distribution Analysis**: By status, priority, and type

### 🔐 Security & Multi-Tenancy
- **JWT Authentication**: Secure token-based auth
- **Role-Based Access Control**: COMPANY_ADMIN, PROJECT_MANAGER, DEVELOPER
- **Tenant Isolation**: Complete data isolation per tenant
- **Schema-Per-Tenant**: Independent databases for each tenant

## 🏗️ Architecture

```
SaaS PM Tool
├── Backend (Spring Boot 3.2)
│   ├── Multi-Tenant Configuration
│   ├── JWT Security
│   ├── REST APIs
│   ├── WebSocket (Real-time)
│   └── AI Service Integration (Claude API)
├── Database
│   ├── Public Schema (Tenants, Subscriptions)
│   └── Per-Tenant Schemas (User, Project, Task, Sprint, etc.)
└── Frontend (React 18)
    ├── Authentication
    ├── Dashboard
    ├── Kanban Board
    ├── Sprint Planning
    └── Analytics

```

## 🛠️ Technology Stack

### Backend
- **Java 21** with Spring Boot 3.2.5
- **Spring Data JPA** for database access
- **Spring Security** with JWT
- **Hibernate** with multi-tenancy support
- **PostgreSQL** (production) / H2 (development)
- **WebSocket** for real-time collaboration
- **Claude AI API** for intelligent features

### Database
- **PostgreSQL** for production
- **H2** for development/testing
- **Hibernate** ORM

### Testing
- **JUnit 5**
- **Mockito**
- **Spring Boot Test**

## 🚀 Getting Started

### Prerequisites
- Java 21+
- Maven 3.8+
- PostgreSQL 12+ (for production)
- Node.js 18+ (for frontend)

### Backend Setup

1. **Clone the Repository**
```bash
git clone <repo-url>
cd backend
```

2. **Development Mode (H2 Database)**
```bash
./mvnw clean spring-boot:run
```

The application will be available at `http://localhost:8080`

3. **Production Mode (PostgreSQL)**
```bash
./mvnw clean spring-boot:run -Dspring-boot.run.arguments="--spring.profiles.active=postgres"
```

First, create the database:
```bash
psql -U postgres -c "CREATE DATABASE saas_pm;"
```

### API Documentation

Once running, access Swagger UI at:
```
http://localhost:8080/swagger-ui.html
```

## 📋 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new tenant
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh JWT token

### Projects
- `GET /api/projects` - List all projects
- `POST /api/projects` - Create project
- `GET /api/projects/{id}` - Get project details
- `PUT /api/projects/{id}` - Update project
- `DELETE /api/projects/{id}` - Archive project

### Tasks
- `GET /api/tasks` - List all tasks
- `POST /api/tasks` - Create task
- `GET /api/tasks/{id}` - Get task details
- `PUT /api/tasks/{id}` - Update task
- `PUT /api/tasks/{id}/status/{status}` - Change task status
- `PUT /api/tasks/{id}/assign/{assigneeId}` - Assign task
- `POST /api/tasks/{taskId}/comments` - Add comment
- `GET /api/tasks/{taskId}/comments` - Get comments
- `POST /api/tasks/{taskId}/time-logs` - Log time
- `GET /api/tasks/{taskId}/time-logs` - Get time logs

### Sprints
- `GET /api/sprints` - List all sprints
- `POST /api/sprints` - Create sprint
- `GET /api/sprints/{id}` - Get sprint details
- `GET /api/sprints/{id}/velocity` - Get sprint velocity
- `GET /api/sprints/{id}/burndown` - Get burndown chart
- `POST /api/sprints/{id}/start` - Start sprint
- `POST /api/sprints/{id}/complete` - Complete sprint

### Team Management
- `GET /api/team` - List team members
- `POST /api/team/invite` - Invite team member
- `GET /api/team/{id}` - Get member details
- `PUT /api/team/{id}` - Update member
- `DELETE /api/team/{id}` - Remove member

### Dashboard & Analytics
- `GET /api/dashboard/overview` - Overall statistics
- `GET /api/dashboard/workload` - Team workload analysis
- `GET /api/dashboard/velocity-chart` - Velocity trends
- `GET /api/dashboard/task-distribution` - Task metrics
- `GET /api/dashboard/project-health` - Project status

### AI Features
- `POST /api/ai/suggest` - Get task assignment suggestion
- `POST /api/ai/estimate` - Get hour estimation
- `POST /api/ai/priority-suggest` - Get priority suggestion
- `GET /api/ai/sprint-summary/{sprintId}` - Get sprint AI summary

### Notifications
- `GET /api/notifications` - Get my notifications
- `GET /api/notifications/unread` - Get unread notifications
- `PUT /api/notifications/{id}/read` - Mark as read
- `DELETE /api/notifications/{id}` - Delete notification

## 🗄️ Database Schema

### Public Schema (Shared)
```
- tenants (id, name, subdomain, plan, created_at)
- subscriptions (id, tenant_id, plan, status, expiry)
- platform_admins (id, email, password, created_at)
```

### Per-Tenant Schema (tenant_{tenant_id})
```
- users (id, email, password, name, role, created_at)
- projects (id, name, description, priority, deadline, status, created_at)
- sprints (id, name, start_date, end_date, status, velocity, retrospective, created_at)
- tasks (id, title, description, priority, type, status, assignee_id, due_date, time_estimate, sprint_id, project_id, created_at)
- comments (id, task_id, user_id, content, created_at)
- time_logs (id, task_id, user_id, hours_spent, notes, created_at)
- notifications (id, user_id, content, is_read, created_at)
- audit_logs (id, user_id, action, entity, entity_id, timestamp)
- subtasks (id, task_id, title, is_completed)
```

## 🔄 Multi-Tenancy Flow

1. **Registration** → New tenant created with unique subdomain
2. **Schema Creation** → Dynamic tenant schema created
3. **Login** → Tenant context resolved from subdomain/JWT
4. **Request** → All queries automatically scoped to tenant schema
5. **Isolation** → Complete data separation per tenant

## 📝 Configuration Files

### application.yml (Development - H2)
```yaml
spring:
  profiles:
    active: default
  datasource:
    url: jdbc:h2:mem:saas_pm
  jpa:
    hibernate:
      ddl-auto: update

app:
  jwt:
    secret: your-secret-key
    expiration-ms: 86400000
  ai:
    use-mock: true
```

### application.yml (Production - PostgreSQL)
```yaml
spring:
  profiles:
    active: postgres
  datasource:
    url: jdbc:postgresql://localhost:5432/saas_pm
    username: postgres
    password: your-password
```

## 🧪 Testing

```bash
# Run all tests
./mvnw test

# Run specific test class
./mvnw test -Dtest=UserServiceTest

# Run with coverage
./mvnw jacoco:report
```

## 🐳 Docker Deployment

```bash
# Build Docker image
docker build -t saas-pm-tool:latest .

# Run with Docker Compose
docker-compose up -d
```

See `docker-compose.yml` for production setup with PostgreSQL and Redis.

## 📦 Dependencies

Key dependencies:
- Spring Boot 3.2.5
- Spring Security
- Spring Data JPA
- PostgreSQL Driver
- JWT (JJWT)
- Lombok
- SpringDoc OpenAPI (Swagger)
- H2 Database (dev)

## 🔒 Security Notes

- **JWT Tokens**: Contain tenant_id for automatic scoping
- **CORS**: Configured for specified origins
- **Password Encryption**: BCrypt hashing
- **Tenant Isolation**: Enforced at database layer
- **Audit Logging**: All changes tracked

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Run tests
4. Submit pull request

## 📄 License

MIT License

## 📞 Support

For issues and questions, please use the GitHub issue tracker.

---

**Built with ❤️ for the modern SaaS ecosystem**
