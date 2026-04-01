# JAN SAMADHAN - Public Grievance Redressal System

A full-stack web platform for citizens to file, track, and manage public service complaints.

---

## 🚀 Start the Server

Terminal (recommended)
```bash
cd backend
python -m uvicorn fullstack_app:app --host 0.0.0.0 --port 8000 --reload
```
Keep this terminal open; closing it stops the site.

One-click (Windows)
- Double-click `START_SERVER.bat` in the project root. It installs dependencies if needed and starts the same server on port 8000.

---

## 🌐 Access the Website

Once the server is running, open your browser and go to:

| Panel | URL |
|-------|-----|
| 🏠 Customer Panel | http://localhost:8000/customer-panel.html |
| 🛠️ Admin Panel | http://localhost:8000/admin-panel.html |

> **Note:** Keep the terminal open while using the site. Closing it will stop the server.

---

## 📦 Requirements

- Python 3.8+
- pip packages (auto-installed by `START_SERVER.bat`):
  - `fastapi`, `uvicorn`, `pydantic`, `python-multipart`
  - `python-jose`, `passlib`, `PyJWT`, `flask`, `flask-cors`

To install manually:
```bash
pip install fastapi uvicorn pydantic python-multipart python-jose[cryptography] passlib[bcrypt] PyJWT flask flask-cors
```

---

## 📁 Project Structure

```
JAN_SAMADHAN/
├── backend/                  # Python FastAPI backend
│   └── fullstack_app.py      # Main server file
├── frontend/                 # Web frontend (HTML/CSS/JS)
│   └── customer-panel.html   # Customer panel
├── START_SERVER.bat          # One-click server starter (Windows)
├── jan_samadhan_fullstack.db # SQLite database
└── README.md                 # This file
```

---

## 🏗️ Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript, Bootstrap 5
- **Backend**: Python, FastAPI, Uvicorn
- **Database**: SQLite
- **Auth**: JWT-based authentication

---

**Developed by**: JAN SAMADHAN Development Team  
**Version**: 2.0.0
