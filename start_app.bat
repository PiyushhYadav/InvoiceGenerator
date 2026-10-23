@echo off
title Piyush Welding and Fabrication Invoice Automation


:: Set working directory to project root
cd /d "%~dp0"

:: 1. Check Python
python --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ======================================================================
    echo [ERROR] Python was not found in your system PATH!
    echo.
    echo Please install Python 3.10 or newer from python.org and make sure to
    echo check "Add Python to PATH" during installation.
    echo ======================================================================
    echo.
    pause
    exit /b 1
)

:: 2. Check Word Template
if not exist "template\Bill_PW_004.docx" (
    echo ======================================================================
    echo [ERROR] Original Word template Bill_PW_004.docx not found in:
    echo "%~dp0template\Bill_PW_004.docx"
    echo ======================================================================
    echo.
    pause
    exit /b 1
)

:: 3. Launch Application silently in the background
start "" pythonw.exe run.py
exit /b 0
