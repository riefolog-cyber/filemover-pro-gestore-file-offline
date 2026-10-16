/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Zero-dependency pure Node.js server for instant 1-click startup on any computer.
// Usato da `npm start` e da AVVIA_FILEMOVER.bat (nessun `npm install` richiesto).
// Per lo sviluppo con HMR vedi server.ts (`npm run dev`).
// I due file espongono lo stesso contratto API (/api/status, /api/drives,
// /api/list-dir, /api/create-dir, /api/browse, /api/scan, /api/execute):
// se modifichi un endpoint, riporta la modifica anche nell'altro file.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { exec } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 3000;

// Timeout for the native folder-picker dialog (generous: user may take a while).
// Prevents the /api/browse request from hanging forever if the dialog gets stuck.
const BROWSE_DIALOG_TIMEOUT_MS = 5 * 60 * 1000;
const BROWSE_DIALOG_OPTS = {
  timeout: BROWSE_DIALOG_TIMEOUT_MS,
  maxBuffer: 1024 * 1024,
  killSignal: 'SIGKILL',
};

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 50 * 1024 * 1024) {
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  // API 1: /api/status
  if (pathname === '/api/status' && req.method === 'GET') {
    const home = os.homedir();
    const quickPaths = {
      desktop: path.join(home, 'Desktop'),
      downloads: path.join(home, 'Downloads'),
      documents: path.join(home, 'Documents'),
      pictures: path.join(home, 'Pictures'),
      home,
    };
    sendJson(res, 200, {
      connected: true,
      platform: process.platform,
      userHome: home,
      cwd: process.cwd(),
      quickPaths,
      timestamp: Date.now(),
    });
    return;
  }

  // API 1b: /api/drives
  if (pathname === '/api/drives' && req.method === 'GET') {
    try {
      const drives = [];
      const home = os.homedir();
      if (process.platform === 'win32') {
        for (let code = 67; code <= 90; code++) {
          const letter = String.fromCharCode(code);
          const drivePath = `${letter}:\\`;
          try {
            if (fs.existsSync(drivePath)) {
              drives.push({ path: drivePath, name: `Disco Locale (${letter}:)` });
            }
          } catch {}
        }
      } else {
        drives.push({ path: '/', name: 'File System (/)' });
        drives.push({ path: home, name: 'Cartella Personale' });
      }
      sendJson(res, 200, { drives });
    } catch (err) {
      sendJson(res, 500, { error: err.message, drives: [] });
    }
    return;
  }

  // API 1c: /api/list-dir
  if (pathname === '/api/list-dir' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const home = os.homedir();
      let targetPath = body && body.dirPath && typeof body.dirPath === 'string' && body.dirPath.trim() ? body.dirPath.trim() : home;

      if (process.platform === 'win32' && /^[a-zA-Z]:$/.test(targetPath)) {
        targetPath += '\\';
      }

      const resolved = path.resolve(targetPath);
      if (!fs.existsSync(resolved)) {
        sendJson(res, 404, { error: `Percorso non trovato: ${resolved}` });
        return;
      }

      const stats = await fs.promises.stat(resolved);
      if (!stats.isDirectory()) {
        sendJson(res, 400, { error: `Non è una cartella: ${resolved}` });
        return;
      }

      const entries = await fs.promises.readdir(resolved, { withFileTypes: true });
      const folders = [];

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const name = entry.name;
        if (
          name.startsWith('.') ||
          name.startsWith('$') ||
          name.toLowerCase() === 'system volume information' ||
          name.toLowerCase() === 'recovery' ||
          name.toLowerCase() === 'windows' ||
          name.toLowerCase() === 'perflogs'
        ) {
          continue;
        }

        const fullPath = path.join(resolved, name);
        try {
          const fstat = await fs.promises.stat(fullPath);
          folders.push({ name, fullPath, mtimeMs: fstat.mtimeMs });
        } catch {
          folders.push({ name, fullPath, mtimeMs: 0 });
        }
      }

      folders.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
      const parentPath = path.dirname(resolved) !== resolved ? path.dirname(resolved) : null;

      sendJson(res, 200, {
        currentPath: resolved,
        parentPath,
        name: path.basename(resolved) || resolved,
        folders,
      });
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return;
  }

  // API 1d: /api/create-dir
  if (pathname === '/api/create-dir' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const { parentPath, folderName } = body || {};
      if (!parentPath || !folderName) {
        sendJson(res, 400, { error: 'Percorso o nome cartella mancante' });
        return;
      }

      const cleanName = folderName.replace(/[<>:"/\\|?*]/g, '_').trim();
      if (!cleanName) {
        sendJson(res, 400, { error: 'Nome cartella non valido' });
        return;
      }

      const newFolderPath = path.join(parentPath, cleanName);
      if (fs.existsSync(newFolderPath)) {
        sendJson(res, 409, { error: 'Una cartella con questo nome esiste già', createdPath: newFolderPath });
        return;
      }

      await fs.promises.mkdir(newFolderPath, { recursive: true });
      sendJson(res, 200, { success: true, createdPath: newFolderPath, folderName: cleanName });
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return;
  }

  // API 2: /api/browse
  if (pathname === '/api/browse' && req.method === 'POST') {
    try {
      if (process.platform === 'win32') {
        const psScript = `
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
try {
  Add-Type -AssemblyName System.Windows.Forms
  $d = New-Object System.Windows.Forms.FolderBrowserDialog
  $d.Description = 'FileMover Pro - Seleziona Cartella'
  $d.ShowNewFolderButton = $true
  $d.AutoUpgradeEnabled = $true
  $f = New-Object System.Windows.Forms.Form
  $f.TopMost = $true
  $f.StartPosition = 'Manual'
  $f.Location = New-Object System.Drawing.Point(-32000, -32000)
  $f.Size = New-Object System.Drawing.Size(1, 1)
  $f.Show()
  $f.BringToFront()
  $r = $d.ShowDialog($f)
  if ($r -eq [System.Windows.Forms.DialogResult]::OK) {
    Write-Output $d.SelectedPath
  }
  $f.Close()
  $f.Dispose()
  $d.Dispose()
} catch {
  $app = New-Object -ComObject Shell.Application
  $folder = $app.BrowseForFolder(0, 'FileMover Pro - Seleziona Cartella', 0x00000040 + 0x00000010, 0)
  if ($folder) {
    Write-Output $folder.Self.Path
  }
}
`;
        const base64 = Buffer.from(psScript, 'utf16le').toString('base64');
        const psCommand = `powershell -STA -NoProfile -ExecutionPolicy Bypass -EncodedCommand ${base64}`;

        exec(psCommand, BROWSE_DIALOG_OPTS, (err, stdout) => {
          if (err) {
            sendJson(res, 200, { selectedPath: null, cancelled: true });
            return;
          }
          const selected = stdout ? stdout.trim() : '';
          if (selected && fs.existsSync(selected)) {
            sendJson(res, 200, { selectedPath: selected, cancelled: false });
          } else {
            sendJson(res, 200, { selectedPath: null, cancelled: true });
          }
        });
        return;
      } else if (process.platform === 'darwin') {
        const osascript = `osascript -e 'tell application "System Events" to activate' -e 'try' -e 'set f to choose folder with prompt "Seleziona cartella:"' -e 'POSIX path of f' -e 'end try'`;
        exec(osascript, BROWSE_DIALOG_OPTS, (_err, stdout) => {
          const selected = stdout.trim();
          sendJson(res, 200, { selectedPath: selected || null, cancelled: !selected });
        });
        return;
      } else {
        exec('zenity --file-selection --directory', BROWSE_DIALOG_OPTS, (_err, stdout) => {
          const selected = stdout.trim();
          sendJson(res, 200, { selectedPath: selected || null, cancelled: !selected });
        });
        return;
      }
    } catch {
      sendJson(res, 200, { selectedPath: null, cancelled: true });
      return;
    }
  }

  // API 3: /api/scan
  if (pathname === '/api/scan' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const { folderPath, recursive = true } = body;
      if (!folderPath) {
        sendJson(res, 400, { error: 'Percorso obbligatorio' });
        return;
      }

      const resolved = path.resolve(folderPath);
      if (!fs.existsSync(resolved)) {
        sendJson(res, 404, { error: `Cartella non trovata: ${resolved}` });
        return;
      }

      const files = [];
      let totalSize = 0;

      async function scanDir(currentDir, currentRel, depth) {
        let entries = [];
        try {
          entries = await fs.promises.readdir(currentDir, { withFileTypes: true });
        } catch {
          return;
        }

        for (const entry of entries) {
          const entryFull = path.join(currentDir, entry.name);
          const entryRel = currentRel ? `${currentRel}/${entry.name}` : entry.name;

          if (entry.name.startsWith('.') || entry.name.toLowerCase() === 'thumbs.db' || entry.name.toLowerCase() === 'desktop.ini') {
            continue;
          }

          if (entry.isDirectory()) {
            if (recursive) {
              await scanDir(entryFull, entryRel, depth + 1);
            }
          } else if (entry.isFile()) {
            try {
              const fileStat = await fs.promises.stat(entryFull);
              const ext = path.extname(entry.name).toLowerCase();
              files.push({
                id: `disk_${files.length}_${entry.name}`,
                name: entry.name,
                extension: ext,
                size: fileStat.size,
                lastModified: fileStat.mtimeMs,
                relativePath: entryRel,
                fullPath: entryFull,
                depth,
              });
              totalSize += fileStat.size;
            } catch {
              // skip
            }
          }
        }
      }

      await scanDir(resolved, '', 0);

      sendJson(res, 200, {
        folderPath: resolved,
        folderName: path.basename(resolved),
        totalFiles: files.length,
        totalSize,
        files,
      });
      return;
    } catch (err) {
      sendJson(res, 500, { error: err.message });
      return;
    }
  }

  // API 4: /api/execute
  if (pathname === '/api/execute' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const {
        operation = 'move',
        conflictResolution = 'rename',
        destFolder,
        items = [],
      } = body;

      if (!destFolder) {
        sendJson(res, 400, { error: 'Cartella di destinazione mancante' });
        return;
      }

      const resolvedDest = path.resolve(destFolder);
      if (!fs.existsSync(resolvedDest)) {
        await fs.promises.mkdir(resolvedDest, { recursive: true });
      }

      const results = [];
      let successCount = 0;
      let skippedCount = 0;
      let errorCount = 0;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const srcPath = item.sourceFullPath;
        const rawDestRel = (item.destRelativePath || '').replace(/\\/g, '/');

        if (!srcPath || !fs.existsSync(srcPath)) {
          errorCount++;
          results.push({
            index: i,
            sourcePath: srcPath,
            status: 'error',
            message: `File di origine non trovato: ${srcPath}`,
          });
          continue;
        }

        try {
          let targetPath = path.join(resolvedDest, ...rawDestRel.split('/'));
          const targetDir = path.dirname(targetPath);

          if (!fs.existsSync(targetDir)) {
            await fs.promises.mkdir(targetDir, { recursive: true });
          }

          if (fs.existsSync(targetPath)) {
            if (conflictResolution === 'skip') {
              skippedCount++;
              results.push({
                index: i,
                sourcePath: srcPath,
                destPath: targetPath,
                status: 'skipped',
                message: 'Saltato: file già presente',
              });
              continue;
            } else if (conflictResolution === 'rename') {
              const ext = path.extname(targetPath);
              const baseName = path.basename(targetPath, ext);
              let counter = 1;
              while (fs.existsSync(targetPath)) {
                targetPath = path.join(targetDir, `${baseName} (${counter})${ext}`);
                counter++;
              }
            }
          }

          if (operation === 'move') {
            try {
              await fs.promises.rename(srcPath, targetPath);
            } catch {
              // Fallback across different disks / drives
              await fs.promises.copyFile(srcPath, targetPath);
              await fs.promises.unlink(srcPath);
            }
          } else {
            await fs.promises.copyFile(srcPath, targetPath);
          }

          successCount++;
          results.push({
            index: i,
            sourcePath: srcPath,
            destPath: targetPath,
            status: 'success',
            message: `${operation === 'move' ? 'Spostato' : 'Copiato'} fisicamente su disco in: ${targetPath}`,
          });
        } catch (itemErr) {
          errorCount++;
          results.push({
            index: i,
            sourcePath: srcPath,
            status: 'error',
            message: `Errore: ${itemErr.message}`,
          });
        }
      }

      sendJson(res, 200, {
        success: true,
        total: items.length,
        successCount,
        skippedCount,
        errorCount,
        results,
      });
      return;
    } catch (err) {
      sendJson(res, 500, { error: err.message });
      return;
    }
  }

  // Static File Serving
  let filePath = path.join(__dirname, 'dist', pathname === '/' ? 'index.html' : pathname);
  if (!fs.existsSync(filePath)) {
    filePath = path.join(__dirname, 'AVVIA_FILEMOVER.html');
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.html': 'text/html; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.svg': 'image/svg+xml',
    };
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('File not found');
  }
});

server.listen(Number(PORT), () => {
  console.log(`[FileMover Pro] Server locale pronto su http://localhost:${PORT}`);
});
