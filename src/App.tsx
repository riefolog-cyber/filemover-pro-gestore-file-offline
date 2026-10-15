/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { Header } from './components/Header';
import { OfflineBanner } from './components/OfflineBanner';
import { FolderSelector } from './components/FolderSelector';
import { CriteriaPanel } from './components/CriteriaPanel';
import { DestinationSettingsPanel } from './components/DestinationSettingsPanel';
import { PreviewSection } from './components/PreviewSection';
import { ExecutionModal } from './components/ExecutionModal';
import { ScriptModal } from './components/ScriptModal';
import {
  DestinationSettings,
  ExecutionLogEntry,
  ExecutionProgress,
  FileItem,
  FilterCriteria,
  FolderDestination,
  FolderSource,
  ServerStatus,
} from './types/fileMover';
import {
  calculateDestination,
  evaluateFileFilter,
  exportMovedZip,
  getOrCreateDirectoryHandle,
  parseWebkitFileList,
  removeSourceEntry,
  scanNativeDirectory,
} from './utils/fileSystem';

const DEFAULT_CRITERIA: FilterCriteria = {
  extensionMode: 'all',
  extensionList: [],
  customExtensions: '',

  nameMode: 'any',
  namePattern: '',
  nameCaseSensitive: false,

  sizeMode: 'any',
  minSizeValue: 0,
  minSizeUnit: 'MB',
  maxSizeValue: 100,
  maxSizeUnit: 'MB',

  dateMode: 'any',
  dateDays: 30,
  dateFrom: '',
  dateTo: '',

  includeSubfolders: true,
  maxDepth: 0,
  ignoreHiddenFiles: true,
};

const DEFAULT_SETTINGS: DestinationSettings = {
  operation: 'move',
  strategy: 'preserve_structure',
  customSubfolderName: 'File_Archiviati',
  conflictResolution: 'rename',
};

// Nome di default per la cartella di destinazione (logica usata in 3 punti: server, native, webkit)
const defaultDestFolderName = (baseName: string) => `${baseName}_Destinazione`;

// Rimuove il prefisso "<destName>/" dal percorso calcolato per ottenere il path relativo alla destinazione
const stripDestPrefix = (calculatedDestination: string, destName: string) => {
  const prefix = `${destName}/`;
  return calculatedDestination.startsWith(prefix)
    ? calculatedDestination.substring(prefix.length)
    : calculatedDestination;
};

// Estrae il nome cartella da un percorso assoluto (supporta / e \)
const folderNameFromPath = (fullPath: string) => {
  const parts = fullPath.split(/[/\\]/).filter(Boolean);
  return parts[parts.length - 1] || fullPath;
};

export default function App() {
  const [source, setSource] = useState<FolderSource | null>(null);
  const [destination, setDestination] = useState<FolderDestination>({
    name: '',
    type: 'virtual',
  });
  const [rawFiles, setRawFiles] = useState<FileItem[]>([]);
  const [criteria, setCriteria] = useState<FilterCriteria>(DEFAULT_CRITERIA);
  const [settings, setSettings] = useState<DestinationSettings>(DEFAULT_SETTINGS);
  const [nativeErrorNotice, setNativeErrorNotice] = useState<string | null>(null);

  // Server direct disk status
  const [serverStatus, setServerStatus] = useState<ServerStatus>({ connected: false });

  // Execution & Modals
  const [isExecuting, setIsExecuting] = useState(false);
  const [showExecutionModal, setShowExecutionModal] = useState(false);
  const [showScriptModal, setShowScriptModal] = useState(false);
  const [executionProgress, setExecutionProgress] = useState<ExecutionProgress>({
    total: 0,
    completed: 0,
    successCount: 0,
    errorCount: 0,
    skippedCount: 0,
    currentFileName: '',
    isExecuting: false,
    isComplete: false,
    logs: [],
  });

  // Check if Native File System Access API is supported by the browser
  const isNativeSupported = typeof window !== 'undefined' && 'showDirectoryPicker' in window;

  // Detect local server on startup
  useEffect(() => {
    let isMounted = true;
    const checkServer = async () => {
      try {
        const res = await fetch('/api/status');
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setServerStatus({
              connected: true,
              platform: data.platform,
              userHome: data.userHome,
              quickPaths: data.quickPaths,
            });
          }
        }
      } catch {
        if (isMounted) {
          setServerStatus({ connected: false });
        }
      }
    };
    checkServer();
    return () => {
      isMounted = false;
    };
  }, []);

  const [isBrowsingSource, setIsBrowsingSource] = useState(false);
  const [isBrowsingDest, setIsBrowsingDest] = useState(false);

  // Helper unico per mantenere il nome destinazione se già impostato, altrimenti usa il default
  const applyDefaultDestName = useCallback((baseName: string) => {
    const fallback = defaultDestFolderName(baseName);
    setDestination((prev) => ({
      ...prev,
      name: prev.name.trim() ? prev.name : fallback,
    }));
  }, []);

  const resetAll = useCallback(() => {
    setSource(null);
    setDestination({ name: '', type: 'virtual' });
    setRawFiles([]);
    setCriteria(DEFAULT_CRITERIA);
    setSettings(DEFAULT_SETTINGS);
    setNativeErrorNotice(null);
  }, []);

  // Update criteria partially
  const updateCriteria = useCallback((updated: Partial<FilterCriteria>) => {
    setCriteria((prev) => ({ ...prev, ...updated }));
  }, []);

  // Update destination settings partially
  const updateSettings = useCallback((updated: Partial<DestinationSettings>) => {
    setSettings((prev) => ({ ...prev, ...updated }));
  }, []);

  // Scan folder on disk via local server
  const loadFolderFromDisk = async (folderPath: string) => {
    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderPath, recursive: criteria.includeSubfolders }),
      });
      const data = await res.json();
      if (res.ok && data.files) {
        setSource({
          name: data.folderName,
          type: 'server',
          fullPath: data.folderPath,
          totalFiles: data.totalFiles,
          totalSize: data.totalSize,
        });
        setRawFiles(data.files);
        setDestination((prev) => ({
          ...prev,
          name: prev.name.trim() ? prev.name : defaultDestFolderName(data.folderName),
          fullPath: prev.fullPath || (serverStatus.connected ? defaultDestFolderName(data.folderPath) : undefined),
        }));
        setNativeErrorNotice(null);
      } else {
        setNativeErrorNotice(data.error || 'Impossibile leggere la cartella specificata.');
      }
    } catch (err) {
      setNativeErrorNotice((err as Error).message);
    }
  };

  // Selezione cartella unificata: usa il picker nativo se disponibile, altrimenti Esplora Risorse via server
  const handleBrowse = async (kind: 'source' | 'dest') => {
    const setBrowsing = kind === 'source' ? setIsBrowsingSource : setIsBrowsingDest;
    // 1. Prioritize native folder picker (instant, foreground, zero latency)
    if (isNativeSupported) {
      await (kind === 'source' ? handleSelectSourceNative() : handleSelectDestNative());
      return;
    }
    if (serverStatus.connected && serverStatus.platform === 'win32') {
      setBrowsing(true);
      try {
        const res = await fetch('/api/browse', { method: 'POST' });
        const data = await res.json();
        if (data.selectedPath) {
          if (kind === 'source') {
            await loadFolderFromDisk(data.selectedPath);
          } else {
            setDestination({
              name: folderNameFromPath(data.selectedPath),
              type: 'server',
              fullPath: data.selectedPath,
            });
            setNativeErrorNotice(null);
          }
        }
      } catch {
        setNativeErrorNotice("Errore durante l'apertura di Esplora Risorse Windows.");
      } finally {
        setBrowsing(false);
      }
    }
  };

  // Browse source directory directly with Windows Explorer
  const handleBrowseSource = () => handleBrowse('source');

  // Browse destination directory directly with Windows Explorer
  const handleBrowseDest = () => handleBrowse('dest');

  // Pick Source Native Directory
  const handleSelectSourceNative = async () => {
    try {
      // @ts-expect-error File System Access API
      const dirHandle: FileSystemDirectoryHandle = await window.showDirectoryPicker();
      const files = await scanNativeDirectory(dirHandle);
      const totalBytes = files.reduce((acc, f) => acc + f.size, 0);

      setSource({
        name: dirHandle.name,
        type: 'native',
        handle: dirHandle,
        totalFiles: files.length,
        totalSize: totalBytes,
      });
      setRawFiles(files);
      applyDefaultDestName(dirHandle.name);
      setNativeErrorNotice(null);
    } catch (err: unknown) {
      if ((err as Error)?.name !== 'AbortError') {
        setNativeErrorNotice(
          "L'accesso diretto al disco tramite il browser è limitato. Suggerimento: Avvia con AVVIA_FILEMOVER.bat per l'accesso diretto senza vincoli."
        );
      }
    }
  };

  // Pick Source via webkitdirectory input
  const handleSelectSourceWebkit = (fileList: FileList) => {
    const files = parseWebkitFileList(fileList);
    const totalBytes = files.reduce((acc, f) => acc + f.size, 0);
    const rootName = fileList[0]?.webkitRelativePath?.split('/')[0] || 'Cartella_Origine';

    setSource({
      name: rootName,
      type: 'webkit',
      totalFiles: files.length,
      totalSize: totalBytes,
    });
    setRawFiles(files);
    applyDefaultDestName(rootName);
    setNativeErrorNotice(null);
  };

  // Pick Destination Native Directory (with write access)
  const handleSelectDestNative = async () => {
    try {
      // @ts-expect-error File System Access API
      const dirHandle: FileSystemDirectoryHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
      setDestination({
        name: dirHandle.name,
        type: 'native',
        handle: dirHandle,
      });
      setNativeErrorNotice(null);
    } catch (err: unknown) {
      if ((err as Error)?.name !== 'AbortError') {
        setNativeErrorNotice(
          "Accesso di scrittura bloccato dalle policy del browser. Avvia FileMover tramite AVVIA_FILEMOVER.bat per spostare i file direttamente su disco."
        );
      }
    }
  };

  // Pick Destination via webkitdirectory input
  const handleSelectDestWebkit = (folderName: string) => {
    setDestination({
      name: folderName,
      type: 'virtual',
    });
    setNativeErrorNotice(null);
  };

  // Manual Destination Path Set
  const handleSetDestPathManually = (path: string) => {
    setDestination({
      name: folderNameFromPath(path),
      type: serverStatus.connected ? 'server' : 'virtual',
      fullPath: path,
    });
  };

  // Re-evaluate filters and calculate destinations for all files
  const processedFiles = useMemo(() => {
    const existingPaths = new Set<string>();

    return rawFiles.map((file) => {
      // 1. Evaluate filter rules
      const filterResult = evaluateFileFilter(file, criteria);

      // 2. Calculate destination
      const destResult = calculateDestination(
        file,
        destination.name,
        settings,
        existingPaths
      );

      return {
        ...file,
        matchesFilter: filterResult.matches,
        matchedRules: filterResult.matched,
        unmatchedRules: filterResult.unmatched,
        calculatedDestination: destResult.destinationPath,
        calculatedFilename: destResult.fileName,
        hasConflict: destResult.hasConflict,
      };
    });
  }, [rawFiles, criteria, destination.name, settings]);

  // Toggle single file selection
  const handleToggleFile = useCallback((fileId: string) => {
    setRawFiles((prev) =>
      prev.map((f) => (f.id === fileId ? { ...f, selectedForAction: !f.selectedForAction } : f))
    );
  }, []);

  // Toggle all matched files selection
  const handleToggleAll = useCallback(
    (selected: boolean) => {
      const matchedIds = new Set(
        processedFiles.filter((f) => f.matchesFilter).map((f) => f.id)
      );
      setRawFiles((prev) =>
        prev.map((f) => (matchedIds.has(f.id) ? { ...f, selectedForAction: selected } : f))
      );
    },
    [processedFiles]
  );

  // Download reorganized ZIP bundle (optional export)
  const handleDownloadZip = async () => {
    const filesToMove = processedFiles.filter((f) => f.matchesFilter && f.selectedForAction);
    if (filesToMove.length === 0 || !destination.name.trim()) return;

    try {
      const zipBlob = await exportMovedZip(filesToMove, destination.name);
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${destination.name || 'Archivio'}_${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Errore creazione ZIP:', err);
    }
  };

  // Execute Move / Copy operation REAL ON DISK
  const handleExecuteOperation = async () => {
    const filesToMove = processedFiles.filter((f) => f.matchesFilter && f.selectedForAction);
    const destName = destination.fullPath || destination.name;
    if (filesToMove.length === 0 || !destName.trim()) return;

    setIsExecuting(true);
    setShowExecutionModal(true);

    const initialProgress: ExecutionProgress = {
      total: filesToMove.length,
      completed: 0,
      successCount: 0,
      errorCount: 0,
      skippedCount: 0,
      currentFileName: '',
      isExecuting: true,
      isComplete: false,
      logs: [],
    };
    setExecutionProgress(initialProgress);

    // PATHWAY 1: Local Server Connected AND both are server paths
    if (
      serverStatus.connected &&
      source?.type === 'server' &&
      destination.type === 'server' &&
      (destination.fullPath || destination.name)
    ) {
      try {
        const destFolder = destination.fullPath || destination.name;
        const items = filesToMove.map((f) => ({
          sourceFullPath: f.fullPath || f.relativePath,
          destRelativePath: stripDestPrefix(f.calculatedDestination, destination.name),
        }));

        const res = await fetch('/api/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            operation: settings.operation,
            conflictResolution: settings.conflictResolution,
            destFolder,
            items,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Errore durante l\'esecuzione su disco.');
        }

        const logs: ExecutionLogEntry[] = (data.results || []).map(
          (
            r: {
              sourcePath: string;
              destPath?: string;
              status: 'success' | 'error' | 'skipped';
              message: string;
            },
            idx: number
          ) => ({
            id: `log_${idx}`,
            timestamp: new Date().toISOString(),
            fileName: r.sourcePath ? r.sourcePath.split(/[/\\]/).pop() || '' : '',
            sourcePath: r.sourcePath || '',
            destPath: r.destPath || destFolder,
            action: settings.operation,
            status: r.status,
            message: r.message,
          })
        );

        setExecutionProgress({
          total: filesToMove.length,
          completed: filesToMove.length,
          successCount: data.successCount || 0,
          errorCount: data.errorCount || 0,
          skippedCount: data.skippedCount || 0,
          currentFileName: 'Completato con successo',
          isExecuting: false,
          isComplete: true,
          logs,
        });

        // If move was selected, reload the source directory so moved files disappear
        if (settings.operation === 'move' && source?.fullPath) {
          await loadFolderFromDisk(source.fullPath);
        }
        setIsExecuting(false);
        return;
      } catch (err) {
        console.error('Server execute failed, trying browser handles:', err);
      }
    }

    // PATHWAY 2: Native File System Access API
    const logs: ExecutionLogEntry[] = [];
    let successCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    const destDirHandle = destination.handle;
    const isMove = settings.operation === 'move';

    for (let i = 0; i < filesToMove.length; i++) {
      const file = filesToMove[i];

      setExecutionProgress((prev) => ({
        ...prev,
        completed: i,
        currentFileName: file.name,
      }));

      // Small delay for smooth UI responsiveness
      await new Promise((resolve) => setTimeout(resolve, 50));

      try {
        if (!destDirHandle) {
          throw new Error(
            'Nessuna cartella di scrittura autorizzata. Seleziona la destinazione con "Sfoglia Cartella" oppure avvia con AVVIA_FILEMOVER.bat.'
          );
        }
        const targetRelPath = stripDestPrefix(file.calculatedDestination, destination.name);
        const parts = targetRelPath.split('/');
        const fileName = parts.pop() || file.name;
        const subPath = parts.join('/');

        // Get or create destination subdirectory
        const targetDir = await getOrCreateDirectoryHandle(destDirHandle, subPath);

        // Get file content
        let blobData: Blob | null = null;
        if (file.handle) {
          const f = await file.handle.getFile();
          blobData = f;
        } else if (file.fileBlob) {
          blobData = file.fileBlob;
        }

        if (!blobData) {
          throw new Error('Contenuto file non disponibile nel browser (ricarica la cartella di origine).');
        }

        const newFileHandle = await targetDir.getFileHandle(fileName, { create: true });
        const writable = await newFileHandle.createWritable();
        await writable.write(blobData);
        await writable.close();

        // If move and we have source directory handle, remove source file
        if (isMove && source?.handle) {
          try {
            await removeSourceEntry(source.handle, file.relativePath);
          } catch (delErr) {
            console.warn('Impossibile eliminare file originale:', delErr);
          }
        }

        successCount++;
        logs.unshift({
          id: `log_${i}_${file.name}`,
          timestamp: new Date().toISOString(),
          fileName: file.name,
          sourcePath: file.relativePath,
          destPath: file.calculatedDestination,
          action: settings.operation,
          status: 'success',
          message: `${isMove ? 'Spostato fisicamente su disco in' : 'Copiato fisicamente su disco in'} ${file.calculatedDestination}`,
        });
      } catch (err: unknown) {
        errorCount++;
        logs.unshift({
          id: `log_err_${i}_${file.name}`,
          timestamp: new Date().toISOString(),
          fileName: file.name,
          sourcePath: file.relativePath,
          destPath: file.calculatedDestination,
          action: settings.operation,
          status: 'error',
          message: `Errore: ${(err as Error)?.message || 'Operazione non riuscita'}`,
        });
      }

      setExecutionProgress({
        total: filesToMove.length,
        completed: i + 1,
        successCount,
        errorCount,
        skippedCount,
        currentFileName: file.name,
        isExecuting: i + 1 < filesToMove.length,
        isComplete: i + 1 === filesToMove.length,
        logs,
      });
    }

    // Remove moved files from rawFiles
    if (isMove && destDirHandle) {
      const movedIds = new Set(filesToMove.map((f) => f.id));
      setRawFiles((prev) => prev.filter((f) => !movedIds.has(f.id)));
    }

    setIsExecuting(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-indigo-500 selection:text-white transition-colors duration-200">
      <Header onReset={resetAll} hasFiles={rawFiles.length > 0} />
      <OfflineBanner />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* 1. SELEZIONE CARTELLE (ORIGINE E DESTINAZIONE) */}
        <FolderSelector
          source={source}
          destination={destination}
          serverStatus={serverStatus}
          onBrowseSource={handleBrowseSource}
          onBrowseDest={handleBrowseDest}
          isBrowsingSource={isBrowsingSource}
          isBrowsingDest={isBrowsingDest}
          onSetSourcePathManually={loadFolderFromDisk}
          onSetDestPathManually={handleSetDestPathManually}
          onSelectSourceNative={handleSelectSourceNative}
          onSelectSourceWebkit={handleSelectSourceWebkit}
          onSelectDestNative={handleSelectDestNative}
          onSelectDestWebkit={handleSelectDestWebkit}
          onSetDestName={(name) =>
            setDestination((prev) => ({
              ...prev,
              name,
              fullPath: serverStatus.connected ? name : prev.fullPath,
            }))
          }
          isNativeSupported={isNativeSupported}
          nativeErrorNotice={nativeErrorNotice}
          onDismissNativeError={() => setNativeErrorNotice(null)}
        />

        {/* 2 & 3. CRITERI DI FILTRO E IMPOSTAZIONI DI DESTINAZIONE */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7">
            <CriteriaPanel
              criteria={criteria}
              onChange={updateCriteria}
              onResetCriteria={() => setCriteria(DEFAULT_CRITERIA)}
              matchedCount={processedFiles.filter((f) => f.matchesFilter).length}
              totalCount={rawFiles.length}
            />
          </div>

          <div className="lg:col-span-5">
            <DestinationSettingsPanel
              settings={settings}
              onChange={updateSettings}
              destFolderName={destination.fullPath || destination.name}
            />
          </div>
        </div>

        {/* 4. ANTEPRIMA OBBLIGATORIA ED ESECUZIONE */}
        <PreviewSection
          files={processedFiles}
          destFolderName={destination.fullPath || destination.name}
          settings={settings}
          onToggleFile={handleToggleFile}
          onToggleAll={handleToggleAll}
          onExecute={handleExecuteOperation}
          isExecuting={isExecuting}
        />
      </main>

      {/* MODALE DI ESECUZIONE FISICA SUL DISCO */}
      {showExecutionModal && (
        <ExecutionModal
          progress={executionProgress}
          operation={settings.operation}
          destFolderName={destination.fullPath || destination.name}
          hasNativeHandle={!!destination.handle}
          isServerConnected={serverStatus.connected}
          onClose={() => setShowExecutionModal(false)}
          onDownloadZip={handleDownloadZip}
          onOpenScriptModal={() => setShowScriptModal(true)}
        />
      )}

      {/* MODALE SCRIPT OPZIONALE */}
      {showScriptModal && (
        <ScriptModal
          files={processedFiles.filter((f) => f.matchesFilter && f.selectedForAction)}
          sourceFolderName={source?.fullPath || source?.name || 'Origine'}
          settings={settings}
          onClose={() => setShowScriptModal(false)}
        />
      )}
    </div>
  );
}
