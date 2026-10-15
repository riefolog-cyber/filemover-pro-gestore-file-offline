/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { Terminal, Copy, Check, Download, X } from 'lucide-react';
import { DestinationSettings, FileItem } from '../types/fileMover';
import {
  generateBashScript,
  generateBatchScript,
  generatePowerShellScript,
} from '../utils/fileSystem';

interface ScriptModalProps {
  files: FileItem[];
  sourceFolderName: string;
  settings: DestinationSettings;
  onClose: () => void;
}

export const ScriptModal: React.FC<ScriptModalProps> = ({
  files,
  sourceFolderName,
  settings,
  onClose,
}) => {
  const [scriptType, setScriptType] = useState<'powershell' | 'bash' | 'batch'>('powershell');
  const [copied, setCopied] = useState(false);

  const scriptContent = useMemo(() => {
    switch (scriptType) {
      case 'powershell':
        return generatePowerShellScript(files, sourceFolderName, settings);
      case 'bash':
        return generateBashScript(files, sourceFolderName, settings);
      case 'batch':
        return generateBatchScript(files, sourceFolderName, settings);
    }
  }, [files, sourceFolderName, settings, scriptType]);

  const handleCopy = () => {
    navigator.clipboard.writeText(scriptContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const ext = scriptType === 'powershell' ? 'ps1' : scriptType === 'bash' ? 'sh' : 'bat';
    const blob = new Blob([scriptContent], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sposta_file_${scriptType}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm transition-colors">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-3xl w-full shadow-2xl flex flex-col max-h-[90vh] transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Script di Esecuzione Locale Offline
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Esegui direttamente dal tuo computer senza dipendenze né connessione internet
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="px-5 pt-4 pb-2 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800/80">
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
            <button
              onClick={() => setScriptType('powershell')}
              className={`px-3 py-1 font-medium rounded transition-colors ${
                scriptType === 'powershell'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              PowerShell (.ps1)
            </button>
            <button
              onClick={() => setScriptType('bash')}
              className={`px-3 py-1 font-medium rounded transition-colors ${
                scriptType === 'bash'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Bash macOS / Linux (.sh)
            </button>
            <button
              onClick={() => setScriptType('batch')}
              className={`px-3 py-1 font-medium rounded transition-colors ${
                scriptType === 'batch'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Prompt Windows (.bat)
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-2.5 py-1.5 text-xs text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 dark:text-slate-300 dark:hover:text-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-md transition-colors flex items-center gap-1.5 border border-slate-300 dark:border-slate-700"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Copiato
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" /> Copia Codice
                </>
              )}
            </button>
            <button
              onClick={handleDownload}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-md transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              Scarica File
            </button>
          </div>
        </div>

        {/* Code viewer */}
        <div className="p-5 overflow-y-auto font-mono text-xs text-slate-800 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 flex-1 border-b border-slate-200 dark:border-slate-800">
          <pre className="leading-relaxed whitespace-pre-wrap select-all">{scriptContent}</pre>
        </div>

        {/* Footer notes */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
          <span>
            {scriptType === 'powershell'
              ? 'Windows: Esegui con tasto destro "Esegui con PowerShell"'
              : scriptType === 'bash'
              ? 'macOS / Linux: Esegui con bash sposta_file_bash.sh'
              : 'Windows: Fai doppio clic sul file .bat scaricato'}
          </span>
          <button
            onClick={onClose}
            className="px-3 py-1 text-xs text-slate-700 bg-slate-200 hover:bg-slate-300 dark:text-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 rounded transition-colors"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
};
