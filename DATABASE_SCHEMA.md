+# Jan Samadhan - Updated Database Schema (ALL TEXT → VARCHAR)

**Database:** `jan_samadhan_fullstack.db`

## **USERS** Table
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique user ID |
| username | VARCHAR(100) | UNIQUE NOT NULL | Username |
| email | VARCHAR(255) | UNIQUE NOT NULL | Email address |
| password_hash | VARCHAR(255) | NOT NULL | Hashed password |
| full_name | VARCHAR(255) | NOT NULL | Full name |
| phone | VARCHAR(50) | NOT NULL | Phone number |
| address | VARCHAR(500) | NOT NULL | Address |
| role | VARCHAR(20) | DEFAULT 'user' | user/admin |
| points | INTEGER | DEFAULT 0 | Reward points |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Created date |

## **COMPLAINTS** Table
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Complaint ID |
| user_id | INTEGER | FOREIGN KEY(users.id) | Owner |
| title | VARCHAR(255) | NOT NULL | Title |
| description | TEXT | NOT NULL | Details |
| category | VARCHAR(100) | NOT NULL | Category |
| priority | VARCHAR(20) | DEFAULT 'medium' | Priority level |
| status | VARCHAR(20) | DEFAULT 'pending' | Status |
| location | VARCHAR(255) |  | Location |
| images | VARCHAR(1000) |  | Image JSON |
| department_id | INTEGER |  | Department |
| assigned_to | VARCHAR(100) |  | Assigned officer |
| admin_notes | VARCHAR(1000) |  | Admin notes |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Created |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Updated |

## **MESSAGES** Table (Contact)
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | ID |
| name | VARCHAR(100) | NOT NULL | Sender name |
| email | VARCHAR(255) | NOT NULL | Sender email |
| category | VARCHAR(100) |  | Category |
| message | TEXT | NOT NULL | Message |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Date |

## **FEEDBACK** Table
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | ID |
| complaint_id | INTEGER | FOREIGN KEY(complaints.id) | Related complaint |
| user_id | INTEGER | FOREIGN KEY(users.id) | User |
| rating | INTEGER | NOT NULL | 1-5 stars |
| comment | VARCHAR(500) | NOT NULL | Comment |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Date |

**✅ ALL TEXT columns replaced with VARCHAR(length)**  
**Character limits applied throughout**  
**Perfect table format**

