@echo off
REM Crafted Realm - double-click to start the local review server on 127.0.0.1:8777.
REM Clears any stale server, stamps the build, then serves. Close this window to stop.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0serve.ps1"
echo.
echo Server stopped. Press any key to close.
pause >nul
