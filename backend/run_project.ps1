Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host "AI-Powered Automatic Block Planning to Maximize Asset Availability" -ForegroundColor Cyan
Write-Host "MUSIC-3D-Based Spare-Part Inventory Intelligence for Indian Railways" -ForegroundColor Cyan
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "1. Initializing and Seeding Database from Excel Workbook..." -ForegroundColor Yellow
python backend/seed_data.py

Write-Host ""
Write-Host "2. Starting Full-Stack Application on http://127.0.0.1:8000 ..." -ForegroundColor Green
Write-Host "   Frontend Application: http://127.0.0.1:8000" -ForegroundColor Green
Write-Host "   Swagger API Docs:     http://127.0.0.1:8000/docs" -ForegroundColor Green
Write-Host ""

python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --app-dir backend
