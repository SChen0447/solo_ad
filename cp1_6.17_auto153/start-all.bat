@echo off
echo ========================================
echo  Markdown 文档对比工具 - 一键启动
echo ========================================
echo.

cd /d "%~dp0"

echo [1/2] 启动后端服务...
start "Backend Server" cmd /k "cd backend && start.bat"

timeout /t 3 /nobreak > nul

echo [2/2] 启动前端服务...
start "Frontend Server" cmd /k "cd frontend && start.bat"

echo.
echo ========================================
echo  服务启动中...
echo ========================================
echo.
echo 后端地址: http://localhost:5000
echo 前端地址: http://localhost:3000
echo.
echo 请在浏览器中打开 http://localhost:3000
echo.
pause
