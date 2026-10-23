@echo off
title Stop Piyush Invoice Generator
echo Stopping Piyush Invoice Generator background process...
powershell -NoProfile -Command "(Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue).OwningProcess | Sort-Object -Unique | ForEach-Object { if ($_ -gt 0) { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue } }"
echo Application stopped successfully.
timeout /t 2 >nul
