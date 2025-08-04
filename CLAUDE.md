# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a full-stack note-taking and study management application called "Scola Dashboard" (formerly Curious Dashboard). It's built with React/TypeScript frontend, Express.js backend, and Supabase as the database/auth provider. The app supports rich text editing, assignment tracking, calendar integration, PWA functionality, and advanced security features.

## Common Development Commands

### Frontend Development
- `npm run dev` - Start development server on http://localhost:8083
- `npm run build` - Build for production
- `npm run build:dev` - Build in development mode  
- `npm run lint` - Run ESLint on frontend code
- `npm run typecheck` - Run TypeScript type checking
- `npm run preview` - Preview production build locally

### Backend Development
- `cd backend && npm run dev` - Start backend development server on http://localhost:3001
- `cd backend && npm run build` - Build backend for production
- `cd backend && npm run start` - Start production backend server
- `cd backend && npm run lint` - Run ESLint on backend code
- `cd backend && npm run db:migrate` - Run database migrations

### Deployment & Production
- `npm run pre-deploy` - Complete pre-deployment validation (config, OAuth, security, typecheck, lint, build)
- `npm run deploy:full` - Full deployment pipeline
- `npm run validate-config` - Validate configuration settings
- `npm run setup-security` - Set up security systems
- `npm run setup-monitoring` - Set up monitoring systems

### Testing Commands
- `npm run test:calendar` - Test calendar integration
- `npm run check-oauth` - Verify OAuth setup

## Critical Development Workflow

**ALWAYS follow these steps after making any changes:**

1. **After Database Changes**: Always run database operations in sequence:
   ```bash
   cd backend && npm run db:migrate
   ```

2. **After Any Code Changes**: Always build to check for syntax errors:
   ```bash
   npm run typecheck && npm run lint && npm run build
   ```

3. **Always Start Dev Server**: After completing changes, always start the development server:
   ```bash
   npm run dev
   ```

4. **Port Management**: Development server must run on port 8083. If port is in use:
   ```bash
   # Kill any process using port 8083
   lsof -ti:8083 | xargs kill -9
   # Then start dev server
   npm run dev
   ```

**Important**: Never skip the build step after making changes - it catches syntax errors and TypeScript issues before they cause runtime problems.

## Architecture Overview

### Frontend Architecture
- **Framework**: React 18 + TypeScript + Vite
- **UI Framework**: shadcn/ui components with Tailwind CSS
- **State Management**: React Context (AuthContext, PWAContext)
- **Rich Text Editor**: TipTap with custom extensions
- **Routing**: React Router v6
- **Data Fetching**: TanStack Query
- **Authentication**: Supabase Auth integration
- **PWA**: Workbox service worker with offline support

### Backend Architecture
- **Framework**: Express.js + TypeScript
- **Database**: PostgreSQL via Supabase
- **Authentication**: JWT + Supabase Auth
- **Security**: Helmet, CORS, rate limiting, malware scanning, session security
- **Validation**: Zod schemas
- **File Processing**: Playwright for PDF exports, ClamAV for malware scanning
- **Architecture Pattern**: MVC with middleware-based security layers

### Key Components & Services

#### Frontend Core Components
- `src/App.tsx` - Main application with routing and providers
- `src/contexts/AuthContext.tsx` - Authentication state management
- `src/integrations/supabase/client.ts` - Supabase client configuration
- `src/components/note/TiptapEditor.tsx` - Rich text editor component
- `src/pages/` - Main application pages (Index, Note, Subjects, Assignments, Schedule)

#### Backend Core Components  
- `backend/src/server.ts` - Express server with security middleware
- `backend/src/routes/` - API route handlers
- `backend/src/controllers/` - Business logic controllers
- `backend/src/middleware/` - Security and validation middleware
- `backend/src/services/` - External service integrations (PDF export, etc.)

#### Database Schema
The application uses Supabase PostgreSQL with these key tables:
- `notes` - Rich text notes with full-text search
- `subjects` - Course/subject organization  
- `assignments` - Assignment tracking with due dates and recurrence
- `user_profiles` - Extended user information
- `user_settings` - User preferences and configurations

### Security Implementation
This application implements enterprise-grade security:
- **Frontend**: Content Security Policy, security headers, input sanitization
- **Backend**: Helmet security headers, rate limiting, session security, audit logging
- **File Security**: Malware scanning with ClamAV, quarantine system
- **Authentication**: Multi-factor auth ready, email verification, secure sessions
- **Data Protection**: Encryption at rest, secure API endpoints, CORS configuration

### Special Features

#### Calendar Integration
- Google Calendar and Microsoft Outlook integration
- Bidirectional sync with conflict resolution
- Academic calendar imports
- Timezone-aware scheduling

#### Rich Text Editor
- TipTap-based editor with custom extensions
- Syntax highlighting and code blocks
- Table support with custom styling
- Export to PDF with advanced formatting
- Auto-save functionality

#### PWA Capabilities
- Offline functionality with service worker
- Installable on desktop and mobile
- Push notification ready
- Auto-update notifications
- Responsive design

## Development Guidelines

### Code Style & Conventions
- Use TypeScript strict mode (configured in tsconfig.json)
- Follow existing component patterns in `src/components/`
- Use shadcn/ui components for consistent UI
- Implement proper error handling and loading states
- Add proper TypeScript types for all new code

### Security Requirements
- Never commit secrets or API keys
- Always validate user input with Zod schemas
- Use parameterized queries for database operations
- Implement proper authentication checks on protected routes
- Follow the existing security middleware patterns

### Database Operations
- Use Supabase client for all database operations
- Implement proper foreign key relationships
- Add database migrations for schema changes
- Use Row Level Security (RLS) policies where appropriate

### Testing & Validation
- Run `npm run typecheck` before committing
- Run `npm run lint` to check code style  
- Test PWA functionality with `npm run build && npm run preview`
- Validate configuration with `npm run validate-config`
- Check OAuth setup with `npm run check-oauth`

### File Structure Patterns
- Place reusable UI components in `src/components/ui/`
- Group feature-specific components in `src/components/[feature]/`
- Store utilities in `src/utils/` and `src/lib/`
- Keep types in `src/types/` files
- Backend follows MVC pattern in `backend/src/`

## Environment Configuration

### Required Environment Variables
Frontend (.env):
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Backend (.env):
```
PORT=3001
NODE_ENV=development
DATABASE_URL=your_postgres_url
JWT_SECRET=your_jwt_secret
FRONTEND_URL=http://localhost:8083
```

### Development Setup
1. Clone repository and install dependencies: `npm install`
2. Install backend dependencies: `cd backend && npm install`  
3. Set up environment variables (see above)
4. Run database migrations: `cd backend && npm run db:migrate`
5. Start development servers:
   - Frontend: `npm run dev` (http://localhost:8083)
   - Backend: `cd backend && npm run dev` (http://localhost:3001)

## Common Patterns & Best Practices

### State Management
- Use React Context for global state (auth, settings)
- Use TanStack Query for server state
- Implement optimistic updates where appropriate
- Handle loading and error states consistently

### Component Patterns
- Use composition over inheritance
- Implement proper TypeScript props interfaces
- Use React.forwardRef for components that need refs
- Follow the existing modal and dialog patterns

### API Integration
- Use Supabase client for database operations
- Implement proper error boundaries
- Use consistent API response patterns
- Handle offline scenarios in PWA mode

### Performance Considerations
- Use React.memo for expensive components
- Implement proper virtualization for large lists
- Optimize images and assets
- Use service worker caching strategies effectively

## Troubleshooting

### Common Issues
- **Build failures**: Run `npm run typecheck` to identify TypeScript errors
- **Database connection**: Verify environment variables and Supabase configuration
- **Authentication issues**: Check Supabase auth settings and JWT configuration
- **PWA installation**: Ensure HTTPS in production and valid manifest.json
- **Security errors**: Review CSP headers and CORS configuration

### Development Tips
- Use browser dev tools Application tab to debug PWA features
- Check Network tab for API request/response issues
- Use React Developer Tools for component debugging
- Monitor console for security warnings and errors