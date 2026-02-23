# Vedanth Clinic - Appointment & Practice Management Application

## Project Overview
A production-ready, full-stack clinic management application with role-based access control for Admin, Doctor, Staff, and Patient users.

## Live Application
- **URL**: https://appointment-mgmt.preview.emergentagent.com
- **Admin Email**: venkatrajana3199@gmail.com (login with Google)

## Tech Stack
- **Frontend**: React 19, Tailwind CSS, Shadcn/UI components, jsPDF
- **Backend**: FastAPI (Python) with async endpoints
- **Database**: MongoDB with Motor async driver
- **Authentication**: Emergent Google OAuth + JWT sessions

## User Roles & Permissions

### Admin (venkatrajana3199@gmail.com)
- Full system access
- Manage all users (create, edit doctors, staff, patients)
- View all appointments across the clinic
- Weekly schedule calendar view
- Manage invoices
- Access all settings

### Doctor
- View own appointments
- Weekly schedule calendar view (own appointments)
- Update appointment status (Check In -> In Progress -> Complete)
- Add diagnosis and prescription notes
- Set presence status (Available, In Session, On Leave, Offline)
- View patient medical records

### Staff (Receptionist)
- Register walk-in patients
- Book appointments for any patient
- Weekly schedule calendar view
- Check-in patients
- Create and manage invoices
- View today's schedule

### Patient
- Book own appointments
- View appointment history
- Access medical records
- View and download invoices (PDF)

## Features Implemented

### Authentication
- [x] Emergent Google OAuth integration
- [x] Session management with 7-day expiry
- [x] Role-based route protection
- [x] Secure cookie-based sessions

### Appointment Management
- [x] 3-step booking wizard (Doctor -> Date/Time -> Details)
- [x] Slot picker grid with availability check
- [x] Conflict detection (prevents double-booking)
- [x] Appointment status flow: Scheduled -> Checked In -> In Progress -> Completed
- [x] Video/In-Person/Follow-up appointment types
- [x] Duration selection (15, 30, 45, 60 mins)

### Schedule Calendar (Teams-like)
- [x] Weekly calendar grid view (7AM-8PM, Mon-Sun)
- [x] Color-coded appointments by status
- [x] Week navigation (previous/next/today)
- [x] Doctor filter for admin/staff
- [x] Click appointment to view details dialog
- [x] Navigate to full appointment detail from dialog
- [x] Status legend

### Patient Management
- [x] Staff can register walk-in patients
- [x] Patient search by name, email, phone
- [x] Quick booking from patient list
- [x] Patient profile with contact details

### User Management
- [x] Create users (admin: any role, staff: patients only)
- [x] Edit user details (name, phone, specialization, address)
- [x] Activate/deactivate users
- [x] Role-based filtering and search

### Medical Records
- [x] View diagnosis history
- [x] Prescription records
- [x] Lab results tracking
- [x] Expandable record cards

### Billing & Invoices
- [x] Create invoices for completed appointments
- [x] Add multiple line items
- [x] Invoice status (Pending, Paid, Waived)
- [x] PDF generation and download (jsPDF)
- [x] Patient invoice history

### Doctor Features
- [x] Presence indicator control
- [x] Real-time status updates
- [x] Today's schedule view
- [x] Add diagnosis/prescription on completion

## API Endpoints

### Authentication
- `POST /api/auth/session` - Exchange OAuth session
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout

### Users
- `GET /api/users` - List users (admin/staff)
- `POST /api/users` - Create user
- `GET /api/users/{id}` - Get user details
- `PUT /api/users/{id}` - Update user details

### Doctors
- `GET /api/doctors` - List active doctors
- `PUT /api/doctors/{id}/presence` - Update presence status

### Appointments
- `GET /api/appointments` - List appointments (filtered by role)
- `POST /api/appointments` - Create appointment
- `GET /api/appointments/{id}` - Get appointment details
- `PUT /api/appointments/{id}` - Update appointment (optimistic locking)
- `DELETE /api/appointments/{id}` - Cancel appointment
- `GET /api/appointments/slots/{doctor_id}/{date}` - Get available slots

### Medical Records
- `GET /api/medical-records` - List records
- `POST /api/medical-records` - Create record (doctor only)

### Invoices
- `GET /api/invoices` - List invoices
- `POST /api/invoices` - Create invoice (staff only)
- `GET /api/invoices/{id}` - Get invoice with full details
- `PUT /api/invoices/{id}/status` - Update status

### Other
- `GET /api/stats/dashboard` - Role-specific dashboard stats
- `POST /api/seed` - Seed test data

## Database Collections
- `users` - All user accounts
- `user_sessions` - Active sessions
- `appointments` - Appointment records
- `medical_records` - Patient medical history
- `invoices` - Billing records
- `audit_logs` - Action audit trail

## Known Limitations
1. Video calls are placeholder UI only (no WebRTC) - excluded per user request
2. No email/SMS notifications
3. No data export functionality
4. No dark mode

## Future Enhancements (Backlog)
1. Email/SMS appointment reminders
2. Data export (CSV/JSON)
3. Analytics dashboard
4. Dark mode
5. AI Assistant integration
