# Admin Database Information

**Admin Structure:** No separate admin table
**Location:** `role = 'admin'` in **users** table

## Default Admin Accounts (Check DB)
```
sqlite3 jan_samadhan_fullstack.db "SELECT id, username, full_name FROM users WHERE role='admin';"
```

**Add Admin User:**
```sql
INSERT INTO users (username, email, password_hash, full_name, phone, address, role) 
VALUES ('admin', 'admin@example.com', 'hashed_password', 'Admin User', '1234567890', 'Office', 'admin');
```

**Current Schema Includes Admin Support:**
- users.role = 'admin' 
- Admin panels access these users
- No separate admin DB/table needed

**Verify:**
1. `python backend/setup_demo_data.py` (adds demo admins)
2. Check DATABASE_SCHEMA.md → users.role VARCHAR(20)
