@echo off
echo ===============================================================================
echo AI-Powered Automatic Block Planning to Maximize Asset Availability
echo MUSIC-3D-Based Spare-Part Inventory Intelligence for Indian Railways
echo ===============================================================================
echo.

echo 1. Initializing and Seeding Database...
python backend/seed_data.py
if %ERRORLEVEL% NEQ 0 (
    echo Error during database initialization!
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo 2. Starting Unified Full-Stack Server at http://localhost:8000 ...
echo (FastAPI Backend + React Frontend + API Docs at http://localhost:8000/docs)
echo Press Ctrl+C to terminate.
echo.
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --app-dir backend
pause
