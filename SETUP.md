# Multi-Tenant SaaS PM Tool - Development Setup Guide

## Quick Start

### 1. Backend Setup

#### Development Mode (H2 - No Database Setup Required)
```bash
cd backend
./mvnw clean spring-boot:run
```

Visit `http://localhost:8080/swagger-ui.html` to see all available APIs.

#### Production Mode (PostgreSQL)
```bash
# Create database
psql -U postgres -c "CREATE DATABASE saas_pm;"

# Run with PostgreSQL profile
cd backend
./mvnw clean spring-boot:run -Dspring-boot.run.arguments="--spring.profiles.active=postgres"
```

### 2. API Testing

#### Register a New Tenant
```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "Acme Corp",
    "subdomain": "acme",
    "plan": "PRO",
    "adminEmail": "admin@acme.com",
    "adminPassword": "password123",
    "adminName": "John Admin"
  }'
```

#### Login
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@acme.com",
    "password": "password123"
  }'
```

This will return a JWT token. Use it in subsequent requests:
```bash
curl -X GET http://localhost:8080/api/projects \
  -H "Authorization: Bearer <your-jwt-token>" \
  -H "X-Tenant-ID: acme"
```

### 3. Using Docker Compose

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop all services
docker-compose down

# Clean up volumes
docker-compose down -v
```

Access the application at `http://localhost:8080`

### 4. Database Access

#### H2 Console (Development)
- URL: `http://localhost:8080/h2-console`
- JDBC URL: `jdbc:h2:mem:saas_pm`
- User: `sa`
- Password: `password`

#### PostgreSQL (Production)
```bash
psql -U postgres -d saas_pm -h localhost
```

### 5. Key Endpoints

#### Authentication
```bash
POST /api/auth/register          # Register new tenant
POST /api/auth/login             # Login to tenant
```

#### Projects
```bash
GET  /api/projects               # List projects
POST /api/projects               # Create project
GET  /api/projects/{id}          # Get project
PUT  /api/projects/{id}          # Update project
```

#### Tasks
```bash
GET  /api/tasks                  # List tasks
POST /api/tasks                  # Create task
GET  /api/tasks/{id}             # Get task
PUT  /api/tasks/{id}             # Update task
PUT  /api/tasks/{id}/status/{status}  # Change status
PUT  /api/tasks/{id}/assign/{assigneeId}  # Assign task
```

#### Sprints
```bash
GET  /api/sprints                # List sprints
POST /api/sprints                # Create sprint
GET  /api/sprints/{id}/velocity  # Get velocity
GET  /api/sprints/{id}/burndown  # Get burndown
POST /api/sprints/{id}/start     # Start sprint
POST /api/sprints/{id}/complete  # Complete sprint
```

#### AI Features
```bash
POST /api/ai/suggest             # Get assignee suggestion
POST /api/ai/estimate            # Get hour estimation
POST /api/ai/priority-suggest    # Get priority suggestion
GET  /api/ai/sprint-summary/{sprintId}  # Get sprint summary
```

#### Dashboard
```bash
GET  /api/dashboard/overview     # Get overview stats
GET  /api/dashboard/workload     # Get team workload
GET  /api/dashboard/velocity-chart  # Get velocity trends
GET  /api/dashboard/project-health  # Get project health
```

#### Team Management
```bash
GET  /api/team                   # List team members
POST /api/team/invite            # Invite team member
GET  /api/team/{id}              # Get member details
PUT  /api/team/{id}              # Update member
```

### 6. Configuration

#### Environment Variables
```bash
# JWT Configuration
APP_JWT_SECRET=your-secret-key
APP_JWT_EXPIRATION_MS=86400000  # 24 hours

# Database (PostgreSQL)
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/saas_pm
SPRING_DATASOURCE_USERNAME=postgres
SPRING_DATASOURCE_PASSWORD=postgres

# AI Configuration
APP_AI_CLAUDE_API_KEY=your-claude-api-key
APP_AI_USE_MOCK=true  # Use mock responses if key not set
```

### 7. Multi-Tenancy

Each tenant gets:
- Unique subdomain (e.g., `acme.localhost:8080`)
- Isolated database schema (e.g., `tenant_acme`)
- Complete data isolation
- Independent user management

#### Tenant Context Resolution
The application resolves tenants from:
1. `X-Tenant-ID` header
2. Subdomain in hostname
3. JWT token (contains tenant_id)

### 8. Building for Production

```bash
# Build JAR
cd backend
./mvnw clean package -DskipTests

# Build Docker image
docker build -t saas-pm-tool:1.0.0 .

# Run container
docker run -p 8080:8080 \
  -e SPRING_PROFILES_ACTIVE=postgres \
  -e SPRING_DATASOURCE_URL=jdbc:postgresql://host.docker.internal:5432/saas_pm \
  saas-pm-tool:1.0.0
```

### 9. Troubleshooting

#### Port 8080 Already in Use
```bash
# Find and kill process
lsof -i :8080
kill -9 <PID>
```

#### Database Connection Issues
```bash
# Check PostgreSQL is running
psql -U postgres -c "SELECT version();"

# Check database exists
psql -U postgres -l | grep saas_pm
```

#### JWT Token Expired
- Tokens expire after 24 hours (configurable)
- Get new token by logging in again

### 10. Frontend Integration

Once frontend is ready:
```bash
# React Application
npm install
npm start  # http://localhost:3000

# Configure API endpoint
REACT_APP_API_URL=http://localhost:8080
```

---

For more details, see [README.md](README.md)
