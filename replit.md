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

## Real-time Features

### WebSocket Implementation
- **Real-time User Management**: Live updates when users are created, updated, or deleted
- **Connection Status Indicator**: Visual indicator showing WebSocket connection status
- **Role-based Broadcasting**: Admin/Manager users receive real-time notifications
- **Automatic Reconnection**: Handles connection drops with exponential backoff
- **Authentication Integration**: WebSocket connections authenticated via JWT tokens

### WebSocket API Events
- `user_created`: Broadcast when new users are added
- `user_updated`: Broadcast when user details are modified
- `user_deleted`: Broadcast when users are removed
- `auth_success`/`auth_error`: Authentication status messages
- `user_call_started`: Broadcast when a user answers a call
- `user_call_ended`: Broadcast when a user ends a call
- `call_answered`: Broadcast when any user answers an incoming call (used to dismiss popups on other devices)

## VoIP Calling Features

### Twilio Integration
- **Device Registration**: Automatic Twilio Device initialization with JWT access tokens
- **Incoming Call Handling**: Real-time popup interface with caller ID display
- **Call Management**: Answer, reject, and hang-up functionality with keyboard shortcuts
- **Connection Status**: Live VoIP connection indicator in dashboard
- **Call Logging**: Backend endpoints for tracking call events and duration

### Call Flow Architecture
1. **Token Generation**: Backend generates Twilio access tokens using stored credentials
2. **Device Registration**: Frontend initializes Twilio Device with user extension as identity
3. **Incoming Calls**: TwiML webhook routes calls to connected clients via extension ID
4. **Call Display**: Popup overlays show caller information with action buttons
5. **Active Calls**: Persistent call status display with duration timer

### Deployment Requirements
- **Public Webhook**: TwiML App must point to deployed URL for incoming calls
- **Real-time Connection**: WebSocket maintains live call state synchronization
- **Audio Permissions**: Browser media permissions required for call audio

## Changelog

- June 30, 2025. Initial setup
- June 30, 2025. Added real-time WebSocket functionality for live user management updates
- June 30, 2025. Implemented comprehensive VoIP calling system with Twilio integration
- June 30, 2025. Added live call status display in user cards with real-time updates and multi-user support
- June 30, 2025. Fixed call popup dismissal - when any user answers a call, other users' incoming call popups automatically disappear
- December 31, 2025. Successfully deployed complete VoIP CRM system to GitHub at https://github.com/ai-developer-dev/crm
- January 1, 2025. Moved stats cards from dashboard to settings page (admin-only visibility)
- January 1, 2025. Replaced disruptive call popups with dedicated calls section on dashboard
- January 1, 2025. Improved call UX - incoming calls show in calls section, answered calls managed via user cards

## User Preferences

Preferred communication style: Simple, everyday language.