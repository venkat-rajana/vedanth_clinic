"""
Iteration 5 Tests - Vedanth Clinic
Tests for fixes:
1. Doctor role can now access GET /api/users?role=patient (was 403 before)
2. Settings page profile update via PUT /api/users/{user_id}
3. Dashboard stats endpoints for all roles
4. All sidebar links accessible without 403 for each role
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test sessions created for each role
ADMIN_TOKEN = "2aCLGsg5mZngrvE6OJ7OCJdi86NZ-OlQFJ5uWF0Qyko"
DOCTOR_TOKEN = "doctor_test_session_fixed"
STAFF_TOKEN = "staff_test_session_iter5"
PATIENT_TOKEN = "patient_test_session_iter5"

@pytest.fixture
def admin_client():
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {ADMIN_TOKEN}"
    })
    return session

@pytest.fixture
def doctor_client():
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {DOCTOR_TOKEN}"
    })
    return session

@pytest.fixture
def staff_client():
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {STAFF_TOKEN}"
    })
    return session

@pytest.fixture
def patient_client():
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {PATIENT_TOKEN}"
    })
    return session


class TestDoctorPatientsAccess:
    """Critical Fix: Doctor should now be able to access GET /api/users?role=patient"""
    
    def test_doctor_can_access_patients_list(self, doctor_client):
        """Doctor GET /api/users?role=patient should return 200 with patient data (was 403 before fix)"""
        response = doctor_client.get(f"{BASE_URL}/api/users?role=patient")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list of patients"
        
        # Verify all returned users are patients
        for user in data:
            assert user["role"] == "patient", f"Doctor should only see patients, got {user['role']}"
    
    def test_doctor_cannot_access_other_roles(self, doctor_client):
        """Doctor should only get patients even if requesting other roles"""
        # Even if doctor requests ?role=admin, they should only get patients
        response = doctor_client.get(f"{BASE_URL}/api/users?role=admin")
        assert response.status_code == 200
        data = response.json()
        # Should return empty or only patients due to backend restriction
        for user in data:
            assert user["role"] == "patient", "Doctor should only see patients"
    
    def test_doctor_without_role_filter_gets_patients_only(self, doctor_client):
        """Doctor GET /api/users (no filter) should only return patients"""
        response = doctor_client.get(f"{BASE_URL}/api/users")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        for user in data:
            assert user["role"] == "patient", "Doctor should only see patients"


class TestSettingsProfileUpdate:
    """Settings page profile update via PUT /api/users/{user_id}"""
    
    def test_user_can_update_own_profile(self, doctor_client):
        """Doctor can update their own profile name, phone, address"""
        # First get current user info
        me_response = doctor_client.get(f"{BASE_URL}/api/auth/me")
        assert me_response.status_code == 200
        user = me_response.json()
        user_id = user["user_id"]
        
        # Update profile
        update_data = {
            "name": "Dr. Priya Sharma",
            "phone": "+91 98765 99999",
            "address": "Updated Test Address"
        }
        response = doctor_client.put(f"{BASE_URL}/api/users/{user_id}", json=update_data)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Verify update
        updated = response.json()
        assert updated["name"] == update_data["name"]
        assert updated["phone"] == update_data["phone"]
    
    def test_patient_can_update_own_profile(self, patient_client):
        """Patient can update their own profile"""
        me_response = patient_client.get(f"{BASE_URL}/api/auth/me")
        assert me_response.status_code == 200
        user = me_response.json()
        user_id = user["user_id"]
        
        update_data = {
            "name": "Anita Desai",
            "phone": "+91 98765 43213",
            "address": "123 MG Road, Bangalore"
        }
        response = patient_client.put(f"{BASE_URL}/api/users/{user_id}", json=update_data)
        assert response.status_code == 200
    
    def test_user_cannot_update_others_profile(self, doctor_client):
        """Doctor cannot update another user's profile (except admin can)"""
        # Try to update patient profile as doctor
        response = doctor_client.put(f"{BASE_URL}/api/users/user_patient001", json={
            "name": "Hacked Name"
        })
        assert response.status_code == 403, "Doctor should not be able to update other user's profile"


class TestDashboardStats:
    """Dashboard stats endpoints for all roles"""
    
    def test_admin_dashboard_stats(self, admin_client):
        """Admin gets full dashboard stats"""
        response = admin_client.get(f"{BASE_URL}/api/stats/dashboard")
        assert response.status_code == 200
        
        data = response.json()
        assert "total_patients" in data
        assert "total_doctors" in data
        assert "today_appointments" in data
        assert "pending_invoices" in data
    
    def test_doctor_dashboard_stats(self, doctor_client):
        """Doctor gets their own dashboard stats"""
        response = doctor_client.get(f"{BASE_URL}/api/stats/dashboard")
        assert response.status_code == 200
        
        data = response.json()
        assert "total_appointments" in data
        assert "today_appointments" in data
        assert "total_patients" in data
    
    def test_staff_dashboard_stats(self, staff_client):
        """Staff gets their dashboard stats"""
        response = staff_client.get(f"{BASE_URL}/api/stats/dashboard")
        assert response.status_code == 200
        
        data = response.json()
        assert "today_appointments" in data
        assert "pending_checkins" in data
        assert "pending_invoices" in data
    
    def test_patient_dashboard_stats(self, patient_client):
        """Patient gets their dashboard stats"""
        response = patient_client.get(f"{BASE_URL}/api/stats/dashboard")
        assert response.status_code == 200
        
        data = response.json()
        assert "total_appointments" in data
        assert "upcoming_appointments" in data


class TestSidebarEndpointsDoctor:
    """Doctor sidebar links: Dashboard, Schedule, My Appointments, My Patients, Medical Records, Settings"""
    
    def test_doctor_can_access_appointments(self, doctor_client):
        """Doctor can access /api/appointments (My Appointments)"""
        response = doctor_client.get(f"{BASE_URL}/api/appointments")
        assert response.status_code == 200
    
    def test_doctor_can_access_doctors_for_schedule(self, doctor_client):
        """Doctor can access /api/doctors for schedule filter"""
        response = doctor_client.get(f"{BASE_URL}/api/doctors")
        assert response.status_code == 200
    
    def test_doctor_can_access_medical_records(self, doctor_client):
        """Doctor can access /api/medical-records"""
        response = doctor_client.get(f"{BASE_URL}/api/medical-records")
        assert response.status_code == 200


class TestSidebarEndpointsStaff:
    """Staff sidebar links: Dashboard, Schedule, Book Appointment, Today's Schedule, Billing, Patients, Settings"""
    
    def test_staff_can_access_patients(self, staff_client):
        """Staff can access /api/users?role=patient (Patients)"""
        response = staff_client.get(f"{BASE_URL}/api/users?role=patient")
        assert response.status_code == 200
    
    def test_staff_can_access_appointments(self, staff_client):
        """Staff can access /api/appointments"""
        response = staff_client.get(f"{BASE_URL}/api/appointments")
        assert response.status_code == 200
    
    def test_staff_can_access_invoices(self, staff_client):
        """Staff can access /api/invoices (Billing)"""
        response = staff_client.get(f"{BASE_URL}/api/invoices")
        assert response.status_code == 200
    
    def test_staff_can_access_doctors(self, staff_client):
        """Staff can access /api/doctors for booking"""
        response = staff_client.get(f"{BASE_URL}/api/doctors")
        assert response.status_code == 200


class TestSidebarEndpointsAdmin:
    """Admin sidebar links: Dashboard, Schedule, User Management, All Appointments, Invoices, Settings"""
    
    def test_admin_can_access_all_users(self, admin_client):
        """Admin can access /api/users (User Management)"""
        response = admin_client.get(f"{BASE_URL}/api/users")
        assert response.status_code == 200
        
        data = response.json()
        roles = set(user["role"] for user in data)
        # Admin should be able to see multiple roles
        assert len(roles) > 1, "Admin should see users of various roles"
    
    def test_admin_can_access_appointments(self, admin_client):
        """Admin can access /api/appointments"""
        response = admin_client.get(f"{BASE_URL}/api/appointments")
        assert response.status_code == 200
    
    def test_admin_can_access_invoices(self, admin_client):
        """Admin can access /api/invoices"""
        response = admin_client.get(f"{BASE_URL}/api/invoices")
        assert response.status_code == 200


class TestSidebarEndpointsPatient:
    """Patient sidebar links: Dashboard, Book Appointment, My Appointments, Medical History, My Invoices, Settings"""
    
    def test_patient_can_access_own_appointments(self, patient_client):
        """Patient can access /api/appointments (filtered to their own)"""
        response = patient_client.get(f"{BASE_URL}/api/appointments")
        assert response.status_code == 200
    
    def test_patient_can_access_own_medical_records(self, patient_client):
        """Patient can access /api/medical-records (filtered to their own)"""
        response = patient_client.get(f"{BASE_URL}/api/medical-records")
        assert response.status_code == 200
    
    def test_patient_can_access_own_invoices(self, patient_client):
        """Patient can access /api/invoices (filtered to their own)"""
        response = patient_client.get(f"{BASE_URL}/api/invoices")
        assert response.status_code == 200
    
    def test_patient_can_access_doctors_for_booking(self, patient_client):
        """Patient can access /api/doctors for booking appointments"""
        response = patient_client.get(f"{BASE_URL}/api/doctors")
        assert response.status_code == 200


class TestScheduleTimeFormat:
    """Verify schedule appointments have correct time format (09:00 not 9:00)"""
    
    def test_appointments_have_zero_padded_time(self, admin_client):
        """Appointments should have zero-padded times (09:00 not 9:00)"""
        response = admin_client.get(f"{BASE_URL}/api/appointments")
        assert response.status_code == 200
        
        data = response.json()
        for apt in data:
            start_time = apt.get("start_time", "")
            # Verify format HH:MM with zero padding
            if start_time:
                parts = start_time.split(":")
                assert len(parts) == 2, f"Time should be HH:MM format: {start_time}"
                hour, minute = parts
                assert len(hour) == 2, f"Hour should be zero-padded: {start_time}"
                assert len(minute) == 2, f"Minute should be zero-padded: {start_time}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
