import sqlite3

db_path = 'jan_samadhan_fullstack.db'

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("Current tables:")
cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = cursor.fetchall()
print(tables)

# 1. DEPARTMENTS
try:
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS departments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(100) UNIQUE NOT NULL,
        code VARCHAR(20) UNIQUE NOT NULL,
        description VARCHAR(500),
        head_officer VARCHAR(100),
        contact_phone VARCHAR(20),
        is_active BOOLEAN DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')
    print("✅ departments table created")
    
    cursor.execute("INSERT OR IGNORE INTO departments (name, code) VALUES ('Water Works', 'WW001'), ('Electricity', 'EE001'), ('Roads', 'RD001')")
    print("✅ departments sample data added")
except Exception as e:
    print(f"departments error: {e}")

# 2. ADMINS
try:
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS admins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username VARCHAR(100) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        department_id INTEGER,
        role VARCHAR(20) DEFAULT 'officer',
        is_active BOOLEAN DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(department_id) REFERENCES departments(id)
    )
    ''')
    print("✅ admins table created")
    
    cursor.execute("INSERT OR IGNORE INTO admins (username, email, password_hash, full_name, phone, department_id, role) VALUES ('admin1', 'admin1@example.com', 'hashed_pass', 'Admin One', '1234567890', 1, 'head')")
    print("✅ admins sample data added")
except Exception as e:
    print(f"admins error: {e}")

# 3. USER_PROFILES
try:
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS user_profiles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER UNIQUE,
        full_name VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        address VARCHAR(500) NOT NULL,
        profile_photo VARCHAR(255),
        verified BOOLEAN DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )
    ''')
    print("✅ user_profiles table created")
except Exception as e:
    print(f"user_profiles error: {e}")

conn.commit()
conn.close()

print("\n✅ All 3 new tables added to database!")
print("Run: python backend/fullstack_app.py to test")
