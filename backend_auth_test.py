import requests
import sys
import json
from datetime import datetime, timezone
import pymongo
import uuid

class VedanthAuthTester:
    def __init__(self, base_url="https://open-portal-31.preview.emergentagent.com"):
        self.base_url = base_url
        self.session_token = None
        self.admin_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.created_user_ids = []

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None, auth_token=None):
        """Run a single API test"""
        url = f"{self.base_url}/api{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        if headers:
            test_headers.update(headers)
        if auth_token:
            test_headers['Authorization'] = f'Bearer {auth_token}'

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
                'response_text': response.text[:500] if response.text else ""
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

    def setup_admin_session(self):
        """Create admin session for user creation tests"""
        try:
            client = pymongo.MongoClient("mongodb://localhost:27017")
            db = client.test_database
            
            # Create admin user
            admin_user_id = f"admin_test_{uuid.uuid4().hex[:12]}"
            admin_doc = {
                "user_id": admin_user_id,
                "email": f"admin_test_{datetime.now().timestamp()}@vedanth.com",
                "name": "Test Admin",
                "role": "admin",
                "is_active": True,
                "presence": "offline",
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            db.users.insert_one(admin_doc)
            self.created_user_ids.append(admin_user_id)
            
            # Create admin session
            self.admin_token = f"admin_session_{uuid.uuid4().hex[:16]}"
            session_doc = {
                "user_id": admin_user_id,
                "session_token": self.admin_token,
                "expires_at": datetime.now(timezone.utc).replace(year=datetime.now().year + 1).isoformat(),
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            db.user_sessions.insert_one(session_doc)
            
            print(f"✅ Created test admin: {admin_user_id}")
            return True
        except Exception as e:
            print(f"❌ Failed to create admin session: {e}")
            return False

    def test_create_users_with_passwords(self):
        """Test creating users with passwords for different roles"""
        if not self.admin_token:
            print("❌ No admin token available")
            return

        print("\n📝 Testing User Creation with Passwords")

        # Test creating doctor with password
        doctor_data = {
            "email": "test.doctor@vedanth.com",
            "name": "Test Doctor",
            "role": "doctor",
            "password": "doctor123",
            "specialization": "General Medicine"
        }
        success, response = self.run_test(
            "Create Doctor with Password", 
            "POST", 
            "/users", 
            200, 
            doctor_data, 
            auth_token=self.admin_token
        )
        if success and 'user_id' in response:
            self.created_user_ids.append(response['user_id'])
            # Verify password_hash is not in response
            if 'password_hash' not in response:
                print("   ✅ password_hash correctly excluded from response")
                self.tests_passed += 1
            else:
                print("   ❌ password_hash found in response - security issue!")

        # Test creating staff with password
        staff_data = {
            "email": "test.staff@vedanth.com",
            "name": "Test Staff",
            "role": "staff",
            "password": "staff123"
        }
        success, response = self.run_test(
            "Create Staff with Password", 
            "POST", 
            "/users", 
            200, 
            staff_data, 
            auth_token=self.admin_token
        )
        if success and 'user_id' in response:
            self.created_user_ids.append(response['user_id'])
            if 'password_hash' not in response:
                print("   ✅ password_hash correctly excluded from response")
                self.tests_passed += 1
            else:
                print("   ❌ password_hash found in response - security issue!")

        # Test creating patient with password
        patient_data = {
            "email": "test.patient@vedanth.com",
            "name": "Test Patient",
            "role": "patient",
            "password": "patient123"
        }
        success, response = self.run_test(
            "Create Patient with Password", 
            "POST", 
            "/users", 
            200, 
            patient_data, 
            auth_token=self.admin_token
        )
        if success and 'user_id' in response:
            self.created_user_ids.append(response['user_id'])
            if 'password_hash' not in response:
                print("   ✅ password_hash correctly excluded from response")
                self.tests_passed += 1
            else:
                print("   ❌ password_hash found in response - security issue!")

    def test_email_password_login(self):
        """Test email/password login functionality"""
        print("\n🔐 Testing Email/Password Login")

        # Test invalid email
        invalid_email_data = {
            "email": "nonexistent@vedanth.com",
            "password": "anypassword"
        }
        self.run_test(
            "Login with Invalid Email", 
            "POST", 
            "/auth/login", 
            401, 
            invalid_email_data
        )

        # Test invalid password for valid email
        invalid_password_data = {
            "email": "test.doctor@vedanth.com",
            "password": "wrongpassword"
        }
        self.run_test(
            "Login with Invalid Password", 
            "POST", 
            "/auth/login", 
            401, 
            invalid_password_data
        )

        # Test valid login for doctor
        valid_doctor_data = {
            "email": "test.doctor@vedanth.com",
            "password": "doctor123"
        }
        success, response = self.run_test(
            "Doctor Login with Valid Credentials", 
            "POST", 
            "/auth/login", 
            200, 
            valid_doctor_data
        )
        if success:
            if 'user' in response and 'password_hash' not in response['user']:
                print("   ✅ password_hash correctly excluded from login response")
                self.tests_passed += 1
            else:
                print("   ❌ password_hash found in login response - security issue!")

        # Test valid login for staff
        valid_staff_data = {
            "email": "test.staff@vedanth.com",
            "password": "staff123"
        }
        success, response = self.run_test(
            "Staff Login with Valid Credentials", 
            "POST", 
            "/auth/login", 
            200, 
            valid_staff_data
        )
        if success and 'user' in response:
            if 'password_hash' not in response['user']:
                print("   ✅ password_hash correctly excluded from login response")
                self.tests_passed += 1
            else:
                print("   ❌ password_hash found in login response - security issue!")
            # Store session token for further tests - it's not in the user object but returned separately
            # The login endpoint doesn't return session_token in response, it sets it as cookie
            # We need to extract it from the response or create a direct session

        # Test valid login for patient
        valid_patient_data = {
            "email": "test.patient@vedanth.com",
            "password": "patient123"
        }
        success, response = self.run_test(
            "Patient Login with Valid Credentials", 
            "POST", 
            "/auth/login", 
            200, 
            valid_patient_data
        )
        if success and 'user' in response:
            if 'password_hash' not in response['user']:
                print("   ✅ password_hash correctly excluded from login response")
                self.tests_passed += 1
            else:
                print("   ❌ password_hash found in login response - security issue!")

    def create_session_for_password_tests(self):
        """Create a session token for a user to test other endpoints"""
        try:
            client = pymongo.MongoClient("mongodb://localhost:27017")
            db = client.test_database
            
            # Find one of our created users (the staff user)
            user = db.users.find_one({"email": "test.staff@vedanth.com"})
            if not user:
                print("❌ Could not find test staff user for session creation")
                return False
                
            # Create session for this user
            self.session_token = f"test_session_{uuid.uuid4().hex[:16]}"
            session_doc = {
                "user_id": user["user_id"],
                "session_token": self.session_token,
                "expires_at": datetime.now(timezone.utc).replace(year=datetime.now().year + 1).isoformat(),
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            db.user_sessions.insert_one(session_doc)
            
            print(f"✅ Created session token for password hash tests")
            return True
        except Exception as e:
            print(f"❌ Failed to create session for password tests: {e}")
            return False
        valid_patient_data = {
            "email": "test.patient@vedanth.com",
            "password": "patient123"
        }
        success, response = self.run_test(
            "Patient Login with Valid Credentials", 
            "POST", 
            "/auth/login", 
            200, 
            valid_patient_data
        )
        if success and 'user' in response:
            if 'password_hash' not in response['user']:
                print("   ✅ password_hash correctly excluded from login response")
                self.tests_passed += 1
            else:
                print("   ❌ password_hash found in login response - security issue!")

    def test_google_only_accounts_login(self):
        """Test that Google-only accounts cannot login via email/password"""
        print("\n🌐 Testing Google-Only Account Protection")
        
        # Create a Google-only user (no password_hash)
        try:
            client = pymongo.MongoClient("mongodb://localhost:27017")
            db = client.test_database
            
            google_user_id = f"google_user_{uuid.uuid4().hex[:12]}"
            google_user_doc = {
                "user_id": google_user_id,
                "email": "google.only@vedanth.com",
                "name": "Google Only User",
                "role": "patient",
                "is_active": True,
                "presence": "offline",
                "created_at": datetime.now(timezone.utc).isoformat()
                # Note: No password_hash field
            }
            db.users.insert_one(google_user_doc)
            self.created_user_ids.append(google_user_id)
            
            # Try to login with email/password
            google_login_data = {
                "email": "google.only@vedanth.com",
                "password": "anypassword"
            }
            self.run_test(
                "Google-Only Account Login Attempt", 
                "POST", 
                "/auth/login", 
                401, 
                google_login_data
            )
            
        except Exception as e:
            print(f"❌ Failed to test Google-only account: {e}")

    def test_password_hash_exclusion(self):
        """Test that password_hash is not returned in various endpoints"""
        # Create session if we don't have one
        if not self.session_token:
            if not self.create_session_for_password_tests():
                return

        print("\n🔒 Testing Password Hash Exclusion from Endpoints")

        # Test GET /api/auth/me
        success, response = self.run_test(
            "GET /auth/me (check password_hash excluded)", 
            "GET", 
            "/auth/me", 
            200, 
            auth_token=self.session_token
        )
        if success:
            if 'password_hash' not in response:
                print("   ✅ password_hash correctly excluded from /auth/me")
                self.tests_passed += 1
            else:
                print("   ❌ password_hash found in /auth/me response - security issue!")

        # Test GET /api/users (with admin token)
        success, response = self.run_test(
            "GET /users (check password_hash excluded)", 
            "GET", 
            "/users", 
            200, 
            auth_token=self.admin_token
        )
        if success and isinstance(response, list) and len(response) > 0:
            has_password_hash = any('password_hash' in user for user in response)
            if not has_password_hash:
                print("   ✅ password_hash correctly excluded from /users")
                self.tests_passed += 1
            else:
                print("   ❌ password_hash found in /users response - security issue!")

        # Test GET /api/users/{id} 
        if self.created_user_ids:
            user_id = self.created_user_ids[0]  # Use first created user
            success, response = self.run_test(
                f"GET /users/{user_id} (check password_hash excluded)", 
                "GET", 
                f"/users/{user_id}", 
                200, 
                auth_token=self.admin_token
            )
            if success:
                if 'password_hash' not in response:
                    print("   ✅ password_hash correctly excluded from /users/{id}")
                    self.tests_passed += 1
                else:
                    print("   ❌ password_hash found in /users/{id} response - security issue!")

    def cleanup_test_data(self):
        """Clean up all test data"""
        try:
            client = pymongo.MongoClient("mongodb://localhost:27017")
            db = client.test_database
            
            for user_id in self.created_user_ids:
                db.users.delete_many({"user_id": user_id})
                db.user_sessions.delete_many({"user_id": user_id})
                
            # Also clean by email patterns
            db.users.delete_many({"email": {"$regex": "^test\\.(doctor|staff|patient)@vedanth\\.com$"}})
            db.users.delete_many({"email": {"$regex": "^google\\.only@vedanth\\.com$"}})
            db.users.delete_many({"email": {"$regex": "admin_test_.*@vedanth\\.com"}})
            
            print(f"✅ Cleaned up test data for {len(self.created_user_ids)} users")
        except Exception as e:
            print(f"⚠️ Failed to cleanup test data: {e}")

def main():
    print("🔐 Starting Vedanth Clinic Authentication Tests")
    print("=" * 60)
    
    tester = VedanthAuthTester()
    
    try:
        # Setup admin session
        print("\n🔧 Setting up Admin Session")
        if not tester.setup_admin_session():
            print("❌ Failed to setup admin session. Exiting.")
            return 1

        # Test user creation with passwords
        tester.test_create_users_with_passwords()
        
        # Test email/password login
        tester.test_email_password_login()
        
        # Test Google-only account protection
        tester.test_google_only_accounts_login()
        
        # Test password hash exclusion
        tester.test_password_hash_exclusion()
        
        # Print results
        print("\n" + "=" * 60)
        print(f"📊 Authentication Test Results: {tester.tests_passed}/{tester.tests_run} passed")
        
        failed_tests = [t for t in tester.test_results if not t['success']]
        if failed_tests:
            print("\n❌ Failed Tests:")
            for test in failed_tests:
                print(f"  - {test['name']}")
                if 'error' in test:
                    print(f"    Error: {test['error']}")
                elif 'status_code' in test:
                    print(f"    Got {test['status_code']}, expected {test['expected_status']}")
                    if test.get('response_text'):
                        print(f"    Response: {test['response_text'][:200]}")
        else:
            print("\n✅ All authentication tests passed!")
        
        return 0 if tester.tests_passed == tester.tests_run else 1
        
    finally:
        tester.cleanup_test_data()

if __name__ == "__main__":
    sys.exit(main())