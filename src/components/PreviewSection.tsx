/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  ArrowRight,
  Search,
  CheckSquare,
  Square,
  FileText,
  FileCode,
  FileArchive,
  FileSpreadsheet,
  FileImage,
  FileVideo,
  File,
  Play,
  Scissors,
  Copy,
  Info,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { DestinationSettings, FileItem } from '../types/fileMover';
import { formatBytes, formatDate } from '../utils/fileSystem';

interface PreviewSectionProps {
  files: FileItem[];
  destFolderName: string;
  settings: DestinationSettings;
  onToggleFile: (fileId: string) => void;
  onToggleAll: (selected: boolean) => void;
  onExecute: () => void;
  isExecuting: boolean;
}

function getFileIcon(ext: string) {
  const clean = ext.replace(/^\./, '').toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'heic'].includes(clean)) {
    return <FileImage className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />;
  }
  if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(clean)) {
    return <FileVideo className="w-4 h-4 text-rose-500 dark:text-rose-400" />;
  }
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(clean)) {
    return <FileArchive className="w-4 h-4 text-amber-500 dark:text-amber-400" />;
  }
  if (['xlsx', 'xls', 'csv'].includes(clean)) {
    return <FileSpreadsheet className="w-4 h-4 text-teal-500 dark:text-teal-400" />;
  }
  if (['pdf', 'docx', 'doc', 'txt', 'rtf'].includes(clean)) {
    return <FileText className="w-4 h-4 text-sky-500 dark:text-sky-400" />;
  }
  if (['js', 'ts', 'tsx', 'jsx', 'json', 'sql', 'html', 'css', 'py'].includes(clean)) {
    return <FileCode className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />;
  }
  return <File className="w-4 h-4 text-slate-400" />;
}

export const PreviewSection: React.FC<PreviewSectionProps> = ({
  files,
  destFolderName,
  settings,
  onToggleFile,
  onToggleAll,
  onExecute,
  isExecuting,
}) => {
  const [tab, setTab] = useState<'selected' | 'excluded' | 'all'>('selected');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionAlert, setActionAlert] = useState<string | null>(null);

  // Filtered files according to matching criteria and search query
  const matchedFiles = useMemo(() => files.filter((f) => f.matchesFilter), [files]);
  const excludedFiles = useMemo(() => files.filter((f) => !f.matchesFilter), [files]);

  const activeFileList = useMemo(() => {
    let list: FileItem[] = [];
    if (tab === 'selected') list = matchedFiles;
    else if (tab === 'excluded') list = excludedFiles;
    else list = files;

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.relativePath.toLowerCase().includes(q) ||
        f.calculatedDestination.toLowerCase().includes(q)
    );
  }, [tab, files, matchedFiles, excludedFiles, searchQuery]);

  // Selected for execution count
  const filesToMove = useMemo(
    () => matchedFiles.filter((f) => f.selectedForAction),
    [matchedFiles]
  );

  const totalSizeToMove = useMemo(
    () => filesToMove.reduce((acc, f) => acc + f.size, 0),
    [filesToMove]
  );

  const allSelectedInView = useMemo(() => {
    if (matchedFiles.length === 0) return false;
    return matchedFiles.every((f) => f.selectedForAction);
  }, [matchedFiles]);

  const isMove = settings.operation === 'move';
  const canExecute = !isExecuting && filesToMove.length > 0 && !!destFolderName.trim();

  const executeLabel = isExecuting
    ? 'Operazione in corso...'
    : `Avvia ${isMove ? 'Spostamento' : 'Copia'} (${filesToMove.length} File)`;

  const renderExecuteButton = (extraClass = '') => (
    <button
      type="button"
      onClick={handleExecuteClick}
      disabled={!canExecute}
      className={`px-5 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 active:scale-95 disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:text-slate-500 rounded-lg transition-all shadow-md flex items-center gap-2 cursor-pointer ${extraClass}`}
    >
      <Play className="w-3.5 h-3.5 fill-current" />
      {executeLabel}
    </button>
  );

  const handleExecuteClick = () => {
    setActionAlert(null);
    if (files.length === 0) {
      setActionAlert('Seleziona prima una cartella di origine al passaggio 1 per caricare i file da spostare.');
      return;
    }
    if (matchedFiles.length === 0) {
      setActionAlert('Nessun file corrisponde ai criteri attuali di filtro. Prova ad allentare i filtri al passaggio 2.');
      return;
    }
    if (filesToMove.length === 0) {
      setActionAlert('Tutti i file conformi risultano deselezionati. Seleziona almeno una casella nell\'anteprima.');
      return;
    }
    if (!destFolderName.trim()) {
      setActionAlert('Specifica o seleziona una cartella di destinazione al passaggio 2 per procedere.');
      return;
    }
    onExecute();
  };

  return (
    <div id="anteprima" className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-5 shadow-sm transition-colors">
      {/* Required Preview Banner */}
      <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-500/30 rounded-lg p-4 flex items-start gap-3.5">
        <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
          <ShieldAlert className="w-4 h-4" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              4. Anteprima Obbligatoria dell&apos;Operazione
            </h3>
            <span className="text-xs bg-indigo-100 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-300 font-mono px-2 py-0.5 rounded font-medium">
              Controllo Preventivo Attivo
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
            In conformità alle istruzioni, <strong>nessun file viene modificato o spostato</strong> prima di aver visto l&apos;anteprima e la destinazione calcolata. Verifica l&apos;elenco in basso prima di procedere.
          </p>
        </div>
      </div>

      {/* Action alert feedback if user clicks when something is missing */}
      {actionAlert && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-500/40 rounded-lg p-3 text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>{actionAlert}</span>
          </div>
          <button
            onClick={() => setActionAlert(null)}
            className="text-amber-800 hover:text-amber-950 dark:text-amber-400 dark:hover:text-amber-100 text-xs font-semibold px-2"
          >
            OK
          </button>
        </div>
      )}

      {/* Summary Metrics Bar with Immediate Top CTA */}
      <div className="bg-slate-50 dark:bg-slate-950/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs flex-1">
          <div>
            <span className="text-slate-500 block mb-0.5">File Selezionati:</span>
            <span className="font-mono text-slate-800 dark:text-slate-200 font-semibold tabular-nums text-sm">
              {filesToMove.length}
              <span className="text-slate-400 dark:text-slate-500 text-xs font-normal"> / {files.length} totali</span>
            </span>
          </div>
          <div>
            <span className="text-slate-500 block mb-0.5">Dimensione Totale:</span>
            <span className="font-mono text-indigo-600 dark:text-indigo-400 font-semibold tabular-nums text-sm">
              {formatBytes(totalSizeToMove)}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block mb-0.5">Tipo Operazione:</span>
            <span className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1">
              {isMove ? (
                <>
                  <Scissors className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" /> Spostamento (Taglia)
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" /> Copia (Conserva)
                </>
              )}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block mb-0.5">Cartella Destinazione:</span>
            <span className="font-mono text-emerald-600 dark:text-emerald-400 truncate block text-[11px] font-semibold" title={destFolderName}>
              {destFolderName || 'Da impostare'}
            </span>
          </div>
        </div>

        {/* Top Direct Action Button (stesso componente del pulsante in fondo) */}
        <div className="shrink-0 flex items-center gap-2">
          {renderExecuteButton()}
        </div>
      </div>

      {/* Toolbar & Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        {/* Tab switch */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-950/80 rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setTab('selected')}
            className={`px-3 py-1.5 font-medium rounded-md transition-colors ${
              tab === 'selected'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            File Conformi ({matchedFiles.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('excluded')}
            className={`px-3 py-1.5 font-medium rounded-md transition-colors ${
              tab === 'excluded'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            File Esclusi ({excludedFiles.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('all')}
            className={`px-3 py-1.5 font-medium rounded-md transition-colors ${
              tab === 'all'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Tutti i File ({files.length})
          </button>
        </div>

        {/* Search input & Select All */}
        <div className="flex items-center gap-2">
          {tab === 'selected' && matchedFiles.length > 0 && (
            <button
              type="button"
              onClick={() => onToggleAll(!allSelectedInView)}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors flex items-center gap-1.5"
            >
              {allSelectedInView ? (
                <>
                  <CheckSquare className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  Deseleziona tutti
                </>
              ) : (
                <>
                  <Square className="w-3.5 h-3.5 text-slate-400" />
                  Seleziona tutti
                </>
              )}
            </button>
          )}

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cerca per nome o percorso..."
              className="bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-52 sm:w-64"
            />
          </div>
        </div>
      </div>

      {/* Preview Table */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto max-h-[440px]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-slate-100 dark:bg-slate-950/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase tracking-wider text-slate-600 dark:text-slate-400 z-10">
              <tr>
                <th className="py-2.5 px-3 w-10 text-center">Sel.</th>
                <th className="py-2.5 px-3 min-w-[200px]">Nome File</th>
                <th className="py-2.5 px-3">Origine (Percorso relativo)</th>
                <th className="py-2.5 px-3 text-right">Dimensione</th>
                <th className="py-2.5 px-3">Ultima Modifica</th>
                <th className="py-2.5 px-3 min-w-[240px]">
                  Destinazione Calcolata (Anteprima)
                </th>
                <th className="py-2.5 px-3 w-12 text-center">Info</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-slate-900/40">
              {activeFileList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 dark:text-slate-400">
                    {files.length === 0 ? (
                      <div className="space-y-1">
                        <p className="font-medium text-slate-700 dark:text-slate-300">
                          Nessun file presente nell&apos;anteprima
                        </p>
                        <p className="text-xs text-slate-500">
                          Seleziona una cartella di origine al passaggio 1 per visualizzare i file
                        </p>
                      </div>
                    ) : (
                      'Nessun file corrisponde ai filtri di ricerca impostati.'
                    )}
                  </td>
                </tr>
              ) : (
                activeFileList.map((file) => {
                  const isExpanded = expandedId === file.id;

                  return (
                    <React.Fragment key={file.id}>
                      <tr
                        className={`transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                          !file.matchesFilter ? 'opacity-40 bg-slate-50/50 dark:bg-slate-950/20' : ''
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="py-2 px-3 text-center">
                          {file.matchesFilter ? (
                            <button
                              type="button"
                              onClick={() => onToggleFile(file.id)}
                              className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
                            >
                              {file.selectedForAction ? (
                                <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                              ) : (
                                <Square className="w-4 h-4" />
                              )}
                            </button>
                          ) : (
                            <span className="text-slate-300 dark:text-slate-700 text-xs select-none">-</span>
                          )}
                        </td>

                        {/* File Name & Icon */}
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-2">
                            {getFileIcon(file.extension)}
                            <span
                              className={`font-medium truncate max-w-[220px] ${
                                file.matchesFilter ? 'text-slate-900 dark:text-slate-100' : 'text-slate-500'
                              }`}
                              title={file.name}
                            >
                              {file.name}
                            </span>
                          </div>
                        </td>

                        {/* Source relative path */}
                        <td className="py-2 px-3 text-slate-600 dark:text-slate-400 font-mono text-[11px] truncate max-w-[180px]" title={file.relativePath}>
                          {file.relativePath}
                        </td>

                        {/* Size */}
                        <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                          {formatBytes(file.size)}
                        </td>

                        {/* Date */}
                        <td className="py-2 px-3 font-mono tabular-nums text-slate-500 dark:text-slate-400 text-[11px] whitespace-nowrap">
                          {formatDate(file.lastModified)}
                        </td>

                        {/* Calculated Destination */}
                        <td className="py-2 px-3">
                          {file.matchesFilter ? (
                            <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-mono text-[11px]">
                              <ArrowRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-600 shrink-0" />
                              <span className="truncate max-w-[240px]" title={file.calculatedDestination}>
                                {file.calculatedDestination}
                              </span>
                              {file.hasConflict && (
                                <span className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 px-1.5 py-0.2 rounded shrink-0">
                                  Rinominato
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-600 italic text-[11px]">
                              Non verrà spostato (escluso)
                            </span>
                          )}
                        </td>

                        {/* Info details toggle */}
                        <td className="py-2 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => setExpandedId(isExpanded ? null : file.id)}
                            className="p-1 text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                            title="Visualizza dettagli criteri"
                          >
                            <Info className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>

                      {/* Expanded criteria info row */}
                      {isExpanded && (
                        <tr className="bg-slate-50 dark:bg-slate-900/90 text-xs">
                          <td colSpan={7} className="p-3 border-t border-slate-200 dark:border-slate-800/80">
                            <div className="space-y-1.5 text-[11px]">
                              <div className="font-semibold text-slate-800 dark:text-slate-300">
                                Analisi Criteri per: <span className="font-mono text-indigo-600 dark:text-indigo-300">{file.name}</span>
                              </div>
                              {file.matchedRules.length > 0 && (
                                <div className="text-emerald-700 dark:text-emerald-400 flex items-start gap-1">
                                  <Check className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                  <span>Criteri soddisfatti: {file.matchedRules.join(' · ')}</span>
                                </div>
                              )}
                              {file.unmatchedRules.length > 0 && (
                                <div className="text-rose-600 dark:text-rose-400 flex items-start gap-1">
                                  <span className="w-3.5 text-center font-bold">×</span>
                                  <span>Motivo esclusione: {file.unmatchedRules.join(' · ')}</span>
                                </div>
                              )}
                              <div className="text-slate-500 dark:text-slate-400 pt-1 flex items-center gap-4">
                                <span>Profondità sottocartella: {file.depth}</span>
                                <span>Dimensione byte: {file.size.toLocaleString('it-IT')} B</span>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Execution Actions Bottom Section */}
      <div className="bg-slate-50 dark:bg-slate-950/80 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
            Pronto per procedere?
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
            {!destFolderName.trim() ? (
              <span className="text-amber-600 dark:text-amber-400 font-medium">
                Seleziona o indica la cartella di destinazione al passaggio 2 per calcolare i percorsi.
              </span>
            ) : filesToMove.length > 0 ? (
              `Hai confermato ${filesToMove.length} file da ${isMove ? 'spostare' : 'copiare'} in "${destFolderName}".`
            ) : (
              'Seleziona almeno un file nell\'anteprima per procedere.'
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Primary Action Button (Real Move / Copy on disk) */}
          {renderExecuteButton('px-6 font-bold')}
        </div>
      </div>
    </div>
  );
};
