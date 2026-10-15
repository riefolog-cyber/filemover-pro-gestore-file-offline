@echo off
setlocal EnableDelayedExpansion
title FileMover Pro - Avvio Diretto

cd /d "%~dp0"

echo =====================================================================
echo                     FILEMOVER PRO - AVVIO DIRETTO
echo =====================================================================
echo.

rem 0. File indispensabili: senza server.js si apre comunque l'HTML autonomo
if not exist "%~dp0server.js" (
    echo [ERRORE] server.js non trovato in: %~dp0
    if exist "%~dp0AVVIA_FILEMOVER.html" (
        echo [INFO] Apro comunque la versione browser autonoma...
        start "" "%~dp0AVVIA_FILEMOVER.html"
    )
    echo.
    pause
    exit /b 1
)

rem 1. Node.js presente? Altrimenti ripiego sulla versione browser autonoma
where node >nul 2>nul
if %errorlevel% neq 0 goto :no_node

for /f "tokens=*" %%v in ('node -v 2^>nul') do set "NODE_VER=%%v"
echo [OK] Node.js rilevato: !NODE_VER!
echo.

rem 2. Porta: rispetta PORT se impostata, altrimenti 3000.
rem    Se occupata dal nostro server la riusa, altrimenti prova la successiva (max +10).
if not defined PORT set "PORT=3000"
set "BASE_PORT=%PORT%"
set "SERVER_LOG=%TEMP%\filemover-server-%PORT%.log"

:find_port
netstat -ano 2>nul | findstr /R /C:":%PORT% .*LISTENING" >nul 2>nul
if %errorlevel% neq 0 goto :port_free
echo [INFO] Porta %PORT% occupata: verifico se e' gia' FileMover Pro...
powershell -NoProfile -ExecutionPolicy Bypass -Command "try { Invoke-WebRequest -UseBasicParsing -TimeoutSec 3 http://127.0.0.1:%PORT%/api/status | Out-Null; exit 0 } catch { exit 1 }" >nul 2>nul
if %errorlevel% equ 0 (
    echo [OK] FileMover Pro e' gia' attivo sulla porta %PORT%.
    set "SERVER_LOG=%TEMP%\filemover-server-%PORT%.log"
    goto :open_browser
)
:port_next
set /a PORT+=1
set /a MAX_PORT=%BASE_PORT%+10
if %PORT% gtr !MAX_PORT! (
    echo [ERRORE] Nessuna porta libera tra %BASE_PORT% e !MAX_PORT!.
    echo.
    pause
    exit /b 1
)
goto :find_port

:port_free
echo [OK] Uso la porta %PORT%.
echo.
echo Avvio del motore FileMover Pro con accesso disco diretto...
echo (Spostamenti reali sul disco, zero permessi o richieste esterne)
echo.

rem 3. Avvio server in background con log su file (niente piu' errori nascosti).
rem    Log per-porta in TEMP: evita conflitti se un vecchio server e' ancora attivo.
set "SERVER_LOG=%TEMP%\filemover-server-%PORT%.log"
start "FileMover Pro - Server" /b node server.js > "%SERVER_LOG%" 2>&1

rem 4. Attendo che /api/status risponda davvero (max ~20 secondi), non un timeout fisso.
rem    Uso 127.0.0.1 e non "localhost": su alcuni PC localhost risolve in ::1 (IPv6)
rem    e il controllo andrebbe in timeout anche a server attivo.
echo Attesa avvio server sulla porta %PORT%...
set "READY=0"
for /L %%I in (1,1,20) do (
    powershell -NoProfile -ExecutionPolicy Bypass -Command "try { Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 http://127.0.0.1:%PORT%/api/status | Out-Null; exit 0 } catch { exit 1 }" >nul 2>nul
    if !errorlevel! equ 0 (
        set "READY=1"
        goto :server_ready
    )
    timeout /t 1 /nobreak >nul
)

:server_ready
if "%READY%"=="1" goto :open_browser
echo.
echo [ERRORE] Il server non risponde sulla porta %PORT%.
echo Dettagli nel file: %SERVER_LOG%
echo.
if exist "%~dp0AVVIA_FILEMOVER.html" (
    echo [INFO] Apro la versione browser autonoma come ripiego...
    start "" "%~dp0AVVIA_FILEMOVER.html"
)
echo.
pause
exit /b 1

:open_browser
echo.
echo Apertura dell'applicazione nel browser predefinito...
start http://127.0.0.1:%PORT%/
echo.
echo =====================================================================
echo   FileMover Pro e' ATTIVO su: http://127.0.0.1:%PORT%/
echo.
echo   - Operazioni REALI sul disco attive (Sposta / Copia)
echo   - Log server: %SERVER_LOG%
echo   - Per arrestare il server, chiudi questa finestra.
echo =====================================================================
echo.
pause
exit /b 0

:no_node
echo [INFO] Node.js non rilevato. Avvio in modalita browser diretta...
echo         (Installa Node.js da https://nodejs.org per gli spostamenti reali su disco)
if exist "%~dp0AVVIA_FILEMOVER.html" (
    start "" "%~dp0AVVIA_FILEMOVER.html"
    echo Aperto AVVIA_FILEMOVER.html nel tuo browser.
    echo NOTA: senza server locale, usa i picker del browser + ZIP/script.
) else (
    echo [ERRORE] File AVVIA_FILEMOVER.html non trovato nella cartella.
)
echo.
pause
exit /b 0
