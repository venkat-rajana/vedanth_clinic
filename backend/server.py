from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Literal
import uuid
from datetime import datetime, timezone, timedelta
import httpx
import hashlib
import secrets

# Admin emails that should automatically get admin role
ADMIN_EMAILS = ["venkatrajana3199@gmail.com"]

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============ ENUMS & TYPES ============
RoleType = Literal["admin", "doctor", "staff", "patient"]
AppointmentStatusType = Literal["scheduled", "checked_in", "in_progress", "completed", "cancelled", "no_show"]
AppointmentTypeType = Literal["in_person", "video", "follow_up"]
DoctorPresenceType = Literal["available", "in_session", "on_leave", "offline"]
InvoiceStatusType = Literal["pending", "paid", "waived"]

# ============ MODELS ============
class UserBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str = Field(default_factory=lambda: f"user_{uuid.uuid4().hex[:12]}")
    email: str
    name: str
    role: RoleType = "patient"
    specialization: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    picture: Optional[str] = None
    presence: DoctorPresenceType = "offline"
    is_active: bool = True
    password_hash: Optional[str] = None  # For email/password login
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    email: str
    name: str
    role: RoleType = "patient"
    specialization: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    password: Optional[str] = None  # Optional password for credential-based login

class EmailPasswordLogin(BaseModel):
    email: str
    password: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    specialization: Optional[str] = None
    presence: Optional[DoctorPresenceType] = None
    is_active: Optional[bool] = None

class AppointmentBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    appointment_id: str = Field(default_factory=lambda: f"apt_{uuid.uuid4().hex[:12]}")
    patient_id: str
    doctor_id: str
    date: str  # ISO date string YYYY-MM-DD
    start_time: str  # HH:MM
    duration: int = 30  # 15, 30, 45, 60
    appointment_type: AppointmentTypeType = "in_person"
    status: AppointmentStatusType = "scheduled"
    notes: Optional[str] = None
    diagnosis: Optional[str] = None
    prescription: Optional[str] = None
    invoice_id: Optional[str] = None
    version: int = 1
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AppointmentCreate(BaseModel):
    patient_id: str
    doctor_id: str
    date: str
    start_time: str
    duration: int = 30
    appointment_type: AppointmentTypeType = "in_person"
    notes: Optional[str] = None

class AppointmentUpdate(BaseModel):
    status: Optional[AppointmentStatusType] = None
    notes: Optional[str] = None
    diagnosis: Optional[str] = None
    prescription: Optional[str] = None
    version: int  # Required for optimistic locking

class MedicalRecordBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    record_id: str = Field(default_factory=lambda: f"rec_{uuid.uuid4().hex[:12]}")
    patient_id: str
    doctor_id: str
    appointment_id: Optional[str] = None
    diagnosis: str
    prescription: Optional[str] = None
    lab_results: Optional[str] = None
    attachments: List[str] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MedicalRecordCreate(BaseModel):
    patient_id: str
    appointment_id: Optional[str] = None
    diagnosis: str
    prescription: Optional[str] = None
    lab_results: Optional[str] = None

class InvoiceBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    invoice_id: str = Field(default_factory=lambda: f"inv_{uuid.uuid4().hex[:12]}")
    appointment_id: str
    patient_id: str
    items: List[dict] = []
    total_amount: float = 0.0
    status: InvoiceStatusType = "pending"
    generated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class InvoiceCreate(BaseModel):
    appointment_id: str
    items: List[dict] = []
    total_amount: float

class AuditLogEntry(BaseModel):
    model_config = ConfigDict(extra="ignore")
    log_id: str = Field(default_factory=lambda: f"log_{uuid.uuid4().hex[:12]}")
    user_id: str
    action: str
    target_id: str
    target_type: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    ip: Optional[str] = None

class SessionData(BaseModel):
    user_id: str
    session_token: str
    expires_at: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# User Activity Log Types
ActivityType = Literal["login", "logout", "session_start", "session_end", "action", "page_view"]

class UserActivityLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    log_id: str = Field(default_factory=lambda: f"activity_{uuid.uuid4().hex[:12]}")
    user_id: str
    user_email: Optional[str] = None
    user_name: Optional[str] = None
    user_role: Optional[str] = None
    activity_type: str  # login, logout, action, page_view, etc.
    action: Optional[str] = None  # CREATE_APPOINTMENT, VIEW_PATIENT, etc.
    target_type: Optional[str] = None  # appointment, patient, invoice, etc.
    target_id: Optional[str] = None
    description: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    session_id: Optional[str] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    metadata: Optional[dict] = None

# ============ HELPER FUNCTIONS ============
def hash_password(password: str) -> str:
    """Hash password using SHA256 with salt"""
    salt = secrets.token_hex(16)
    hash_obj = hashlib.sha256((password + salt).encode())
    return f"{salt}:{hash_obj.hexdigest()}"

def verify_password(password: str, password_hash: str) -> bool:
    """Verify password against hash"""
    try:
        salt, stored_hash = password_hash.split(":")
        hash_obj = hashlib.sha256((password + salt).encode())
        return hash_obj.hexdigest() == stored_hash
    except:
        return False

async def log_user_activity(
    user_id: str,
    activity_type: str,
    action: str = None,
    target_type: str = None,
    target_id: str = None,
    description: str = None,
    request: Request = None,
    user_info: dict = None,
    session_id: str = None,
    metadata: dict = None
):
    """Log user activity to the database"""
    try:
        # Get user info if not provided
        if not user_info:
            user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0, "email": 1, "name": 1, "role": 1})
            user_info = user_doc if user_doc else {}
        
        # Extract request info
        ip_address = None
        user_agent = None
        if request:
            ip_address = request.client.host if request.client else None
            user_agent = request.headers.get("User-Agent", "")[:500]  # Limit length
        
        activity_log = {
            "log_id": f"activity_{uuid.uuid4().hex[:12]}",
            "user_id": user_id,
            "user_email": user_info.get("email"),
            "user_name": user_info.get("name"),
            "user_role": user_info.get("role"),
            "activity_type": activity_type,
            "action": action,
            "target_type": target_type,
            "target_id": target_id,
            "description": description,
            "ip_address": ip_address,
            "user_agent": user_agent,
            "session_id": session_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "metadata": metadata
        }
        
        await db.user_activity_logs.insert_one(activity_log)
    except Exception as e:
        logger.error(f"Failed to log user activity: {e}")

async def get_current_user(request: Request) -> dict:
    """Extract and validate user from session token"""
    # Check cookie first, then Authorization header
    session_token = request.cookies.get("session_token")
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header.split(" ")[1]
    
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Find session
    session_doc = await db.user_sessions.find_one(
        {"session_token": session_token},
        {"_id": 0}
    )
    
    if not session_doc:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    # Check expiry with timezone awareness
    expires_at = session_doc["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    
    # Get user
    user_doc = await db.users.find_one(
        {"user_id": session_doc["user_id"]},
        {"_id": 0}
    )
    
    if not user_doc:
        raise HTTPException(status_code=401, detail="User not found")
    
    return user_doc

async def log_audit(user_id: str, action: str, target_id: str, target_type: str, ip: str = None):
    """Create audit log entry"""
    log_entry = AuditLogEntry(
        user_id=user_id,
        action=action,
        target_id=target_id,
        target_type=target_type,
        ip=ip
    )
    doc = log_entry.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    await db.audit_logs.insert_one(doc)

# ============ AUTH ROUTES ============
@api_router.post("/auth/session")
async def exchange_session(request: Request, response: Response):
    """Exchange session_id for session_token - REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH"""
    body = await request.json()
    session_id = body.get("session_id")
    
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    
    # Call Emergent Auth to get session data
    async with httpx.AsyncClient() as client_http:
        resp = await client_http.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}
        )
        
        if resp.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid session_id")
        
        auth_data = resp.json()
    
    email = auth_data.get("email")
    name = auth_data.get("name")
    picture = auth_data.get("picture")
    session_token = auth_data.get("session_token")
    
    # Check if user exists
    existing_user = await db.users.find_one({"email": email}, {"_id": 0})
    
    if existing_user:
        user_id = existing_user["user_id"]
        # Update user info if needed
        update_data = {"name": name, "picture": picture}
        # Check if this email should be admin
        if email in ADMIN_EMAILS and existing_user.get("role") != "admin":
            update_data["role"] = "admin"
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": update_data}
        )
    else:
        # Create new user - check if should be admin
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        role = "admin" if email in ADMIN_EMAILS else "patient"
        new_user = {
            "user_id": user_id,
            "email": email,
            "name": name,
            "picture": picture,
            "role": role,
            "is_active": True,
            "presence": "offline",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(new_user)
    
    # Store session
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    session_doc = {
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Remove old sessions for this user
    await db.user_sessions.delete_many({"user_id": user_id})
    await db.user_sessions.insert_one(session_doc)
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7 * 24 * 60 * 60
    )
    
    # Get full user data
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    
    # Log login activity
    await log_user_activity(
        user_id=user_id,
        activity_type="login",
        action="GOOGLE_LOGIN",
        description=f"User logged in via Google OAuth",
        request=request,
        user_info=user,
        session_id=session_token
    )
    
    return {"user": user, "message": "Session created"}

@api_router.get("/auth/me")
async def get_me(request: Request):
    """Get current authenticated user"""
    user = await get_current_user(request)
    # Remove password_hash from response
    return {k: v for k, v in user.items() if k != "password_hash"}

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    """Logout user"""
    session_token = request.cookies.get("session_token")
    user_id = None
    
    if session_token:
        # Get user_id before deleting session
        session = await db.user_sessions.find_one({"session_token": session_token})
        if session:
            user_id = session.get("user_id")
        await db.user_sessions.delete_many({"session_token": session_token})
    
    # Log logout activity
    if user_id:
        await log_user_activity(
            user_id=user_id,
            activity_type="logout",
            action="USER_LOGOUT",
            description="User logged out",
            request=request,
            session_id=session_token
        )
    
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logged out"}

@api_router.post("/auth/login")
async def email_password_login(login_data: EmailPasswordLogin, request: Request, response: Response):
    """Login with email and password"""
    # Find user by email
    user = await db.users.find_one({"email": login_data.email}, {"_id": 0})
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not user.get("is_active", True):
        raise HTTPException(status_code=401, detail="Account is deactivated")
    
    # Check if user has password set
    if not user.get("password_hash"):
        raise HTTPException(status_code=401, detail="This account uses Google sign-in. Please use Google to login.")
    
    # Verify password
    if not verify_password(login_data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Create session
    session_token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    
    session_doc = {
        "user_id": user["user_id"],
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Remove old sessions for this user
    await db.user_sessions.delete_many({"user_id": user["user_id"]})
    await db.user_sessions.insert_one(session_doc)
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7 * 24 * 60 * 60
    )
    
    # Return user without password_hash
    user_response = {k: v for k, v in user.items() if k != "password_hash"}
    
    # Log login activity
    await log_user_activity(
        user_id=user["user_id"],
        activity_type="login",
        action="EMAIL_PASSWORD_LOGIN",
        description=f"User logged in via email/password",
        request=request,
        user_info=user,
        session_id=session_token
    )
    
    return {"user": user_response, "message": "Login successful"}

# ============ USER ROUTES ============
@api_router.get("/users")
async def get_users(request: Request, role: Optional[str] = None):
    """Get all users (admin/staff) or filtered by role. Doctors can view patients."""
    current_user = await get_current_user(request)
    
    if current_user["role"] not in ["admin", "staff", "doctor"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    query = {"is_active": True}
    if role:
        query["role"] = role
    
    # Doctors can only see patients
    if current_user["role"] == "doctor":
        query["role"] = "patient"
    
    users = await db.users.find(query, {"_id": 0, "password_hash": 0}).to_list(1000)
    return users

@api_router.get("/users/{user_id}")
async def get_user(user_id: str, request: Request):
    """Get single user"""
    current_user = await get_current_user(request)
    
    # Users can view their own profile, admins can view all
    if current_user["user_id"] != user_id and current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return user

@api_router.put("/users/{user_id}")
async def update_user(user_id: str, update: UserUpdate, request: Request):
    """Update user"""
    current_user = await get_current_user(request)
    
    # Users can update their own profile, admins can update all
    if current_user["user_id"] != user_id and current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")
    
    result = await db.users.update_one(
        {"user_id": user_id},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    await log_audit(current_user["user_id"], "UPDATE_USER", user_id, "user")
    
    return user

@api_router.post("/users")
async def create_user(user_data: UserCreate, request: Request):
    """Create new user (admin can create any, staff can create patients)"""
    current_user = await get_current_user(request)
    
    # Admin can create any user, staff can only create patients
    if current_user["role"] == "staff":
        if user_data.role != "patient":
            raise HTTPException(status_code=403, detail="Staff can only register patients")
    elif current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Check if email exists
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")
    
    # Hash password if provided
    password_hash = None
    if user_data.password:
        password_hash = hash_password(user_data.password)
    
    new_user = UserBase(
        email=user_data.email,
        name=user_data.name,
        role=user_data.role,
        specialization=user_data.specialization,
        phone=user_data.phone,
        address=user_data.address,
        password_hash=password_hash
    )
    
    doc = new_user.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.users.insert_one(doc)
    await log_audit(current_user["user_id"], "CREATE_USER", new_user.user_id, "user")
    
    # Return user without password_hash
    result = await db.users.find_one({"user_id": new_user.user_id}, {"_id": 0, "password_hash": 0})
    return result

@api_router.get("/doctors")
async def get_doctors(request: Request):
    """Get all active doctors"""
    await get_current_user(request)  # Just verify authenticated
    
    doctors = await db.users.find(
        {"role": "doctor", "is_active": True},
        {"_id": 0}
    ).to_list(100)
    
    return doctors

@api_router.put("/doctors/{doctor_id}/presence")
async def update_doctor_presence(doctor_id: str, request: Request):
    """Update doctor presence status"""
    current_user = await get_current_user(request)
    body = await request.json()
    presence = body.get("presence")
    
    # Only the doctor themselves or admin can update
    if current_user["user_id"] != doctor_id and current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.users.update_one(
        {"user_id": doctor_id, "role": "doctor"},
        {"$set": {"presence": presence}}
    )
    
    return {"message": "Presence updated"}

# ============ APPOINTMENT ROUTES ============
@api_router.get("/appointments")
async def get_appointments(
    request: Request,
    doctor_id: Optional[str] = None,
    patient_id: Optional[str] = None,
    date: Optional[str] = None,
    status: Optional[str] = None
):
    """Get appointments with filters"""
    current_user = await get_current_user(request)
    
    query = {}
    
    # Role-based filtering
    if current_user["role"] == "patient":
        query["patient_id"] = current_user["user_id"]
    elif current_user["role"] == "doctor":
        query["doctor_id"] = current_user["user_id"]
    
    # Additional filters
    if doctor_id:
        query["doctor_id"] = doctor_id
    if patient_id and current_user["role"] in ["admin", "staff", "doctor"]:
        query["patient_id"] = patient_id
    if date:
        query["date"] = date
    if status:
        query["status"] = status
    
    appointments = await db.appointments.find(query, {"_id": 0}).to_list(1000)
    
    # Batch fetch all patient and doctor info to avoid N+1 queries
    if appointments:
        patient_ids = list(set([apt["patient_id"] for apt in appointments]))
        doctor_ids = list(set([apt["doctor_id"] for apt in appointments]))
        all_user_ids = list(set(patient_ids + doctor_ids))
        
        users = await db.users.find(
            {"user_id": {"$in": all_user_ids}},
            {"_id": 0, "user_id": 1, "name": 1, "specialization": 1}
        ).to_list(len(all_user_ids))
        
        user_map = {u["user_id"]: u for u in users}
        
        # Enrich appointments with user data
        for apt in appointments:
            patient = user_map.get(apt["patient_id"], {})
            doctor = user_map.get(apt["doctor_id"], {})
            apt["patient_name"] = patient.get("name", "Unknown")
            apt["doctor_name"] = doctor.get("name", "Unknown")
            apt["doctor_specialization"] = doctor.get("specialization")
    
    return appointments

@api_router.get("/appointments/{appointment_id}")
async def get_appointment(appointment_id: str, request: Request):
    """Get single appointment"""
    current_user = await get_current_user(request)
    
    appointment = await db.appointments.find_one(
        {"appointment_id": appointment_id},
        {"_id": 0}
    )
    
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    # Check access
    if current_user["role"] == "patient" and appointment["patient_id"] != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Enrich with names
    patient = await db.users.find_one({"user_id": appointment["patient_id"]}, {"_id": 0})
    doctor = await db.users.find_one({"user_id": appointment["doctor_id"]}, {"_id": 0})
    appointment["patient_name"] = patient["name"] if patient else "Unknown"
    appointment["patient_email"] = patient["email"] if patient else ""
    appointment["patient_phone"] = patient.get("phone", "") if patient else ""
    appointment["doctor_name"] = doctor["name"] if doctor else "Unknown"
    appointment["doctor_specialization"] = doctor.get("specialization") if doctor else None
    
    await log_audit(current_user["user_id"], "VIEW_APPOINTMENT", appointment_id, "appointment")
    
    return appointment

@api_router.post("/appointments")
async def create_appointment(apt_data: AppointmentCreate, request: Request):
    """Create new appointment with conflict detection"""
    current_user = await get_current_user(request)
    
    # Check for slot conflict
    existing = await db.appointments.find_one({
        "doctor_id": apt_data.doctor_id,
        "date": apt_data.date,
        "start_time": apt_data.start_time,
        "status": {"$nin": ["cancelled", "no_show"]}
    })
    
    if existing:
        raise HTTPException(
            status_code=409,
            detail="This slot was just taken. Please select another."
        )
    
    # Create appointment
    new_apt = AppointmentBase(
        patient_id=apt_data.patient_id,
        doctor_id=apt_data.doctor_id,
        date=apt_data.date,
        start_time=apt_data.start_time,
        duration=apt_data.duration,
        appointment_type=apt_data.appointment_type,
        notes=apt_data.notes
    )
    
    doc = new_apt.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.appointments.insert_one(doc)
    await log_audit(current_user["user_id"], "CREATE_APPOINTMENT", new_apt.appointment_id, "appointment")
    
    return await db.appointments.find_one({"appointment_id": new_apt.appointment_id}, {"_id": 0})

@api_router.put("/appointments/{appointment_id}")
async def update_appointment(appointment_id: str, update: AppointmentUpdate, request: Request):
    """Update appointment with optimistic locking"""
    current_user = await get_current_user(request)
    
    # Get current appointment
    appointment = await db.appointments.find_one(
        {"appointment_id": appointment_id},
        {"_id": 0}
    )
    
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    # Check version for optimistic locking
    if appointment["version"] != update.version:
        raise HTTPException(
            status_code=409,
            detail="Appointment was modified by another user. Please refresh."
        )
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None and k != "version"}
    update_data["version"] = update.version + 1
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.appointments.update_one(
        {"appointment_id": appointment_id, "version": update.version},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=409, detail="Update conflict")
    
    await log_audit(current_user["user_id"], "UPDATE_APPOINTMENT", appointment_id, "appointment")
    
    return await db.appointments.find_one({"appointment_id": appointment_id}, {"_id": 0})

@api_router.delete("/appointments/{appointment_id}")
async def cancel_appointment(appointment_id: str, request: Request):
    """Cancel appointment"""
    current_user = await get_current_user(request)
    
    appointment = await db.appointments.find_one({"appointment_id": appointment_id}, {"_id": 0})
    
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    # Check authorization
    if current_user["role"] == "patient" and appointment["patient_id"] != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.appointments.update_one(
        {"appointment_id": appointment_id},
        {"$set": {"status": "cancelled", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    await log_audit(current_user["user_id"], "CANCEL_APPOINTMENT", appointment_id, "appointment")
    
    return {"message": "Appointment cancelled"}

@api_router.get("/appointments/slots/{doctor_id}/{date}")
async def get_available_slots(doctor_id: str, date: str, request: Request):
    """Get available time slots for a doctor on a specific date"""
    await get_current_user(request)
    
    # Get booked slots
    booked = await db.appointments.find(
        {
            "doctor_id": doctor_id,
            "date": date,
            "status": {"$nin": ["cancelled", "no_show"]}
        },
        {"_id": 0, "start_time": 1, "duration": 1}
    ).to_list(100)
    
    booked_times = set()
    for apt in booked:
        start_hour, start_min = map(int, apt["start_time"].split(":"))
        duration = apt.get("duration", 30)
        slots_needed = duration // 30
        for i in range(slots_needed):
            total_mins = start_hour * 60 + start_min + (i * 30)
            h = total_mins // 60
            m = total_mins % 60
            booked_times.add(f"{h:02d}:{m:02d}")
    
    # Generate all slots from 07:00 to 20:00
    all_slots = []
    for hour in range(7, 20):
        for minute in [0, 30]:
            time_str = f"{hour:02d}:{minute:02d}"
            all_slots.append({
                "time": time_str,
                "available": time_str not in booked_times
            })
    
    return all_slots

# ============ MEDICAL RECORDS ROUTES ============
@api_router.get("/medical-records")
async def get_medical_records(request: Request, patient_id: Optional[str] = None):
    """Get medical records"""
    current_user = await get_current_user(request)
    
    query = {}
    
    if current_user["role"] == "patient":
        query["patient_id"] = current_user["user_id"]
    elif patient_id:
        query["patient_id"] = patient_id
    
    records = await db.medical_records.find(query, {"_id": 0}).to_list(1000)
    
    # Batch log audit entries instead of N+1 inserts
    if records:
        audit_logs = []
        timestamp = datetime.now(timezone.utc).isoformat()
        for record in records:
            audit_logs.append({
                "log_id": f"log_{uuid.uuid4().hex[:12]}",
                "user_id": current_user["user_id"],
                "action": "VIEW_MEDICAL_RECORD",
                "target_id": record["record_id"],
                "target_type": "medical_record",
                "timestamp": timestamp
            })
        if audit_logs:
            await db.audit_logs.insert_many(audit_logs)
    
    return records

@api_router.post("/medical-records")
async def create_medical_record(record_data: MedicalRecordCreate, request: Request):
    """Create medical record (doctor only)"""
    current_user = await get_current_user(request)
    
    if current_user["role"] not in ["doctor", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    new_record = MedicalRecordBase(
        patient_id=record_data.patient_id,
        doctor_id=current_user["user_id"],
        appointment_id=record_data.appointment_id,
        diagnosis=record_data.diagnosis,
        prescription=record_data.prescription,
        lab_results=record_data.lab_results
    )
    
    doc = new_record.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.medical_records.insert_one(doc)
    await log_audit(current_user["user_id"], "CREATE_MEDICAL_RECORD", new_record.record_id, "medical_record")
    
    return await db.medical_records.find_one({"record_id": new_record.record_id}, {"_id": 0})

# ============ INVOICE ROUTES ============
@api_router.get("/invoices")
async def get_invoices(request: Request, patient_id: Optional[str] = None):
    """Get invoices"""
    current_user = await get_current_user(request)
    
    query = {}
    
    if current_user["role"] == "patient":
        query["patient_id"] = current_user["user_id"]
    elif patient_id:
        query["patient_id"] = patient_id
    
    invoices = await db.invoices.find(query, {"_id": 0}).to_list(1000)
    
    # Batch fetch patients and appointments to avoid N+1 queries
    if invoices:
        patient_ids = list(set([inv["patient_id"] for inv in invoices]))
        appointment_ids = list(set([inv["appointment_id"] for inv in invoices]))
        
        patients = await db.users.find(
            {"user_id": {"$in": patient_ids}},
            {"_id": 0, "user_id": 1, "name": 1, "email": 1, "phone": 1, "address": 1}
        ).to_list(len(patient_ids))
        
        appointments = await db.appointments.find(
            {"appointment_id": {"$in": appointment_ids}},
            {"_id": 0}
        ).to_list(len(appointment_ids))
        
        patient_map = {p["user_id"]: p for p in patients}
        appointment_map = {a["appointment_id"]: a for a in appointments}
        
        # Enrich invoices with patient and appointment data
        for inv in invoices:
            inv["patient"] = patient_map.get(inv["patient_id"])
            inv["appointment"] = appointment_map.get(inv["appointment_id"])
    
    return invoices

@api_router.post("/invoices")
async def create_invoice(invoice_data: InvoiceCreate, request: Request):
    """Create invoice (staff only)"""
    current_user = await get_current_user(request)
    
    if current_user["role"] not in ["staff", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get appointment to get patient_id
    appointment = await db.appointments.find_one(
        {"appointment_id": invoice_data.appointment_id},
        {"_id": 0}
    )
    
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    new_invoice = InvoiceBase(
        appointment_id=invoice_data.appointment_id,
        patient_id=appointment["patient_id"],
        items=invoice_data.items,
        total_amount=invoice_data.total_amount
    )
    
    doc = new_invoice.model_dump()
    doc['generated_at'] = doc['generated_at'].isoformat()
    
    await db.invoices.insert_one(doc)
    
    # Update appointment with invoice_id
    await db.appointments.update_one(
        {"appointment_id": invoice_data.appointment_id},
        {"$set": {"invoice_id": new_invoice.invoice_id}}
    )
    
    await log_audit(current_user["user_id"], "CREATE_INVOICE", new_invoice.invoice_id, "invoice")
    
    return await db.invoices.find_one({"invoice_id": new_invoice.invoice_id}, {"_id": 0})

@api_router.put("/invoices/{invoice_id}/status")
async def update_invoice_status(invoice_id: str, request: Request):
    """Update invoice status"""
    current_user = await get_current_user(request)
    body = await request.json()
    status = body.get("status")
    
    if current_user["role"] not in ["staff", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.invoices.update_one(
        {"invoice_id": invoice_id},
        {"$set": {"status": status}}
    )
    
    return {"message": "Invoice status updated"}

@api_router.get("/invoices/{invoice_id}")
async def get_invoice(invoice_id: str, request: Request):
    """Get single invoice with full details for PDF generation"""
    current_user = await get_current_user(request)
    
    invoice = await db.invoices.find_one({"invoice_id": invoice_id}, {"_id": 0})
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    # Check access
    if current_user["role"] == "patient" and invoice["patient_id"] != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Enrich with full data
    patient = await db.users.find_one({"user_id": invoice["patient_id"]}, {"_id": 0})
    appointment = await db.appointments.find_one({"appointment_id": invoice["appointment_id"]}, {"_id": 0})
    doctor = await db.users.find_one({"user_id": appointment["doctor_id"]}, {"_id": 0}) if appointment else None
    
    invoice["patient"] = patient
    invoice["appointment"] = appointment
    invoice["doctor"] = doctor
    
    return invoice

# ============ STATS ROUTES ============
@api_router.get("/stats/dashboard")
async def get_dashboard_stats(request: Request):
    """Get dashboard statistics"""
    current_user = await get_current_user(request)
    
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    if current_user["role"] == "admin":
        total_patients = await db.users.count_documents({"role": "patient", "is_active": True})
        total_doctors = await db.users.count_documents({"role": "doctor", "is_active": True})
        total_appointments = await db.appointments.count_documents({})
        today_appointments = await db.appointments.count_documents({"date": today})
        pending_invoices = await db.invoices.count_documents({"status": "pending"})
        
        return {
            "total_patients": total_patients,
            "total_doctors": total_doctors,
            "total_appointments": total_appointments,
            "today_appointments": today_appointments,
            "pending_invoices": pending_invoices
        }
    
    elif current_user["role"] == "doctor":
        my_appointments = await db.appointments.count_documents({"doctor_id": current_user["user_id"]})
        today_appointments = await db.appointments.count_documents({
            "doctor_id": current_user["user_id"],
            "date": today
        })
        my_patients = await db.appointments.distinct("patient_id", {"doctor_id": current_user["user_id"]})
        
        return {
            "total_appointments": my_appointments,
            "today_appointments": today_appointments,
            "total_patients": len(my_patients)
        }
    
    elif current_user["role"] == "staff":
        today_appointments = await db.appointments.count_documents({"date": today})
        pending_checkins = await db.appointments.count_documents({
            "date": today,
            "status": "scheduled"
        })
        pending_invoices = await db.invoices.count_documents({"status": "pending"})
        
        return {
            "today_appointments": today_appointments,
            "pending_checkins": pending_checkins,
            "pending_invoices": pending_invoices
        }
    
    else:  # patient
        my_appointments = await db.appointments.count_documents({"patient_id": current_user["user_id"]})
        upcoming = await db.appointments.count_documents({
            "patient_id": current_user["user_id"],
            "date": {"$gte": today},
            "status": "scheduled"
        })
        
        return {
            "total_appointments": my_appointments,
            "upcoming_appointments": upcoming
        }

# ============ USER ACTIVITY LOGS ROUTES ============
@api_router.get("/activity-logs")
async def get_activity_logs(
    request: Request,
    role: Optional[str] = None,
    activity_type: Optional[str] = None,
    user_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = 100,
    skip: int = 0
):
    """Get user activity logs (admin only)"""
    current_user = await get_current_user(request)
    
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    query = {}
    
    # Filter by role
    if role:
        query["user_role"] = role
    
    # Filter by activity type
    if activity_type:
        query["activity_type"] = activity_type
    
    # Filter by specific user
    if user_id:
        query["user_id"] = user_id
    
    # Filter by date range
    if start_date:
        query["timestamp"] = {"$gte": start_date}
    if end_date:
        if "timestamp" in query:
            query["timestamp"]["$lte"] = end_date
        else:
            query["timestamp"] = {"$lte": end_date}
    
    # Get total count
    total = await db.user_activity_logs.count_documents(query)
    
    # Fetch logs with pagination
    logs = await db.user_activity_logs.find(query, {"_id": 0}) \
        .sort("timestamp", -1) \
        .skip(skip) \
        .limit(limit) \
        .to_list(limit)
    
    return {
        "logs": logs,
        "total": total,
        "limit": limit,
        "skip": skip
    }

@api_router.get("/activity-logs/stats")
async def get_activity_stats(request: Request):
    """Get activity statistics (admin only)"""
    current_user = await get_current_user(request)
    
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Get stats by role
    pipeline_role = [
        {"$group": {
            "_id": "$user_role",
            "count": {"$sum": 1},
            "latest": {"$max": "$timestamp"}
        }}
    ]
    role_stats = await db.user_activity_logs.aggregate(pipeline_role).to_list(100)
    
    # Get stats by activity type
    pipeline_type = [
        {"$group": {
            "_id": "$activity_type",
            "count": {"$sum": 1}
        }}
    ]
    type_stats = await db.user_activity_logs.aggregate(pipeline_type).to_list(100)
    
    # Get today's activity count
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    today_count = await db.user_activity_logs.count_documents({
        "timestamp": {"$gte": today}
    })
    
    # Get total count
    total_count = await db.user_activity_logs.count_documents({})
    
    # Get unique active users today
    pipeline_active = [
        {"$match": {"timestamp": {"$gte": today}}},
        {"$group": {"_id": "$user_id"}},
        {"$count": "count"}
    ]
    active_result = await db.user_activity_logs.aggregate(pipeline_active).to_list(1)
    active_users_today = active_result[0]["count"] if active_result else 0
    
    return {
        "by_role": {item["_id"]: {"count": item["count"], "latest": item["latest"]} for item in role_stats if item["_id"]},
        "by_type": {item["_id"]: item["count"] for item in type_stats if item["_id"]},
        "today_count": today_count,
        "total_count": total_count,
        "active_users_today": active_users_today
    }

@api_router.get("/activity-logs/user/{target_user_id}")
async def get_user_activity_logs(
    target_user_id: str,
    request: Request,
    limit: int = 50,
    skip: int = 0
):
    """Get activity logs for a specific user (admin only)"""
    current_user = await get_current_user(request)
    
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    query = {"user_id": target_user_id}
    
    # Get total count
    total = await db.user_activity_logs.count_documents(query)
    
    # Fetch logs
    logs = await db.user_activity_logs.find(query, {"_id": 0}) \
        .sort("timestamp", -1) \
        .skip(skip) \
        .limit(limit) \
        .to_list(limit)
    
    return {
        "logs": logs,
        "total": total,
        "limit": limit,
        "skip": skip
    }

# ============ SEED DATA ROUTE ============
@api_router.post("/seed")
async def seed_data():
    """Seed initial data for testing"""
    
    # Check if already seeded
    admin = await db.users.find_one({"email": "admin@vedanth.com"})
    if admin:
        return {"message": "Data already seeded"}
    
    # Create users
    users = [
        {
            "user_id": "user_admin001",
            "email": "admin@vedanth.com",
            "name": "Admin User",
            "role": "admin",
            "is_active": True,
            "presence": "offline",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "user_id": "user_doctor001",
            "email": "priya.sharma@vedanth.com",
            "name": "Dr. Priya Sharma",
            "role": "doctor",
            "specialization": "Cardiologist",
            "is_active": True,
            "presence": "available",
            "phone": "+91 98765 43210",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "user_id": "user_doctor002",
            "email": "arjun.mehta@vedanth.com",
            "name": "Dr. Arjun Mehta",
            "role": "doctor",
            "specialization": "General Physician",
            "is_active": True,
            "presence": "available",
            "phone": "+91 98765 43211",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "user_id": "user_staff001",
            "email": "ravi.kumar@vedanth.com",
            "name": "Ravi Kumar",
            "role": "staff",
            "is_active": True,
            "presence": "offline",
            "phone": "+91 98765 43212",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "user_id": "user_patient001",
            "email": "patient@vedanth.com",
            "name": "Anita Desai",
            "role": "patient",
            "is_active": True,
            "presence": "offline",
            "phone": "+91 98765 43213",
            "address": "123 MG Road, Bangalore",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "user_id": "user_patient002",
            "email": "patient2@vedanth.com",
            "name": "Rahul Verma",
            "role": "patient",
            "is_active": True,
            "presence": "offline",
            "phone": "+91 98765 43214",
            "address": "456 Park Street, Bangalore",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    await db.users.insert_many(users)
    
    # Create sample appointments
    today = datetime.now(timezone.utc)
    appointments = []
    
    for i in range(8):
        day_offset = i % 7
        apt_date = (today + timedelta(days=day_offset)).strftime("%Y-%m-%d")
        statuses = ["scheduled", "scheduled", "checked_in", "in_progress", "completed", "completed", "scheduled", "scheduled"]
        types = ["in_person", "video", "follow_up", "in_person", "in_person", "video", "in_person", "follow_up"]
        
        appointments.append({
            "appointment_id": f"apt_seed{i:03d}",
            "patient_id": "user_patient001" if i % 2 == 0 else "user_patient002",
            "doctor_id": "user_doctor001" if i % 2 == 0 else "user_doctor002",
            "date": apt_date,
            "start_time": f"{9 + i:02d}:00",
            "duration": 30,
            "appointment_type": types[i],
            "status": statuses[i],
            "notes": f"Sample appointment {i+1}",
            "diagnosis": "Routine checkup completed" if statuses[i] == "completed" else None,
            "prescription": "Take rest and stay hydrated" if statuses[i] == "completed" else None,
            "version": 1,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        })
    
    await db.appointments.insert_many(appointments)
    
    # Create sample medical records
    records = [
        {
            "record_id": "rec_seed001",
            "patient_id": "user_patient001",
            "doctor_id": "user_doctor001",
            "appointment_id": "apt_seed004",
            "diagnosis": "Mild hypertension detected. Blood pressure: 140/90",
            "prescription": "Amlodipine 5mg once daily. Follow up in 2 weeks.",
            "lab_results": "CBC: Normal, Lipid Profile: Elevated LDL",
            "attachments": [],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "record_id": "rec_seed002",
            "patient_id": "user_patient002",
            "doctor_id": "user_doctor002",
            "appointment_id": "apt_seed005",
            "diagnosis": "Seasonal flu with mild fever",
            "prescription": "Paracetamol 500mg as needed. Rest and fluids.",
            "lab_results": None,
            "attachments": [],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    await db.medical_records.insert_many(records)
    
    # Create sample invoices
    invoices = [
        {
            "invoice_id": "inv_seed001",
            "appointment_id": "apt_seed004",
            "patient_id": "user_patient001",
            "items": [
                {"description": "Consultation Fee", "amount": 500},
                {"description": "ECG Test", "amount": 300}
            ],
            "total_amount": 800,
            "status": "paid",
            "generated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "invoice_id": "inv_seed002",
            "appointment_id": "apt_seed005",
            "patient_id": "user_patient002",
            "items": [
                {"description": "Consultation Fee", "amount": 400}
            ],
            "total_amount": 400,
            "status": "pending",
            "generated_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    await db.invoices.insert_many(invoices)
    
    return {"message": "Seed data created successfully"}

# ============ ROOT ROUTE ============
@api_router.get("/")
async def root():
    return {"message": "Vedanth Clinic API", "version": "1.0.0"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
