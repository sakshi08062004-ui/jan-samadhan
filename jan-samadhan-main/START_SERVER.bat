@echo off
title JAN SAMADHAN Backend Server Starter
color 0A
echo.
echo ========================================
echo    JAN SAMADHAN Backend Starter
echo ========================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python is not installed or not in PATH
    echo    Please install Python from https://python.org
    echo    Make sure to add Python to PATH during installation
    pause
    exit /b 1
)

echo ✅ Python detected
echo.

REM Navigate to backend directory
cd /d "%~dp0backend"
if errorlevel 1 (
    echo ❌ Backend directory not found
    echo    Please make sure you're running this from the JAN SAMADHAN folder
    pause
    exit /b 1
)

echo 📁 Changed to backend directory
echo.

REM Check if backend files exist
if not exist "fullstack_app.py" (
    echo ❌ fullstack_app.py not found
    echo    Please make sure all backend files are present
    pause
    exit /b 1
)

echo ✅ Backend files found
echo.

REM Check if port 8000 is available
netstat -an | findstr :8000 | findstr LISTENING >nul
if not errorlevel 1 (
    echo ⚠️  Port 8000 is already in use
    echo.
    echo Please close any other application using port 8000 and try again.
    pause
    exit /b 1
)

echo ✅ Port 8000 is available
echo.

REM Install required packages
echo 📦 Checking and installing required packages...
python -m pip install fastapi uvicorn pydantic python-multipart python-jose[cryptography] passlib[bcrypt] PyJWT requests flask flask-cors werkzeug
if errorlevel 1 (
    echo ❌ Failed to install required packages
    pause
    exit /b 1
)

echo ✅ Required packages checked/installed
echo.

REM Start the backend server
echo 🚀 Starting JAN SAMADHAN Backend Server...
echo    File: fullstack_app.py
echo    Port: 8000
echo    URL: http://localhost:8000
echo.
echo ========================================
echo    Press Ctrl+C to stop the server
echo ========================================
echo.

python -m uvicorn fullstack_app:app --host 0.0.0.0 --port 8000 --reload

echo.
echo 🛑 Server stopped
pause
