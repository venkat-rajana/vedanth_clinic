# Vedanth Clinic - Appointment & Practice Management Application

## Project Overview
A production-ready, full-stack clinic management application with role-based access control for Admin, Doctor, Staff, and Patient users.

## Live Application
- **URL**: https://appointment-mgmt.preview.emergentagent.com
- **Admin Email**: venkatrajana3199@gmail.com (login with Google)

## Tech Stack
- **Frontend**: React 19, Tailwind CSS, Shadcn/UI components
- **Backend**: FastAPI (Python) with async endpoints
- **Database**: MongoDB with Motor async driver
- **Authentication**: Emergent Google OAuth + JWT sessions

## User Roles & Permissions

### Admin (venkatrajana3199@gmail.com)
- Full system access
- Manage all users (create doctors, staff, patients)
- View all appointments across the clinic
- Manage invoices
- Access all settings

### Doctor
- View own appointments only
- Update appointment status (Check In → In Progress → Complete)
- Add diagnosis and prescription notes
- Set presence status (Available, In Session, On Leave, Offline)
- View patient medical records

### Staff (Receptionist)
- Register walk-in patients
- Book appointments for any patient
- Check-in patients
- Create and manage invoices
- View today's schedule

### Patient
- Book own appointments
- View appointment history
- Access medical records
- View and download invoices

## Features Implemented

### Authentication
- [x] Emergent Google OAuth integration
- [x] Session management with 30-min timeout
- [x] Role-based route protection
- [x] Secure cookie-based sessions

### Appointment Management
- [x] 3-step booking wizard (Doctor → Date/Time → Details)
- [x] Slot picker grid with availability check
- [x] Conflict detection (prevents double-booking)
- [x] Appointment status flow: Scheduled → Checked In → In Progress → Completed
- [x] Video/In-Person/Follow-up appointment types
- [x] Duration selection (15, 30, 45, 60 mins)

### Patient Management
- [x] Staff can register walk-in patients
- [x] Patient search by name, email, phone
- [x] Quick booking from patient list
- [x] Patient profile with contact details

### Medical Records
- [x] View diagnosis history
- [x] Prescription records
- [x] Lab results tracking
- [x] Expandable record cards

### Billing & Invoices
- [x] Create invoices for completed appointments
- [x] Add multiple line items
- [x] Invoice status (Pending, Paid, Waived)
- [x] PDF generation and download
- [x] Patient invoice history

### Doctor Features
- [x] Presence indicator control
- [x] Real-time status updates
- [x] Today's schedule view
- [x] Add diagnosis/prescription on completion

### Video Appointments
- [x] Placeholder UI for video calls
- [x] Camera/microphone toggle controls
- [x] Chat panel placeholder
- **Note**: Actual WebRTC not implemented

## How to Use

### First Time Setup
1. Go to the application URL
2. Click "Sign In with Google"
3. Login with your admin email (venkatrajana3199@gmail.com)
4. You'll see the Admin Dashboard

### Creating Staff/Doctors
1. Go to "User Management" in sidebar
2. Click "Add User"
3. Enter name, email, select role (Doctor/Staff)
4. For doctors, add specialization
5. Save - they can now login with Google using that email

### Staff Registering Patients
1. Login as Staff
2. Go to "Patients" in sidebar
3. Click "Register New Patient"
4. Enter patient details (name, email required)
5. Patient can later login with Google using same email

### Booking Appointments
1. Go to "Book Appointment"
2. Select a doctor
3. Choose date and available time slot
4. Select appointment type and duration
5. Confirm booking

### Managing Appointments (Staff/Doctor)
1. Go to "Appointments" or "Today's Schedule"
2. Use dropdown menu on each appointment:
   - Check In (when patient arrives)
   - Start Session (begin consultation)
   - Complete & Add Notes (finish with diagnosis)
   - Cancel Appointment

## API Endpoints

### Authentication
- `POST /api/auth/session` - Exchange OAuth session
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout

### Users
- `GET /api/users` - List users (admin/staff)
- `POST /api/users` - Create user (admin: any, staff: patients only)
- `GET /api/users/{id}` - Get user details
- `PUT /api/users/{id}` - Update user

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
- `GET /api/invoices/{id}` - Get invoice details
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
1. Video calls are placeholder UI only (no WebRTC)
2. No email/SMS notifications yet
3. No data export functionality yet
4. No dark mode

## Future Enhancements
1. AI Assistant integration (Vedanth AI)
2. Real WebRTC video consultations
3. Email/SMS appointment reminders
4. Weekly calendar grid view
5. Data export (CSV/JSON)
6. Analytics dashboard
