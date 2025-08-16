@echo off
title Royal Bakery Local Server
cd /d %~dp0

rem Open browser automatically (PC IP detect)
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4 Address"') do set ip=%%a
set ip=%ip: =%

start "" http://%ip%:3000

powershell -ExecutionPolicy Bypass -File "%~dp0start_server.ps1" 3000
