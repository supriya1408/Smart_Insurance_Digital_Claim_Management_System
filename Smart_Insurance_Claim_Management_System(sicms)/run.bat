@echo off
REM Starts the complete application (API + frontend) on http://localhost:8080
cd /d "%~dp0backend"
where mvn >nul 2>nul
if errorlevel 1 (
  echo Maven ^(mvn^) was not found on PATH.
  echo Open the "backend" folder in IntelliJ IDEA and run SicmsApplication instead.
  pause
  exit /b 1
)
echo Starting Smart Insurance Claim Management System...
echo When you see "Started SicmsApplication", open http://localhost:8080
call mvn spring-boot:run
pause
