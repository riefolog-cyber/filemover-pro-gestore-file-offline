#!/usr/bin/env bash
# FileMover Pro - Avvio diretto Mac/Linux (equivalente di AVVIA_FILEMOVER.bat)
# Uso: ./AVVIA_FILEMOVER.sh   (oppure: bash AVVIA_FILEMOVER.sh)
set -u
cd "$(dirname "$0")"

BASE_PORT="${PORT:-3000}"

have() { command -v "$1" >/dev/null 2>&1; }
open_url() {
  if have xdg-open; then xdg-open "$1" >/dev/null 2>&1 &
  elif have open; then open "$1" >/dev/null 2>&1 &
  else echo "Apri manualmente: $1"; fi
}

echo "====================================================================="
echo "                    FILEMOVER PRO - AVVIO DIRETTO"
echo "====================================================================="

if [ ! -f "server.js" ]; then
  echo "[ERRORE] server.js non trovato in: $(pwd)"
  [ -f "AVVIA_FILEMOVER.html" ] && { echo "[INFO] Apro la versione browser autonoma..."; open_url "AVVIA_FILEMOVER.html"; }
  exit 1
fi

if ! have node; then
  echo "[INFO] Node.js non rilevato: apro AVVIA_FILEMOVER.html nel browser."
  echo "       (Installa Node.js da https://nodejs.org per gli spostamenti reali su disco)"
  open_url "AVVIA_FILEMOVER.html"
  exit 0
fi

echo "[OK] Node.js rilevato: $(node -v)"
echo

# Porta: rispetta PORT se impostata, altrimenti 3000.
# Se occupata dal nostro server la riusa, altrimenti prova la successiva (max +10).
PORT="$BASE_PORT"
for _ in $(seq 0 10); do
  if have curl && curl -s -m 3 "http://127.0.0.1:$PORT/api/status" 2>/dev/null | grep -q connected; then
    echo "[OK] FileMover Pro e' gia' attivo su http://127.0.0.1:$PORT"
    open_url "http://127.0.0.1:$PORT/"
    exit 0
  fi
  if (echo > /dev/tcp/127.0.0.1/$PORT) 2>/dev/null; then
    echo "[INFO] Porta $PORT occupata, provo la successiva..."
    PORT=$((PORT + 1))
    continue
  fi
  break
done

echo "[OK] Uso la porta $PORT."
echo "Avvio del motore FileMover Pro con accesso disco diretto..."
SERVER_LOG="/tmp/filemover-server-$PORT.log"
PORT="$PORT" nohup node server.js > "$SERVER_LOG" 2>&1 &
SERVER_PID=$!
echo "Server PID: $SERVER_PID (log: $SERVER_LOG)"

READY=0
for _ in $(seq 1 20); do
  if have curl && curl -s -m 2 "http://127.0.0.1:$PORT/api/status" 2>/dev/null | grep -q connected; then READY=1; break; fi
  sleep 1
done

if [ "$READY" = "1" ]; then
  echo "FileMover Pro ATTIVO su http://127.0.0.1:$PORT/ (Ctrl+C qui per arrestare il server)"
  open_url "http://127.0.0.1:$PORT/"
  wait "$SERVER_PID"
else
  echo "[ERRORE] Il server non risponde (vedi $SERVER_LOG). Apro la versione browser..."
  kill "$SERVER_PID" 2>/dev/null
  open_url "AVVIA_FILEMOVER.html"
  exit 1
fi
