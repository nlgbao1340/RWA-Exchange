@echo off
cls
echo.
echo ========================================
echo     RWA LENDING PLATFORM
echo     QUICK START GUIDE
echo ========================================
echo.
echo This script will guide you through running the project.
echo.
echo PREREQUISITES:
echo [√] Node.js installed
echo [√] MetaMask extension installed
echo [√] npm install completed in both folders
echo.
echo ========================================
echo.

:MENU
echo Choose an option:
echo.
echo [1] FULL RESET (Clean cache and restart)
echo [2] QUICK START (Normal startup)
echo [3] Exit
echo.
set /p choice="Enter your choice (1-3): "

if "%choice%"=="1" goto FULL_RESET
if "%choice%"=="2" goto QUICK_START
if "%choice%"=="3" goto EXIT
goto MENU

:FULL_RESET
echo.
echo ========================================
echo     FULL RESET
echo ========================================
echo.
echo Step 1: Killing all Node.js processes...
taskkill /F /IM node.exe 2>nul
echo Done!
echo.

echo Step 2: Cleaning backend cache...
cd backend
if exist cache rmdir /S /Q cache
if exist artifacts rmdir /S /Q artifacts
if exist deployments\localhost.json del /F /Q deployments\localhost.json
cd ..
echo Done!
echo.

echo Step 3: Cleaning frontend cache...
cd frontend
if exist node_modules\.cache rmdir /S /Q node_modules\.cache
if exist dist rmdir /S /Q dist
cd ..
echo Done!
echo.

echo ========================================
echo     RESET COMPLETE!
echo ========================================
echo.
echo IMPORTANT: Clear MetaMask cache now!
echo 1. Open MetaMask
echo 2. Settings -^> Advanced
echo 3. Click "Clear activity tab data"
echo.
pause
cls
goto QUICK_START

:QUICK_START
echo.
echo ========================================
echo     STARTING PROJECT
echo ========================================
echo.
echo You need to open 3 separate terminals:
echo.
echo TERMINAL 1: Run Hardhat Node
echo    cd backend
echo    npm run node
echo.
echo TERMINAL 2: Deploy and Seed (wait 5s after Terminal 1 starts)
echo    cd backend
echo    npm run deploy
echo    npm run seed
echo.
echo TERMINAL 3: Start Frontend
echo    cd frontend
echo    npm run dev
echo.
echo ========================================
echo.
echo Would you like to:
echo [1] Open Terminal 1 (Hardhat Node)
echo [2] Open Terminal 2 (Deploy ^& Seed)
echo [3] Open Terminal 3 (Frontend)
echo [4] Open all terminals
echo [5] Back to menu
echo.
set /p term_choice="Enter your choice (1-5): "

if "%term_choice%"=="1" goto TERM1
if "%term_choice%"=="2" goto TERM2
if "%term_choice%"=="3" goto TERM3
if "%term_choice%"=="4" goto TERM_ALL
if "%term_choice%"=="5" goto MENU

:TERM1
echo.
echo Opening Terminal 1 - Hardhat Node...
start cmd /k "cd backend && echo Starting Hardhat Node... && echo Keep this window open! && npm run node"
echo Done!
timeout /t 2 >nul
goto QUICK_START

:TERM2
echo.
echo Opening Terminal 2 - Deploy and Seed...
start cmd /k "cd backend && echo Waiting 5 seconds... && timeout /t 5 && echo Deploying contracts... && npm run deploy && echo Seeding data... && npm run seed && echo Done! Press any key to close. && pause"
echo Done!
timeout /t 2 >nul
goto QUICK_START

:TERM3
echo.
echo Opening Terminal 3 - Frontend...
start cmd /k "cd frontend && echo Starting Frontend... && npm run dev"
echo Done!
timeout /t 2 >nul
goto QUICK_START

:TERM_ALL
echo.
echo Opening all terminals...
echo.
echo Terminal 1: Hardhat Node
start cmd /k "cd backend && echo [TERMINAL 1] Starting Hardhat Node... && echo Keep this window open! && npm run node"
timeout /t 2 >nul

echo Terminal 2: Deploy and Seed
start cmd /k "cd backend && echo [TERMINAL 2] Waiting for node to start... && timeout /t 8 && echo Deploying contracts... && npm run deploy && echo. && echo Seeding data... && npm run seed && echo. && echo Done! Press any key to close. && pause"
timeout /t 2 >nul

echo Terminal 3: Frontend
start cmd /k "cd frontend && echo [TERMINAL 3] Starting Frontend... && timeout /t 12 && npm run dev"
echo.
echo Done! All terminals opened.
echo.
echo ========================================
echo     NEXT STEPS
echo ========================================
echo.
echo 1. Wait for all terminals to finish loading
echo 2. Open browser: http://localhost:3000
echo 3. Configure MetaMask (see START.md)
echo 4. Import test account:
echo    Private Key: 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
echo 5. Connect wallet and explore!
echo.
pause
goto MENU

:EXIT
echo.
echo Goodbye!
timeout /t 1 >nul
exit

