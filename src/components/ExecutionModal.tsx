/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  CheckCircle2,
  AlertCircle,
  XCircle,
  Download,
  X,
  FileCheck2,
  HardDrive,
  Sparkles,
} from 'lucide-react';
import { ExecutionProgress, OperationAction } from '../types/fileMover';

interface ExecutionModalProps {
  progress: ExecutionProgress;
  operation: OperationAction;
  destFolderName: string;
  hasNativeHandle: boolean;
  isServerConnected?: boolean;
  onClose: () => void;
  onDownloadZip?: () => void;
  onOpenScriptModal?: () => void;
}

export const ExecutionModal: React.FC<ExecutionModalProps> = ({
  progress,
  operation,
  destFolderName,
  hasNativeHandle,
  isServerConnected = false,
  onClose,
  onDownloadZip,
  onOpenScriptModal,
}) => {
  const percent = progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;
  const isMove = operation === 'move';
  const isRealDisk = hasNativeHandle || isServerConnected;

  const downloadReportCsv = () => {
    const headers = ['Data/Ora', 'Nome File', 'Origine', 'Destinazione', 'Azione', 'Esito', 'Dettagli'];
    const rows = progress.logs.map((l) => [
      `"${l.timestamp}"`,
      `"${l.fileName.replace(/"/g, '""')}"`,
      `"${l.sourcePath.replace(/"/g, '""')}"`,
      `"${l.destPath.replace(/"/g, '""')}"`,
      `"${l.action}"`,
      `"${l.status}"`,
      `"${l.message.replace(/"/g, '""')}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report_${operation}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm transition-colors">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-2xl w-full shadow-2xl flex flex-col max-h-[90vh] transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <FileCheck2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {progress.isComplete
                  ? `Operazione di ${isMove ? 'Spostamento' : 'Copia'} Completata`
                  : `${isMove ? 'Spostamento' : 'Copia'} in Corso...`}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Destinazione: <span className="font-mono text-slate-800 dark:text-slate-300 font-semibold">{destFolderName || 'Cartella Destinazione'}</span>
              </p>
            </div>
          </div>
          {progress.isComplete && (
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Progress bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-600 dark:text-slate-400 font-mono truncate max-w-[360px]">
                {progress.isComplete
                  ? 'Tutti i file elaborati con successo'
                  : `In elaborazione: ${progress.currentFileName || 'Preparazione...'}`}
              </span>
              <span className="text-slate-900 dark:text-slate-200 font-mono font-semibold tabular-nums">
                {progress.completed} / {progress.total} ({percent}%)
              </span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-200 dark:border-slate-800">
              <div
                className="bg-emerald-500 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>

          {/* Real Disk Success Banner */}
          {progress.isComplete && isRealDisk && (
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-500/30 rounded-lg p-4 space-y-2">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <span className="font-semibold text-emerald-900 dark:text-emerald-300 text-sm block">
                    {isMove ? 'File Spostati Fisicamente sul Disco!' : 'File Copiati Fisicamente sul Disco!'}
                  </span>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-xs">
                    L&apos;operazione è stata completata direttamente sul tuo computer. I file si trovano ora nella cartella di destinazione selezionata:
                  </p>
                  <p className="font-mono text-emerald-800 dark:text-emerald-300 font-medium text-[11px] bg-emerald-100/60 dark:bg-emerald-900/40 p-1.5 rounded">
                    {destFolderName}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Sandbox Notice ONLY if neither server nor native write handle */}
          {progress.isComplete && !isRealDisk && (
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-500/30 rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <span className="font-semibold text-amber-900 dark:text-amber-300 text-sm block">
                    Browser Sandbox: Accesso Diretto Non Concesso
                  </span>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-xs">
                    Per eseguire lo spostamento <strong>reale e diretto su disco</strong> senza alcuna restrizione del browser, avvia FileMover con il file:
                  </p>
                  <p className="font-mono font-bold text-indigo-700 dark:text-indigo-400 text-xs bg-indigo-50 dark:bg-indigo-950/50 p-1.5 rounded border border-indigo-200 dark:border-indigo-800">
                    AVVIA_FILEMOVER.bat
                  </p>
                </div>
              </div>

              {(onDownloadZip || onOpenScriptModal) && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {onDownloadZip && (
                    <button
                      type="button"
                      onClick={onDownloadZip}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/80 rounded-md transition-colors"
                    >
                      Scarica archivio ZIP
                    </button>
                  )}
                  {onOpenScriptModal && (
                    <button
                      type="button"
                      onClick={onOpenScriptModal}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/80 rounded-md transition-colors"
                    >
                      Vedi Script
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Stats counters */}
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="bg-slate-50 dark:bg-slate-950/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800/80">
              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 mb-0.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span className="font-semibold">Elaborati</span>
              </div>
              <span className="font-mono text-slate-900 dark:text-slate-200 text-sm font-semibold tabular-nums">
                {progress.successCount}
              </span>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800/80">
              <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 mb-0.5">
                <AlertCircle className="w-3.5 h-3.5" />
                <span className="font-semibold">Conflitti</span>
              </div>
              <span className="font-mono text-slate-900 dark:text-slate-200 text-sm font-semibold tabular-nums">
                {progress.skippedCount}
              </span>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800/80">
              <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 mb-0.5">
                <XCircle className="w-3.5 h-3.5" />
                <span className="font-semibold">Errori</span>
              </div>
              <span className="font-mono text-slate-900 dark:text-slate-200 text-sm font-semibold tabular-nums">
                {progress.errorCount}
              </span>
            </div>
          </div>

          {/* Real-time log list */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="font-medium">Registro Operazioni sul Disco:</span>
              <span className="font-mono text-[11px]">{progress.logs.length} eventi</span>
            </div>
            <div className="bg-slate-900 text-slate-100 rounded-lg p-3 max-h-48 overflow-y-auto font-mono text-[11px] space-y-1.5 border border-slate-800">
              {progress.logs.length === 0 ? (
                <div className="text-slate-500 py-4 text-center">In attesa dell&apos;avvio...</div>
              ) : (
                progress.logs.map((log) => (
                  <div key={log.id} className="flex items-start gap-2 leading-tight">
                    <span
                      className={`shrink-0 font-bold ${
                        log.status === 'success'
                          ? 'text-emerald-400'
                          : log.status === 'error'
                          ? 'text-rose-400'
                          : 'text-amber-400'
                      }`}
                    >
                      {log.status === 'success' ? '✓' : log.status === 'error' ? '✗' : '!'}
                    </span>
                    <span className="text-slate-400 text-[10px] shrink-0">
                      {log.timestamp.slice(11, 19)}
                    </span>
                    <span className="text-slate-300 truncate max-w-[200px]" title={log.fileName}>
                      {log.fileName}
                    </span>
                    <span className="text-slate-500 truncate" title={log.message}>
                      {log.message}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 rounded-b-xl">
          <button
            onClick={downloadReportCsv}
            disabled={progress.logs.length === 0}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 dark:text-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            Scarica Report CSV
          </button>

          {progress.isComplete ? (
            <button
              onClick={onClose}
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors shadow-sm cursor-pointer"
            >
              Chiudi e Torna ai File
            </button>
          ) : (
            <div className="flex items-center gap-2 text-xs text-indigo-600 dark:text-indigo-400 font-medium">
              <Sparkles className="w-3.5 h-3.5 animate-spin" />
              <span>Elaborazione in corso...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
