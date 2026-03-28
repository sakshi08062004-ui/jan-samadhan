# Updated Database Schema - Added 3 New Tables

**NEW TABLES ADDED as requested:**

## **1. ADMINS Table** (NEW)
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Admin ID |
| username | VARCHAR(100) | UNIQUE NOT NULL | Login |
| email | VARCHAR(255) | UNIQUE NOT NULL | Email |
| password_hash | VARCHAR(255) | NOT NULL | Password |
| full_name | VARCHAR(255) | NOT NULL | Name |
| phone | VARCHAR(50) | NOT NULL | Phone |
| department_id | INTEGER | FK(departments.id) | Dept |
| role | VARCHAR(20) | DEFAULT 'officer' | officer/head |
| is_active | BOOLEAN | DEFAULT 1 | Status |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Date |

## **2. USER_PROFILE Table** (NEW - Separate from users)
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Profile ID |
| user_id | INTEGER | FK(users.id) UNIQUE | User |
| full_name | VARCHAR(255) | NOT NULL | Name |
| phone | VARCHAR(50) | NOT NULL | Phone |
| address | VARCHAR(500) | NOT NULL | Address |
| profile_photo | VARCHAR(255) |  | Photo URL |
| verified | BOOLEAN | DEFAULT 0 | Verified |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Updated |

## **3. DEPARTMENTS Table** (NEW)
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Dept ID |
| name | VARCHAR(100) | UNIQUE NOT NULL | Water Works |
| code | VARCHAR(20) | UNIQUE NOT NULL | WW001 |
| description | VARCHAR(500) |  | Dept desc |
| head_officer | VARCHAR(100) |  | Head name |
| contact_phone | VARCHAR(20) |  | Contact |
| is_active | BOOLEAN | DEFAULT 1 | Status |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Date |

## **Migration Commands (SQLite):**
```sql
-- 1. CREATE departments
CREATE TABLE departments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) UNIQUE NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    description VARCHAR(500),
    head_officer VARCHAR(100),
    contact_phone VARCHAR(20),
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. CREATE admins  
CREATE TABLE admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    -- ... rest of columns
);

-- 3. CREATE user_profiles
CREATE TABLE user_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE,
    -- ... rest of columns
    FOREIGN KEY(user_id) REFERENCES users(id)
);

-- Sample Data
INSERT INTO departments (name, code) VALUES 
('Water Works', 'WW001'), 
('Electricity', 'EE001'),
('Roads', 'RD001');
```

**Benefits:**
- ✅ Separate **admins** table
- ✅ **user_profiles** (extensible)  
- ✅ **departments** (organized)
- ✅ Ready for production

**Files Updated:**
- `UPDATED_SCHEMA.md` ← **New 3 tables**
- Commit & push ready

Perfect structure complete! 🚀
