@echo off
setlocal

:: Define where the Windows command will live
set "INSTALL_DIR=%USERPROFILE%\.local\bin"
if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"
set "SCRIPT_PATH=%INSTALL_DIR%\kassist.bat"

echo Installing 'kassist' command for Windows...

:: Generate the actual runner script (kassist.bat)
(
echo @echo off
echo setlocal enabledelayedexpansion
echo.
echo set "REPO_URL=https://github.com/Kartik20122002/kap_assist.git"
echo set "APP_DIR=%%USERPROFILE%%\kap_assist"
echo set "BRANCH=master"
echo set "APP_URL=http://localhost:4242"
echo.
echo echo === Kap Assist [kassist] ===
echo.
echo where node ^>nul 2^>nul
echo if errorlevel 1 ^(
echo     echo Error: 'node' is not installed. Please install it first.
echo     exit /b 1
echo ^)
echo.
echo where git ^>nul 2^>nul
echo if errorlevel 1 ^(
echo     echo Error: 'git' is not installed. Please install it first.
echo     exit /b 1
echo ^)
echo.
echo set NEEDS_BUILD=false
echo.
echo if not exist "%%APP_DIR%%" ^(
echo     echo Repository not found. Cloning to %%APP_DIR%%...
echo     git clone "%%REPO_URL%%" "%%APP_DIR%%"
echo     set NEEDS_BUILD=true
echo ^) else ^(
echo     echo Checking for updates...
echo     cd /d "%%APP_DIR%%"
echo     git fetch origin "%%BRANCH%%"
echo     for /f "tokens=*" %%%%a in ^('git rev-parse HEAD'^) do set LOCAL=%%%%a
echo     for /f "tokens=*" %%%%a in ^('git rev-parse origin/%%BRANCH%%'^) do set REMOTE=%%%%a
echo     if "!LOCAL!" NEQ "!REMOTE!" ^(
echo         echo Updates found! Pulling latest code...
echo         git pull origin "%%BRANCH%%"
echo         set NEEDS_BUILD=true
echo     ^)
echo ^)
echo.
echo cd /d "%%APP_DIR%%"
echo.
echo if not exist ".next" ^(
echo     set NEEDS_BUILD=true
echo ^)
echo.
echo if "!NEEDS_BUILD!"=="true" ^(
echo     echo Installing dependencies...
echo     call npm install
echo     echo Building the application...
echo     call npm run build
echo     if errorlevel 1 ^(
echo         echo Build failed - Please try again later.
echo         exit /b 1
echo     ^)
echo ^)
echo.
echo echo Starting application...
echo start "" "%%APP_URL%%"
echo call npm start
) > "%SCRIPT_PATH%"

echo.
echo Adding the command to your Windows PATH...
:: A small PowerShell one-liner to securely append the path to the Environment Variable permanently
powershell -NoProfile -Command "$p = [Environment]::GetEnvironmentVariable('Path', 'User'); if ($p -notmatch [regex]::Escape('%INSTALL_DIR%')) { [Environment]::SetEnvironmentVariable('Path', $p + ';%INSTALL_DIR%', 'User') }"

echo.
echo ==========================================
echo [OK] Installation Complete!
echo ==========================================
echo You MUST close this window and open a NEW Terminal / Command Prompt.
echo After that, you can simply type:
echo   kassist
echo anywhere to instantly update and start the app!
echo.
pause
