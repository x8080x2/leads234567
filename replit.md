# Overview

This is a professional B2B email discovery application built with React frontend and Express backend. The application integrates with the GetProspect API to find business email addresses for contacts. Users can perform single email searches or batch process CSV files containing multiple contacts. The system provides comprehensive search history, API configuration management, and detailed results tracking with export capabilities.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing (single-page application)
- **State Management**: TanStack Query (React Query) for server state management
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **Forms**: React Hook Form with Zod validation
- **Build Tool**: Vite for development and production builds

## Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Schema Validation**: Zod for runtime type checking
- **Session Management**: Express sessions with PostgreSQL store
- **Development**: Hot reload with Vite middleware integration

## Data Storage
- **Database**: PostgreSQL with Neon serverless hosting
- **Schema Management**: Drizzle Kit for migrations and schema changes
- **Storage Interface**: Abstracted storage layer with in-memory fallback
- **Tables**: 
  - `email_searches` - stores individual search results
  - `api_config` - manages API key configuration
  - `batch_jobs` - tracks bulk processing operations

## Authentication & Configuration
- **API Management**: Secure API key storage with encryption
- **Configuration**: Environment-based settings with DATABASE_URL validation
- **Error Handling**: Global error middleware with structured error responses

## External Dependencies
- **GetProspect API**: Primary email discovery service integration
- **File Processing**: CSV parsing and export functionality
- **UI Libraries**: Comprehensive Radix UI component ecosystem
- **Development Tools**: 
  - Replit-specific plugins for development environment
  - ESBuild for production bundling
  - PostCSS with Autoprefixer for CSS processing

The application follows a clean separation of concerns with shared type definitions, centralized API client configuration, and modular component architecture. The backend provides RESTful endpoints for single searches, batch processing, configuration management, and search history retrieval.