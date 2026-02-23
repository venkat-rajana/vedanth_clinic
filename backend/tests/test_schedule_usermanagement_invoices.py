"""
Backend API Tests for Schedule, User Management (Edit), and Invoice features
Tests the three main features:
1. GET /api/appointments - returns appointments enriched with patient_name and doctor_name
2. PUT /api/users/{user_id} - updates user fields (Edit Details)
3. GET /api/invoices/{invoice_id} - returns invoice with patient, appointment, and doctor data
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Use the admin session token created for testing
SESSION_TOKEN = "test_session_1771862773068"

@pytest.fixture(scope="module")
def api_client():
    """Session with auth header"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {SESSION_TOKEN}"
    })
    return session


class TestAppointmentsAPI:
    """Tests for GET /api/appointments - Schedule page data"""
    
    def test_get_appointments_success(self, api_client):
        """Test that appointments endpoint returns data"""
        response = api_client.get(f"{BASE_URL}/api/appointments")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) > 0, "Should have at least one appointment"
    
    def test_appointments_enriched_with_patient_name(self, api_client):
        """Test that appointments have patient_name field"""
        response = api_client.get(f"{BASE_URL}/api/appointments")
        assert response.status_code == 200
        data = response.json()
        
        for apt in data:
            assert "patient_name" in apt, f"Appointment {apt.get('appointment_id')} missing patient_name"
            assert apt["patient_name"] is not None, "patient_name should not be None"
            assert isinstance(apt["patient_name"], str), "patient_name should be a string"
    
    def test_appointments_enriched_with_doctor_name(self, api_client):
        """Test that appointments have doctor_name field"""
        response = api_client.get(f"{BASE_URL}/api/appointments")
        assert response.status_code == 200
        data = response.json()
        
        for apt in data:
            assert "doctor_name" in apt, f"Appointment {apt.get('appointment_id')} missing doctor_name"
            assert apt["doctor_name"] is not None, "doctor_name should not be None"
            assert isinstance(apt["doctor_name"], str), "doctor_name should be a string"
    
    def test_appointments_enriched_with_doctor_specialization(self, api_client):
        """Test that appointments have doctor_specialization field"""
        response = api_client.get(f"{BASE_URL}/api/appointments")
        assert response.status_code == 200
        data = response.json()
        
        for apt in data:
            assert "doctor_specialization" in apt, f"Appointment {apt.get('appointment_id')} missing doctor_specialization"
    
    def test_appointments_have_required_fields(self, api_client):
        """Test that appointments contain all required fields for schedule grid"""
        response = api_client.get(f"{BASE_URL}/api/appointments")
        assert response.status_code == 200
        data = response.json()
        
        required_fields = ["appointment_id", "patient_id", "doctor_id", "date", "start_time", 
                          "duration", "appointment_type", "status", "patient_name", "doctor_name"]
        
        for apt in data[:3]:  # Check first 3 appointments
            for field in required_fields:
                assert field in apt, f"Appointment missing required field: {field}"
    
    def test_appointments_filter_by_doctor(self, api_client):
        """Test filtering appointments by doctor_id"""
        response = api_client.get(f"{BASE_URL}/api/appointments?doctor_id=user_doctor001")
        assert response.status_code == 200
        data = response.json()
        
        for apt in data:
            assert apt["doctor_id"] == "user_doctor001", "All appointments should be for specified doctor"


class TestUserManagementEditAPI:
    """Tests for PUT /api/users/{user_id} - Edit Details functionality"""
    
    def test_update_user_name(self, api_client):
        """Test updating user name"""
        # First get original user data
        original_response = api_client.get(f"{BASE_URL}/api/users/user_patient001")
        assert original_response.status_code == 200
        original_name = original_response.json()["name"]
        
        # Update name
        new_name = "TEST_Updated Anita Desai"
        update_response = api_client.put(
            f"{BASE_URL}/api/users/user_patient001",
            json={"name": new_name}
        )
        assert update_response.status_code == 200
        updated_data = update_response.json()
        assert updated_data["name"] == new_name, "Name should be updated"
        
        # Verify via GET
        verify_response = api_client.get(f"{BASE_URL}/api/users/user_patient001")
        assert verify_response.json()["name"] == new_name, "Name change should persist"
        
        # Restore original name
        api_client.put(f"{BASE_URL}/api/users/user_patient001", json={"name": original_name})
    
    def test_update_user_phone(self, api_client):
        """Test updating user phone"""
        original_response = api_client.get(f"{BASE_URL}/api/users/user_patient001")
        original_phone = original_response.json().get("phone", "")
        
        new_phone = "+91 99999 12345"
        update_response = api_client.put(
            f"{BASE_URL}/api/users/user_patient001",
            json={"phone": new_phone}
        )
        assert update_response.status_code == 200
        assert update_response.json()["phone"] == new_phone
        
        # Verify persistence
        verify_response = api_client.get(f"{BASE_URL}/api/users/user_patient001")
        assert verify_response.json()["phone"] == new_phone
        
        # Restore
        api_client.put(f"{BASE_URL}/api/users/user_patient001", json={"phone": original_phone})
    
    def test_update_user_address(self, api_client):
        """Test updating user address"""
        new_address = "TEST 789 New Address, Mumbai"
        update_response = api_client.put(
            f"{BASE_URL}/api/users/user_patient001",
            json={"address": new_address}
        )
        assert update_response.status_code == 200
        assert update_response.json()["address"] == new_address
        
        # Restore
        api_client.put(f"{BASE_URL}/api/users/user_patient001", json={"address": "123 MG Road, Bangalore"})
    
    def test_update_doctor_specialization(self, api_client):
        """Test updating doctor specialization field"""
        original_response = api_client.get(f"{BASE_URL}/api/users/user_doctor001")
        original_spec = original_response.json().get("specialization", "")
        
        new_spec = "TEST_Heart Specialist"
        update_response = api_client.put(
            f"{BASE_URL}/api/users/user_doctor001",
            json={"specialization": new_spec}
        )
        assert update_response.status_code == 200
        assert update_response.json()["specialization"] == new_spec
        
        # Verify persistence
        verify_response = api_client.get(f"{BASE_URL}/api/users/user_doctor001")
        assert verify_response.json()["specialization"] == new_spec
        
        # Restore original
        api_client.put(f"{BASE_URL}/api/users/user_doctor001", json={"specialization": original_spec})
    
    def test_update_user_empty_payload_fails(self, api_client):
        """Test that empty update payload returns 400"""
        update_response = api_client.put(
            f"{BASE_URL}/api/users/user_patient001",
            json={}
        )
        assert update_response.status_code == 400
    
    def test_update_nonexistent_user_fails(self, api_client):
        """Test updating non-existent user returns 404"""
        update_response = api_client.put(
            f"{BASE_URL}/api/users/nonexistent_user_xyz",
            json={"name": "Test"}
        )
        assert update_response.status_code in [404, 401, 403]


class TestInvoicesAPI:
    """Tests for Invoice endpoints - PDF generation data"""
    
    def test_get_invoices_list(self, api_client):
        """Test GET /api/invoices returns list with enriched data"""
        response = api_client.get(f"{BASE_URL}/api/invoices")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0, "Should have at least one invoice"
    
    def test_invoices_have_patient_data(self, api_client):
        """Test that invoices have patient data"""
        response = api_client.get(f"{BASE_URL}/api/invoices")
        assert response.status_code == 200
        data = response.json()
        
        for inv in data:
            assert "patient" in inv, "Invoice should have patient data"
            assert inv["patient"] is not None
            assert "name" in inv["patient"], "Patient should have name"
    
    def test_invoices_have_appointment_data(self, api_client):
        """Test that invoices have appointment data"""
        response = api_client.get(f"{BASE_URL}/api/invoices")
        assert response.status_code == 200
        data = response.json()
        
        for inv in data:
            assert "appointment" in inv, "Invoice should have appointment data"
            if inv["appointment"]:
                assert "appointment_id" in inv["appointment"]
                assert "date" in inv["appointment"]
    
    def test_get_single_invoice_with_doctor_data(self, api_client):
        """Test GET /api/invoices/{invoice_id} returns doctor data for PDF"""
        response = api_client.get(f"{BASE_URL}/api/invoices/inv_seed001")
        assert response.status_code == 200
        data = response.json()
        
        # Check invoice fields
        assert "invoice_id" in data
        assert "items" in data
        assert "total_amount" in data
        assert "status" in data
        
        # Check patient data
        assert "patient" in data
        assert data["patient"] is not None
        assert "name" in data["patient"]
        assert "email" in data["patient"]
        
        # Check appointment data
        assert "appointment" in data
        assert data["appointment"] is not None
        
        # Check doctor data (key for PDF)
        assert "doctor" in data, "Single invoice should have doctor data for PDF"
        assert data["doctor"] is not None, "Doctor should not be None"
        assert "name" in data["doctor"], "Doctor should have name"
        assert "specialization" in data["doctor"], "Doctor should have specialization"
    
    def test_invoice_items_structure(self, api_client):
        """Test invoice items have correct structure"""
        response = api_client.get(f"{BASE_URL}/api/invoices/inv_seed001")
        assert response.status_code == 200
        data = response.json()
        
        assert "items" in data
        assert isinstance(data["items"], list)
        assert len(data["items"]) > 0
        
        for item in data["items"]:
            assert "description" in item, "Item should have description"
            assert "amount" in item, "Item should have amount"
    
    def test_get_nonexistent_invoice_returns_404(self, api_client):
        """Test that non-existent invoice returns 404"""
        response = api_client.get(f"{BASE_URL}/api/invoices/nonexistent_inv_xyz")
        assert response.status_code == 404


class TestDoctorsAPI:
    """Tests for doctors endpoint used in schedule doctor filter"""
    
    def test_get_doctors_list(self, api_client):
        """Test GET /api/doctors returns list of doctors"""
        response = api_client.get(f"{BASE_URL}/api/doctors")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0, "Should have at least one doctor"
    
    def test_doctors_have_required_fields(self, api_client):
        """Test doctors have fields needed for schedule filter"""
        response = api_client.get(f"{BASE_URL}/api/doctors")
        assert response.status_code == 200
        data = response.json()
        
        for doc in data:
            assert "user_id" in doc, "Doctor should have user_id"
            assert "name" in doc, "Doctor should have name"


class TestAuthAPI:
    """Tests for authentication"""
    
    def test_auth_me_returns_user(self, api_client):
        """Test GET /api/auth/me returns authenticated user"""
        response = api_client.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 200
        data = response.json()
        assert "user_id" in data
        assert "email" in data
        assert "role" in data
    
    def test_unauthenticated_request_fails(self):
        """Test that requests without auth fail"""
        session = requests.Session()
        response = session.get(f"{BASE_URL}/api/users")
        assert response.status_code == 401


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
