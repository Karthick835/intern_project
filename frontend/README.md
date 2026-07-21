# ProjectHub Frontend - Multi-Tenant SaaS Project Management

Beautiful, modern React 18 frontend for the ProjectHub multi-tenant project management platform.

## 🎨 Features

✅ **Beautiful Landing Page** - Showcase your product  
✅ **Authentication** - Sign up and login flows  
✅ **Interactive Kanban Board** - Drag & drop task management  
✅ **Sprint Planning** - Burndown charts and sprint management  
✅ **Analytics Dashboard** - Team insights and performance metrics  
✅ **Team Management** - Invite and manage team members  
✅ **Real-time Collaboration** - WebSocket support for live updates  
✅ **Responsive Design** - Works on all devices  
✅ **Dark/Light Theme** - Theme customization  

## 🛠️ Tech Stack

- **React 18** - UI Framework
- **Vite** - Build tool & dev server
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations
- **React Beautiful DnD** - Drag & drop
- **Recharts** - Data visualization
- **Socket.io** - Real-time features
- **React Router** - Navigation
- **Axios** - HTTP client

## 📦 Installation

### Prerequisites
- Node.js 16+ and npm

### Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will open at `http://localhost:3000`

## 🚀 Build for Production

```bash
npm run build
npm run preview
```

## 📁 Project Structure

```
frontend/
├── src/
│   ├── pages/               # Page components
│   │   ├── Landing.jsx      # Landing page
│   │   ├── auth/            # Auth pages (Login, Register)
│   │   ├── Dashboard.jsx    # Main dashboard
│   │   ├── KanbanBoard.jsx  # Kanban board
│   │   ├── SprintBoard.jsx  # Sprint planning
│   │   ├── Analytics.jsx    # Analytics dashboard
│   │   ├── TaskDetail.jsx   # Task details page
│   │   ├── TeamManagement.jsx
│   │   └── Settings.jsx
│   ├── components/          # Reusable components
│   │   ├── ProtectedRoute.jsx
│   │   └── layout/
│   │       ├── Sidebar.jsx
│   │       └── Navbar.jsx
│   ├── App.jsx              # Main app & routing
│   ├── main.jsx             # Entry point
│   └── index.css            # Global styles
├── index.html               # HTML template
├── vite.config.js           # Vite config
├── tailwind.config.js       # Tailwind config
└── package.json
```

## 🔌 Backend Integration

The frontend communicates with the backend at `http://localhost:8080`

### API Endpoints Used

**Authentication**
- `POST /api/auth/register-tenant` - Register new company
- `POST /api/auth/login` - User login

**Projects**
- `GET /api/projects` - List projects
- `POST /api/projects` - Create project
- etc.

## 🎯 Key Pages

### Landing Page
- Hero section with call-to-action
- Features showcase
- Pricing plans
- Beautiful animations

### Kanban Board ⭐ Star Feature
- Drag & drop tasks between columns
- Real-time updates
- Assignee avatars
- Priority indicators

### Dashboard
- Quick stats (projects, tasks, team)
- Recent tasks
- Team activity feed

### Sprint Planning
- Sprint burndown chart
- Task management
- Sprint stats

### Analytics
- Sprint velocity trends
- Task distribution
- Team workload heatmap

## 🔐 Authentication

Login with demo credentials:
- Email: `admin@testcompany.com`
- Password: `Password123!`

Or register a new company account.

## 🎨 Customization

### Colors
Edit `tailwind.config.js` to customize colors:
```js
colors: {
  primary: {
    500: '#0ea5e9',    // Change brand color
    600: '#0284c7',
  }
}
```

### Animations
Modify animations in `index.css` or Framer Motion components

### API Base URL
Change backend URL in axios configuration

## 📱 Responsive Design

- Mobile: 320px+
- Tablet: 768px+
- Desktop: 1024px+

## 🚀 Performance Optimization

- Code splitting with React Router
- Lazy loading components
- Optimized bundle size (~250KB gzipped)
- Efficient re-renders with React memo

## 🔗 WebSocket Integration

For real-time collaboration:

```js
import io from 'socket.io-client'

const socket = io('http://localhost:8080')
socket.on('taskUpdated', (data) => {
  // Handle real-time updates
})
```

## 📚 Component Documentation

All components are self-documented with:
- Clear prop interfaces
- Usage examples in pages
- Tailwind CSS classes

## 🐛 Troubleshooting

**Port 3000 already in use?**
```bash
npm run dev -- --port 3001
```

**Backend not connecting?**
- Ensure backend is running on `http://localhost:8080`
- Check `vite.config.js` proxy settings

**Hot reload not working?**
- Clear node_modules and reinstall
- Restart dev server

## 📞 Support

For issues or questions, check the main README or contact the development team.

---

**Build something amazing with ProjectHub!** 🚀
