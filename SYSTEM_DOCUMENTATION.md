# ClassTrack - Complete System Documentation

## 📋 Table of Contents
1. [System Overview](#system-overview)
2. [Architecture & Components](#architecture--components)
3. [Complete Feature List](#complete-feature-list)
4. [Programming Languages & Technologies](#programming-languages--technologies)
5. [Database Schema](#database-schema)
6. [API Endpoints Reference](#api-endpoints-reference)
7. [Frontend Pages & Routes](#frontend-pages--routes)
8. [Security Features](#security-features)
9. [File Structure](#file-structure)

---

## 🎯 System Overview

**ClassTrack** is a comprehensive **Class Management System (CMS)** designed for educational institutions. It provides a complete solution for managing classes, assignments, student submissions, schedules, announcements, and classroom maintenance reports.

### Core Purpose
- **Multi-role Management**: Admin, Teacher, and Student roles with distinct permissions
- **Assignment Workflow**: Complete assignment creation, submission, and grading system
- **Engagement Analytics**: AI-powered engagement tracking based on time spent on assignments
- **Classroom Management**: Schedule management and cleanliness reporting system
- **Real-time Updates**: Live schedules and announcements for student dashboards

---

## 🏗️ Architecture & Components

### Backend Architecture (FastAPI)

#### 1. **Database Layer** (`database.py`)
- **Purpose**: Database connection and session management
- **Technology**: SQLAlchemy ORM with PostgreSQL
- **Features**:
  - Environment-based configuration
  - Connection pooling
  - Session factory for dependency injection
  - Database lifecycle management

#### 2. **Data Models** (`models.py`)
- **SQLAlchemy ORM Models**: 8 core entities
- **Pydantic Schemas**: Request/response validation models
- **Relationships**: Complex foreign key relationships with cascading deletes
- **Enums**: UserRole (ADMIN, TEACHER, STUDENT)

#### 3. **Business Logic Layer** (`crud.py`)
- **CRUD Operations**: Complete database operations for all entities
- **Validation Logic**: Business rule enforcement
- **Error Handling**: Comprehensive error handling with meaningful messages
- **Query Optimization**: Efficient database queries with pagination

#### 4. **Security Layer** (`security.py`)
- **Authentication**: JWT token-based authentication
- **Password Hashing**: SHA256 (with recommendation for upgrade)
- **Token Management**: Token creation and verification
- **Session Management**: 30-minute token expiration

#### 5. **API Layer** (`main.py`)
- **FastAPI Application**: RESTful API with 50+ endpoints
- **Role-Based Access Control**: Endpoint-level permission checking
- **File Upload Handling**: Profile pictures and classroom report photos
- **CORS Configuration**: Cross-origin resource sharing
- **Static File Serving**: Uploaded files served via `/uploads/`

### Frontend Architecture (React + TypeScript)

#### 1. **Component Structure**
- **Pages**: 15+ page components for different views
- **UI Components**: Reusable components (Button, Card, Modal, Input, etc.)
- **Context Providers**: UserContext, SystemStatusContext
- **Protected Routes**: Role-based route protection

#### 2. **State Management**
- **React Hooks**: useState, useEffect, useContext
- **Local Storage**: Token persistence
- **Context API**: Global state management

#### 3. **Routing** (`AppRouter.tsx`)
- **React Router v7**: Client-side routing
- **Protected Routes**: Role-based access control
- **Dynamic Navigation**: Role-specific menu items

#### 4. **API Integration** (`authService.ts`)
- **Axios**: HTTP client with interceptors
- **Token Management**: Automatic token injection
- **Error Handling**: Centralized error handling

---

## ✨ Complete Feature List

### 🔐 Authentication & User Management

#### Admin Features:
- ✅ User CRUD operations (Create, Read, Update, Delete)
- ✅ User role management (Admin, Teacher, Student)
- ✅ User search and filtering by role
- ✅ User metrics (total user count)
- ✅ User data export (CSV-ready format)
- ✅ Default user seeding (admin, teacher, student)

#### All Users:
- ✅ JWT-based authentication
- ✅ Login/Logout functionality
- ✅ Profile management (first name, last name)
- ✅ Profile picture upload (max 5MB, images only)
- ✅ Password change with current password verification
- ✅ Session management (30-minute token expiration)
- ✅ Current user information endpoint

### 📚 Class Management

#### Admin Features:
- ✅ Class CRUD operations
- ✅ Class code generation (unique, uppercase)
- ✅ Teacher assignment to classes
- ✅ Class search and filtering
- ✅ Class metrics (total class count)
- ✅ Class data export
- ✅ Unassigned class viewing

#### Teacher Features:
- ✅ View assigned classes
- ✅ Class roster viewing (enrolled students)
- ✅ Class performance metrics

#### Student Features:
- ✅ View enrolled classes
- ✅ Class schedule viewing

### 📝 Assignment Management

#### Teacher/Admin Features:
- ✅ Assignment creation (name, description, class assignment)
- ✅ Assignment viewing (all or teacher-specific)
- ✅ Assignment editing
- ✅ Assignment deletion
- ✅ Assignment details viewing
- ✅ Assignment-to-class linking

#### Student Features:
- ✅ View assignments for enrolled classes
- ✅ Assignment details viewing
- ✅ Assignment submission with time tracking
- ✅ View own submission status

### 📤 Submission Management

#### Student Features:
- ✅ Create submissions for assignments
- ✅ Time spent tracking (core AI data input)
- ✅ Duplicate submission prevention
- ✅ View own submissions
- ✅ View grades for submitted assignments

#### Teacher/Admin Features:
- ✅ View all submissions for an assignment
- ✅ Grade submissions (0-100 scale)
- ✅ View submission details (student, grade, time spent)
- ✅ Submission filtering by assignment
- ✅ Engagement insights per assignment

### 📊 Analytics & Insights

#### Teacher Features:
- ✅ Assignment engagement metrics:
  - Total submissions count
  - Average time spent
  - Engagement score calculation
- ✅ Class performance reports:
  - Average grades per class
  - Submission rates
  - Student performance breakdown
- ✅ Student performance tracking:
  - Individual student grades
  - Submission rates per student
  - Average grades per student

#### Admin Features:
- ✅ System-wide metrics:
  - Total users count
  - Total classes count
- ✅ Data export capabilities

### 📅 Schedule Management

#### Admin/Teacher Features:
- ✅ Schedule creation (class, time slot, room, status)
- ✅ Schedule viewing (all schedules)
- ✅ Schedule editing
- ✅ Schedule deletion
- ✅ Schedule status management (Occupied, Clean, Needs Cleaning)

#### Student Features:
- ✅ Live schedule viewing (public endpoint)
- ✅ Enriched schedule data (class name, teacher name)
- ✅ Personal schedule viewing (enrolled classes only)

### 📢 Announcement Management

#### Admin/Teacher Features:
- ✅ Announcement creation (title, content, urgency flag)
- ✅ Announcement viewing (all announcements)
- ✅ Announcement editing
- ✅ Announcement deletion
- ✅ Urgent announcement marking

#### All Users:
- ✅ Live announcements viewing (public endpoint)
- ✅ Announcement feed on dashboards

### 🏫 Classroom Reporting

#### Student Features:
- ✅ Create classroom reports:
  - Cleanliness status (before/after)
  - Report text description
  - Photo evidence upload (max 10MB)
- ✅ View own reports
- ✅ Report history tracking

#### Admin/Teacher Features:
- ✅ View all classroom reports
- ✅ Filter reports by class
- ✅ Filter reports by reporter
- ✅ View report details with photos
- ✅ Report deletion

### 📁 File Management

#### Features:
- ✅ Profile picture uploads:
  - Supported formats: JPG, JPEG, PNG, GIF, WebP
  - Max size: 5MB
  - Unique filename generation (UUID-based)
- ✅ Classroom report photo uploads:
  - Supported formats: JPG, JPEG, PNG, GIF, WebP
  - Max size: 10MB
  - Evidence storage
- ✅ Static file serving via `/uploads/` endpoint
- ✅ File type validation
- ✅ File size validation

### 🎨 User Interface Features

#### Dashboard Features:
- ✅ Role-specific dashboards:
  - Admin Dashboard: System overview, user/class metrics
  - Teacher Dashboard: Class management, assignment overview
  - Student Dashboard: Assignments, schedule, announcements
- ✅ Real-time data updates
- ✅ Activity feeds
- ✅ Quick action buttons
- ✅ Statistics cards

#### UI Components:
- ✅ Responsive design (Tailwind CSS)
- ✅ Loading states (skeleton loaders)
- ✅ Error handling (SweetAlert2)
- ✅ Modal dialogs
- ✅ Form validation
- ✅ Dynamic navigation (role-based)
- ✅ QR code generation (for assignments)

---

## 💻 Programming Languages & Technologies

### Backend Languages & Frameworks

#### 1. **Python 3.x**
- **Purpose**: Primary backend language
- **Features Used**:
  - Object-oriented programming
  - Type hints for better code quality
  - Async/await for asynchronous operations
  - Context managers for resource management
  - Enum classes for type safety
- **Libraries**:
  - FastAPI: Modern web framework
  - SQLAlchemy: ORM for database operations
  - Pydantic: Data validation
  - PyJWT: JWT token handling
  - python-dotenv: Environment variable management
  - aiofiles: Async file operations
  - Alembic: Database migrations

#### 2. **SQL (PostgreSQL)**
- **Purpose**: Relational database
- **Features Used**:
  - ACID compliance
  - Foreign key constraints
  - Indexes for performance
  - Enum types
  - DateTime types
  - Boolean types
  - Text and String types
- **Operations**:
  - CRUD operations
  - Complex joins
  - Aggregations
  - Transactions

### Frontend Languages & Frameworks

#### 3. **TypeScript**
- **Purpose**: Type-safe JavaScript
- **Features Used**:
  - Type annotations
  - Interfaces for data structures
  - Type inference
  - Generic types
  - Union types
  - Optional properties
- **Benefits**:
  - Compile-time error checking
  - Better IDE support
  - Improved code maintainability

#### 4. **JavaScript (ES6+)**
- **Purpose**: Runtime language for React
- **Features Used**:
  - Arrow functions
  - Destructuring
  - Template literals
  - Promises and async/await
  - Modules (import/export)
  - Spread operator
  - Optional chaining

#### 5. **JSX/TSX**
- **Purpose**: React component syntax
- **Features Used**:
  - Component composition
  - Props passing
  - Event handling
  - Conditional rendering
  - List rendering
  - Hooks (useState, useEffect, useContext)

### Styling & Build Tools

#### 6. **CSS3**
- **Purpose**: Styling
- **Features Used**:
  - Flexbox layouts
  - Grid layouts
  - Responsive design (media queries)
  - Animations
  - Custom properties (CSS variables)

#### 7. **Tailwind CSS 4.x**
- **Purpose**: Utility-first CSS framework
- **Features Used**:
  - Utility classes
  - Responsive breakpoints
  - Custom color schemes
  - Component classes
  - PostCSS integration

#### 8. **PostCSS**
- **Purpose**: CSS processing
- **Features Used**:
  - Autoprefixer
  - CSS transformations
  - Plugin system

### Build & Development Tools

#### 9. **Vite 7.x**
- **Purpose**: Build tool and dev server
- **Features Used**:
  - Fast HMR (Hot Module Replacement)
  - ES modules
  - Optimized production builds
  - Plugin system
  - Dev server with proxy

#### 10. **Node.js**
- **Purpose**: JavaScript runtime for build tools
- **Features Used**:
  - npm package management
  - Module resolution
  - File system operations

### Database Migration

#### 11. **Alembic (Python)**
- **Purpose**: Database schema version control
- **Features Used**:
  - Migration generation
  - Migration execution
  - Schema versioning
  - Rollback capabilities

### Additional Technologies

#### 12. **Axios**
- **Purpose**: HTTP client
- **Features Used**:
  - Request/response interceptors
  - Automatic JSON parsing
  - Error handling
  - Request cancellation

#### 13. **React Router v7**
- **Purpose**: Client-side routing
- **Features Used**:
  - Route definitions
  - Protected routes
  - Navigation hooks
  - Route parameters

#### 14. **SweetAlert2**
- **Purpose**: Beautiful alert dialogs
- **Features Used**:
  - Success/error notifications
  - Confirmation dialogs
  - Custom styling

#### 15. **QRCode.react**
- **Purpose**: QR code generation
- **Features Used**:
  - QR code rendering
  - Customizable QR codes

---

## 🗄️ Database Schema

### Tables Overview

1. **users**
   - Primary key: `id`
   - Unique: `username`
   - Enums: `role` (ADMIN, TEACHER, STUDENT)
   - Relationships: One-to-many with classes, enrollments, assignments, submissions

2. **classes**
   - Primary key: `id`
   - Unique: `name`, `code`
   - Foreign key: `teacher_id` → users.id
   - Relationships: One-to-many with enrollments, assignments, schedules, reports

3. **enrollments**
   - Primary key: `id`
   - Foreign keys: `class_id` → classes.id, `student_id` → users.id
   - Junction table for many-to-many: students ↔ classes

4. **assignments**
   - Primary key: `id`
   - Foreign keys: `class_id` → classes.id, `creator_id` → users.id
   - Relationships: One-to-many with submissions

5. **submissions**
   - Primary key: `id`
   - Foreign keys: `assignment_id` → assignments.id, `student_id` → users.id
   - Unique constraint: (assignment_id, student_id) - prevents duplicate submissions

6. **schedules**
   - Primary key: `id`
   - Foreign key: `class_id` → classes.id
   - Status enum: Occupied, Clean, Needs Cleaning

7. **announcements**
   - Primary key: `id`
   - No foreign keys (system-wide)

8. **classroom_reports**
   - Primary key: `id`
   - Foreign keys: `class_id` → classes.id, `reporter_id` → users.id
   - Photo URL storage

### Relationships Diagram

```
User (Teacher) ──┐
                 ├──> Class ──┬──> Enrollment ←── User (Student)
User (Admin) ────┘            │
                              ├──> Assignment ──> Submission ←── User (Student)
                              │
                              ├──> Schedule
                              │
                              └──> ClassroomReport ←── User (Student)

Announcement (System-wide, no relationships)
```

---

## 🔌 API Endpoints Reference

### Authentication Endpoints
- `POST /token` - Login (returns JWT)
- `GET /users/me` - Get current user
- `PUT /users/me` - Update profile
- `POST /users/me/photo` - Upload profile picture
- `PUT /users/change-password` - Change password

### User Management (Admin Only)
- `GET /users/` - List all users (with optional role filter)
- `POST /users/create` - Create user
- `PATCH /users/{user_id}` - Update user
- `DELETE /users/{user_id}` - Delete user
- `GET /metrics/users/count` - User count
- `GET /exports/users/all` - Export all users

### Class Management (Admin Only)
- `GET /classes/` - List all classes
- `POST /classes/` - Create class
- `GET /classes/{class_id}` - Get class by ID
- `PATCH /classes/{class_id}` - Update class
- `DELETE /classes/{class_id}` - Delete class
- `GET /metrics/classes/count` - Class count
- `GET /exports/classes/all` - Export all classes

### Teacher-Specific Endpoints
- `GET /teachers/me/classes` - Get teacher's classes with metrics
- `GET /teachers/me/classes/{class_id}/roster` - Get class roster
- `GET /teachers/me/assignments` - Get teacher's assignments
- `GET /teachers/me/reports` - Get comprehensive teacher reports

### Assignment Management (Teacher/Admin)
- `GET /assignments/` - List all assignments
- `POST /assignments/` - Create assignment
- `GET /assignments/{assignment_id}` - Get assignment details
- `PATCH /assignments/{assignment_id}` - Update assignment
- `DELETE /assignments/{assignment_id}` - Delete assignment

### Student Assignment Endpoints
- `GET /assignments/me` - Get student's assignments
- `GET /students/me/assignments` - Get student's assignments (alias)

### Submission Management
- `POST /submissions/` - Create submission (Student only)
- `GET /assignments/{assignment_id}/submissions` - Get submissions for assignment (Teacher/Admin)
- `PATCH /submissions/{submission_id}/grade` - Grade submission (Teacher/Admin)
- `GET /students/me/submissions/{assignment_id}` - Get student's submission

### Analytics & Insights (Teacher/Admin)
- `GET /insights/engagement/{assignment_id}` - Get engagement metrics
- `GET /students/me/grades` - Get student grades (Student only)

### Schedule Management (Admin/Teacher)
- `GET /schedules/` - List all schedules
- `POST /schedules/` - Create schedule
- `GET /schedules/{schedule_id}` - Get schedule
- `PUT /schedules/{schedule_id}` - Update schedule
- `DELETE /schedules/{schedule_id}` - Delete schedule
- `GET /schedules/live` - Live schedules (Public)

### Announcement Management (Admin/Teacher)
- `GET /announcements/` - List all announcements
- `POST /announcements/` - Create announcement
- `GET /announcements/{announcement_id}` - Get announcement
- `PUT /announcements/{announcement_id}` - Update announcement
- `DELETE /announcements/{announcement_id}` - Delete announcement
- `GET /announcements/live` - Live announcements (Public)

### Classroom Reports
- `POST /reports/` - Create report (Student only)
- `GET /reports/` - List all reports (Admin/Teacher)
- `GET /reports/my` - Get my reports (Student)
- `GET /reports/class/{class_id}` - Get reports by class (Admin/Teacher)

### Student-Specific Endpoints
- `GET /students/me/schedule` - Get student schedule
- `GET /students/me/grades` - Get student grades

---

## 🖥️ Frontend Pages & Routes

### Public Routes
- `/` - Login page
- `/login` - Login page (alias)

### Admin Routes (`/admin/*`)
- `/admin/dashboard` - Admin dashboard
- `/admin/users` - User management
- `/admin/classes` - Class management
- `/admin/schedules` - Schedule management
- `/admin/reports` - Reports viewing

### Teacher Routes (`/teacher/*`)
- `/teacher/dashboard` - Teacher dashboard
- `/teacher/assignments` - Assignment management
- `/teacher/assignments/:assignmentId` - Assignment details
- `/teacher/assignments/:assignmentId/submissions` - View submissions
- `/teacher/classes` - Class viewing
- `/teacher/schedule` - Schedule management
- `/teacher/reports` - Performance reports

### Student Routes (`/student/*`)
- `/student/dashboard` - Student dashboard
- `/student/classes` - Enrolled classes
- `/student/assignments` - Available assignments
- `/student/assignments/:assignmentId` - Assignment submission
- `/student/assignments/:assignmentId/submit` - Assignment submission (alias)
- `/student/schedule` - Personal schedule
- `/student/grades` - View grades

### Shared Routes
- `/profile` - User profile (all roles)

---

## 🔒 Security Features

### Authentication
- ✅ JWT token-based authentication
- ✅ Bearer token authorization
- ✅ Token expiration (30 minutes)
- ✅ Secure password storage (hashed)
- ✅ Current password verification for password changes

### Authorization
- ✅ Role-based access control (RBAC)
- ✅ Endpoint-level permission checking
- ✅ Resource-level ownership verification
- ✅ Protected routes on frontend

### Input Validation
- ✅ Pydantic schema validation
- ✅ Field-level validators
- ✅ Type checking
- ✅ Length constraints
- ✅ Format validation

### File Upload Security
- ✅ File type validation (whitelist)
- ✅ File size limits (5MB profile, 10MB reports)
- ✅ Unique filename generation (UUID)
- ✅ Content type verification

### Data Protection
- ✅ SQL injection prevention (ORM)
- ✅ XSS prevention (React escaping)
- ✅ CORS configuration
- ✅ Foreign key constraints
- ✅ Unique constraints

---

## 📂 File Structure

```
Classtrack/
├── backend/
│   ├── alembic/              # Database migrations
│   │   ├── versions/         # Migration files
│   │   └── env.py            # Migration environment
│   ├── uploads/              # File storage
│   ├── __pycache__/          # Python cache
│   ├── alembic.ini          # Alembic configuration
│   ├── crud.py              # Business logic layer
│   ├── database.py          # Database configuration
│   ├── main.py              # FastAPI application (API layer)
│   ├── models.py            # SQLAlchemy models & Pydantic schemas
│   ├── requirements.txt     # Python dependencies
│   ├── schemas.py           # Additional Pydantic schemas
│   └── security.py         # Authentication & security
│
└── Classtrack/
    └── frontend/
        ├── dist/            # Production build
        ├── node_modules/   # Node dependencies
        ├── public/         # Static assets
        ├── src/
        │   ├── assets/     # Images, logos
        │   ├── components/ # React components
        │   │   ├── ui/     # Reusable UI components
        │   │   ├── DynamicHeader.tsx
        │   │   ├── LoginForm.tsx
        │   │   ├── ProtectedRoute.tsx
        │   │   ├── Sidebar.tsx
        │   │   └── SkeletonLoader.tsx
        │   ├── contexts/   # React contexts
        │   │   ├── SystemStatusContext.tsx
        │   │   └── UserContext.tsx
        │   ├── pages/      # Page components
        │   │   ├── AssignmentPage.tsx
        │   │   ├── ClassesPage.tsx
        │   │   ├── DashboardPage.tsx
        │   │   ├── LoginPage.tsx
        │   │   ├── ProfilePage.tsx
        │   │   ├── ReportsPage.tsx
        │   │   ├── SchedulePage.tsx
        │   │   ├── StudentDashboard.tsx
        │   │   ├── SubmissionsViewPage.tsx
        │   │   └── TeacherDashboard.tsx
        │   ├── router/     # Routing configuration
        │   │   └── AppRouter.tsx
        │   ├── services/  # API services
        │   │   └── authService.ts
        │   ├── styles/    # CSS files
        │   ├── App.tsx    # Root component
        │   ├── main.tsx  # Entry point
        │   └── index.css # Global styles
        ├── eslint.config.js
        ├── index.html
        ├── package.json
        ├── postcss.config.js
        ├── tailwind.config.ts
        ├── tsconfig.json
        └── vite.config.ts
```

---

## 🎓 Summary

**ClassTrack** is a full-stack educational management system built with modern technologies. It provides:

- **3 User Roles** with distinct permissions
- **8 Database Tables** with complex relationships
- **50+ API Endpoints** covering all features
- **15+ Frontend Pages** with role-based access
- **Multi-language Stack**: Python, TypeScript, JavaScript, SQL, CSS
- **Modern Frameworks**: FastAPI, React, Tailwind CSS
- **Comprehensive Features**: From user management to analytics

The system is production-ready for small to medium educational institutions, with room for security enhancements and scalability improvements.

---

**Document Version**: 1.0  
**Last Updated**: 2024  
**System Version**: ClassTrack v1.0.0
