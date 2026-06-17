@echo off
echo ========================================
echo  Markdown 文档对比工具 - 后端启动脚本
echo ========================================
echo.

cd /d "%~dp0"

if not exist "venv" (
    echo 正在创建虚拟环境...
    python -m venv venv
    if errorlevel 1 (
        echo 创建虚拟环境失败，请确保已安装 Python
        pause
        exit /b 1
    )
    echo 虚拟环境创建成功
    echo.
)

echo 激活虚拟环境...
call venv\Scripts\activate.bat

echo 检查依赖...
pip install -r requirements.txt
if errorlevel 1 (
    echo 依赖安装失败
    pause
    exit /b 1
)

echo.
echo 启动 Flask 服务 (端口 5000)...
echo.
echo 服务地址: http://localhost:5000
echo 健康检查: http://localhost:5000/api/health
echo.
echo 按 Ctrl+C 停止服务
echo.

python app.py

pause
