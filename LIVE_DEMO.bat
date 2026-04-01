@echo off
title JAN SAMADHAN Live Demo Launcher
echo ========================================
echo     JAN SAMADHAN - LIVE PREVIEW DEMO
echo ========================================
echo.

REM Backend Server (Port 8000)
echo [1/3] Starting Backend Server...
cd /d "C:\Users\Dell\CascadeProjects\JAN_SAMADHAN"
start "JAN SAMADHAN Backend" cmd /k "color 0A && echo Backend Server Started - Port 8000 && echo Login: admin/admin123 && echo Press Ctrl+C to stop && python backend\fullstack_app.py"

REM Wait for backend to start
timeout /t 3 /nobreak >nul

REM Admin Panel
echo [2/3] Opening Admin Panel...
start "ADMIN PANEL - Section Wise ✅" "frontend\admin-panel.html"

REM Customer Panel (Original Working)
echo [3/3] Opening Customer Panel (Working)...
start "CUSTOMER PANEL ✅" "frontend\customer-panel_ORIGINAL.html"

echo.
echo ========================================
echo LIVE PREVIEW RUNNING! 🎉
echo.
echo 🔐 ADMIN LOGIN: admin / admin123  
echo 📱 ADMIN: Check "Departments" ^> 3 sections + charts
echo 👤 CUSTOMER: Navbar clicks work perfectly
echo.
echo Backend: http://127.0.0.1:8000
echo.
echo Close this window when done.
pause

