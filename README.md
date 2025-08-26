# Scola Dashboard

A comprehensive study management and note-taking platform designed to help students organize their academic journey.

## 🎓 Features

- **Rich Text Editor**: Advanced note-taking with TipTap editor
- **Subject Organization**: Organize notes by subjects and courses
- **Assignment Tracking**: Keep track of assignments with due dates
- **Calendar Integration**: Sync with Google Calendar and Microsoft Outlook
- **Schedule Management**: Plan your academic schedule
- **PWA Support**: Install as an app on desktop and mobile devices
- **Offline Capability**: Access your notes even without internet
- **PDF Export**: Export notes and assignments to PDF
- **Security**: Enterprise-grade security with malware scanning

## 🚀 Technologies

This project is built with modern web technologies:

- **Frontend**: React 18 + TypeScript + Vite
- **UI Framework**: shadcn/ui components with Tailwind CSS
- **Rich Text Editor**: TipTap with custom extensions
- **Database**: PostgreSQL via Supabase
- **Authentication**: Supabase Auth with OAuth support
- **PWA**: Service Worker with Workbox
- **State Management**: React Context + TanStack Query

## 🛠️ Development Setup

### Prerequisites

- Node.js 16+ and npm
- Git

### Installation

```sh
# Clone the repository
git clone https://github.com/PhenyoKh/curious-dashboard-craft.git

# Navigate to the project directory
cd curious-dashboard-craft

# Install dependencies
npm install

# Start the development server
npm run dev
```

The application will be available at `http://localhost:8083`

### Backend Setup

```sh
# Navigate to backend directory
cd backend

# Install backend dependencies
npm install

# Start backend development server
npm run dev
```

The API will be available at `http://localhost:3001`

## 📦 Available Scripts

### Frontend
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript check

### Backend
- `cd backend && npm run dev` - Start backend server
- `cd backend && npm run build` - Build backend
- `cd backend && npm run start` - Start production server

### Deployment
- `npm run pre-deploy` - Complete pre-deployment validation
- `npm run deploy:full` - Full deployment pipeline

## 🔧 Configuration

The application requires several environment variables. Copy `.env.example` to `.env` and configure:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Application URL
VITE_APP_URL=https://www.scola.co.za

# OAuth Configuration (Optional)
VITE_GOOGLE_CLIENT_ID=your_google_client_id
VITE_MICROSOFT_CLIENT_ID=your_microsoft_client_id
```

## 🏗️ Architecture

### Frontend Architecture
- **React 18**: Modern React with Hooks and Context
- **TypeScript**: Type-safe development
- **Vite**: Fast build tool and dev server
- **shadcn/ui**: Reusable UI components
- **TipTap**: Rich text editing capabilities
- **PWA**: Progressive Web App features

### Backend Architecture
- **Express.js**: RESTful API server
- **PostgreSQL**: Relational database via Supabase
- **JWT**: Authentication and authorization
- **Security**: Helmet, CORS, rate limiting
- **File Processing**: PDF generation and malware scanning

## 🔒 Security Features

- Content Security Policy (CSP)
- Malware scanning for file uploads
- Rate limiting and request validation
- Session security and audit logging
- Row Level Security (RLS) in database
- Input sanitization and XSS protection

## 📱 PWA Features

- **Installable**: Add to home screen on mobile/desktop
- **Offline Support**: Service worker caching
- **Auto-Updates**: Automatic update notifications
- **Native Feel**: App-like experience

## 🚀 Deployment

The application is deployed at [https://www.scola.co.za](https://www.scola.co.za)

For production deployment:
1. Configure environment variables
2. Run pre-deployment checks
3. Build and deploy to your hosting platform

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## 📄 License

This project is proprietary software. All rights reserved.

## 📞 Support

For support and questions, visit our [Help Center](https://www.scola.co.za/help) or contact us through the application.

---

**Scola Dashboard** - Your personal study management platform