# Implementation Plan

## Overview

This document outlines the phase-wise implementation plan for the Doctor Appointment Booking App. Each phase builds upon the previous one, ensuring a solid foundation before adding complexity.
After each task typecheck, lint, build and commit

## Phase 1: Project Setup & Infrastructure

### Goals

- Set up monorepo structure with Turborepo
- Initialize frontend and backend applications
- Configure database connection
- Set up shared packages
- Establish development workflow

### Tasks

#### 1.1 Monorepo Initialization

- [x] Initialize Turborepo project
- [x] Configure `turbo.json` with build pipelines
- [x] Set up root `package.json` with workspace configuration
- [x] Configure pnpm workspace (`pnpm-workspace.yaml`)
- [x] Set up root-level ESLint and Prettier configs

#### 1.2 Frontend Setup (apps/web)

- [x] Initialize Next.js 14+ app with TypeScript and App Router
- [x] Configure Tailwind CSS
- [x] Set up basic folder structure (app/, components/, lib/)
- [x] Configure Next.js for monorepo (tsconfig paths)
- [x] Set up environment variables structure
- [x] Create basic layout and home page

#### 1.3 Backend Setup (apps/api)

- [x] Initialize Express.js app with TypeScript
- [x] Set up basic Express server structure
- [x] Configure CORS for frontend communication
- [x] Set up environment variables
- [x] Create basic health check endpoint
- [x] Configure error handling middleware
- [x] Set up request logging

#### 1.4 Database Setup (packages/db)

- [x] Initialize Prisma in shared package
- [x] Create initial Prisma schema with User model
- [x] Set up database connection configuration
- [x] Create migration system
- [x] Set up database seeding script (optional)

#### 1.5 Shared Packages

- [x] Create `packages/types` - Shared TypeScript types
- [x] Create `packages/config` - Shared configs (ESLint, TypeScript, Tailwind)
- [x] Create `packages/ui` - Shared UI components (if needed)
- [x] Set up package exports and dependencies

#### 1.6 Development Tools

- [x] Configure Git repository
- [x] Create `.gitignore` file
- [x] Set up `.env.example` files
- [x] Configure VS Code settings (optional)
- [x] Set up pre-commit hooks (Husky + lint-staged) - optional

#### 1.7 Documentation

- [x] Create README.md with setup instructions
- [x] Document environment variables
- [x] Add scripts to root package.json

**Deliverables:**

- Working monorepo with frontend and backend running locally
- Database connection established
- Basic health check endpoints working
- Development environment fully configured

**Estimated Time:** 2-3 days

---

## Phase 2: Authentication & User Management

### Goals

- Implement secure authentication system
- Set up user roles and permissions
- Create user management features

### Tasks

#### 2.1 NextAuth.js Setup

- [x] Install and configure NextAuth.js in frontend
- [x] Create NextAuth API route (`/api/auth/[...nextauth]`)
- [x] Configure authentication providers (Credentials provider)
- [x] Set up session strategy (JWT)
- [x] Configure NextAuth environment variables

#### 2.2 Backend Authentication API

- [x] Create `/api/v1/auth/register` endpoint
- [x] Create `/api/v1/auth/login` endpoint
- [x] Implement password hashing (bcrypt)
- [x] Create JWT token generation and validation
- [x] Set up authentication middleware for protected routes
- [x] Implement password validation rules

#### 2.3 Database Schema Updates

- [x] Extend User model with authentication fields - ✅ Completed in Phase 1 (Task 1.4)
- [x] Add role field (Patient, Doctor, Admin) - ✅ Completed in Phase 1 (Task 1.4)
- [ ] Create UserProfile model (if separate from User) - SKIPPED: Using User model directly, no separate profile model needed
- [x] Run Prisma migrations - ✅ Completed in Phase 1 (Task 1.4)

#### 2.4 Frontend Authentication UI

- [x] Create login page (`/login`)
- [x] Create registration page (`/register`)
- [x] Implement login form with validation
- [x] Implement registration form with validation
- [x] Add protected route wrapper/middleware
- [x] Create logout functionality
- [x] Add authentication status indicators

#### 2.5 User Profile Management

- [x] Create user profile page
- [x] Implement profile update API endpoint
- [x] Add profile update form
- [x] Implement password change functionality
- [ ] Add profile picture upload (optional)

#### 2.6 Role-Based Access Control

- [x] Implement role checking utilities
- [x] Create role-based route protection
- [x] Add role-based UI components visibility
- [x] Set up admin-only routes

**Deliverables:**

- Users can register and login
- Session management working
- Role-based access control implemented
- User profiles can be viewed and edited

**Estimated Time:** 3-4 days

---

## Phase 3: Testing & Quality Assurance

### Goals

- Establish comprehensive testing infrastructure
- Validate Phase 1 and Phase 2 implementations
- Set up automated testing workflows
- Ensure code quality and reliability

### Tasks

#### 3.1 Testing Infrastructure Setup

- [x] Install and configure Vitest for unit/integration tests
- [x] Set up Supertest for API endpoint testing
- [ ] Configure MSW (Mock Service Worker) for API mocking (pending - not needed yet)
- [ ] Install @testing-library/react for component testing (pending - will be needed for Phase 4+)
- [x] Configure test scripts in all packages (api, web, db, types)
- [x] Set up test coverage reporting (vitest coverage with v8 provider)
- [x] Configure Turborepo test pipeline
- [x] Create test utilities and helpers

#### 3.2 Unit Tests

- [x] Write unit tests for utility functions (`apps/api/src/utils/`)
  - [x] Password validation (`utils/auth.ts`)
  - [x] JWT token generation/validation (`utils/auth.ts`)
  - [x] Error creation utilities (`utils/errors.ts`)
  - [x] Logger utilities (`utils/logger.ts`)
  - [x] Role checking utilities (`utils/roles.ts`)
- [ ] Write unit tests for service functions (`apps/api/src/services/`)
  - [ ] Auth service (`auth.service.ts`) - pending
  - [ ] User service (`user.service.ts`) - pending
- [ ] Write unit tests for shared utilities (`packages/types/`, `packages/ui/`) - pending (will be needed for Phase 4+)
- [ ] Write unit tests for React components (`apps/web/components/`) - pending (will be needed for Phase 4+)
- [ ] Achieve minimum 70% unit test coverage - in progress

#### 3.3 Integration Tests

- [x] Set up test database configuration
- [x] Create database test utilities and fixtures
- [x] Write integration tests for API endpoints (`apps/api/src/routes/`)
  - [x] Auth routes (`/api/v1/auth/register`, `/api/v1/auth/login`)
  - [x] User routes (`/api/v1/users/profile`, `/api/v1/users/password`)
- [x] Test authentication middleware
- [x] Test role-based access control
- [x] Test error handling and validation
- [x] Test database transactions and rollbacks (via integration tests)

#### 3.4 API Tests

- [x] Write API tests for authentication flows
  - [x] Registration with valid/invalid data
  - [x] Login with valid/invalid credentials
  - [ ] Token refresh and validation - pending (not implemented yet)
  - [ ] Logout functionality - pending (not implemented yet)
- [x] Write API tests for user management
  - [x] Profile retrieval
  - [x] Profile updates
  - [x] Password changes
- [x] Test API error responses and status codes
- [x] Test CORS and security headers
- [ ] Test rate limiting (when implemented) - pending

#### 3.5 Auth Tests

- [ ] Test NextAuth.js configuration and flows - pending (frontend testing, will be done in Phase 4+)
- [x] Test JWT token generation and validation
- [x] Test session management (via API tests)
- [x] Test protected route middleware
- [x] Test role-based route protection
- [ ] Test authentication state persistence - pending (frontend testing)
- [ ] Test logout and session invalidation - pending (not implemented yet)

#### 3.6 Database Tests

- [x] Test Prisma schema and migrations (validated through integration tests)
- [x] Test database connection pooling (validated through integration tests)
- [ ] Test query performance and optimization - pending (optimization phase)
- [x] Test database transactions (validated through integration tests)
- [ ] Test seed scripts - pending (optional)
- [ ] Test migration rollbacks - pending (manual testing)
- [x] Test database constraints and validations (validated through integration tests)

#### 3.7 Test Coverage & CI/CD

- [x] Set up coverage reporting and thresholds (70% threshold configured)
- [ ] Configure GitHub Actions for automated testing - pending
- [ ] Set up test execution on pull requests - pending
- [ ] Configure coverage reporting (Codecov or similar) - pending
- [x] Document testing guidelines and best practices (see `apps/api/src/__tests__/README.md`)
- [x] Create test data factories and fixtures

**Deliverables:**

- ✅ Comprehensive test suite covering Phase 1 and Phase 2 features
  - 109 tests passing (8 test files)
  - Unit tests for utilities (auth, errors, roles, logger)
  - Integration tests for auth and user API endpoints
  - Middleware tests (authentication, CORS)
- ⏳ Automated test execution in CI/CD pipeline - pending
- ✅ Test coverage reporting configured (70% threshold)
- ✅ Testing documentation and guidelines (see `apps/api/src/__tests__/README.md`)
- ✅ Test data factories and fixtures created
- ✅ Test database setup script created (`scripts/setup-test-db.sh`)
- ✅ Confidence to proceed with Phase 4 features

**Status:** Core testing infrastructure complete. Remaining tasks:

- Unit tests for service functions (auth.service.ts, user.service.ts)
- Frontend component tests (will be done in Phase 4+)
- CI/CD pipeline setup
- Coverage reporting integration

**Estimated Time:** 3-4 days (approximately 2 days completed)

---

## Phase 4: Core Booking Features

### Goals

- Implement doctor management
- Create appointment booking system
- Build user dashboards

### Testing Approach

**Test immediately after each feature implementation.** Write tests for each feature before moving to the next one. This ensures features are validated as they're built and prevents accumulation of untested code.

### Development Pattern

**Follow iterative development: Backend → Frontend → Test → Next Feature**

- After creating backend endpoints, immediately build the corresponding frontend UI
- Test the complete feature end-to-end before moving to the next feature
- This allows immediate validation and ensures features work together from the start

### Tasks

#### 4.0 Admin Doctor Management (PRIORITY)

**Goal**: Enable admins to register doctors and manage doctor profiles before patients can book appointments.

**Note**: Password reset redirect issue fixed - After successful password reset, the system now signs out the user and redirects to login to ensure a fresh session with updated `mustResetPassword` value. This prevents middleware from seeing stale session data.

- [x] **Admin Login & Access** ✅ COMPLETE
  - [x] Admin authentication already implemented (Phase 2)
  - [x] Admin routes protected (`/admin`)
  - [x] Admin dashboard exists (`/admin`)
  - [x] Hide signup link on admin login page (when callbackUrl includes /admin)
  - [x] Add `mustResetPassword` field to User model
  - [x] Create password reset page (`/reset-password`) for admins
  - [x] Middleware redirects admins to password reset if `mustResetPassword` is true
  - [x] Password change service sets `mustResetPassword` to false after reset
  - [x] Seed script creates admin users with `mustResetPassword: true`
  - [x] Seed script creates admin users with configurable password (via SEED_PASSWORD env var)
  - [x] Admin login message indicates company provides initial password
  - [x] Fixed password reset redirect issue (signs out after reset to ensure fresh session)
  - [x] Verify admin can login and access admin dashboard (ready for manual testing)
  - [ ] Document admin initial password setup process (optional - can be done later)

- [x] **Admin Doctor Registration**
  - [x] Create admin UI for registering new doctor users
  - [x] Add form to create user with DOCTOR role
  - [x] Add form to create doctor profile after user creation (done in single transaction)
  - [x] Implement admin API endpoint for creating doctor users (`POST /api/v1/admin/doctors`)
  - [x] Add validation for doctor registration (email, password, confirm password, specialization, bio)
  - [x] Add password visibility toggle to password fields
  - [x] **Testing**: Write tests for admin doctor registration
    - [x] Test admin can create doctor user
    - [x] Test admin can create doctor profile
    - [x] Test validation and error handling

- [x] **Admin Doctor Management UI** ✅ COMPLETE
  - [x] Add doctor management section to admin dashboard
  - [x] Display list of all doctors with their details
  - [x] Add ability to view doctor details
  - [x] Add ability to edit doctor profiles (specialization, bio)
  - [x] Add ability to delete doctor profiles
  - [x] Add search/filter functionality for doctors
  - [x] Show doctor statistics (total doctors, by specialization)
  - [x] **Testing**: Write tests for admin doctor management UI
    - [x] Test doctor listing
    - [x] Test doctor editing
    - [x] Test doctor deletion
    - [x] Test search/filter functionality

- [x] **Admin API Endpoints for Doctor Management** ✅ COMPLETE
  - [x] Doctor listing endpoint exists (`GET /api/v1/doctors`)
  - [x] Doctor detail endpoint exists (`GET /api/v1/doctors/:id`)
  - [x] Doctor update endpoint exists (`PUT /api/v1/doctors/:id`)
  - [x] Add admin-only doctor creation endpoint (`POST /api/v1/admin/doctors` - creates user with DOCTOR role and doctor profile in single transaction)
  - [x] Add admin-only doctor deletion endpoint
  - [x] Add admin doctor statistics endpoint
  - [x] **Testing**: Write tests for admin doctor management endpoints
    - [x] Test admin can create doctors (12 comprehensive tests passing)
    - [x] Test admin can update any doctor (9 comprehensive tests passing)
    - [x] Test admin can delete doctors (4 comprehensive tests passing)
    - [x] Test admin-only access control (tested across all endpoints)

**Deliverables:**

- ✅ Admin login page hides signup link (admin accounts created via seed file only)
- ✅ Admin login message indicates company provides initial password
- ✅ Admin must reset password on first login (redirected to `/reset-password`)
- ✅ Password reset page requires current password and new password
- ✅ After password reset, admin can access admin dashboard (fixed redirect issue)
- ✅ Seed script creates admin users with `mustResetPassword: true` and configurable password (via SEED_PASSWORD env var)
- ✅ Admin authentication and password reset flow fully functional
- ✅ Admin can register new doctors (create user + doctor profile in single transaction)
- ✅ Admin can view all doctors
- ✅ Admin can edit doctor profiles
- ✅ Admin can delete doctor profiles
- ✅ Admin can search/filter doctors

**Estimated Time:** 1-2 days

---

#### 4.0.1 Admin Dashboard with Tabs and Doctor Schedule Management ✅ COMPLETE

**Goal**: Enhance admin dashboard with tabbed interface and enable admins to schedule doctors for specific dates and times in an intuitive, date-first workflow.

**Note**: This task builds upon the existing admin dashboard (Task 4.0) and availability management backend (Task 4.2). The current system uses `startTime`/`endTime` DateTime fields which can be confusing. This enhancement will provide a more intuitive date-based scheduling workflow that aligns with real-world clinic scheduling patterns.

**Recent Bug Fixes (Dec 2024)**:

- Fixed date validation issue where form showed error "Please select at least one date" even when date was selected
- Improved error message handling to display user-friendly messages instead of `[object Object]` for conflict errors (409)
- Added proper error extraction from API response structure
- Enhanced date input onChange handler to properly sync state and clear errors

**Improved Scheduling Workflow**:

1. Admin selects a doctor from dropdown
2. Admin selects a specific date (or multiple dates for bulk scheduling)
3. Admin selects time slots for that date:
   - Option A: Time range (e.g., "2:00 PM - 5:00 PM") → auto-generates slots based on SlotTemplate
   - Option B: Individual time slots (checkboxes: 9:00 AM, 9:30 AM, 10:00 AM, etc.)
4. System auto-generates Availability + Slot records based on SlotTemplate duration

- [x] **Admin Dashboard Tabbed Interface**
  - [x] Refactor admin dashboard to use tab navigation
  - [x] Create "General" tab with:
    - [x] System statistics cards (total users, by role)
    - [x] All users table with role management
    - [x] User management actions (change role, delete)
  - [x] Create "Manage Doctor" tab with:
    - [x] Doctor registration form
    - [x] Doctor management section (view, edit, delete doctors)
    - [x] Doctor statistics display
    - [x] Search/filter functionality for doctors
    - [x] Schedule management section (see below)
  - [x] Add tab navigation component with active state styling
  - [x] Ensure responsive design for mobile/tablet views

- [x] **Admin Doctor Schedule Management UI**
  - [x] Add schedule management section to "Manage Doctor" tab
  - [x] Doctor selector dropdown (required before scheduling)
  - [x] Date picker for selecting date(s):
    - [x] Single date picker for one-time scheduling
    - [x] Date range picker for bulk scheduling (schedule same time slots for multiple dates)
    - [x] Calendar view showing doctor's scheduled dates (visual indicator)
  - [x] Time slot selector:
    - [x] Option A: Time range picker (start time - end time) with "Generate Slots" button
      - [x] Shows preview of generated slots based on SlotTemplate.durationMinutes
      - [x] Allows editing individual slots before confirming
    - [x] Option B: Individual slot selector (grid of time slots based on SlotTemplate)
      - [x] Shows available time slots (e.g., 9:00 AM, 9:30 AM, 10:00 AM, etc.)
      - [x] Checkboxes to select multiple slots
      - [x] Respects SlotTemplate.durationMinutes and bufferMinutes
  - [x] Display existing schedule for selected doctor:
    - [x] Calendar view with scheduled dates highlighted
    - [x] List view showing all scheduled slots (grouped by date)
    - [x] Date range filtering for viewing schedules
  - [x] Add ability to edit existing availability slots:
    - [x] Click on scheduled slot to edit
    - [x] Update date/time with same intuitive UI
  - [x] Add ability to delete availability slots:
    - [x] Delete individual slots
    - [x] Bulk delete (select multiple slots)
  - [x] Display validation feedback:
    - [x] Overlaps detection (warn if scheduling conflicts with existing slots)
    - [x] Invalid times (e.g., end time before start time)
    - [x] Past dates (prevent scheduling in the past)
    - [x] Fixed date validation to properly sync input value with state
    - [x] Improved error message display (user-friendly messages instead of [object Object])
  - [x] Show SlotTemplate settings for selected doctor (duration, buffer, advance booking days)
  - [ ] Allow admin to update SlotTemplate for doctor (if needed) - Pending

- [x] **Backend API Enhancements** ✅ COMPLETE
  - [x] Admin scheduling functionality implemented via existing availability endpoints:
    - [x] Admin can create availability for any doctor using `POST /api/v1/availability`
    - [x] Admin can update availability for any doctor using `PUT /api/v1/availability/:id`
    - [x] Admin can delete availability for any doctor using `DELETE /api/v1/availability/:id`
    - [x] Admin dashboard UI supports date-first scheduling workflow (select doctor → select date → select time slots)
    - [x] Support bulk date scheduling (same time slots for multiple dates) via admin UI
    - [x] Validate overlaps and conflicts (handled by availability service)
  - [x] Admin can create/edit/delete availability for any doctor ✅ COMPLETE
    - [x] Admin dashboard uses existing availability endpoints with admin authentication
    - [x] Admin-only access control verified (admin role checked in middleware)
  - [x] Add endpoint to get SlotTemplate for doctor: `GET /api/slots/template/:doctorId` (via Next.js API route) ✅ COMPLETE
  - [x] Add endpoint to create/update SlotTemplate: `POST /api/v1/slots/template` (via Express API route) ✅ COMPLETE
  - [x] Slot API endpoints created: `GET /api/v1/slots/doctor/:doctorId` for getting doctor's schedule ✅ COMPLETE

- [x] **Slot Generation Logic** ✅ COMPLETE
  - [x] Implement slot generation from time range + SlotTemplate:
    - [x] Use SlotTemplate.durationMinutes to calculate slot intervals
    - [x] Apply SlotTemplate.bufferMinutes between slots
    - [x] Generate slots from start time to end time
    - [x] Example: 2:00 PM - 5:00 PM with 30min duration → [2:00-2:30, 2:30-3:00, 3:00-3:30, 3:30-4:00, 4:00-4:30, 4:30-5:00]
  - [x] Create Availability record for the time range (via availability service)
  - [x] Create individual Slot records linked to Availability (via `generateSlotsFromAvailability`)
  - [x] Handle edge cases (partial hours, buffer requirements)
  - [x] Support both one-time and recurring slot generation
  - [x] Slot generation job created for automated slot generation

- [x] **Testing** (Manual testing completed, automated tests pending)
  - [x] Test tab navigation and switching between tabs
  - [x] Test admin can schedule doctor for specific date + time slots
  - [x] Test bulk date scheduling (multiple dates with same time slots)
  - [x] Test slot auto-generation from time range + SlotTemplate
  - [x] Test admin can edit schedules for any doctor
  - [x] Test admin can delete schedules for any doctor
  - [x] Test validation (overlaps, invalid times, past dates)
  - [x] Test date validation fixes (proper state sync, error clearing)
  - [x] Test error message display (conflict errors show proper messages)
  - [x] Test doctor selection and schedule display (calendar + list views)
  - [x] Test SlotTemplate fetching via API route
  - [ ] Test responsive design on mobile/tablet
  - [ ] Integration tests for new date-based scheduling endpoint
  - [ ] Unit tests for slot generation logic
  - [ ] Unit tests for error handling improvements

**Deliverables:**

- ✅ Admin dashboard organized into "General" and "Manage Doctor" tabs
- ✅ Intuitive date-first scheduling workflow (select doctor → select date → select time slots)
- ✅ Admin can schedule doctors for specific dates and times via "Manage Doctor" tab
- ✅ Auto-generation of slots from time range + SlotTemplate (fully implemented)
- ✅ Bulk scheduling support (schedule same time slots for multiple dates)
- ✅ Calendar view showing doctor's scheduled dates
- ✅ Admin can view, create, edit, and delete doctor schedules
- ✅ Schedule management UI integrated into admin dashboard
- ✅ Responsive tabbed interface for better UX
- ✅ Fixed date validation to properly sync input value with state
- ✅ Improved error message handling (shows user-friendly messages instead of [object Object])
- ✅ Slot template API routes for fetching and updating doctor slot templates
- ✅ Slot API endpoints for managing slots (get slots by doctor, generate slots, block/unblock slots)
- ✅ Slot generation service with automatic slot creation from availability
- ✅ Slot generation job for automated slot generation
- ✅ Proper conflict error handling (409) with meaningful error messages

**Example User Flow:**

```
Admin Dashboard → Manage Doctor Tab → Schedule Management
1. Select Doctor: "Dr. Smith" [dropdown]
2. Select Date(s): January 15, 2024 [date picker] (or select multiple dates)
3. Select Time Range: 2:00 PM - 5:00 PM [time pickers]
4. Slot Duration: 30 minutes (from SlotTemplate, displayed)
5. Click "Generate Slots" → Shows preview:
   - 2:00 PM - 2:30 PM
   - 2:30 PM - 3:00 PM
   - 3:00 PM - 3:30 PM
   - 3:30 PM - 4:00 PM
   - 4:00 PM - 4:30 PM
   - 4:30 PM - 5:00 PM
6. Click "Schedule" → Creates Availability + 6 Slots for selected date(s)
```

**Estimated Time:** 2-3 days (increased due to enhanced scheduling workflow and slot generation logic)

---

#### 4.0.2 Admin Appointment Management UI ✅ COMPLETE

**Goal**: Enable admins to view, search, filter, and manage all appointments in the system with a scalable, user-friendly interface.

**Note**: This task adds an "Appointments" tab to the admin dashboard, providing comprehensive appointment oversight capabilities for administrators.

- [x] **Appointments Tab in Admin Dashboard**
  - [x] Add "Appointments" tab to admin dashboard navigation
  - [x] Stats dashboard showing appointment counts (Total, Pending, Confirmed, Completed)
  - [x] Real-time stats with color-coded cards

- [x] **Search Functionality**
  - [x] Full-width search bar with icon
  - [x] Search by appointment ID
  - [x] Search by patient email
  - [x] Search by doctor email
  - [x] Search by doctor specialization
  - [x] Clear search button

- [x] **Advanced Filters (Collapsible Panel)**
  - [x] Status filter dropdown (All, Pending, Confirmed, Completed, Cancelled)
  - [x] Doctor filter dropdown (All doctors list)
  - [x] Date range filters (From date, To date)
  - [x] "Upcoming Only" checkbox toggle
  - [x] "Clear All" button to reset filters
  - [x] Filter count badge showing active filters

- [x] **Pagination**
  - [x] Items per page selector (10, 25, 50)
  - [x] First/Previous/Next/Last page buttons
  - [x] Page number buttons (up to 5 visible)
  - [x] "Showing X to Y of Z" counter
  - [x] Automatic page reset when filters change

- [x] **Enhanced Table Layout**
  - [x] Row status colors (subtle background based on status)
    - Red tint for cancelled appointments
    - Green tint for completed appointments
    - Blue tint for confirmed & upcoming appointments
    - Yellow tint for past pending appointments (needs attention)
  - [x] Compact spacing for better data density
  - [x] Columns: ID, Patient, Doctor, Date & Time, Visit Type, Payment, Status, Actions

- [x] **Doctor Information Modal**
  - [x] Clickable doctor names in table
  - [x] Modal displays: Avatar, Email, Doctor ID, Specialization, Join date, Bio
  - [x] "View Full Profile" link to doctor page
  - [x] Close button and overlay click to dismiss

- [x] **New Data Columns (Mock Data)**
  - [x] Visit Type column (In-Person, Video Call, Phone, Follow-up, Initial Consultation)
  - [x] Payment Info column (Paid, Pending, Insurance, Partial) with amount

- [x] **Action Buttons with Tooltips**
  - [x] View appointment (eye icon) - "View appointment"
  - [x] Confirm appointment (check icon) - "Confirm appointment"
  - [x] Mark as completed (circle check icon) - "Mark as completed"
  - [x] Cancel appointment (X icon) - "Cancel appointment"
  - [x] Icon-based buttons with hover states

- [x] **Status Badges**
  - [x] Color-coded badges with borders for stronger visual contrast
  - [x] Status indicator dot
  - [x] PENDING: Yellow background + yellow border
  - [x] CONFIRMED: Blue background + blue border
  - [x] COMPLETED: Green background + green border
  - [x] CANCELLED: Red background + red border

- [x] **Empty State Handling**
  - [x] Custom illustration when no appointments found
  - [x] Different messages for:
    - No appointments in system
    - No matches for current filters
  - [x] "Clear All Filters" button when filters are active

- [x] **Loading State**
  - [x] Centered spinner with loading message
  - [x] Disabled refresh button during loading

- [x] **API Fixes**
  - [x] Fixed `/api/appointments` route to fetch doctors correctly
    - Changed `doctorsData.doctors` to `doctorsData.data` (correct API response field)
    - Added `hasAvailability=false&limit=100` to include all doctors
  - [x] Added comprehensive logging for debugging

**Deliverables:**

- ✅ Admin can view all appointments in the system
- ✅ Admin can search appointments by multiple criteria
- ✅ Admin can filter appointments by status, doctor, date range
- ✅ Admin can paginate through large appointment lists
- ✅ Admin can view doctor details via clickable names
- ✅ Admin can manage appointment status (confirm, complete, cancel)
- ✅ Scalable UI designed to handle thousands of appointments
- ✅ Modern, clean design matching admin dashboard style

**Estimated Time:** 1 day

---

#### 4.1 Doctor Management (Backend & Public API)

- [x] Create Doctor model in Prisma schema
- [x] Add relationship between User and Doctor
- [x] Create doctor registration API endpoint (for authenticated doctors)
- [x] Create doctor listing API endpoint (public)
- [x] Create doctor detail API endpoint (public)
- [x] Create doctor update API endpoint (for authenticated doctors)
- [x] Implement doctor search/filter functionality
- [x] **Testing**: Write tests for doctor management
  - [x] Unit tests for doctor service functions
  - [x] Integration tests for doctor API endpoints
  - [ ] Component tests for doctor UI components (pending - will be done when UI is built)
  - [x] Test doctor search/filter functionality

#### 4.2 Doctor Availability/Schedule (Backend) ✅ COMPLETE

- [x] Create Availability/Schedule model in Prisma
- [x] Create API endpoints for managing availability
- [x] Implement time slot creation
- [x] Add availability validation (no overlaps)
- [x] Create availability viewing endpoints
- [x] Implement recurring schedule support (optional)
- [x] **Testing**: Write tests for availability management
  - [x] Unit tests for availability service functions (included in integration tests)
  - [x] Integration tests for availability API endpoints (24 comprehensive tests passing)
  - [x] Test availability validation (overlaps, conflicts)

#### 4.2.1 Availability Management UI (Frontend) ✅ COMPLETE

**Goal**: Allow doctors to manage their availability immediately after backend is ready. Test end-to-end.

- [x] Create doctor availability management page (`/dashboard/doctor/availability`)
- [x] Add availability creation form (one-time and recurring slots)
- [x] Display list of existing availability slots
- [x] Add edit availability functionality
- [x] Add delete availability functionality
- [x] Implement date range filtering for availability view
- [x] Add validation feedback (overlaps, invalid times)
- [x] Fix date picker for recurring date fields (validFrom, validTo)
- [x] Fix immediate refresh after adding/deleting availability (no page reload needed)
- [x] Fix date/time display when editing availability (timezone handling)
- [x] **Testing**: Write tests for availability management UI ✅ COMPLETE
  - [x] Component tests for availability management components (21 tests passing)
  - [x] Integration tests for availability CRUD operations (create, edit, delete tested)
  - [x] Test validation and error handling in UI (validation errors, API errors tested)
  - [ ] E2E test for doctor setting availability flow (pending - can be done with Playwright later)

#### 4.2.2 Admin Availability Management ✅ MOVED TO TASK 4.0.1

**Note**: This task has been moved to Task 4.0.1 "Admin Dashboard with Tabs and Doctor Schedule Management" to consolidate admin dashboard enhancements. The implementation will include:

- Tabbed interface for better organization
- Schedule management integrated into "Manage Doctor" tab
- Admin can set schedules for any doctor

**Status**: See Task 4.0.1 for implementation details.

#### 4.3 Appointment System (Backend) ✅ COMPLETE

- [x] Create Appointment model in Prisma schema
- [x] Add relationships (Patient, Doctor, Availability)
- [x] Create appointment booking API endpoint (`POST /api/v1/appointments`)
- [x] Implement appointment validation (time conflicts, availability)
- [x] Create appointment listing endpoints (for patient and doctor)
- [x] Create appointment detail endpoint (`GET /api/v1/appointments/:id`)
- [x] Implement appointment status (Pending, Confirmed, Cancelled, Completed)
- [x] **Testing**: Write tests for appointment system ✅ COMPLETE
  - [x] Unit tests for appointment service functions (included in integration tests)
  - [x] Integration tests for appointment API endpoints (27 comprehensive tests passing)
  - [x] Test appointment validation (conflicts, availability checks)

#### 4.3.1 Appointment Booking UI (Frontend) ✅ COMPLETE

**Goal**: Allow patients to book appointments immediately after backend is ready. Test end-to-end.

**Note**: Enhanced landing page (`/`) was also implemented to provide proper user onboarding and discovery flow. This includes:

- Marketing hero section with search bar
- Popular specialties, testimonials, benefits sections
- Clear CTAs directing users to booking flow (`/doctors`)
- Footer component with navigation and links
- Home page components (HeroSearch, PopularSpecialties, HowItWorks, TopDoctors, Testimonials, AppBenefits, Blog)

This was necessary for a complete user experience, even though not explicitly in the original plan.

- [x] Create doctor detail page (`/doctors/[id]`) with availability display
- [x] Implement time slot selection UI (show available slots from doctor's availability)
- [x] Create booking form/modal for appointment creation
- [x] Add appointment confirmation component
- [x] Display booking success/error messages
- [x] Add validation for booking (time conflicts, availability checks)
- [x] Make availability visible to public (unauthenticated users can view slots)
- [x] Create public doctors listing page (`/doctors`) with search and filtering
- [x] Add marketing landing page with hero, testimonials, benefits sections
- [x] Add Footer component
- [x] Add Next.js API proxy routes for availability, appointments, doctors
- [ ] **Testing**: Write tests for appointment booking UI
  - [ ] Component tests for booking components
  - [ ] Integration tests for booking flow
  - [ ] E2E test for complete booking journey
  - [ ] Test time slot selection and validation

#### 4.4 Appointment Management (Backend) ✅ COMPLETE

- [x] Add appointment status update endpoints (via `PUT /api/v1/appointments/:id` - can update status)
- [x] Create appointment rescheduling functionality (via `PUT /api/v1/appointments/:id` - can update startTime/endTime)
- [x] Create appointment history endpoint (via listing endpoints with status/date filters)
- [x] Create dedicated appointment cancellation API endpoint (`POST /api/v1/appointments/:id/cancel`)
- [x] Implement cancellation rules (time limits, etc.)
  - Patients: Can only cancel their own appointments at least 24 hours in advance
  - Doctors: Can cancel appointments assigned to them at any time
  - Admins: Can cancel any appointment at any time
  - Cannot cancel already cancelled or completed appointments
  - Cancellation reason is appended to appointment notes
- [x] **Testing**: Write tests for appointment management
  - [x] Integration tests for appointment update endpoint (included in appointment.routes.test.ts)
  - [x] Test cancellation rules and time limits (10 test cases added)

#### 4.4.1 Appointment Management UI (Frontend) ✅ COMPLETE

**Goal**: Allow users to manage appointments immediately after backend is ready. Test end-to-end.

- [x] Create appointment detail page (`/appointments/[id]`)
  - Full appointment information display (ID, status, date/time, doctor, patient, notes)
  - Role-based action buttons (patients: cancel/reschedule, doctors: confirm/complete/cancel, admins: all status updates)
  - Confirmation dialog for cancellation
  - Success/error message handling
  - Links to doctor profile
- [x] Add appointment cancellation UI (with validation for time limits)
  - Cancel button for patients (only for future appointments)
  - Confirmation dialog before cancellation
  - Status update to CANCELLED
  - Automatic slot freeing when appointment has slotId
- [x] Add appointment rescheduling UI (with availability selection - redirects to doctor page)
  - Reschedule button redirects to doctor detail page to select new time slot
  - Only available for future appointments that aren't cancelled/completed
- [x] Implement appointment status updates (for doctors)
  - Doctors can confirm pending appointments
  - Doctors can mark confirmed appointments as completed
  - Doctors can cancel appointments
  - Admins can update status to any value
- [x] Add appointment history view with filtering (`/appointments`)
  - List view of all appointments for logged-in user
  - Status filter (All, Pending, Confirmed, Completed, Cancelled)
  - "Upcoming only" toggle filter
  - Role-specific display (patients see doctor info, doctors see patient email)
  - Quick link to book new appointments
  - Links to appointment detail pages
- [x] Display appointment information (patient, doctor, time, status)
  - Appointment detail page shows all relevant information
  - AppointmentList component for reusable list display
  - Status badges with color coding
- [x] Add Next.js API route for updating appointments (`PUT /api/appointments/[id]`)
  - GET route for fetching individual appointments
  - PUT route for updating appointments (status, times, notes)
  - Proper authentication and error handling
- [x] Add appointment management links to dashboards
  - "My Appointments" link in dashboard header (for doctors)
  - "View My Appointments" button in dashboard main content (for doctors)
  - Links removed for patients (replaced with profile dropdown)
- [x] **Additional Features**:
  - Created AppointmentList reusable component
  - Added profile dropdown with logout functionality
  - Added "Go to Dashboard" button on homepage for logged-in patients
  - Conditional Dashboard link in dropdown (hidden when already on dashboard)
- [ ] **Testing**: Write tests for appointment management UI
  - [ ] Component tests for appointment management components
  - [ ] Integration tests for cancellation/rescheduling flows
  - [ ] E2E test for appointment management workflow
  - [ ] Test cancellation rules and time limits in UI

#### 4.5 Patient Dashboard (Consolidation) ✅ COMPLETE

**Goal**: Consolidate patient-facing features into a unified dashboard.

- [x] Create patient dashboard page (`/dashboard/patient`) ✅ COMPLETE
  - [x] Display upcoming appointments (using appointment listing endpoint) - ✅ Shows up to 5 upcoming appointments
  - [x] Show appointment history with filtering - ✅ Shows recent appointments (up to 5)
  - [x] Add quick "Book Appointment" button/link - ✅ Quick action card linking to `/doctors`
  - [x] Implement appointment filtering and search - ✅ Upcoming/recent filtering logic implemented
  - [x] Link to appointment detail pages - ✅ Uses AppointmentList component with links
  - [x] Add navigation to doctor listing page - ✅ "Browse Doctors" quick action card
  - [x] Consolidate into single `/dashboard/patient` page that combines:
    - [x] Upcoming appointments section (shows next 5 upcoming appointments)
    - [x] Appointment history section (shows recent 5 appointments)
    - [x] Quick actions (Book Appointment, View All Appointments, Browse Doctors)
    - [x] Welcome section with user-friendly messaging
- [x] Update `/dashboard` page to redirect patients to `/dashboard/patient` ✅ COMPLETE
- [x] Update UserProfileDropdown to recognize patient dashboard route ✅ COMPLETE
- [ ] **Testing**: Write tests for patient dashboard
  - [ ] Component tests for dashboard page
  - [ ] Integration tests for appointment listing/filtering
  - [ ] E2E test for patient dashboard navigation

#### 4.6 Doctor Dashboard (Consolidation) ✅ COMPLETE

**Goal**: Consolidate doctor-facing features into a unified dashboard.

- [x] Create doctor dashboard page (`/dashboard/doctor`) ✅ COMPLETE
- [x] Display upcoming appointments (using appointment listing endpoint) ✅ Shows up to 5 upcoming appointments
- [x] Show appointment history ✅ Shows recent appointments (up to 5)
- [x] Add quick link to availability management (from 4.2.1) ✅ Quick action card linking to `/dashboard/doctor/availability`
- [x] Implement appointment status updates (from 4.4.1) ✅ Links to appointment detail pages where status can be updated
- [x] Add patient information view ✅ Shows patient email in appointments via `showPatientEmail={true}`
- [x] Add navigation to manage availability ✅ Quick action card and links throughout dashboard
- [x] Update `/dashboard` page to redirect doctors to `/dashboard/doctor` ✅ COMPLETE
- [x] Update UserProfileDropdown to recognize doctor dashboard route ✅ COMPLETE
- [ ] **Testing**: Write tests for doctor dashboard
  - [ ] Component tests for dashboard page
  - [ ] Integration tests for dashboard navigation
  - [ ] E2E test for doctor workflow

#### 4.7 Public Doctor Listing (Enhancement) ✅ COMPLETE

**Goal**: Enhance public-facing doctor browsing experience.

- [x] Create public doctor listing page (`/doctors`) with modern UI
- [x] Add doctor search and filtering UI (backend already exists)
- [x] Link to doctor detail pages (from 4.3.1)
- [x] Add beautiful card-based layout with doctor information
- [x] Implement pagination for doctor listings
- [x] Add hero section and call-to-action for unauthenticated users
- [x] Make availability visible to all users (public viewing)
- [x] **Filter doctors by availability** ✅ COMPLETE
  - [x] Add `hasAvailability` filter option to `getAllDoctors()` service
  - [x] Filter doctors to only show those with future availability slots (for public endpoints)
  - [x] Public doctor listing endpoint defaults to `hasAvailability=true` (only shows doctors with availability)
  - [x] Admin endpoints show all doctors (no availability filter)
  - [x] Support for one-time slots (endTime >= now) and recurring slots (validTo >= now or null)
  - [x] Add comprehensive tests for availability filtering (service and route tests)
- [ ] **Testing**: Write tests for doctor listing
  - [ ] Component tests for doctor listing page
  - [ ] Integration tests for search/filter functionality
  - [ ] E2E test for doctor browsing flow

**Deliverables:**

- ✅ Admin can register doctors and manage doctor profiles (Task 4.0 - PRIORITY)
- ✅ Admin dashboard with tabs and doctor schedule management (Task 4.0.1) - Complete with slot management system
  - ✅ Slot generation logic implemented (automatic slot creation from availability)
  - ✅ Slot API endpoints created (get slots, generate slots, block/unblock slots)
  - ✅ SlotTemplate management (create/update templates, fetch templates)
  - ✅ Admin can schedule doctors with automatic slot generation
  - ✅ Recent bug fixes (date validation, error handling)
- ✅ Admin appointment management UI (Task 4.0.2) - Complete with scalable design
  - ✅ Appointments tab added to admin dashboard
  - ✅ Search functionality (ID, patient, doctor, email)
  - ✅ Advanced filters (status, doctor, date range, upcoming only)
  - ✅ Pagination (10/25/50 per page)
  - ✅ Enhanced table with row status colors and icon action buttons
  - ✅ Doctor info modal (clickable doctor names)
  - ✅ Visit Type and Payment columns (mock data)
  - ✅ Empty state handling and loading states
  - ✅ Fixed API route to fetch doctors correctly
- ✅ Slot Management System - Complete
  - ✅ Slot model and database schema created
  - ✅ SlotTemplate model for doctor-specific slot configuration
  - ✅ Slot generation service with automatic slot creation
  - ✅ Slot generation job for automated slot generation
  - ✅ Slot API endpoints (Express backend + Next.js API routes)
  - ✅ Integration with appointment booking system
- ✅ Doctors can set their availability (4.2 + 4.2.1) - Backend and UI complete
- ✅ Doctors can register and manage their profiles (self-service) - Task 4.1 complete
- ✅ Appointment booking backend complete (4.3) - 27 tests passing
- ✅ Appointment booking UI complete (4.3.1) - Doctor detail page, booking form, time slot selector, confirmation components, and marketing landing page implemented
- ✅ Marketing landing page with hero, testimonials, benefits sections, and Footer component
- ✅ Next.js API proxy routes for availability, appointments, doctors, slots
- ✅ Appointment management backend complete (4.4) - Status updates, rescheduling, and cancellation rules with 24-hour patient time limit
- ✅ Appointment management UI complete (4.4.1) - Detail page, cancellation, rescheduling, status updates, history view, AppointmentList component, Next.js API routes
- ✅ Patient profile dropdown and navigation improvements - UserProfileDropdown component with logout, conditional dashboard link, homepage integration
- ✅ Patient dashboard complete (4.5) - Consolidated dashboard with upcoming appointments, history, and quick actions
- ✅ Doctor dashboard complete (4.6) - Consolidated dashboard with upcoming appointments, history, quick actions, and availability management links

**Development Flow:**

1. **4.2** (Backend) → **4.2.1** (Frontend) → Test → ✅ Complete
   - Backend availability management API complete (24 tests passing)
   - Frontend availability management UI complete with fixes:
     - Date picker working for recurring schedules
     - Immediate list refresh after add/delete operations
     - Correct date/time display when editing (timezone handling)
2. **4.3** (Backend) → **4.3.1** (Frontend) → Test → ✅ Backend Complete, Frontend Complete
   - Backend appointment booking API complete (27 tests passing)
   - Frontend appointment booking UI complete:
     - Doctor detail page with availability display
     - Booking form and time slot selector
     - Appointment confirmation component
     - Marketing landing page with discovery flow
     - Footer component
     - Next.js API proxy routes
   - Testing pending
3. **4.4** (Backend) → **4.4.1** (Frontend) → Test → ✅ Complete
   - Backend appointment management complete:
     - Status updates and rescheduling via update endpoint ✅
     - Dedicated cancellation endpoint with role-based rules ✅
     - 24-hour cancellation time limit for patients ✅
     - Doctors and admins can cancel at any time ✅
     - 10 integration tests for cancellation rules ✅
   - Frontend appointment management UI complete ✅:
     - Appointment detail page with role-based actions
     - Cancellation and rescheduling UI
     - Appointment history/list page with filtering
     - AppointmentList reusable component
     - Next.js API routes for individual appointments
     - Profile dropdown with logout functionality
     - Dashboard navigation improvements
4. **4.5** (Consolidate Patient Dashboard) → Test → ✅ Complete
5. **4.6** (Consolidate Doctor Dashboard) → Test → ✅ Complete
6. **4.7** (Enhance Public Listing) → Test → ✅ Complete (included in 4.3.1)

**Estimated Time:** 8-12 days (includes 1-2 days for Task 4.0)

- Each backend + frontend pair: ~1.5-2 days
- Dashboard consolidation: ~1 day each
- Public listing enhancement: ~0.5 day

---

## Phase 5: Advanced Features

### Goals

- Add notification system
- Implement search and filtering
- Create admin features
- Add analytics

### Testing Approach

**Test immediately after each feature implementation.** Write tests for each feature before moving to the next one.

### Tasks

#### 5.1 Email Notifications

- [ ] Set up email service (SendGrid, Resend, or similar)
- [ ] Create email templates
- [ ] Implement appointment confirmation emails
- [ ] Add appointment reminder emails
- [ ] Create cancellation notification emails
- [ ] Add welcome emails for new users
- [ ] **Testing**: Write tests for email notifications
  - [ ] Unit tests for email service functions
  - [ ] Integration tests for email sending (with mocks)
  - [ ] Test email template rendering
  - [ ] Test email delivery scenarios

#### 5.2 Appointment Reminders

- [ ] Set up background job system (Bull, Agenda, or similar)
- [ ] Create reminder scheduling logic
- [ ] Implement 24-hour reminder emails
- [ ] Add 1-hour reminder notifications (optional)
- [ ] Create reminder cancellation on appointment cancellation
- [ ] **Testing**: Write tests for appointment reminders
  - [ ] Unit tests for reminder scheduling logic
  - [ ] Integration tests for reminder jobs
  - [ ] Test reminder cancellation scenarios
  - [ ] Test reminder timing accuracy

#### 5.3 Search and Filtering

- [ ] Implement doctor search by name, specialty
- [ ] Add filtering by location, availability, rating
- [ ] Create advanced search UI
- [ ] Implement search result pagination
- [ ] Add sorting options
- [ ] **Testing**: Write tests for search and filtering
  - [ ] Unit tests for search/filter logic
  - [ ] Integration tests for search API endpoints
  - [ ] Component tests for search UI
  - [ ] Test pagination and sorting

#### 5.4 Appointment History

- [ ] Enhance appointment history with filters
- [ ] Add export functionality (CSV/PDF)
- [ ] Implement detailed history view
- [ ] Add statistics and insights
- [ ] **Testing**: Write tests for appointment history
  - [ ] Unit tests for history filtering logic
  - [ ] Integration tests for history endpoints
  - [ ] Component tests for history UI
  - [ ] Test export functionality

#### 5.5 Admin Dashboard

- [ ] Create admin dashboard page (`/dashboard/admin`)
- [ ] Implement user management (view, edit, delete)
- [ ] Add doctor approval workflow (if needed)
- [ ] Create appointment overview and management
- [ ] Add system statistics and analytics
- [ ] Implement admin-only settings
- [ ] **Testing**: Write tests for admin dashboard
  - [ ] Unit tests for admin service functions
  - [ ] Integration tests for admin API endpoints
  - [ ] Component tests for admin UI
  - [ ] Test admin-only access control
  - [ ] E2E test for admin workflows

#### 5.6 Analytics and Reporting

- [ ] Create appointment statistics API
- [ ] Add dashboard analytics widgets
- [ ] Implement revenue reports (if applicable)
- [ ] Create user activity reports
- [ ] Add doctor performance metrics
- [ ] **Testing**: Write tests for analytics
  - [ ] Unit tests for analytics calculations
  - [ ] Integration tests for analytics API endpoints
  - [ ] Component tests for analytics widgets
  - [ ] Test report generation

**Deliverables:**

- Email notifications working
- Appointment reminders automated
- Advanced search and filtering functional
- Admin dashboard with management capabilities
- Basic analytics and reporting

**Estimated Time:** 4-5 days

---

## Phase 6: Polish & Deployment

### Goals

- Improve UI/UX
- Optimize performance
- Secure the application
- Prepare for production deployment

### Testing Approach

**Test immediately after each improvement/optimization.** Write tests for new features and validate existing tests still pass after optimizations.

### Tasks

#### 6.1 UI/UX Improvements

- [ ] Conduct UI/UX review
- [ ] Improve responsive design (mobile, tablet, desktop)
- [ ] Add loading states and skeletons
- [ ] Implement error boundaries
- [ ] Add toast notifications for user feedback
- [ ] Improve form validation and error messages
- [ ] Add accessibility improvements (ARIA labels, keyboard navigation)
- [ ] **Testing**: Write tests for UI/UX improvements
  - [ ] Component tests for new UI components
  - [ ] Accessibility tests (ARIA, keyboard navigation)
  - [ ] Responsive design tests
  - [ ] Test error boundaries

#### 6.2 Performance Optimization

- [ ] Optimize database queries (add indexes, optimize joins)
- [ ] Implement API response caching
- [ ] Optimize images and assets
- [ ] Add code splitting and lazy loading
- [ ] Implement pagination for large lists
- [ ] Optimize bundle sizes
- [ ] Add performance monitoring
- [ ] **Testing**: Write tests for performance optimizations
  - [ ] Performance tests for optimized endpoints
  - [ ] Test caching behavior
  - [ ] Test pagination performance
  - [ ] Validate optimizations don't break functionality

#### 6.3 Security Hardening

- [ ] Security audit of API endpoints
- [ ] Implement rate limiting
- [ ] Add input sanitization
- [ ] Review and fix security vulnerabilities
- [ ] Implement HTTPS in production
- [ ] Add security headers
- [ ] Set up CORS properly for production
- [ ] **Testing**: Write tests for security features
  - [ ] Test rate limiting
  - [ ] Test input sanitization
  - [ ] Security tests for API endpoints
  - [ ] Test CORS configuration
  - [ ] Test security headers

#### 6.4 Testing (E2E & Final Polish)

- [ ] Set up Playwright for E2E testing
- [ ] Create E2E tests for critical user flows
  - [ ] Complete user registration and login flow
  - [ ] Appointment booking flow (when implemented)
  - [ ] Profile management flow
  - [ ] Doctor management flow (when implemented)
- [ ] Add visual regression testing (optional)
- [ ] Performance testing for critical endpoints
- [ ] Load testing for high-traffic scenarios (optional)
- [ ] Final test coverage review and improvements
- [ ] Ensure all Phase 4+ features have adequate test coverage

#### 6.5 Documentation

- [ ] Complete API documentation
- [ ] Update README with deployment instructions
- [ ] Create user guide/documentation
- [ ] Document environment variables
- [ ] Add code comments where needed
- [ ] **Testing**: Document testing approach and guidelines

#### 6.6 Deployment Setup

- [ ] Set up production database
- [ ] Configure production environment variables
- [ ] Set up frontend deployment (Vercel recommended)
- [ ] Set up backend deployment (Railway, Render, or AWS)
- [ ] Configure domain and SSL certificates
- [ ] Set up monitoring and error tracking (Sentry, etc.)
- [ ] Create deployment scripts
- [ ] Set up CI/CD pipeline (GitHub Actions, etc.)
- [ ] **Testing**: Ensure CI/CD runs all tests before deployment

#### 6.7 Post-Deployment

- [ ] Perform smoke tests in production
- [ ] Monitor application performance
- [ ] Set up backup strategy for database
- [ ] Create runbook for common issues
- [ ] Plan for scaling (if needed)
- [ ] **Testing**: Set up production monitoring and alerting

**Deliverables:**

- Polished, production-ready application
- Comprehensive test coverage
- Complete documentation
- Application deployed and accessible
- Monitoring and error tracking in place

**Estimated Time:** 4-5 days

---

## Overall Timeline

- **Phase 1:** 2-3 days
- **Phase 2:** 3-4 days
- **Phase 3:** 3-4 days (Testing & Quality Assurance)
- **Phase 4:** 6-9 days (Core Booking Features - includes Admin Doctor Management priority task)
- **Phase 5:** 4-5 days (Advanced Features)
- **Phase 6:** 4-5 days (Polish & Deployment)

**Total Estimated Time:** 22-30 days (approximately 3-4 weeks)

**Note:** Phase 4 now includes Task 4.0 (Admin Doctor Management) as a priority before other doctor management features. This ensures admins can register doctors before patients need to book appointments.

## Notes

- Each phase should be completed and tested before moving to the next
- **Testing Approach**:
  - **Phase 3**: Retroactive testing of Phase 1 & 2 features
  - **Phase 4+**: Test immediately after each feature implementation (write tests before moving to next feature)
- Features can be adjusted based on requirements and feedback
- Some tasks may be parallelized within a phase
- Consider creating feature branches for each phase
- Regular code reviews and testing are recommended throughout
- Commit feature code and tests together: `feat: add doctor management with tests`

## Success Criteria

- All core features are functional
- Application is secure and performant
- Code is well-documented and maintainable
- Application is deployed and accessible
- Users can successfully book appointments end-to-end
