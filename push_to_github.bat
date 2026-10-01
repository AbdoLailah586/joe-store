@echo off
chcp 65001 >nul
echo ========================================================
echo        JOE Store - Push Updates to GitHub & Vercel
echo ========================================================
echo.

cd /d "%~dp0"

:: Check if git is installed
where git >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Git is not installed or not in PATH!
    pause
    exit /b 1
)

:: Get commit message
set "COMMIT_MSG=%~1"
if "%COMMIT_MSG%"=="" (
    set "COMMIT_MSG=Update JOE Store UI and features"
)

echo [1/4] Staging files...
git add .

echo [2/4] Committing changes...
git commit -m "%COMMIT_MSG%"

:: Check if origin remote exists
git remote get-url origin >nul 2>nul
if %errorlevel% neq 0 (
    echo.
    echo [!] Remote repository 'origin' is not set yet.
    set /p REPO_URL="Enter your GitHub Repository URL (e.g. https://github.com/username/joe-store.git): "
    if not "%REPO_URL%"=="" (
        git remote add origin "%REPO_URL%"
        git branch -M main
    ) else (
        echo [ERROR] No GitHub URL provided. Please add remote with: git remote add origin ^<URL^>
        pause
        exit /b 1
    )
)

echo [3/4] Pushing to GitHub (main branch)...
git push -u origin main

if %errorlevel% equ 0 (
    echo.
    echo ========================================================
    echo   [SUCCESS] Successfully pushed to GitHub!
    echo   Vercel will automatically trigger the new deployment.
    echo ========================================================
) else (
    echo.
    echo [!] Push failed. If this is the first push with an existing remote:
    echo     Trying: git push -u origin main --force
    git push -u origin main
)

echo.
pause
