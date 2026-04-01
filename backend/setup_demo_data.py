import sqlite3
import random
from datetime import datetime, timedelta

DB_PATH = 'jan_samadhan_fullstack.db'

def create_demo_users():
    """Create demo users for complaints"""
    from werkzeug.security import generate_password_hash
    demo_users = [
        ('user1', 'user1@test.com', 'User One', 'User123!'),
        ('citizen2', 'citizen2@gmail.com', 'Priya Patel', 'Pass123!'),
        ('rajesh', 'rajesh@yahoo.com', 'Rajesh Kumar', 'Welcome1!'),
    ]
    
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    for username, email, name, password in demo_users:
        password_hash = generate_password_hash(password)
        
        c.execute("""INSERT OR IGNORE INTO users (username, email, password_hash, full_name, created_at)
                     VALUES (?, ?, ?, ?, ?)""", 
                  (username, email, password_hash, name, datetime.now()))
    
    conn.commit()
    conn.close()
    print("✅ 3 demo users created")

def create_demo_complaints():
    """Create demo complaints for feedback dropdown"""
    demo_complaints = [
        ('Water leakage in kitchen', 'Major water leakage causing damage', 'Water Supply', 'high', 'Sector 12, House 45'),
        ('Street light broken', 'Street light not working, safety issue', 'Street Light', 'urgent', 'Main Road near school'),
        ('Potholes on road', 'Multiple potholes causing vehicle damage', 'Road Repair', 'high', 'Colony Main Road'),
        ('No water supply', 'No water for 3 days', 'Water Supply', 'urgent', 'Flat 204, Block A'),
    ]
    
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    user_ids = [1,2,3]  # From demo users
    
    for i, (title, desc, cat, prio, loc) in enumerate(demo_complaints):
        c.execute("""INSERT OR IGNORE INTO complaints 
                     (user_id, title, description, category, priority, location, status, created_at)
                     VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)""",
                  (user_ids[i%3], title, desc, cat, prio, loc, datetime.now()))
    
    conn.commit()
    
    c.execute('SELECT COUNT(*) FROM complaints')
    count = c.fetchone()[0]
    print(f"✅ {len(demo_complaints)} demo complaints. Total: {count}")
    
    conn.close()

if __name__ == '__main__':
    print("🚀 Setting up complete demo data...")
    create_demo_users()
    create_demo_complaints()
    print("✅ Demo setup complete!")
    print("💡 Run: python backend/add_demo_feedback.py")
    print("💡 Run: python backend/add_demo_messages.py")
