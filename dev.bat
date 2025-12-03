@echo off
echo Starting server and client...
start "Server" cmd /k "npm run dev:server"
timeout /t 2 /nobreak >nul
start "Client" cmd /k "npm run dev:client"
echo Both servers started in separate windows.
echo Close the windows to stop the servers.

