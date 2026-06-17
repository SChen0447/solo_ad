@echo off
echo ========================================
echo  Markdown 文档对比工具 - 前端启动脚本
echo ========================================
echo.

cd /d "%~dp0"

echo 检查 Node.js...
node --version
if errorlevel 1 (
    echo 未检测到 Node.js，请先安装 Node.js
    pause
    exit /b 1
)

echo.
echo 检查依赖...
if not exist "node_modules" (
    echo 正在安装依赖...
    npm install
    if errorlevel 1 (
        echo 依赖安装失败
        pause
        exit /b 1
    )
    echo 依赖安装成功
)

echo.
echo 启动开发服务器 (端口 3000)...
echo.
echo 前端地址: http://localhost:3000
echo API代理: /api -> http://localhost:5000
echo.
echo 按 Ctrl+C 停止服务
echo.

npm run dev

pause
