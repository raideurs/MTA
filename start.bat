@echo off
echo Pulling latest changes from main...
git pull origin main
if %ERRORLEVEL% neq 0 (
    echo Failed to pull from main. Please check your git configuration.
    pause
    exit /b 1
)

echo Installing dependencies...
call npm install
if %ERRORLEVEL% neq 0 (
    echo Failed to install dependencies.
    pause
    exit /b 1
)

echo Starting the application...
call npm start
