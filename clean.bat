@echo off
echo ================================
echo    CLEAN RWA PROJECT
echo ================================
echo.

echo [1/3] Killing all Node.js processes...
taskkill /F /IM node.exe 2>nul
if %errorlevel% equ 0 (
    echo     Success: All Node.js processes killed
) else (
    echo     No Node.js processes running
)
echo.

echo [2/3] Cleaning backend cache...
cd backend
if exist cache rmdir /S /Q cache
if exist artifacts rmdir /S /Q artifacts
if exist deployments\localhost.json del /F /Q deployments\localhost.json
if exist node_modules\.cache rmdir /S /Q node_modules\.cache
echo     Success: Backend cache cleaned
echo.

echo [3/3] Cleaning frontend cache...
cd ..\frontend
if exist node_modules\.cache rmdir /S /Q node_modules\.cache
if exist dist rmdir /S /Q dist
echo     Success: Frontend cache cleaned
echo.

echo ================================
echo    CLEAN COMPLETED!
echo ================================
echo.
echo Next steps:
echo 1. Clear MetaMask activity data
echo 2. Run start-node.bat
echo 3. Run deploy-and-seed.bat
echo 4. Run start-frontend.bat
echo.
pause
