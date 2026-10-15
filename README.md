# FileMover Pro — Gestore File Offline

Applicazione **100% offline** per spostare, copiare e organizzare file tra cartelle con criteri avanzati (estensioni, nomi, dimensioni, date, sottocartelle) e **anteprima obbligatoria** prima di ogni operazione. Nessun dato lascia il tuo computer: niente cloud, niente telemetria, niente account.

![Offline](https://img.shields.io/badge/offline-100%25-emerald) ![License](https://img.shields.io/badge/license-Apache--2.0-blue) ![Node](https://img.shields.io/badge/node-%3E%3D18-339933)

---

## 1. Avvio rapido

### Windows — 1 clic

Fai doppio clic su **`AVVIA_FILEMOVER.bat`**. Lo script fa tutto da solo:

1. Se Node.js **manca** → apre `AVVIA_FILEMOVER.html` nel browser (versione autonoma, vedi §5).
2. Se la porta 3000 è già occupata da FileMover Pro → la **riusa** (niente server doppi); se è occupata da altro → passa a 3001, 3002… (rispetta la variabile `PORT` se impostata).
3. Avvia `server.js` (**zero dipendenze**, niente `npm install`) e aspetta che risponda davvero prima di aprire il browser.
4. Se il server non parte → lo scrive nel log (`%TEMP%\filemover-server-<porta>.log`) e apre l'HTML come ripiego.

Per arrestare il server: chiudi la finestra del terminale.

### Mac / Linux

```bash
bash AVVIA_FILEMOVER.sh
```

Stessa automazione del `.bat` (log in `/tmp/filemover-server-<porta>.log`, `Ctrl+C` per arrestare). In alternativa apri direttamente `AVVIA_FILEMOVER.html` nel browser.

### Senza Node.js (qualsiasi PC)

Apri **`AVVIA_FILEMOVER.html`**: è il build aggiornato e autonomo dell'app (single-file). Su **Chrome/Edge** fa tutto, spostamenti reali su disco inclusi; su Firefox/Safari vedi §5.

---

## 2. Come si usa (i 4 passi)

L'interfaccia guida il flusso in alto: **1. Cartelle → 2. Criteri → 3. Destinazione → 4. Anteprima Obbligatoria**.

### Passo 1–2. Cartella di origine e destinazione

- Clicca **"Sfoglia Cartella con Esplora Risorse"** per scegliere origine e destinazione.
- Oppure **digita/incolla il percorso** manualmente (es. `C:\Users\giova\Desktop\MieFoto`).
- La destinazione può essere una cartella esistente o un nuovo percorso (verrà creato).

### Passo 2b. Criteri di selezione e filtro

| Criterio | Cosa fa |
|---|---|
| **Estensioni** | Tutte, solo incluse o tutte tranne le escluse (tag rapidi + campo libero) |
| **Nome file** | Contiene / inizia / finisce / esatto / regex, con opzione maiuscole-minuscole |
| **Dimensione** | Maggiore di / minore di / compresa tra (B, KB, MB, GB) |
| **Data modifica** | Ultimi N giorni / dopo il / prima del / intervallo |
| **Sottocartelle** | Scansione ricorsiva, profondità massima, ignora file nascosti/di sistema |

Il contatore "N di M file corrispondono" si aggiorna in tempo reale.

### Passo 3. Regole di collocazione

- **Modalità**: Sposta (elimina gli originali) oppure Copia (li conserva).
- **Alberatura**: mantieni struttura originale · appiattisci tutto · raggruppa per estensione · raggruppa per data (AAAA/MM) · sottocartella personalizzata.
- **Conflitti di omonimia**: rinomina con `(1)`, `(2)`… (consigliato) · sovrascrivi · salta.

### Passo 4. Anteprima obbligatoria ed esecuzione

Nessun file viene toccato prima che tu prema **Avvia Spostamento/Copia**. L'anteprima mostra per ogni file: origine, dimensione, data e **destinazione calcolata**, con ricerca, filtri (conformi/esclusi/tutti), selezione singola o totale e dettaglio dei criteri soddisfatti.

A operazione completata: barra di avanzamento, registro per-file e **report CSV** scaricabile.

---

## 3. Modalità di esecuzione

| Modalità | Quando si usa | Come |
|---|---|---|
| **Server locale** | Sempre che è attivo (banner verde "Motore Disco Diretto") | Spostamento/copia reali via API, anche tra dischi diversi |
| **Browser nativo** (Chrome/Edge) | Senza server, con permessi di scrittura concessi | File System Access API, reale su disco |
| **Script 1-clic** | Senza permessi diretti | Scarica `.ps1` / `.bat` (Windows) o `.sh` (Mac/Linux) ed eseguilo |
| **Archivio ZIP** | Solo export | ZIP con la nuova struttura già organizzata |

Dalla modale di esecuzione puoi sempre ripiegare su ZIP o script.

---

## 4. Struttura del progetto

```
AVVIA_FILEMOVER.bat     Avvio automatico Windows (Node opzionale)
AVVIA_FILEMOVER.sh      Avvio automatico Mac/Linux
AVVIA_FILEMOVER.html    App autonoma single-file (senza Node)
server.js               Server standalone zero-dipendenze (npm start / .bat / .sh)
server.ts               Server di sviluppo Express + Vite HMR (npm run dev)
                        I due server espongono le stesse API: se modifichi un
                        endpoint, riporta la modifica anche nell'altro.
src/                    Frontend React + TypeScript + Tailwind
  components/           Header, FolderSelector, CriteriaPanel,
                        DestinationSettingsPanel, PreviewSection,
                        ExecutionModal, ScriptModal, OfflineBanner
  utils/fileSystem.ts   Filtri, calcolo destinazioni, scan, script, ZIP
  types/fileMover.ts    Tipi condivisi
```

API del server: `GET /api/status`, `GET /api/drives`, `POST /api/list-dir`, `POST /api/create-dir`, `POST /api/browse`, `POST /api/scan`, `POST /api/execute`.

---

## 5. Senza Node.js: cosa cambia per browser

| Browser | Lettura cartelle | Scrittura diretta su disco | Alternativa |
|---|---|---|---|
| Chrome / Edge | ✔️ | ✔️ (con autorizzazione) | — |
| Firefox / Safari | ✔️ (sola lettura) | ❌ | ZIP o script generati dall'app |

---

## 6. Risoluzione problemi

| Sintomo | Causa probabile | Soluzione |
|---|---|---|
| Il `.bat` dice "server non risponde" ma poi tutto funziona | Su alcuni PC `localhost` risolve in IPv6 (`::1`) | Dalla v1.0.0 i controlli usano `127.0.0.1`: aggiorna i file ed esegui di nuovo |
| Porta 3000 occupata | Altro programma o vecchio server attivo | Il `.bat`/`.sh` riusa il server se è FileMover, altrimenti cambia porta da solo |
| "Nessuna cartella di scrittura autorizzata" | Destinazione non selezionata col picker | Riseleziona la destinazione con "Sfoglia Cartella", oppure avvia col `.bat` |
| Popup "Modalità Browser" | Server non rilevato | Normale aprendo solo l'HTML: usa Chrome/Edge per la scrittura diretta |
| `npm install` si blocca | Conflitti peer-dependency | Risolto via `.npmrc` (`legacy-peer-deps=true`); in alternativa `bun install` |
| Versione HTML datata | Build precedente ai sorgenti | `npm run build` per rigenerare `AVVIA_FILEMOVER.html` |

Log server: `%TEMP%\filemover-server-<porta>.log` (Windows) o `/tmp/filemover-server-<porta>.log` (Mac/Linux).

---

## 7. Sviluppo

Requisiti: Node.js ≥ 18. `bun install` funziona come alternativa a `npm install`.

| Comando | Cosa fa |
|---|---|
| `npm run dev` | Sviluppo con HMR (`server.ts`: Express + Vite) |
| `npm start` | Produzione senza dipendenze (`server.js` puro) |
| `npm run build` | Build frontend + rigenera `AVVIA_FILEMOVER.html` (Windows/Mac/Linux) |
| `npm run lint` | Controllo tipi (`tsc --noEmit`) |

Variabili d'ambiente (vedi `.env.example`): `PORT` (default 3000), `NODE_ENV` (`production` = serve `dist/`, altrimenti middleware Vite — solo `server.ts`).

---

## 8. Licenza

[Apache-2.0](LICENSE). Sentiti libero di usare, modificare e ridistribuire.
