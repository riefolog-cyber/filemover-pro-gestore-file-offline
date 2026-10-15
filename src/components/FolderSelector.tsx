/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import {
  FolderOpen,
  FolderInput,
  FolderOutput,
  CheckCircle2,
  HardDrive,
  FileQuestion,
  AlertCircle,
  X,
  Zap,
  RefreshCw,
} from 'lucide-react';
import { FolderDestination, FolderSource, ServerStatus } from '../types/fileMover';
import { formatBytes } from '../utils/fileSystem';

interface FolderSelectorProps {
  source: FolderSource | null;
  destination: FolderDestination;
  serverStatus: ServerStatus;
  onBrowseSource: () => void;
  onBrowseDest: () => void;
  isBrowsingSource?: boolean;
  isBrowsingDest?: boolean;
  onSetSourcePathManually: (path: string) => void;
  onSetDestPathManually: (path: string) => void;
  onSelectSourceNative: () => void;
  onSelectSourceWebkit: (files: FileList) => void;
  onSelectDestNative: () => void;
  onSelectDestWebkit: (folderName: string, filesCount: number) => void;
  onSetDestName: (name: string) => void;
  isNativeSupported: boolean;
  nativeErrorNotice: string | null;
  onDismissNativeError: () => void;
}

export const FolderSelector: React.FC<FolderSelectorProps> = ({
  source,
  destination,
  serverStatus,
  onBrowseSource,
  onBrowseDest,
  isBrowsingSource = false,
  isBrowsingDest = false,
  onSetSourcePathManually,
  onSetDestPathManually,
  onSelectSourceNative,
  onSelectSourceWebkit,
  onSelectDestNative,
  onSelectDestWebkit,
  onSetDestName,
  isNativeSupported,
  nativeErrorNotice,
  onDismissNativeError,
}) => {
  const sourceFileInputRef = useRef<HTMLInputElement>(null);
  const destFileInputRef = useRef<HTMLInputElement>(null);
  const [manualSourcePath, setManualSourcePath] = useState('');
  const [showManualSource, setShowManualSource] = useState(false);

  const handleSourceWebkitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onSelectSourceWebkit(e.target.files);
    }
  };

  const handleDestWebkitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const firstFile = e.target.files[0];
      const relPath = firstFile.webkitRelativePath || '';
      const folderName = relPath.split('/')[0] || e.target.files[0].name || 'Destinazione';
      onSelectDestWebkit(folderName, e.target.files.length);
    }
  };

  const handleManualSubmit = (
    e: React.FormEvent,
    value: string,
    onSubmit: (path: string) => void
  ) => {
    e.preventDefault();
    if (value.trim()) {
      onSubmit(value.trim());
    }
  };

  const handleBrowseClick = (onBrowse: () => void, inputRef: React.RefObject<HTMLInputElement | null>) => {
    if (isNativeSupported || serverStatus.connected) {
      onBrowse();
    } else {
      inputRef.current?.click();
    }
  };

  const isDirectDiskActive = serverStatus.connected || !!destination.handle;

  return (
    <div className="space-y-4">
      {/* Server Status Header Banner */}
      {serverStatus.connected ? (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-semibold flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              Motore Disco Diretto Attivo (AVVIA_FILEMOVER)
            </span>
            <span className="text-slate-500 dark:text-slate-400 hidden sm:inline">·</span>
            <span className="text-slate-600 dark:text-slate-400 hidden sm:inline">
              Spostamenti ed eliminazioni reali su qualsiasi disco, senza limiti o richieste di download.
            </span>
          </div>
          <span className="font-mono text-[11px] bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded font-semibold shrink-0">
            {serverStatus.platform === 'win32' ? 'Windows' : serverStatus.platform || 'Locale'}
          </span>
        </div>
      ) : (
        <div className="bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs text-slate-700 dark:text-slate-300">
          <div className="flex items-center gap-2">
            <HardDrive className="w-3.5 h-3.5 text-indigo-500" />
            <span>
              Modalità Browser. Per lo spostamento diretto con zero permessi, avvia con <strong className="font-mono text-indigo-600 dark:text-indigo-400">AVVIA_FILEMOVER.bat</strong>.
            </span>
          </div>
        </div>
      )}

      {/* Notice error banner */}
      {nativeErrorNotice && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-500/30 rounded-xl p-3 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1 text-[11px] leading-relaxed">
            <span className="font-semibold block text-amber-900 dark:text-amber-200 mb-0.5">Avviso Selezione</span>
            {nativeErrorNotice}
          </div>
          <button
            onClick={onDismissNativeError}
            className="text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Cards 2-Col Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 1. CARTELLA DI ORIGINE */}
        <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col justify-between shadow-sm transition-colors">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <FolderInput className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    1. Cartella di Origine
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Seleziona la cartella con i file da organizzare
                  </p>
                </div>
              </div>
              {source ? (
                <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Pronta
                </span>
              ) : (
                <span className="text-xs text-slate-400 dark:text-slate-500">Da selezionare</span>
              )}
            </div>

            {source ? (
              <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-lg p-3.5 my-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <FolderOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate" title={source.fullPath || source.name}>
                      {source.name}
                    </span>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-400 font-mono text-[11px] shrink-0">
                    {source.fullPath ? 'Disco Locale' : source.type === 'native' ? 'Accesso Diretto' : 'Cartella Web'}
                  </span>
                </div>
                {source.fullPath && (
                  <p className="font-mono text-[11px] text-slate-500 dark:text-slate-400 truncate" title={source.fullPath}>
                    {source.fullPath}
                  </p>
                )}
                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 pt-1">
                  <span className="font-mono tabular-nums text-slate-700 dark:text-slate-300 font-medium">
                    {source.totalFiles} file scansionati
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums text-slate-700 dark:text-slate-300 font-medium">
                    {formatBytes(source.totalSize)} totali
                  </span>
                </div>
              </div>
            ) : (
              <div className="border border-dashed border-slate-300 dark:border-slate-800 rounded-lg p-5 my-3 text-center bg-slate-50/50 dark:bg-slate-950/40">
                <FileQuestion className="w-8 h-8 mx-auto text-slate-400 dark:text-slate-600 mb-2" />
                <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                  Nessuna cartella di origine selezionata
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-500 mt-0.5">
                  Fai clic su &quot;Sfoglia Cartella dal Computer&quot; per iniziare
                </p>
              </div>
            )}
          </div>

          {/* Action buttons per cartella origine */}
          <div className="pt-2 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="file"
                ref={sourceFileInputRef}
                // @ts-expect-error webkitdirectory standard
                webkitdirectory="true"
                directory="true"
                multiple
                className="hidden"
                onChange={handleSourceWebkitChange}
              />

              <button
                type="button"
                onClick={() => handleBrowseClick(onBrowseSource, sourceFileInputRef)}
                disabled={isBrowsingSource}
                className="px-4 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 rounded-lg transition-colors flex items-center gap-2 shadow-sm cursor-pointer"
                title="Apri Esplora Risorse di Windows per selezionare la cartella di origine"
              >
                {isBrowsingSource ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Apertura Esplora Risorse Windows...</span>
                  </>
                ) : (
                  <>
                    <FolderOpen className="w-4 h-4" />
                    <span>Sfoglia Cartella con Esplora Risorse</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowManualSource(!showManualSource)}
                className="px-2.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                title="Inserisci o incolla manualmente un percorso cartella"
              >
                {showManualSource ? 'Nascondi percorso manuale' : 'Digita percorso...'}
              </button>
            </div>

            {/* Manual Path Input form */}
            {showManualSource && (
              <form onSubmit={(e) => handleManualSubmit(e, manualSourcePath, onSetSourcePathManually)} className="flex items-center gap-1.5 pt-1">
                <input
                  type="text"
                  value={manualSourcePath}
                  onChange={(e) => setManualSourcePath(e.target.value)}
                  placeholder="Es: C:\Users\giova\Desktop\MieFoto"
                  className="flex-1 px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 text-xs font-medium bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg transition-colors"
                >
                  Carica
                </button>
              </form>
            )}
          </div>
        </div>

        {/* 2. CARTELLA DI DESTINAZIONE */}
        <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col justify-between shadow-sm transition-colors">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <FolderOutput className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    2. Cartella di Destinazione
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Cartella fisica in cui spostare o copiare i file
                  </p>
                </div>
              </div>
              {destination.fullPath || destination.handle ? (
                <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Disco Diretto Pronto
                </span>
              ) : destination.name ? (
                <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                  {destination.name}
                </span>
              ) : (
                <span className="text-xs text-slate-400 dark:text-slate-500">Da impostare</span>
              )}
            </div>

            <div className="space-y-3 my-3">
              {/* Folder Picker Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="file"
                  ref={destFileInputRef}
                  // @ts-expect-error webkitdirectory standard
                  webkitdirectory="true"
                  directory="true"
                  multiple
                  className="hidden"
                  onChange={handleDestWebkitChange}
                />

                <button
                  type="button"
                  onClick={() => handleBrowseClick(onBrowseDest, destFileInputRef)}
                  disabled={isBrowsingDest}
                  className="px-4 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 rounded-lg transition-colors flex items-center gap-2 shadow-sm cursor-pointer"
                  title="Apri Esplora Risorse Windows per selezionare o creare la cartella di destinazione"
                >
                  {isBrowsingDest ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Apertura Esplora Risorse Windows...</span>
                    </>
                  ) : (
                    <>
                      <FolderOpen className="w-4 h-4" />
                      <span>Sfoglia Cartella con Esplora Risorse</span>
                    </>
                  )}
                </button>
              </div>

              {/* Destination Path Display / Input */}
              <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                  <span className="font-medium">Percorso Cartella Destinazione:</span>
                  {isDirectDiskActive && (
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Scrittura Diretta
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={destination.fullPath || destination.name}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (serverStatus.connected) {
                        onSetDestPathManually(val);
                      } else {
                        onSetDestName(val);
                      }
                    }}
                    placeholder="Es: C:\Users\giova\Desktop\Archivio_Organizzato"
                    className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                {destination.fullPath ? (
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-mono">
                    ✓ Cartella reale: {destination.fullPath}
                  </p>
                ) : destination.name ? (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Sottocartella di destinazione: <span className="font-mono font-medium text-slate-700 dark:text-slate-300">{destination.name}</span>
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="pt-1 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>I file spostati confluiranno qui</span>
            {destination.name && (
              <button
                type="button"
                onClick={() => onSetDestName('')}
                className="text-[11px] text-slate-400 hover:text-rose-500 transition-colors"
              >
                Azzera
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
