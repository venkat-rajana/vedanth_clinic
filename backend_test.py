import requests
import sys
import json
from datetime import datetime, timezone

class VedanthClinicAPITester:
    def __init__(self, base_url="https://appt-portal-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.session_token = None
        self.test_user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/api{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        if headers:
            test_headers.update(headers)
        if self.session_token:
            test_headers['Authorization'] = f'Bearer {self.session_token}'

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
                    print(f"   Response: {response.text[:200]}")

            result = {
                'name': name,
                'success': success,
                'status_code': response.status_code,
                'expected_status': expected_status
            }
            self.test_results.append(result)

            return success, response.json() if response.text and response.text.strip() else {}

        except Exception as e:
            print(f"❌ {name} - Error: {str(e)}")
            self.test_results.append({
                'name': name,
                'success': False,
                'error': str(e)
            })
            return False, {}

    def test_root_endpoint(self):
        """Test the root API endpoint"""
        return self.run_test("Root API", "GET", "/", 200)

    def test_seed_data(self):
        """Test seed data creation"""
        return self.run_test("Seed Data", "POST", "/seed", 200)

    def test_get_doctors(self):
        """Test getting doctors list"""
        return self.run_test("Get Doctors", "GET", "/doctors", 401)  # Should fail without auth

    def test_get_stats(self):
        """Test dashboard stats"""
        return self.run_test("Dashboard Stats", "GET", "/stats/dashboard", 401)  # Should fail without auth

    def test_create_test_session(self):
        """Create a test user and session for authenticated tests"""
        # This simulates what would happen after OAuth
        import uuid
        import pymongo
        
        try:
            client = pymongo.MongoClient("mongodb://localhost:27017")
            db = client.test_database
            
            # Create test user
            self.test_user_id = f"test_user_{uuid.uuid4().hex[:12]}"
            user_doc = {
                "user_id": self.test_user_id,
                "email": f"testuser_{datetime.now().timestamp()}@vedanth.com",
                "name": "Test User",
                "role": "patient",
                "is_active": True,
                "presence": "offline",
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            db.users.insert_one(user_doc)
            
            # Create session
            self.session_token = f"test_session_{uuid.uuid4().hex[:16]}"
            session_doc = {
                "user_id": self.test_user_id,
                "session_token": self.session_token,
                "expires_at": datetime.now(timezone.utc).replace(year=datetime.now().year + 1).isoformat(),
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            db.user_sessions.insert_one(session_doc)
            
            print(f"✅ Created test user: {self.test_user_id}")
            print(f"✅ Created test session: {self.session_token}")
            return True
        except Exception as e:
            print(f"❌ Failed to create test session: {e}")
            return False

    def test_authenticated_endpoints(self):
        """Test authenticated endpoints"""
        if not self.session_token:
            print("❌ No session token available for authenticated tests")
            return

        # Test auth me
        success, user_data = self.run_test("Auth Me", "GET", "/auth/me", 200)
        
        # Test doctors with auth
        self.run_test("Get Doctors (Authenticated)", "GET", "/doctors", 200)
        
        # Test stats with auth
        self.run_test("Dashboard Stats (Authenticated)", "GET", "/stats/dashboard", 200)
        
        # Test appointments
        self.run_test("Get Appointments", "GET", "/appointments", 200)
        
        # Test users endpoint
        self.run_test("Get Users (Patient)", "GET", "/users", 403)  # Patients can't access all users
        
        # Test medical records
        self.run_test("Get Medical Records", "GET", "/medical-records", 200)
        
        # Test invoices
        self.run_test("Get Invoices", "GET", "/invoices", 200)

    def test_appointment_creation(self):
        """Test creating an appointment"""
        if not self.session_token:
            print("❌ No session token for appointment test")
            return

        # Get doctors first
        success, _ = self.run_test("Get Doctors for Appointment", "GET", "/doctors", 200)
        
        # Try to create appointment (might fail due to missing doctor/conflicts)
        appointment_data = {
            "patient_id": self.test_user_id,
            "doctor_id": "user_doctor001",  # From seed data
            "date": "2025-01-15",
            "start_time": "10:00",
            "duration": 30,
            "appointment_type": "in_person",
            "notes": "Test appointment"
        }
        
        self.run_test("Create Appointment", "POST", "/appointments", 200, appointment_data)

    def cleanup_test_data(self):
        """Clean up test data"""
        if self.test_user_id:
            try:
                import pymongo
                client = pymongo.MongoClient("mongodb://localhost:27017")
                db = client.test_database
                
                db.users.delete_many({"user_id": self.test_user_id})
                db.user_sessions.delete_many({"user_id": self.test_user_id})
                db.appointments.delete_many({"patient_id": self.test_user_id})
                
                print(f"✅ Cleaned up test data for user {self.test_user_id}")
            except Exception as e:
                print(f"⚠️ Failed to cleanup test data: {e}")

def main():
    print("🏥 Starting Vedanth Clinic API Tests")
    print("=" * 50)
    
    tester = VedanthClinicAPITester()
    
    try:
        # Test unauthenticated endpoints
        print("\n📋 Testing Unauthenticated Endpoints")
        tester.test_root_endpoint()
        tester.test_seed_data()
        tester.test_get_doctors()  # Should fail
        tester.test_get_stats()    # Should fail
        
        # Create test session for authenticated tests
        print("\n🔑 Setting up Test Authentication")
        if tester.test_create_test_session():
            
            # Test authenticated endpoints
            print("\n🔒 Testing Authenticated Endpoints")
            tester.test_authenticated_endpoints()
            
            # Test appointment workflow
            print("\n📅 Testing Appointment Workflow")
            tester.test_appointment_creation()
            
        # Print results
        print("\n" + "=" * 50)
        print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} passed")
        
        failed_tests = [t for t in tester.test_results if not t['success']]
        if failed_tests:
            print("\n❌ Failed Tests:")
            for test in failed_tests:
                print(f"  - {test['name']}")
                if 'error' in test:
                    print(f"    Error: {test['error']}")
                elif 'status_code' in test:
                    print(f"    Got {test['status_code']}, expected {test['expected_status']}")
        
        return 0 if tester.tests_passed == tester.tests_run else 1
        
    finally:
        tester.cleanup_test_data()

if __name__ == "__main__":
    sys.exit(main())