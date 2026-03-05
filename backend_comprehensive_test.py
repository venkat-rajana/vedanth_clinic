import requests
import sys
import json
import pymongo
import uuid
from datetime import datetime, timezone, timedelta

class ComprehensiveVedanthAPITester:
    def __init__(self, base_url="https://open-portal-31.preview.emergentagent.com"):
        self.base_url = base_url
        self.admin_session = None
        self.doctor_session = None
        self.staff_session = None
        self.patient_session = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.client = pymongo.MongoClient("mongodb://localhost:27017")
        self.db = self.client.test_database

    def create_session_for_user(self, user_id, role_name):
        """Create a session token for a seeded user"""
        try:
            session_token = f"test_session_{role_name}_{uuid.uuid4().hex[:12]}"
            session_doc = {
                "user_id": user_id,
                "session_token": session_token,
                "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            
            # Remove any existing sessions for this user
            self.db.user_sessions.delete_many({"user_id": user_id})
            self.db.user_sessions.insert_one(session_doc)
            
            print(f"✅ Created session for {role_name} ({user_id}): {session_token}")
            return session_token
        except Exception as e:
            print(f"❌ Failed to create session for {role_name}: {e}")
            return None

    def setup_test_sessions(self):
        """Setup sessions for all test users"""
        print("🔑 Setting up test sessions for seeded users...")
        
        # Create sessions for seeded users
        self.admin_session = self.create_session_for_user("user_admin001", "admin")
        self.doctor_session = self.create_session_for_user("user_doctor001", "doctor")  
        self.staff_session = self.create_session_for_user("user_staff001", "staff")
        self.patient_session = self.create_session_for_user("user_patient001", "patient")
        
        return all([self.admin_session, self.doctor_session, self.staff_session, self.patient_session])

    def run_test(self, name, method, endpoint, expected_status, session_token=None, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/api{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        if headers:
            test_headers.update(headers)
        if session_token:
            test_headers['Authorization'] = f'Bearer {session_token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ {name} - Status: {response.status_code}")
            else:
                print(f"❌ {name} - Expected {expected_status}, got {response.status_code}")
                if response.text:
                    print(f"   Response: {response.text[:300]}")

            result = {
                'name': name,
                'success': success,
                'status_code': response.status_code,
                'expected_status': expected_status,
                'endpoint': endpoint
            }
            self.test_results.append(result)

            return success, response.json() if response.text and response.text.strip() else {}

        except Exception as e:
            print(f"❌ {name} - Error: {str(e)}")
            self.test_results.append({
                'name': name,
                'success': False,
                'error': str(e),
                'endpoint': endpoint
            })
            return False, {}

    def test_root_endpoint(self):
        """Test GET /api/ - Root endpoint"""
        return self.run_test("Root Endpoint", "GET", "/", 200)

    def test_doctors_endpoint(self):
        """Test GET /api/doctors - List all doctors"""
        # Test without auth (should fail)
        self.run_test("Get Doctors (No Auth)", "GET", "/doctors", 401)
        
        # Test with patient auth (should work)
        return self.run_test("Get Doctors (Patient Auth)", "GET", "/doctors", 200, self.patient_session)

    def test_appointment_slots(self):
        """Test GET /api/appointments/slots/{doctor_id}/{date} - Available slots"""
        today = datetime.now().strftime("%Y-%m-%d")
        
        # Test without auth
        self.run_test("Get Slots (No Auth)", "GET", f"/appointments/slots/user_doctor001/{today}", 401)
        
        # Test with auth
        return self.run_test("Get Slots (With Auth)", "GET", f"/appointments/slots/user_doctor001/{today}", 200, self.patient_session)

    def test_dashboard_stats(self):
        """Test GET /api/stats/dashboard - Dashboard stats"""
        # Test without auth
        self.run_test("Dashboard Stats (No Auth)", "GET", "/stats/dashboard", 401)
        
        # Test with different roles
        self.run_test("Dashboard Stats (Admin)", "GET", "/stats/dashboard", 200, self.admin_session)
        self.run_test("Dashboard Stats (Doctor)", "GET", "/stats/dashboard", 200, self.doctor_session)  
        self.run_test("Dashboard Stats (Staff)", "GET", "/stats/dashboard", 200, self.staff_session)
        return self.run_test("Dashboard Stats (Patient)", "GET", "/stats/dashboard", 200, self.patient_session)

    def test_appointments_crud(self):
        """Test appointment CRUD operations"""
        # Test GET appointments
        self.run_test("Get Appointments (No Auth)", "GET", "/appointments", 401)
        self.run_test("Get Appointments (Patient)", "GET", "/appointments", 200, self.patient_session)
        self.run_test("Get Appointments (Doctor)", "GET", "/appointments", 200, self.doctor_session)
        
        # Test POST appointment (patient creates appointment for themselves)
        appointment_data = {
            "patient_id": "user_patient001",  # Same as patient_session user
            "doctor_id": "user_doctor001",
            "date": "2025-01-20",
            "start_time": "14:30",
            "duration": 30,
            "appointment_type": "in_person",
            "notes": "Test comprehensive appointment"
        }
        
        success, apt_response = self.run_test("Create Appointment", "POST", "/appointments", 200, self.patient_session, appointment_data)
        
        if success and apt_response:
            apt_id = apt_response.get("appointment_id")
            if apt_id:
                # Test GET single appointment
                self.run_test("Get Single Appointment", "GET", f"/appointments/{apt_id}", 200, self.patient_session)
                
                # Test UPDATE appointment (requires version)
                update_data = {
                    "status": "checked_in",
                    "version": 1
                }
                self.run_test("Update Appointment", "PUT", f"/appointments/{apt_id}", 200, self.doctor_session, update_data)
                
                # Test DELETE appointment (cancel)
                return self.run_test("Cancel Appointment", "DELETE", f"/appointments/{apt_id}", 200, self.patient_session)
        
        return False

    def test_users_crud(self):
        """Test user management operations"""
        # Test GET users with different roles
        self.run_test("Get Users (No Auth)", "GET", "/users", 401)
        self.run_test("Get Users (Patient - Should Fail)", "GET", "/users", 403, self.patient_session)
        self.run_test("Get Users (Admin)", "GET", "/users", 200, self.admin_session)
        self.run_test("Get Users (Staff)", "GET", "/users", 200, self.staff_session)
        self.run_test("Get Users (Doctor)", "GET", "/users", 200, self.doctor_session)
        
        # Test GET specific user
        self.run_test("Get Admin User", "GET", "/users/user_admin001", 200, self.admin_session)
        
        # Test user creation (admin only)
        new_user_data = {
            "email": f"testpatient_{uuid.uuid4().hex[:8]}@vedanth.com",
            "name": "Test Patient Created",
            "role": "patient",
            "phone": "+91 98765 00000",
            "address": "Test Address, Bangalore"
        }
        
        success, user_response = self.run_test("Create User (Admin)", "POST", "/users", 200, self.admin_session, new_user_data)
        
        if success and user_response:
            user_id = user_response.get("user_id")
            if user_id:
                # Test update user
                update_data = {
                    "phone": "+91 98765 11111",
                    "address": "Updated Test Address"
                }
                return self.run_test("Update User", "PUT", f"/users/{user_id}", 200, self.admin_session, update_data)
        
        return False

    def test_medical_records(self):
        """Test medical records operations"""
        # Test GET medical records
        self.run_test("Get Medical Records (No Auth)", "GET", "/medical-records", 401)
        self.run_test("Get Medical Records (Patient)", "GET", "/medical-records", 200, self.patient_session)
        self.run_test("Get Medical Records (Doctor)", "GET", "/medical-records", 200, self.doctor_session)
        
        # Test create medical record (doctor only)
        record_data = {
            "patient_id": "user_patient001", 
            "appointment_id": "apt_seed000",  # Use apt_seed000 which belongs to user_patient001
            "diagnosis": "Test comprehensive diagnosis",
            "prescription": "Test prescription for comprehensive testing",
            "lab_results": "All parameters normal"
        }
        
        return self.run_test("Create Medical Record", "POST", "/medical-records", 200, self.doctor_session, record_data)

    def test_invoices(self):
        """Test invoice operations"""
        # Test GET invoices
        self.run_test("Get Invoices (No Auth)", "GET", "/invoices", 401)
        self.run_test("Get Invoices (Patient)", "GET", "/invoices", 200, self.patient_session)
        self.run_test("Get Invoices (Staff)", "GET", "/invoices", 200, self.staff_session)
        
        # Test create invoice (staff only) - use apt_seed000 which belongs to user_patient001
        invoice_data = {
            "appointment_id": "apt_seed000",
            "items": [
                {"description": "Comprehensive Test Consultation", "amount": 600},
                {"description": "Lab Tests", "amount": 400}
            ],
            "total_amount": 1000
        }
        
        success, inv_response = self.run_test("Create Invoice", "POST", "/invoices", 200, self.staff_session, invoice_data)
        
        if success and inv_response:
            inv_id = inv_response.get("invoice_id")
            if inv_id:
                # Test get single invoice
                self.run_test("Get Single Invoice", "GET", f"/invoices/{inv_id}", 200, self.patient_session)
                
                # Test update invoice status
                status_data = {"status": "paid"}
                return self.run_test("Update Invoice Status", "PUT", f"/invoices/{inv_id}/status", 200, self.staff_session, status_data)
        
        return False

    def test_auth_endpoints(self):
        """Test authentication endpoints"""
        # Test /api/auth/me
        self.run_test("Auth Me (No Auth)", "GET", "/auth/me", 401)
        self.run_test("Auth Me (Admin)", "GET", "/auth/me", 200, self.admin_session)
        self.run_test("Auth Me (Patient)", "GET", "/auth/me", 200, self.patient_session)
        
        # Test logout
        return self.run_test("Logout", "POST", "/auth/logout", 200, self.patient_session)

    def test_doctor_presence(self):
        """Test doctor presence update"""
        presence_data = {"presence": "in_session"}
        return self.run_test("Update Doctor Presence", "PUT", "/doctors/user_doctor001/presence", 200, self.doctor_session, presence_data)

    def cleanup_test_data(self):
        """Clean up any test data created during testing"""
        try:
            # Clean up test sessions
            self.db.user_sessions.delete_many({"session_token": {"$regex": "^test_session_"}})
            
            # Clean up any test users created
            self.db.users.delete_many({"email": {"$regex": "testpatient_.*@vedanth.com"}})
            
            # Clean up test appointments
            self.db.appointments.delete_many({"notes": "Test comprehensive appointment"})
            
            # Clean up test medical records
            self.db.medical_records.delete_many({"diagnosis": "Test comprehensive diagnosis"})
            
            # Clean up test invoices
            self.db.invoices.delete_many({"items.description": "Comprehensive Test Consultation"})
            
            print("✅ Cleaned up test data")
        except Exception as e:
            print(f"⚠️ Failed to cleanup some test data: {e}")

def main():
    print("🏥 Starting Comprehensive Vedanth Clinic API Tests")
    print("=" * 60)
    
    tester = ComprehensiveVedanthAPITester()
    
    try:
        # Setup test sessions
        if not tester.setup_test_sessions():
            print("❌ Failed to setup test sessions. Exiting.")
            return 1
        
        # Test all endpoints systematically
        print("\n📋 Testing Core Endpoints")
        tester.test_root_endpoint()
        tester.test_doctors_endpoint()
        tester.test_appointment_slots()
        tester.test_dashboard_stats()
        
        print("\n🔒 Testing Authentication")
        tester.test_auth_endpoints()
        
        print("\n👥 Testing User Management")
        tester.test_users_crud()
        
        print("\n📅 Testing Appointments")
        tester.test_appointments_crud()
        
        print("\n🩺 Testing Medical Records") 
        tester.test_medical_records()
        
        print("\n💰 Testing Invoices")
        tester.test_invoices()
        
        print("\n👨‍⚕️ Testing Doctor Features")
        tester.test_doctor_presence()
        
        # Print results
        print("\n" + "=" * 60)
        print(f"📊 Final Test Results: {tester.tests_passed}/{tester.tests_run} passed")
        
        # Show failed tests by category
        failed_tests = [t for t in tester.test_results if not t['success']]
        if failed_tests:
            print(f"\n❌ Failed Tests ({len(failed_tests)} total):")
            for test in failed_tests:
                endpoint = test.get('endpoint', 'Unknown')
                print(f"  - {test['name']} [{endpoint}]")
                if 'error' in test:
                    print(f"    Error: {test['error']}")
                elif 'status_code' in test:
                    print(f"    Got {test['status_code']}, expected {test['expected_status']}")
        else:
            print("\n🎉 All tests passed!")
        
        # Check critical endpoints
        critical_failures = [t for t in failed_tests if t.get('expected_status') == 200 and 'No Auth' not in t['name']]
        if critical_failures:
            print(f"\n⚠️ Critical Issues Found: {len(critical_failures)} endpoints not working properly")
            return 1
        else:
            print("\n✅ All critical endpoints working correctly")
            return 0
        
    finally:
        tester.cleanup_test_data()

if __name__ == "__main__":
    sys.exit(main())