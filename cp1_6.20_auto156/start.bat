@echo off
echo Starting Mood Collage Wall...
echo.

echo [1/2] Starting Flask backend...
start "Flask Backend" /B python app.py

timeout /t 2 /nobreak >nul

echo [2/2] Starting Vite frontend...
echo.
npm run dev

pause
