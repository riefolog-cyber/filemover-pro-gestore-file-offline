/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DEV SERVER (richiede `npm install`): Express + middleware Vite con HMR.
 * Usato da `npm run dev` (tsx server.ts).
 * Per l'avvio standalone senza dipendenze vedi server.js (usato da AVVIA_FILEMOVER.bat).
 * I due file espongono lo stesso contratto API (/api/status, /api/drives,
 * /api/list-dir, /api/create-dir, /api/browse, /api/scan, /api/execute):
 * se modifichi un endpoint, riporta la modifica anche nell'altro file.
 */

import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const isProd = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 3000;

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '50mb' }));

  // API 1: Check server health, status, and quick shortcuts
  app.get('/api/status', (_req, res) => {
    const home = os.homedir();
    const quickPaths = {
      desktop: path.join(home, 'Desktop'),
      downloads: path.join(home, 'Downloads'),
      documents: path.join(home, 'Documents'),
      pictures: path.join(home, 'Pictures'),
      home,
    };

    res.json({
      connected: true,
      platform: process.platform,
      userHome: home,
      cwd: process.cwd(),
      quickPaths,
      timestamp: Date.now(),
    });
  });

  // API 1b: Get available drive letters or root paths
  app.get('/api/drives', (_req, res) => {
    try {
      const drives: Array<{ path: string; name: string }> = [];
      const home = os.homedir();

      if (process.platform === 'win32') {
        for (let code = 67; code <= 90; code++) {
          const letter = String.fromCharCode(code);
          const drivePath = `${letter}:\\`;
          try {
            if (fs.existsSync(drivePath)) {
              drives.push({ path: drivePath, name: `Disco Locale (${letter}:)` });
            }
          } catch {
            // Drive not ready or accessible
          }
        }
      } else {
        drives.push({ path: '/', name: 'File System (/)' });
        drives.push({ path: home, name: 'Cartella Personale' });
      }

      res.json({ drives });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message, drives: [] });
    }
  });

  // API 1c: List directories in a path for interactive in-app visual folder picker
  app.post('/api/list-dir', async (req, res) => {
    try {
      const { dirPath } = req.body;
      const home = os.homedir();
      let targetPath = dirPath && typeof dirPath === 'string' && dirPath.trim() ? dirPath.trim() : home;

      // On Windows if user passes "C:", normalize to "C:\"
      if (process.platform === 'win32' && /^[a-zA-Z]:$/.test(targetPath)) {
        targetPath += '\\';
      }

      const resolved = path.resolve(targetPath);
      if (!fs.existsSync(resolved)) {
        return res.status(404).json({ error: `Percorso non trovato: ${resolved}` });
      }

      const stats = await fs.promises.stat(resolved);
      if (!stats.isDirectory()) {
        return res.status(400).json({ error: `Non è una cartella: ${resolved}` });
      }

      const entries = await fs.promises.readdir(resolved, { withFileTypes: true });
      const folders: Array<{ name: string; fullPath: string; mtimeMs: number }> = [];

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const name = entry.name;
        // Ignore system / hidden folders
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
          folders.push({
            name,
            fullPath,
            mtimeMs: fstat.mtimeMs,
          });
        } catch {
          folders.push({
            name,
            fullPath,
            mtimeMs: 0,
          });
        }
      }

      // Sort alphabetically
      folders.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

      const parentPath = path.dirname(resolved) !== resolved ? path.dirname(resolved) : null;

      res.json({
        currentPath: resolved,
        parentPath,
        name: path.basename(resolved) || resolved,
        folders,
      });
    } catch (err) {
      console.error('list-dir error:', err);
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // API 1d: Create new directory
  app.post('/api/create-dir', async (req, res) => {
    try {
      const { parentPath, folderName } = req.body;
      if (!parentPath || !folderName) {
        return res.status(400).json({ error: 'Percorso o nome cartella mancante' });
      }

      const cleanName = folderName.replace(/[<>:"/\\|?*]/g, '_').trim();
      if (!cleanName) {
        return res.status(400).json({ error: 'Nome cartella non valido' });
      }

      const newFolderPath = path.join(parentPath, cleanName);
      if (fs.existsSync(newFolderPath)) {
        return res.status(409).json({ error: 'Una cartella con questo nome esiste già', createdPath: newFolderPath });
      }

      await fs.promises.mkdir(newFolderPath, { recursive: true });
      res.json({ success: true, createdPath: newFolderPath, folderName: cleanName });
    } catch (err) {
      console.error('create-dir error:', err);
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // API 2: Browse directory natively on host OS with GUARANTEED FOREGROUND / TOPMOST window
  app.post('/api/browse', async (_req, res) => {
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

        const { stdout } = await execAsync(psCommand);
        const selected = stdout.trim();
        if (selected && fs.existsSync(selected)) {
          return res.json({ selectedPath: selected, cancelled: false });
        }
        return res.json({ selectedPath: null, cancelled: true });
      } else if (process.platform === 'darwin') {
        // macOS AppleScript folder chooser brought to front
        const osascript = `osascript -e 'tell application "System Events" to activate' -e 'try' -e 'set f to choose folder with prompt "Seleziona cartella:"' -e 'POSIX path of f' -e 'end try'`;
        const { stdout } = await execAsync(osascript);
        const selected = stdout.trim();
        if (selected && fs.existsSync(selected)) {
          return res.json({ selectedPath: selected, cancelled: false });
        }
        return res.json({ selectedPath: null, cancelled: true });
      } else {
        // Linux zenity or kdialog
        try {
          const { stdout } = await execAsync('zenity --file-selection --directory --title="Seleziona Cartella"');
          const selected = stdout.trim();
          if (selected && fs.existsSync(selected)) {
            return res.json({ selectedPath: selected, cancelled: false });
          }
        } catch {
          // Zenity not installed
        }
        return res.json({ selectedPath: null, cancelled: true });
      }
    } catch (err) {
      console.error('Error during browse:', err);
      return res.status(500).json({ error: (err as Error).message, cancelled: true });
    }
  });

  // API 3: Scan a directory recursively on disk
  app.post('/api/scan', async (req, res) => {
    try {
      const { folderPath, recursive = true } = req.body;
      if (!folderPath || typeof folderPath !== 'string') {
        return res.status(400).json({ error: 'Percorso cartella obbligatorio' });
      }

      const resolvedPath = path.resolve(folderPath);
      if (!fs.existsSync(resolvedPath)) {
        return res.status(404).json({ error: `La cartella specificata non esiste: ${resolvedPath}` });
      }

      const stats = await fs.promises.stat(resolvedPath);
      if (!stats.isDirectory()) {
        return res.status(400).json({ error: `Il percorso non è una cartella: ${resolvedPath}` });
      }

      interface ScannedFile {
        id: string;
        name: string;
        extension: string;
        size: number;
        lastModified: number;
        relativePath: string;
        fullPath: string;
        depth: number;
      }

      const files: ScannedFile[] = [];
      let totalSize = 0;

      async function scanDir(currentDir: string, currentRelative: string, depth: number) {
        let entries: fs.Dirent[] = [];
        try {
          entries = await fs.promises.readdir(currentDir, { withFileTypes: true });
        } catch (readErr) {
          console.warn(`Impossibile leggere cartella ${currentDir}:`, readErr);
          return;
        }

        for (const entry of entries) {
          const entryFull = path.join(currentDir, entry.name);
          const entryRel = currentRelative ? `${currentRelative}/${entry.name}` : entry.name;

          // Skip system/hidden files like desktop.ini, .git, thumbs.db
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
              // Skip locked or inaccessible file
            }
          }
        }
      }

      await scanDir(resolvedPath, '', 0);

      res.json({
        folderPath: resolvedPath,
        folderName: path.basename(resolvedPath),
        totalFiles: files.length,
        totalSize,
        files,
      });
    } catch (err) {
      console.error('Scan error:', err);
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // API 4: Real physical move/copy operation directly on disk
  app.post('/api/execute', async (req, res) => {
    try {
      const {
        operation = 'move',
        conflictResolution = 'rename',
        destFolder,
        items = [],
      }: {
        operation: 'move' | 'copy';
        conflictResolution: 'rename' | 'overwrite' | 'skip';
        destFolder: string;
        items: Array<{
          sourceFullPath: string;
          destRelativePath: string;
        }>;
      } = req.body;

      if (!destFolder || typeof destFolder !== 'string') {
        return res.status(400).json({ error: 'Cartella di destinazione mancante' });
      }

      const resolvedDest = path.resolve(destFolder);
      // Ensure base destination folder exists
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
        const rawDestRel = item.destRelativePath.replace(/\\/g, '/');

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
          // Resolve target destination
          let targetPath = path.join(resolvedDest, ...rawDestRel.split('/'));
          const targetDir = path.dirname(targetPath);

          // Create target subdirectories if necessary
          if (!fs.existsSync(targetDir)) {
            await fs.promises.mkdir(targetDir, { recursive: true });
          }

          // Handle conflict resolution if target already exists
          if (fs.existsSync(targetPath)) {
            if (conflictResolution === 'skip') {
              skippedCount++;
              results.push({
                index: i,
                sourcePath: srcPath,
                destPath: targetPath,
                status: 'skipped',
                message: 'Saltato: file già presente nella destinazione',
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
            // If overwrite, it will proceed to write over targetPath
          }

          // Perform operation
          if (operation === 'move') {
            try {
              // Attempt atomic rename first
              await fs.promises.rename(srcPath, targetPath);
            } catch {
              // EXDEV error occurs when moving across different drive letters (e.g. C: to D:)
              // Fallback to copy + unlink
              await fs.promises.copyFile(srcPath, targetPath);
              await fs.promises.unlink(srcPath);
            }
          } else {
            // Copy
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
            message: `Errore durante operazione: ${(itemErr as Error).message}`,
          });
        }
      }

      res.json({
        success: true,
        total: items.length,
        successCount,
        skippedCount,
        errorCount,
        results,
      });
    } catch (err) {
      console.error('Execute error:', err);
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Serve Frontend
  if (!isProd) {
    // Development mode: Mount Vite middleware
    const vite = await createViteServer({
      server: { middlewareMode: true, host: '0.0.0.0' },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production mode: Serve dist folder
    const distPath = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    } else {
      // Fallback to singlefile AVVIA_FILEMOVER.html
      app.get('*', (_req, res) => {
        const singleHtml = path.resolve(process.cwd(), 'AVVIA_FILEMOVER.html');
        if (fs.existsSync(singleHtml)) {
          res.sendFile(singleHtml);
        } else {
          res.send('FileMover Pro pronto. Esegui "npm run build".');
        }
      });
    }
  }

  app.listen(Number(PORT), () => {
    console.log(`[FileMover Pro] Server attivo su http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[FileMover Pro] Errore di avvio server:', err);
  process.exit(1);
});
