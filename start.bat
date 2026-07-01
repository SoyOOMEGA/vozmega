@echo off
cd /d C:\Users\oomegacypher\Desktop\voice-alerts

echo ================================
echo   🎤 Voice Alerts iniciando
echo ================================
echo.

echo [1/2] Verificando Node...
node -v
if %errorlevel% neq 0 (
    echo ❌ Node.js no funciona
    pause
    exit
)

echo.
echo [2/2] Iniciando servidor...
echo.

node server.js

echo.
echo ================================
echo El servidor se detuvo
echo ================================
pause