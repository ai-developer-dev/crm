# VoIP CRM System

## Overview

This is a full-stack VoIP CRM (Customer Relationship Management) system built with a modern tech stack. The application provides user management, authentication, call logging, and contact management capabilities for VoIP operations. It features a React frontend with shadcn/ui components and an Express.js backend with PostgreSQL database integration.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **UI Library**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **State Management**: TanStack Query (React Query) for server state
- **Routing**: Wouter for client-side routing
- **Form Handling**: React Hook Form with Zod validation
- **Build Tool**: Vite with custom configuration for development and production

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Authentication**: JWT-based authentication with bcrypt password hashing
- **Session Management**: Database-stored sessions with token validation
- **API Design**: RESTful API with structured error handling

### Database Architecture
- **Database**: PostgreSQL (configured for Neon serverless)
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Connection**: Connection pooling via Neon serverless adapter

## Key Components

### Authentication System
- JWT token-based authentication with 7-day expiration
- Secure password hashing using bcrypt
- Role-based access control (admin, manager, user)
- Session management with database storage
- Protected routes with middleware validation

### User Management
- Three-tier user roles: admin, manager, user
- Extension-based phone system integration
- User creation, editing, and deletion (role-dependent)
- Active/inactive user status management

### Database Schema
- **Users**: Core user information with roles and authentication
- **User Sessions**: JWT session tracking with expiration
- **Call Logs**: Inbound/outbound call tracking with duration and status
- **Contacts**: Customer contact management with company and notes

### UI Components
- Comprehensive shadcn/ui component library
- Custom dashboard layout with sidebar navigation
- Responsive design with mobile support
- Toast notifications for user feedback
- Form validation with real-time feedback

## Data Flow

### Authentication Flow
1. User submits credentials via login form
2. Backend validates credentials and creates JWT token
3. Session record created in database with token hash
4. Frontend stores token and user data in localStorage
5. Subsequent requests include Authorization header
6. Backend middleware validates token and session on protected routes

### User Management Flow
1. Admin/Manager accesses user management page
2. React Query fetches user list from `/api/users` endpoint
3. CRUD operations trigger API calls with optimistic updates
4. Database operations performed via Drizzle ORM
5. Query cache invalidated to reflect changes

### Page Navigation Flow
1. Wouter handles client-side routing
2. Protected routes check authentication state
3. Role-based access control validates user permissions
4. Dashboard layout provides consistent navigation structure

## External Dependencies

### Frontend Dependencies
- **@tanstack/react-query**: Server state management and caching
- **@radix-ui/***: Unstyled, accessible UI primitives
- **react-hook-form**: Form state management and validation
- **zod**: Schema validation for forms and API data
- **tailwindcss**: Utility-first CSS framework
- **wouter**: Lightweight client-side routing

### Backend Dependencies
- **drizzle-orm**: Type-safe SQL ORM
- **@neondatabase/serverless**: PostgreSQL connection adapter
- **bcrypt**: Password hashing utility
- **jsonwebtoken**: JWT token creation and validation
- **express**: Web application framework

### Development Dependencies
- **vite**: Fast build tool and dev server
- **typescript**: Static type checking
- **drizzle-kit**: Database schema management
- **tailwindcss**: CSS processing

## Deployment Strategy

### Build Process
1. **Frontend**: Vite builds React app to `dist/public`
2. **Backend**: esbuild bundles server code to `dist/index.js`
3. **Database**: Drizzle migrations applied via `db:push` command

### Environment Configuration
- Database connection via `DATABASE_URL` environment variable
- JWT secret configuration for token signing
- Production/development environment detection

### Startup Sequence
1. Database connection established with connection pooling
2. Express server configured with middleware
3. Routes registered with authentication middleware
4. Static files served in production mode
5. Vite development server in development mode

## Changelog

- June 30, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.