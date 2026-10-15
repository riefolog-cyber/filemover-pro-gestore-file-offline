/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import JSZip from 'jszip';
import {
  DestinationSettings,
  FileItem,
  FilterCriteria,
  FilterSizeUnit,
} from '../types/fileMover';

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  if (!bytes || isNaN(bytes)) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const idx = Math.min(i, sizes.length - 1);
  return `${parseFloat((bytes / Math.pow(k, idx)).toFixed(dm))} ${sizes[idx]}`;
}

export function formatDate(timestamp: number): string {
  if (!timestamp || isNaN(timestamp)) return '-';
  const d = new Date(timestamp);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function bytesFromUnit(value: number, unit: FilterSizeUnit): number {
  if (isNaN(value) || value < 0) return 0;
  switch (unit) {
    case 'B':
      return value;
    case 'KB':
      return value * 1024;
    case 'MB':
      return value * 1024 * 1024;
    case 'GB':
      return value * 1024 * 1024 * 1024;
    default:
      return value;
  }
}

/**
 * Normalizes an extension (e.g., ".PDF" -> "pdf", "jpg" -> "jpg")
 */
export function normalizeExtension(ext: string): string {
  return ext.replace(/^\.+/, '').toLowerCase().trim();
}

/**
 * Extracts the file extension (with dot, lowercased) from a file name
 */
export function getFileExtension(name: string): string {
  const lastDot = name.lastIndexOf('.');
  if (lastDot <= 0) return '';
  return name.slice(lastDot).toLowerCase();
}

/**
 * Evaluates whether a file item satisfies all configured criteria
 */
export function evaluateFileFilter(
  file: {
    name: string;
    extension: string;
    size: number;
    lastModified: number;
    relativePath: string;
    depth: number;
  },
  criteria: FilterCriteria
): { matches: boolean; matched: string[]; unmatched: string[] } {
  const matched: string[] = [];
  const unmatched: string[] = [];

  // 1. Sottocartelle & Profondità
  if (!criteria.includeSubfolders && file.depth > 0) {
    unmatched.push('Escluso: in sottocartella (inclusione disattivata)');
    return { matches: false, matched, unmatched };
  }

  if (criteria.maxDepth > 0 && file.depth > criteria.maxDepth) {
    unmatched.push(`Escluso: profondità (${file.depth}) > limite (${criteria.maxDepth})`);
    return { matches: false, matched, unmatched };
  }

  if (criteria.ignoreHiddenFiles) {
    const normalizedRel = file.relativePath.replace(/\\/g, '/');
    const segments = normalizedRel.split('/');
    const isHidden = segments.some(
      (s) =>
        s.startsWith('.') ||
        s === 'node_modules' ||
        s === 'Thumbs.db' ||
        s === 'desktop.ini' ||
        s.toLowerCase() === '$recycle.bin'
    );
    if (isHidden) {
      unmatched.push('Escluso: file o cartella nascosta/di sistema');
      return { matches: false, matched, unmatched };
    }
  }

  // 2. Estensioni
  const fileExtNorm = normalizeExtension(file.extension);
  const activeExtensions = new Set<string>();

  criteria.extensionList.forEach((e) => {
    const norm = normalizeExtension(e);
    if (norm) activeExtensions.add(norm);
  });

  if (criteria.customExtensions.trim()) {
    criteria.customExtensions
      .split(/[,;\s]+/)
      .map((e) => normalizeExtension(e))
      .filter(Boolean)
      .forEach((e) => activeExtensions.add(e));
  }

  if (criteria.extensionMode === 'include') {
    if (activeExtensions.size > 0) {
      if (activeExtensions.has(fileExtNorm)) {
        matched.push(`Estensione '.${fileExtNorm || 'senza-estensione'}' inclusa`);
      } else {
        unmatched.push(`Estensione '.${fileExtNorm || 'senza-estensione'}' non presente nella lista`);
      }
    }
  } else if (criteria.extensionMode === 'exclude') {
    if (activeExtensions.has(fileExtNorm)) {
      unmatched.push(`Estensione '.${fileExtNorm || 'senza-estensione'}' esclusa`);
    } else {
      matched.push(`Estensione '.${fileExtNorm || 'senza-estensione'}' non esclusa`);
    }
  } else {
    matched.push('Tutte le estensioni accettate');
  }

  // 3. Criterio Nome File
  const pattern = criteria.namePattern.trim();
  if (criteria.nameMode !== 'any' && pattern) {
    const targetName = criteria.nameCaseSensitive ? file.name : file.name.toLowerCase();
    const query = criteria.nameCaseSensitive ? pattern : pattern.toLowerCase();

    // Support match against base name (without extension) as well
    const dotIdx = targetName.lastIndexOf('.');
    const baseName = dotIdx > 0 ? targetName.substring(0, dotIdx) : targetName;

    switch (criteria.nameMode) {
      case 'contains':
        if (targetName.includes(query) || baseName.includes(query)) {
          matched.push(`Nome contiene '${pattern}'`);
        } else {
          unmatched.push(`Nome non contiene '${pattern}'`);
        }
        break;
      case 'starts_with':
        if (targetName.startsWith(query) || baseName.startsWith(query)) {
          matched.push(`Nome inizia con '${pattern}'`);
        } else {
          unmatched.push(`Nome non inizia con '${pattern}'`);
        }
        break;
      case 'ends_with':
        // Check both full filename (e.g. '.pdf') and base filename without extension
        if (targetName.endsWith(query) || baseName.endsWith(query)) {
          matched.push(`Nome termina con '${pattern}'`);
        } else {
          unmatched.push(`Nome non termina con '${pattern}'`);
        }
        break;
      case 'exact':
        if (targetName === query || baseName === query) {
          matched.push(`Nome corrisponde a '${pattern}'`);
        } else {
          unmatched.push(`Nome non corrisponde esattamente a '${pattern}'`);
        }
        break;
      case 'regex':
        try {
          const re = new RegExp(pattern, criteria.nameCaseSensitive ? '' : 'i');
          if (re.test(file.name)) {
            matched.push(`Nome rispetta regex /${pattern}/`);
          } else {
            unmatched.push(`Nome non rispetta regex /${pattern}/`);
          }
        } catch {
          unmatched.push('Sintassi Regex non valida');
        }
        break;
    }
  }

  // 4. Criterio Dimensione File
  if (criteria.sizeMode === 'greater_than') {
    const minBytes = bytesFromUnit(criteria.minSizeValue, criteria.minSizeUnit);
    if (file.size >= minBytes) {
      matched.push(`Dimensione (${formatBytes(file.size)}) ≥ ${criteria.minSizeValue} ${criteria.minSizeUnit}`);
    } else {
      unmatched.push(`Dimensione (${formatBytes(file.size)}) < ${criteria.minSizeValue} ${criteria.minSizeUnit}`);
    }
  } else if (criteria.sizeMode === 'less_than') {
    const maxBytes = bytesFromUnit(criteria.maxSizeValue, criteria.maxSizeUnit);
    if (file.size <= maxBytes) {
      matched.push(`Dimensione (${formatBytes(file.size)}) ≤ ${criteria.maxSizeValue} ${criteria.maxSizeUnit}`);
    } else {
      unmatched.push(`Dimensione (${formatBytes(file.size)}) > ${criteria.maxSizeValue} ${criteria.maxSizeUnit}`);
    }
  } else if (criteria.sizeMode === 'between') {
    let minBytes = bytesFromUnit(criteria.minSizeValue, criteria.minSizeUnit);
    let maxBytes = bytesFromUnit(criteria.maxSizeValue, criteria.maxSizeUnit);
    if (minBytes > maxBytes) {
      const temp = minBytes;
      minBytes = maxBytes;
      maxBytes = temp;
    }
    if (file.size >= minBytes && file.size <= maxBytes) {
      matched.push(`Dimensione (${formatBytes(file.size)}) compresa tra ${formatBytes(minBytes)} e ${formatBytes(maxBytes)}`);
    } else {
      unmatched.push(`Dimensione (${formatBytes(file.size)}) fuori dall'intervallo richiesto`);
    }
  }

  // 5. Criterio Data di Modifica
  if (criteria.dateMode === 'last_days') {
    const validDays = Math.max(1, criteria.dateDays || 1);
    const daysMs = validDays * 24 * 60 * 60 * 1000;
    const threshold = Date.now() - daysMs;
    if (file.lastModified >= threshold) {
      matched.push(`Modificato negli ultimi ${validDays} giorni`);
    } else {
      unmatched.push(`Modificato oltre ${validDays} giorni fa`);
    }
  } else if (criteria.dateMode === 'after' && criteria.dateFrom) {
    const fromTime = new Date(`${criteria.dateFrom}T00:00:00`).getTime();
    if (!isNaN(fromTime)) {
      if (file.lastModified >= fromTime) {
        matched.push(`Modificato dal ${criteria.dateFrom}`);
      } else {
        unmatched.push(`Modificato prima del ${criteria.dateFrom}`);
      }
    }
  } else if (criteria.dateMode === 'before' && criteria.dateTo) {
    const toTime = new Date(`${criteria.dateTo}T23:59:59`).getTime();
    if (!isNaN(toTime)) {
      if (file.lastModified <= toTime) {
        matched.push(`Modificato fino al ${criteria.dateTo}`);
      } else {
        unmatched.push(`Modificato dopo il ${criteria.dateTo}`);
      }
    }
  } else if (criteria.dateMode === 'between') {
    const fromTime = criteria.dateFrom ? new Date(`${criteria.dateFrom}T00:00:00`).getTime() : 0;
    const toTime = criteria.dateTo ? new Date(`${criteria.dateTo}T23:59:59`).getTime() : Infinity;

    let validFrom = isNaN(fromTime) ? 0 : fromTime;
    let validTo = isNaN(toTime) ? Infinity : toTime;

    if (validFrom > validTo && validTo !== Infinity) {
      const t = validFrom;
      validFrom = validTo;
      validTo = t;
    }

    if (file.lastModified >= validFrom && file.lastModified <= validTo) {
      matched.push(`Modificato nell'intervallo specificato`);
    } else {
      unmatched.push(`Modificato fuori dall'intervallo specificato`);
    }
  }

  const isMatch = unmatched.length === 0;
  return { matches: isMatch, matched, unmatched };
}

/**
 * Calculates the exact destination path based on organization strategy and checks for collisions
 */
export function calculateDestination(
  file: {
    name: string;
    extension: string;
    relativePath: string;
    lastModified: number;
  },
  destFolderName: string,
  settings: DestinationSettings,
  existingPaths: Set<string>
): { destinationPath: string; fileName: string; hasConflict: boolean; willSkip: boolean } {
  const cleanDest = (destFolderName || 'Destinazione').trim().replace(/\\/g, '/').replace(/\/+$/, '');
  const cleanName = file.name;
  let subfolder = '';

  const normalizedRel = file.relativePath.replace(/\\/g, '/');

  switch (settings.strategy) {
    case 'preserve_structure': {
      const parts = normalizedRel.split('/');
      parts.pop(); // remove file name
      subfolder = parts.join('/');
      break;
    }
    case 'flatten': {
      subfolder = '';
      break;
    }
    case 'organize_by_extension': {
      const ext = normalizeExtension(file.extension);
      subfolder = ext ? ext.toUpperCase() : 'SENZA_ESTENSIONE';
      break;
    }
    case 'organize_by_date': {
      const d = new Date(file.lastModified || Date.now());
      const year = isNaN(d.getFullYear()) ? new Date().getFullYear() : d.getFullYear();
      const month = String(isNaN(d.getMonth()) ? 1 : d.getMonth() + 1).padStart(2, '0');
      subfolder = `${year}/${month}`;
      break;
    }
    case 'custom_subfolder': {
      subfolder = settings.customSubfolderName.trim().replace(/^\/+|\/+$/g, '') || 'File_Spostati';
      break;
    }
  }

  const destFolderRelative = subfolder ? `${cleanDest}/${subfolder}` : cleanDest;
  let tentativePath = `${destFolderRelative}/${cleanName}`;
  let finalFileName = cleanName;
  const hasConflict = existingPaths.has(tentativePath.toLowerCase());
  let willSkip = false;

  if (hasConflict) {
    if (settings.conflictResolution === 'rename') {
      const dotIndex = cleanName.lastIndexOf('.');
      const baseName = dotIndex > 0 ? cleanName.substring(0, dotIndex) : cleanName;
      const ext = dotIndex > 0 ? cleanName.substring(dotIndex) : '';

      let counter = 1;
      while (existingPaths.has(`${destFolderRelative}/${baseName} (${counter})${ext}`.toLowerCase())) {
        counter++;
      }
      finalFileName = `${baseName} (${counter})${ext}`;
      tentativePath = `${destFolderRelative}/${finalFileName}`;
    } else if (settings.conflictResolution === 'skip') {
      willSkip = true;
    }
  }

  if (!willSkip) {
    existingPaths.add(tentativePath.toLowerCase());
  }

  return {
    destinationPath: tentativePath,
    fileName: finalFileName,
    hasConflict,
    willSkip,
  };
}

/**
 * Traverses a FileSystemDirectoryHandle recursively to build FileItem list
 */
export async function scanNativeDirectory(
  dirHandle: FileSystemDirectoryHandle,
  pathPrefix = '',
  depth = 0
): Promise<FileItem[]> {
  const results: FileItem[] = [];

  for await (const entry of dirHandle.values()) {
    const relativePath = pathPrefix ? `${pathPrefix}/${entry.name}` : entry.name;

    if (entry.kind === 'file') {
      const fileHandle = entry as FileSystemFileHandle;
      try {
        const file = await fileHandle.getFile();
        results.push({
          id: `native_${Math.random().toString(36).substring(2, 9)}_${entry.name}`,
          name: entry.name,
          extension: getFileExtension(entry.name),
          size: file.size,
          lastModified: file.lastModified,
          relativePath,
          depth,
          handle: fileHandle,
          fileBlob: file,
          calculatedDestination: '',
          calculatedFilename: entry.name,
          selectedForAction: true,
          matchesFilter: true,
          matchedRules: [],
          unmatchedRules: [],
          status: 'pending',
        });
      } catch (err) {
        console.warn(`Impossibile leggere i metadati del file ${entry.name}:`, err);
      }
    } else if (entry.kind === 'directory') {
      const subDirHandle = entry as FileSystemDirectoryHandle;
      const subResults = await scanNativeDirectory(subDirHandle, relativePath, depth + 1);
      results.push(...subResults);
    }
  }

  return results;
}

/**
 * Parses FileList from standard <input type="file" webkitdirectory />
 */
export function parseWebkitFileList(files: FileList): FileItem[] {
  const results: FileItem[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const rel = (file.webkitRelativePath || file.name).replace(/\\/g, '/');
    const parts = rel.split('/');
    const relativePath = parts.length > 1 ? parts.slice(1).join('/') : file.name;
    const depth = parts.length > 1 ? parts.length - 2 : 0;

    results.push({
      id: `webkit_${i}_${file.name}`,
      name: file.name,
      extension: getFileExtension(file.name),
      size: file.size,
      lastModified: file.lastModified,
      relativePath,
      depth,
      fileBlob: file,
      calculatedDestination: '',
      calculatedFilename: file.name,
      selectedForAction: true,
      matchesFilter: true,
      matchedRules: [],
      unmatchedRules: [],
      status: 'pending',
    });
  }

  return results;
}

/**
 * Helpers condivisi dai generatori di script (PowerShell / Bash / Batch):
 * normalizzano i percorsi calcolati ed estraggono la cartella di destinazione.
 */
function normalizeToPosix(p: string): string {
  return p.replace(/\\/g, '/');
}

function toWinPath(p: string): string {
  return normalizeToPosix(p).replace(/\//g, '\\');
}

function getScriptDestDir(calculatedDestination: string): string {
  const normalized = normalizeToPosix(calculatedDestination);
  const lastSlash = normalized.lastIndexOf('/');
  return lastSlash > 0 ? normalized.substring(0, lastSlash) : normalized;
}

/**
 * Generates an executable PowerShell script for Windows users to run locally
 * Uses -LiteralPath to avoid regex wildcard issues with brackets [ ] in filenames
 */
export function generatePowerShellScript(
  files: FileItem[],
  sourceFolderName: string,
  settings: DestinationSettings
): string {
  const isMove = settings.operation === 'move';
  const verbCmd = isMove ? 'Move-Item' : 'Copy-Item';

  const lines = [
    `# =================================================================`,
    `# FileMover Pro - Script di Esecuzione Locale PowerShell`,
    `# Operazione: ${isMove ? 'SPOSTAMENTO' : 'COPIA'}`,
    `# Totale file: ${files.length}`,
    `# Generato il: ${new Date().toLocaleString('it-IT')}`,
    `# Funziona 100% offline - Nessuna connessione a internet richiesta`,
    `# =================================================================`,
    `$ErrorActionPreference = "Continue"`,
    `$PSScriptRoot = Split-Path -Parent -Path $MyInvocation.MyCommand.Definition`,
    `Set-Location -Path $PSScriptRoot`,
    ``,
    `Write-Host "Avvio operazione su ${files.length} file..." -ForegroundColor Cyan`,
    ``,
  ];

  files.forEach((file, index) => {
    const srcRelative = toWinPath(file.relativePath);
    const destRelative = toWinPath(file.calculatedDestination);
    const destDir = toWinPath(getScriptDestDir(file.calculatedDestination));

    lines.push(`# [${index + 1}/${files.length}] ${file.name}`);
    lines.push(`$Src = if ([System.IO.Path]::IsPathRooted("${sourceFolderName}\\${srcRelative}")) { "${sourceFolderName}\\${srcRelative}" } else { Join-Path $PSScriptRoot "${sourceFolderName}\\${srcRelative}" }`);
    lines.push(`$TargetDir = if ([System.IO.Path]::IsPathRooted("${destDir}")) { "${destDir}" } else { Join-Path $PSScriptRoot "${destDir}" }`);
    lines.push(`$TargetFile = if ([System.IO.Path]::IsPathRooted("${destRelative}")) { "${destRelative}" } else { Join-Path $PSScriptRoot "${destRelative}" }`);
    lines.push(`if (!(Test-Path -LiteralPath $TargetDir)) { New-Item -ItemType Directory -Force -Path $TargetDir | Out-Null }`);
    lines.push(`if (Test-Path -LiteralPath $Src) {`);
    lines.push(`    ${verbCmd} -LiteralPath $Src -Destination $TargetFile -Force`);
    lines.push(`    Write-Host "[OK] ${file.name} -> $TargetFile" -ForegroundColor Green`);
    lines.push(`} else {`);
    lines.push(`    Write-Host "[AVVISO] File origine non trovato: $Src" -ForegroundColor Yellow`);
    lines.push(`}`);
    lines.push(``);
  });

  lines.push(`Write-Host "Operazione completata con successo!" -ForegroundColor Green`);
  return lines.join('\r\n');
}

/**
 * Generates an executable Bash script for macOS / Linux users
 */
export function generateBashScript(
  files: FileItem[],
  sourceFolderName: string,
  settings: DestinationSettings
): string {
  const isMove = settings.operation === 'move';
  const verbCmd = isMove ? 'mv -f' : 'cp -f';

  const lines = [
    `#!/usr/bin/env bash`,
    `# =================================================================`,
    `# FileMover Pro - Script di Esecuzione Locale Bash (macOS / Linux)`,
    `# Operazione: ${isMove ? 'SPOSTAMENTO' : 'COPIA'}`,
    `# Totale file: ${files.length}`,
    `# Generato il: ${new Date().toLocaleString('it-IT')}`,
    `# =================================================================`,
    `set -e`,
    `SCRIPT_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")" && pwd)"`,
    `cd "$SCRIPT_DIR"`,
    `echo "Avvio operazione su ${files.length} file..."`,
    ``,
  ];

  files.forEach((file, index) => {
    const srcRelative = normalizeToPosix(file.relativePath);
    const destRelative = normalizeToPosix(file.calculatedDestination);
    const destDir = getScriptDestDir(file.calculatedDestination);

    lines.push(`# [${index + 1}/${files.length}] ${file.name}`);
    lines.push(`mkdir -p "${destDir}"`);
    lines.push(`if [ -f "${sourceFolderName}/${srcRelative}" ]; then`);
    lines.push(`  ${verbCmd} "${sourceFolderName}/${srcRelative}" "${destRelative}"`);
    lines.push(`  echo "[OK] ${file.name} -> ${destRelative}"`);
    lines.push(`elif [ -f "${srcRelative}" ]; then`);
    lines.push(`  ${verbCmd} "${srcRelative}" "${destRelative}"`);
    lines.push(`  echo "[OK] ${file.name} -> ${destRelative}"`);
    lines.push(`else`);
    lines.push(`  echo "[AVVISO] File origine non trovato: ${sourceFolderName}/${srcRelative}"`);
    lines.push(`fi`);
    lines.push(``);
  });

  lines.push(`echo "Operazione completata con successo!"`);
  return lines.join('\n');
}

/**
 * Generates an executable Windows Batch (.bat) script
 */
export function generateBatchScript(
  files: FileItem[],
  sourceFolderName: string,
  settings: DestinationSettings
): string {
  const isMove = settings.operation === 'move';
  const verbCmd = isMove ? 'move /Y' : 'copy /Y';

  const lines = [
    `@echo off`,
    `chcp 65001 > nul`,
    `REM =================================================================`,
    `REM FileMover Pro - Script Batch Windows (.bat)`,
    `REM Operazione: ${isMove ? 'SPOSTAMENTO' : 'COPIA'}`,
    `REM Totale file: ${files.length}`,
    `REM =================================================================`,
    `cd /d "%~dp0"`,
    `echo Avvio operazione su ${files.length} file...`,
    `echo.`,
  ];

  files.forEach((file, index) => {
    const srcRelative = toWinPath(file.relativePath);
    const destRelative = toWinPath(file.calculatedDestination);
    const destDir = toWinPath(getScriptDestDir(file.calculatedDestination));

    lines.push(`REM [${index + 1}/${files.length}] ${file.name}`);
    lines.push(`if not exist "${destDir}" mkdir "${destDir}"`);
    lines.push(`if exist "${sourceFolderName}\\${srcRelative}" (`);
    lines.push(`  ${verbCmd} "${sourceFolderName}\\${srcRelative}" "${destRelative}"`);
    lines.push(`  echo [OK] ${file.name}`);
    lines.push(`) else if exist "${srcRelative}" (`);
    lines.push(`  ${verbCmd} "${srcRelative}" "${destRelative}"`);
    lines.push(`  echo [OK] ${file.name}`);
    lines.push(`) else (`);
    lines.push(`  echo [AVVISO] Non trovato: "${sourceFolderName}\\${srcRelative}"`);
    lines.push(`)`);
    lines.push(``);
  });

  lines.push(`echo.`);
  lines.push(`echo Operazione completata con successo!`);
  lines.push(`pause`);
  return lines.join('\r\n');
}

/**
 * Packages the selected files according to their calculated destinations into a downloadable ZIP archive
 */
export async function exportMovedZip(
  files: FileItem[],
  destFolderName: string,
  onProgress?: (percent: number, currentFile: string) => void
): Promise<Blob> {
  const zip = new JSZip();
  const total = files.length;

  for (let i = 0; i < total; i++) {
    const file = files[i];
    if (onProgress) {
      onProgress(Math.round(((i + 1) / total) * 100), file.name);
    }

    let fileData: Blob | ArrayBuffer | string = 'FileMover Pro Placeholder Content';
    if (file.fileBlob) {
      fileData = file.fileBlob;
    }

    // Path in zip should be relative to destination root
    let zipPath = normalizeToPosix(file.calculatedDestination);
    if (zipPath.startsWith(`${destFolderName}/`)) {
      zipPath = zipPath.substring(destFolderName.length + 1);
    }
    // Ensure leading slash is stripped
    zipPath = zipPath.replace(/^\/+/, '');
    if (!zipPath) {
      zipPath = file.name;
    }

    zip.file(zipPath, fileData);
  }

  return await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
}

/**
 * Helper to get or create a nested subfolder handle in File System Access API
 */
export async function getOrCreateDirectoryHandle(
  rootHandle: FileSystemDirectoryHandle,
  subPath: string
): Promise<FileSystemDirectoryHandle> {
  const clean = subPath.replace(/\\/g, '/');
  const parts = clean.split('/').filter(Boolean);
  let currentHandle = rootHandle;
  for (const part of parts) {
    currentHandle = await currentHandle.getDirectoryHandle(part, { create: true });
  }
  return currentHandle;
}

/**
 * Helper to remove an entry from a source directory handle, navigating through nested folders if needed
 */
export async function removeSourceEntry(
  rootHandle: FileSystemDirectoryHandle,
  relativePath: string
): Promise<void> {
  const clean = relativePath.replace(/\\/g, '/').replace(/^\/+/, '');
  const parts = clean.split('/').filter(Boolean);
  const fileName = parts.pop();
  if (!fileName) return;

  let currentHandle = rootHandle;
  for (const part of parts) {
    currentHandle = await currentHandle.getDirectoryHandle(part, { create: false });
  }
  await currentHandle.removeEntry(fileName);
}

