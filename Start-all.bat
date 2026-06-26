@echo off
title LogiEat OS - Start All
cd /d "%~dp0"
set "ROOT=%~dp0"

echo =====================================================
echo   LogiEat OS  -  menyalakan semua server
echo =====================================================
echo.

REM --- cari folder PHP Laragon secara otomatis ---
set "PHP="
for /d %%d in ("C:\laragon\bin\php\php-*") do set "PHP=%%d"

REM --- 1) MySQL: buka Laragon, klik "Start All" untuk MySQL ---
echo [1/4] Membuka Laragon (klik "Start All" untuk MySQL)...
if exist "C:\laragon\laragon.exe" start "" "C:\laragon\laragon.exe"
timeout /t 4 >nul

REM --- 2) AI service (FastAPI / app.py) :9000 ---
echo [2/4] AI service app.py  -  http://127.0.0.1:9000
start "LogiEat AI :9000" cmd /k "cd /d %ROOT%ai-service & .venv\Scripts\python.exe -m uvicorn app:app --host 127.0.0.1 --port 9000"

REM --- 3) Go core (realtime + AI bridge) :8080 ---
echo [3/4] Go core            -  http://0.0.0.0:8080
start "LogiEat Go :8080" cmd /k "cd /d %ROOT%backend-go & set JWT_SECRET=logieat-dev-shared-secret-change-in-prod& set DB_DSN=root:@tcp(127.0.0.1:3306)/logieat?parseTime=true& set AI_SERVICE_URL=http://127.0.0.1:9000& go run ./cmd/server"

REM --- 4) Laravel (web + API) :8001  (host 0.0.0.0 supaya HP bisa akses) ---
echo [4/4] Laravel web + API  -  http://0.0.0.0:8001
start "LogiEat Laravel :8001" cmd /k "cd /d %ROOT%admin-laravel & set PATH=%PHP%;%PATH%& php artisan serve --host=0.0.0.0 --port=8001"

echo.
echo -----------------------------------------------------
echo  SELESAI. Pastikan MySQL di Laragon sudah "Start All".
echo.
echo  Web admin (PC) : http://localhost:8001
echo  HP / APK       : http://192.168.18.39:8001
echo.
echo  Tutup jendela cmd masing-masing untuk mematikan server.
echo -----------------------------------------------------
pause
