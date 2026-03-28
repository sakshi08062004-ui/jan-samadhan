# Recommended Database Schema for Jan Samadhan

**Current:** Good (4 tables)
**Suggested Improvements:**

## **1. RECOMMENDED TABLES (8 Total)**
```
users, admins, departments, complaints, complaint_status, attachments, notifications, audit_logs
```

## **OPTIMAL SCHEMA:**

### **admins** (NEW)
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PK | Admin ID |
| username | VARCHAR(100) | UNIQUE NOT NULL | Login |
| email | VARCHAR(255) | UNIQUE NOT NULL | Email |
| role | VARCHAR(20) | DEFAULT 'officer' | officer/superadmin |
| department_id | INTEGER | FK(departments.id) | Assigned dept |

### **departments** (NEW)
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PK | Dept ID |
| name | VARCHAR(100) | UNIQUE NOT NULL | Water/Electricity |
| code | VARCHAR(10) | UNIQUE | DEPT001 |
| officer_count | INTEGER | DEFAULT 0 | Active officers |

### **complaints** (Enhanced)
Add: `tracking_id VARCHAR(20) UNIQUE, target_resolution_date DATE`

### **attachments** (NEW)
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PK | - |
| complaint_id | INTEGER | FK | - |
| filename | VARCHAR(255) | NOT NULL | photo.pdf |
| filepath | VARCHAR(500) |  | /uploads/ |
| uploaded_at | TIMESTAMP |  | - |

**Migration Steps:**
1. Add departments table
2. Split admins from users  
3. Add attachments support
4. Create audit trail

**Why Better:**
- Admin/user separation ✓
- Department management ✓
- File uploads ✓
- Audit trail ✓
- Scalable structure ✓

**Current → Recommended:** 4 → 8 tables (Production Ready)
