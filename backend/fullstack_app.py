from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import sqlite3
import hashlib
import jwt
import os
from werkzeug.security import generate_password_hash, check_password_hash
import json
from pathlib import Path

# FastAPI Application setup
app = FastAPI(title="JAN SAMADHAN Backend")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database setup - standardized to root directory
DB_FILENAME = "jan_samadhan_fullstack.db"
# If running from 'backend' folder, the DB is one level up
PROJECT_ROOT = Path(__file__).resolve().parent.parent
DB_PATH = str(PROJECT_ROOT / DB_FILENAME)
SECRET_KEY = "jan_samadhan_secret_2024_change_this"

security = HTTPBearer()


# Models
class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    full_name: str
    phone: Optional[str] = ""
    address: Optional[str] = ""

class UserLogin(BaseModel):
    username: str
    password: str

class FeedbackCreate(BaseModel):
    complaint_id: Optional[int] = None
    rating: int
    comment: str

class ComplaintCreate(BaseModel):
    title: str
    description: str
    category: str
    priority: str
    location: Optional[str] = ""
    images: Optional[List[dict]] = []

class AdminComplaintsResponse(BaseModel):
    complaints: List[dict]

class DepartmentAssignment(BaseModel):
    department_id: int
    assigned_to: str
    status: str
    admin_notes: Optional[str] = ""

class StatusUpdate(BaseModel):
    status: str
    admin_notes: Optional[str] = ""

class ContactMessage(BaseModel):
    name: str
    email: str
    category: str
    message: str

@app.get("/api/admin/complaints")
async def get_admin_complaints():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    # Using JOIN to get username, email and department name efficiently
    c.execute("""
        SELECT c.id, c.title, c.description, c.category, c.priority, c.status, c.location, c.images, c.department_id, c.assigned_to, c.admin_notes, c.created_at, u.username, u.email,
               CASE 
                   WHEN c.department_id = 1 THEN 'Water Department'
                   WHEN c.department_id = 2 THEN 'Street Light Department'
                   WHEN c.department_id = 3 THEN 'Road Department'
                   ELSE 'Unassigned'
               END as department_name
        FROM complaints c
        LEFT JOIN users u ON c.user_id = u.id
        ORDER BY c.created_at DESC
    """)
    complaints = []
    for row in c.fetchall():
        complaints.append({
            "id": row[0],
            "title": row[1],
            "description": row[2],
            "category": row[3],
            "priority": row[4],
            "status": row[5],
            "location": row[6],
            "images": row[7],
            "department_id": row[8],
            "assigned_to": row[9],
            "admin_notes": row[10],
            "created_at": row[11],
            "username": row[12] if row[12] else "Unknown",
            "email": row[13],
            "department_name": row[14]
        })
    conn.close()
    return AdminComplaintsResponse(complaints=complaints)

@app.get("/api/admin/departments/{department_id}/complaints")
async def get_department_complaints(department_id: int):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("""
        SELECT c.id, c.title, c.description, c.category, c.priority, c.status, c.location, c.images, c.department_id, c.assigned_to, c.admin_notes, c.created_at, u.username, u.email,
               CASE 
                   WHEN c.department_id = 1 THEN 'Water Department'
                   WHEN c.department_id = 2 THEN 'Street Light Department'
                   WHEN c.department_id = 3 THEN 'Road Department'
                   ELSE 'Unassigned'
               END as department_name
        FROM complaints c
        LEFT JOIN users u ON c.user_id = u.id
        WHERE c.department_id = ? 
        ORDER BY c.created_at DESC
    """, (department_id,))
    complaints = []
    for row in c.fetchall():
        complaints.append({
            "id": row[0],
            "title": row[1],
            "description": row[2],
            "category": row[3],
            "priority": row[4],
            "status": row[5],
            "location": row[6],
            "images": row[7],
            "department_id": row[8],
            "assigned_to": row[9],
            "admin_notes": row[10],
            "created_at": row[11],
            "username": row[12] if row[12] else "Unknown",
            "email": row[13],
            "department_name": row[14]
        })
    conn.close()
    return {"complaints": complaints}

@app.get("/api/admin/feedback")
async def get_admin_feedback():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("""
        SELECT f.*, c.title as complaint_title, u.username 
        FROM feedback f 
        LEFT JOIN complaints c ON f.complaint_id = c.id 
        LEFT JOIN users u ON f.user_id = u.id 
        ORDER BY f.created_at DESC
    """)
    feedback = []
    for row in c.fetchall():
        feedback.append({
            "id": row[0],
            "complaint_id": row[1],
            "user_id": row[2],
            "rating": row[3],
            "comment": row[4],
            "created_at": row[5],
            "complaint_title": row[6],
            "user_name": row[7]  # Frontend expects user_name
        })
    conn.close()
    return {"feedback": feedback}

@app.post("/api/admin/login")
async def admin_login(credentials: UserLogin):
    user = get_user(credentials.username)
    if not user or not verify_password(credentials.password, user[3]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if user[7] != 'admin':
        raise HTTPException(status_code=403, detail="Admin access only")
    
    token = create_token(user[0], user[1])
    return {
        "access_token": token,
        "user": {
            "id": user[0],
            "username": user[1],
            "email": user[2],
            "full_name": user[4],
            "role": user[7] or "user"
        }
    }

@app.get("/api/admin/dashboard")
async def get_admin_dashboard():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    # Pull all complaint statuses once and normalize to avoid case/spacing variants
    c.execute("SELECT status FROM complaints")
    status_rows = [ (row[0] or "").strip().lower().replace(" ", "_").replace("-", "_") for row in c.fetchall() ]

    total       = len(status_rows)
    pending     = sum(s in {"pending", "open"} for s in status_rows)
    in_progress = sum(s in {"in_progress", "processing", "resolving"} for s in status_rows)
    resolved    = sum(s in {"resolved", "closed", "done"} for s in status_rows)
    rejected    = sum(s in {"rejected", "declined"} for s in status_rows)
    
    c.execute("SELECT COUNT(*) FROM users")
    total_users = c.fetchone()[0]
    
    c.execute("SELECT COUNT(*) FROM messages")
    total_messages = c.fetchone()[0]
    
    conn.close()
    return {
        "total_complaints": total,
        "pending_complaints": pending,
        "resolved_complaints": resolved,
        "in_progress_complaints": in_progress,
        "rejected_complaints": rejected,
        "total_users": total_users,
        "total_messages": total_messages,
        "active_users": total_users # Placeholder
    }

@app.get("/api/admin/analytics")
async def get_admin_analytics():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    # Department stats (based on IDs 1, 2, 3)
    dept_names = {1: 'Water', 2: 'Street Light', 3: 'Road'}
    dept_stats = []
    performance_stats = []
    
    for dept_id, name in dept_names.items():
        c.execute("SELECT COUNT(*) FROM complaints WHERE department_id = ?", (dept_id,))
        count = c.fetchone()[0]
        dept_stats.append({"name": f"{name} Department", "complaint_count": count})
        
        # Performance/Efficiency calculation: resolved / total * 100
        c.execute("SELECT COUNT(*) FROM complaints WHERE department_id = ? AND status = 'resolved'", (dept_id,))
        resolved = c.fetchone()[0]
        efficiency = round((resolved / count * 100), 1) if count > 0 else 0
        performance_stats.append({"dept": name, "efficiency": efficiency})
    
    # Status distribution
    c.execute("SELECT status, COUNT(*) FROM complaints GROUP BY status")
    status_dist = [{"status": row[0], "count": row[1]} for row in c.fetchall()]
    
    # Priority distribution
    c.execute("SELECT priority, COUNT(*) FROM complaints GROUP BY priority")
    priority_dist = [{"priority": row[0], "count": row[1]} for row in c.fetchall()]
    
    conn.close()
    return {
        "department_stats": dept_stats,
        "status_distribution": status_dist,
        "priority_distribution": priority_dist,
        "dept_performance": performance_stats
    }

@app.get("/api/admin/departments")
async def get_admin_departments():
    # Hardcoded exactly 3 departments as requested
    depts = [
        {"id": 1, "name": "Water Department", "code": "WATER", "description": "Handles water supply, sewage, and drainage issues", "contact_email": "water@jansamadhan.gov", "head_name": "Rahul", "color": "#007bff"},
        {"id": 2, "name": "Street Light Department", "code": "LIGHT", "description": "Manages street lighting and traffic signals", "contact_email": "lights@jansamadhan.gov", "head_name": "Suresh", "color": "#ffc107"},
        {"id": 3, "name": "Road Department", "code": "ROAD", "description": "Responsible for road maintenance and cleaning", "contact_email": "roads@jansamadhan.gov", "head_name": "Ram", "color": "#28a745"}
    ]
    
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    for dept in depts:
        c.execute("SELECT COUNT(*) FROM complaints WHERE department_id = ?", (dept["id"],))
        dept["total_complaints"] = c.fetchone()[0]
        c.execute("SELECT COUNT(*) FROM complaints WHERE department_id = ? AND status = 'pending'", (dept["id"],))
        dept["pending_complaints"] = c.fetchone()[0]
        c.execute("SELECT COUNT(*) FROM complaints WHERE department_id = ? AND status = 'in_progress'", (dept["id"],))
        dept["in_progress_complaints"] = c.fetchone()[0]
        c.execute("SELECT COUNT(*) FROM complaints WHERE department_id = ? AND status = 'resolved'", (dept["id"],))
        dept["resolved_complaints"] = c.fetchone()[0]
        
    conn.close()
    return {"departments": depts}

@app.get("/api/admin/messages")
async def get_admin_messages():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT * FROM messages ORDER BY created_at DESC")
    messages = []
    for row in c.fetchall():
        messages.append({
            "id": row[0],
            "name": row[1],
            "email": row[2],
            "category": row[3],
            "message": row[4],
            "created_at": row[5]
        })
    conn.close()
    return {"messages": messages}

@app.get("/api/admin/users")
async def get_admin_users():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT id, username, email, full_name, phone, address, role, points, created_at FROM users ORDER BY created_at DESC")
    users = []
    for row in c.fetchall():
        users.append({
            "id": row[0],
            "username": row[1],
            "email": row[2],
            "full_name": row[3],
            "phone": row[4],
            "address": row[5],
            "role": row[6],
            "points": row[7],
            "created_at": row[8]
        })
    conn.close()
    return {"users": users}

@app.put("/api/admin/complaints/{complaint_id}/assign")
async def assign_complaint(complaint_id: int, assignment: DepartmentAssignment):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("""UPDATE complaints 
                 SET department_id = ?, assigned_to = ?, status = ?, admin_notes = ?, updated_at = CURRENT_TIMESTAMP 
                 WHERE id = ?""",
              (assignment.department_id, assignment.assigned_to, assignment.status, assignment.admin_notes, complaint_id))
    conn.commit()
    conn.close()
    return {"message": "Complaint assigned successfully"}

@app.put("/api/admin/complaints/{complaint_id}/status")
async def update_complaint_status_admin(complaint_id: int, update: StatusUpdate):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("""UPDATE complaints 
                 SET status = ?, admin_notes = ?, updated_at = CURRENT_TIMESTAMP 
                 WHERE id = ?""",
              (update.status, update.admin_notes, complaint_id))
    conn.commit()
    conn.close()
    return {"message": "Status updated successfully"}

@app.post("/api/contact")
async def submit_contact(msg: ContactMessage):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("INSERT INTO messages (name, email, category, message) VALUES (?, ?, ?, ?)",
              (msg.name, msg.email, msg.category, msg.message))
    conn.commit()
    conn.close()
    return {"message": "Message sent successfully"}

# Database init
def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    # Users table
    c.execute('''CREATE TABLE IF NOT EXISTS users
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  username TEXT UNIQUE NOT NULL,
                  email TEXT UNIQUE NOT NULL,
                  password_hash TEXT NOT NULL,
                  full_name TEXT,
                  phone TEXT,
                  address TEXT,
                  role TEXT DEFAULT 'user',
                  points INTEGER DEFAULT 0,
                  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)''')
    
    # Check if role column exists (for existing databases)
    c.execute("PRAGMA table_info(users)")
    columns = [row[1] for row in c.fetchall()]
    if 'role' not in columns:
        c.execute("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'")
    
    # Complaints table
    c.execute('''CREATE TABLE IF NOT EXISTS complaints
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  user_id INTEGER,
                  title TEXT NOT NULL,
                  description TEXT NOT NULL,
                  category TEXT NOT NULL,
                  priority TEXT DEFAULT 'medium',
                  status TEXT DEFAULT 'pending',
                  location TEXT,
                  images TEXT,
                  department_id INTEGER,
                  assigned_to TEXT,
                  admin_notes TEXT,
                  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                  FOREIGN KEY (user_id) REFERENCES users (id))''')

    # Contact messages table
    c.execute('''CREATE TABLE IF NOT EXISTS messages
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  name TEXT NOT NULL,
                  email TEXT NOT NULL,
                  category TEXT,
                  message TEXT NOT NULL,
                  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)''')
    
    # Feedback table (NEW - FIXES THE ERROR)
    c.execute('''CREATE TABLE IF NOT EXISTS feedback
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  complaint_id INTEGER,
                  user_id INTEGER,
                  rating INTEGER NOT NULL,
                  comment TEXT NOT NULL,
                  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                  FOREIGN KEY (complaint_id) REFERENCES complaints (id),
                  FOREIGN KEY (user_id) REFERENCES users (id))''')
    
    # Cleanup old feedback (only keep today's feedback)
    c.execute("DELETE FROM feedback WHERE date(created_at) < date('now', 'localtime')")

    # Seed default admin so the admin panel can log in on first run
    c.execute("SELECT COUNT(*) FROM users WHERE role = 'admin'")
    admin_exists = c.fetchone()[0]
    if admin_exists == 0:
        admin_hash = generate_password_hash("admin123")
        c.execute("""
            INSERT OR IGNORE INTO users (username, email, password_hash, full_name, role, points)
            VALUES (?, ?, ?, ?, 'admin', 0)
        """, ("admin", "admin@jan-samadhan.local", admin_hash, "Default Admin"))
        # Use ASCII-only message to avoid encoding issues on some Windows terminals
        print("Created default admin user -> username: admin / password: admin123")

    conn.commit()
    conn.close()

init_db()

def hash_password(password: str) -> str:
    # Use werkzeug's generate_password_hash for secure, standard-compliant hashing
    return generate_password_hash(password)

def verify_password(password: str, hashed: str) -> bool:
    try:
        # First try werkzeug's native check (handles pbkdf2, scrypt, etc.)
        if check_password_hash(hashed, password):
            return True
    except Exception:
        pass
        
    # Fallback for simple SHA256 previously used in this preview
    return hashlib.sha256(password.encode()).hexdigest() == hashed

def get_user(username: str):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT id, username, email, password_hash, full_name, phone, address, role, points FROM users WHERE username = ?", (username,))
    user = c.fetchone()
    conn.close()
    return user

def get_user_by_id(user_id: int):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT id, username, email, password_hash, full_name, phone, address, role, points FROM users WHERE id = ?", (user_id,))
    user = c.fetchone()
    conn.close()
    return user

def create_user(user_data: UserCreate):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    try:
        c.execute("""INSERT INTO users (username, email, password_hash, full_name, phone, address)
                     VALUES (?, ?, ?, ?, ?, ?)""",
                  (user_data.username, user_data.email, 
                   hash_password(user_data.password), 
                   user_data.full_name, user_data.phone, user_data.address))
        user_id = c.lastrowid
        conn.commit()
        return {"id": user_id, "username": user_data.username}
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=400, detail="Username or email already exists")
    finally:
        conn.close()

def create_token(user_id: int, username: str):
    payload = {"user_id": user_id, "username": username}
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=["HS256"])
        user_id = payload.get("user_id")
        username = payload.get("username")
        if user_id and username:
            user = get_user_by_id(user_id)
            if user:
                return {"user_id": user_id, "username": username}
    except jwt.PyJWTError:
        pass
    raise HTTPException(status_code=401, detail="Invalid token")


@app.get("/api/health")
async def health():
    return {"status": "healthy", "message": "JAN SAMADHAN Backend Ready"}


# Missing API endpoints for customer panel
@app.get("/api/notifications")
async def get_notifications(current_user: dict = Depends(verify_token)):
    """Get user notifications"""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("""
        SELECT id, message, is_read, created_at 
        FROM notifications 
        WHERE user_id = ? 
        ORDER BY created_at DESC 
        LIMIT 20
    """, (current_user["user_id"],))
    notifications = []
    for row in c.fetchall():
        notifications.append({
            "id": row[0],
            "message": row[1],
            "is_read": bool(row[2]),
            "created_at": row[3]
        })
    conn.close()
    return {"notifications": notifications}

@app.post("/api/auth/register")
async def register(user_data: UserCreate):
    try:
        user = create_user(user_data)
        token = create_token(user["id"], user["username"])
        return {"access_token": token, "user": user}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/auth/login")
async def login(credentials: UserLogin):
    user = get_user(credentials.username)
    if not user or not verify_password(credentials.password, user[3]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user[0], user[1])
    return {
        "access_token": token,
        "user": {
            "id": user[0],
            "username": user[1],
            "email": user[2],
            "full_name": user[4]
        }
    }

@app.get("/api/complaints")
async def get_complaints(current_user: dict = Depends(verify_token)):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT * FROM complaints WHERE user_id = ? ORDER BY created_at DESC", (current_user["user_id"],))
    complaints = []
    for row in c.fetchall():
        # row indices: 0:id, 1:user_id, 2:title, 3:description, 4:category, 5:priority, 6:status, 7:location, 8:images, 9:dept_id, 10:assigned, 11:notes, 12:created, 13:updated
        complaints.append({
            "id": row[0],
            "user_id": row[1],
            "title": row[2],
            "description": row[3],
            "category": row[4],
            "priority": row[5],
            "status": row[6],
            "location": row[7],
            "images": row[8],
            "created_at": row[12],
            "updated_at": row[13]
        })
    conn.close()
    return {"complaints": complaints}

@app.post("/api/complaints")
async def create_complaint(complaint: ComplaintCreate, current_user: dict = Depends(verify_token)):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("""INSERT INTO complaints (user_id, title, description, category, priority, location, images)
                 VALUES (?, ?, ?, ?, ?, ?, ?)""",
              (current_user["user_id"], complaint.title, complaint.description,
               complaint.category, complaint.priority, complaint.location,
               json.dumps(complaint.images) if complaint.images else None))
    conn.commit()
    complaint_id = c.lastrowid
    
    conn.commit()
    conn.close()
    
    return {"id": complaint_id}

@app.put("/api/complaints/{complaint_id}")
async def update_complaint(complaint_id: int, complaint: ComplaintCreate, current_user: dict = Depends(verify_token)):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    # Verify ownership and status
    c.execute("SELECT user_id, status FROM complaints WHERE id = ?", (complaint_id,))
    row = c.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Complaint not found")
    
    if row[0] != current_user["user_id"]:
        conn.close()
        raise HTTPException(status_code=403, detail="Not authorized to edit this complaint")
        
    if row[1] != 'pending':
        conn.close()
        raise HTTPException(status_code=400, detail="Only pending complaints can be edited")
    
    c.execute("""UPDATE complaints 
                 SET title = ?, description = ?, category = ?, priority = ?, location = ?, images = ?, updated_at = CURRENT_TIMESTAMP 
                 WHERE id = ?""",
              (complaint.title, complaint.description, complaint.category, complaint.priority, 
               complaint.location, json.dumps(complaint.images) if complaint.images else None, complaint_id))
    
    conn.commit()
    conn.close()
    return {"message": "Complaint updated successfully"}

@app.delete("/api/complaints/{complaint_id}")
async def delete_complaint_endpoint(complaint_id: int, current_user: dict = Depends(verify_token)):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    # Verify ownership
    c.execute("SELECT user_id FROM complaints WHERE id = ?", (complaint_id,))
    row = c.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Complaint not found")
        
    if row[0] != current_user["user_id"]:
        conn.close()
        raise HTTPException(status_code=403, detail="Not authorized to delete this complaint")
    
    c.execute("DELETE FROM complaints WHERE id = ?", (complaint_id,))
    conn.commit()
    conn.close()
    return {"message": "Complaint deleted successfully"}

# ✅ FEEDBACK ENDPOINT (THIS FIXES THE ERROR!)
@app.post("/api/feedback")
async def submit_feedback(feedback: FeedbackCreate, current_user: dict = Depends(verify_token)):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    # Validate rating 1-5
    if feedback.rating < 1 or feedback.rating > 5:
        conn.close()
        raise HTTPException(status_code=400, detail="Rating must be 1-5")
    
    # Insert feedback
    c.execute("INSERT OR IGNORE INTO feedback (complaint_id, user_id, rating, comment) VALUES (?, ?, ?, ?)", (feedback.complaint_id or None, current_user["user_id"], feedback.rating, feedback.comment))
    
    conn.commit()
    conn.close()
    
    return {"message": "Feedback submitted successfully!"}

@app.get("/api/stats")
async def get_stats(current_user: dict = Depends(verify_token)):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    c.execute("SELECT COUNT(*) FROM complaints")
    total_complaints = c.fetchone()[0]
    
    c.execute("SELECT COUNT(*) FROM complaints WHERE status = 'resolved'")
    resolved_complaints = c.fetchone()[0]
    
    c.execute("SELECT COUNT(*) FROM users")
    active_users = c.fetchone()[0]
    
    conn.close()
    return {
        "total_complaints": total_complaints,
        "resolved_complaints": resolved_complaints,
        "active_users": active_users
    }

@app.get("/api/user/profile")
async def get_profile(current_user: dict = Depends(verify_token)):
    user = get_user_by_id(current_user["user_id"])
    return {"user": {
        "id": user[0],
        "username": user[1],
        "email": user[2],
        "full_name": user[4],
        "phone": user[5],
        "address": user[6],
        "points": user[8]
    }}

@app.put("/api/user/profile")
async def update_profile(user_data: dict, current_user: dict = Depends(verify_token)):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    c.execute("""UPDATE users 
                 SET full_name = ?, phone = ?, address = ?
                 WHERE id = ?""",
              (user_data.get("full_name"), user_data.get("phone"), user_data.get("address"), current_user["user_id"]))
    
    conn.commit()
    conn.close()
    return {"message": "Profile updated successfully"}

@app.get("/api/complaints/status/{complaint_id}")
async def get_complaint_status_public(complaint_id: int):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT id, title, category, status, updated_at FROM complaints WHERE id = ?", (complaint_id,))
    row = c.fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Complaint not found")
    return {
        "id": row[0],
        "title": row[1],
        "category": row[2],
        "status": row[3],
        "updated_at": row[4]
    }

async def get_single_complaint(complaint_id: int, current_user: dict = Depends(verify_token)):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT * FROM complaints WHERE id = ?", (complaint_id,))
    row = c.fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Complaint not found")
    if row[1] != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Not authorized to view this complaint")
    return {
        "complaint": {
            "id": row[0],
            "user_id": row[1],
            "title": row[2],
            "description": row[3],
            "category": row[4],
            "priority": row[5],
            "status": row[6],
            "location": row[7],
            "images": row[8],
            "created_at": row[12],
            "updated_at": row[13]
        }
    }
# Serve frontend static assets - AFTER all API routes
FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"
if FRONTEND_DIR.exists():
    # Mount frontend files at root
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend_root")
    print(f"Frontend mounted from: {FRONTEND_DIR}")
else:
    print(f"Frontend directory not found: {FRONTEND_DIR}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
