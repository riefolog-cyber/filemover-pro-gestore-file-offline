/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  FileText,
  Sliders,
  Calendar,
  Folders,
  Type,
  Maximize2,
  X,
} from 'lucide-react';
import {
  FilterCriteria,
  FilterNameMode,
  FilterSizeMode,
  FilterSizeUnit,
  FilterDateMode,
} from '../types/fileMover';

interface CriteriaPanelProps {
  criteria: FilterCriteria;
  onChange: (updated: Partial<FilterCriteria>) => void;
  onResetCriteria: () => void;
  matchedCount: number;
  totalCount: number;
}

const POPULAR_EXTENSIONS = [
  'pdf',
  'jpg',
  'png',
  'docx',
  'xlsx',
  'mp4',
  'zip',
  'txt',
  'log',
  'sql',
  'csv',
];

export const CriteriaPanel: React.FC<CriteriaPanelProps> = ({
  criteria,
  onChange,
  onResetCriteria,
  matchedCount,
  totalCount,
}) => {
  const togglePopularExtension = (ext: string) => {
    const list = [...criteria.extensionList];
    const index = list.indexOf(ext);
    if (index >= 0) {
      list.splice(index, 1);
    } else {
      list.push(ext);
    }
    onChange({ extensionList: list });
  };

  return (
    <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-6 shadow-sm transition-colors">
      {/* Header of criteria */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800/80 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Criteri di Selezione & Filtro
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Definisci quali file considerare per lo spostamento
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-mono">
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold tabular-nums">{matchedCount}</span>
            <span>di</span>
            <span className="text-slate-700 dark:text-slate-300 tabular-nums">{totalCount}</span>
            <span>file corrispondono</span>
          </div>
          <button
            onClick={onResetCriteria}
            className="px-2.5 py-1 text-xs text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 dark:text-slate-400 dark:hover:text-slate-200 dark:bg-slate-800/80 rounded border border-slate-300 dark:border-slate-800 transition-colors"
          >
            Azzera Filtri
          </button>
        </div>
      </div>

      {/* Grid of criteria */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* 1. ESTENSIONI */}
        <div className="space-y-3 bg-slate-50 dark:bg-slate-950/40 p-4 rounded-lg border border-slate-200 dark:border-slate-800/60 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                Estensioni File
              </label>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                {criteria.extensionMode === 'all'
                  ? 'Tutte'
                  : `${criteria.extensionList.length} selezionate`}
              </span>
            </div>

            {/* Mode selection buttons */}
            <div className="grid grid-cols-3 gap-1 p-1 bg-slate-200/80 dark:bg-slate-900 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => onChange({ extensionMode: 'all' })}
                className={`py-1 text-center font-medium rounded transition-colors ${
                  criteria.extensionMode === 'all'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Tutte
              </button>
              <button
                type="button"
                onClick={() => onChange({ extensionMode: 'include' })}
                className={`py-1 text-center font-medium rounded transition-colors ${
                  criteria.extensionMode === 'include'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Includi
              </button>
              <button
                type="button"
                onClick={() => onChange({ extensionMode: 'exclude' })}
                className={`py-1 text-center font-medium rounded transition-colors ${
                  criteria.extensionMode === 'exclude'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Escludi
              </button>
            </div>

            {criteria.extensionMode !== 'all' && (
              <div className="space-y-2 pt-1">
                {/* Popular tags */}
                <div className="flex flex-wrap gap-1.5">
                  {POPULAR_EXTENSIONS.map((ext) => {
                    const isSelected = criteria.extensionList.includes(ext);
                    return (
                      <button
                        key={ext}
                        type="button"
                        onClick={() => togglePopularExtension(ext)}
                        className={`text-[11px] font-mono px-2 py-0.5 rounded transition-colors ${
                          isSelected
                            ? 'bg-indigo-100 text-indigo-800 border border-indigo-300 dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-500/40'
                            : 'bg-white text-slate-700 border border-slate-300 hover:border-slate-400 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800 dark:hover:border-slate-700'
                        }`}
                      >
                        .{ext}
                      </button>
                    );
                  })}
                </div>

                {/* Custom extensions text input */}
                <div>
                  <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">
                    Altre estensioni (separate da virgola):
                  </label>
                  <input
                    type="text"
                    value={criteria.customExtensions}
                    onChange={(e) => onChange({ customExtensions: e.target.value })}
                    placeholder="Es. webp, mp3, heic"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>
            )}
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
            {criteria.extensionMode === 'all'
              ? 'Verranno considerati file con qualsiasi estensione.'
              : criteria.extensionMode === 'include'
              ? 'Verranno spostati solo i file con le estensioni indicate.'
              : 'I file con le estensioni indicate saranno ignorati.'}
          </p>
        </div>

        {/* 2. NOME FILE */}
        <div className="space-y-3 bg-slate-50 dark:bg-slate-950/40 p-4 rounded-lg border border-slate-200 dark:border-slate-800/60 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Type className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Nome del File
              </label>
              {criteria.namePattern && (
                <button
                  onClick={() => onChange({ namePattern: '', nameMode: 'any' })}
                  className="text-[11px] text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 flex items-center gap-0.5"
                >
                  <X className="w-3 h-3" /> Pulisci
                </button>
              )}
            </div>

            <div>
              <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">Criterio sul nome:</label>
              <select
                value={criteria.nameMode}
                onChange={(e) => onChange({ nameMode: e.target.value as FilterNameMode })}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="any">Qualsiasi nome (nessun filtro)</option>
                <option value="contains">Contiene il testo...</option>
                <option value="starts_with">Inizia con...</option>
                <option value="ends_with">Finisce con...</option>
                <option value="exact">Nome esatto</option>
                <option value="regex">Espressione Regolare (Regex)</option>
              </select>
            </div>

            {criteria.nameMode !== 'any' && (
              <div className="space-y-2">
                <div>
                  <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">Testo o schema cercato:</label>
                  <input
                    type="text"
                    value={criteria.namePattern}
                    onChange={(e) => onChange({ namePattern: e.target.value })}
                    placeholder={
                      criteria.nameMode === 'regex' ? 'Es. ^Fattura_\\d{4}' : 'Es. 2025 o backup'
                    }
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-300">
                  <input
                    type="checkbox"
                    checked={criteria.nameCaseSensitive}
                    onChange={(e) => onChange({ nameCaseSensitive: e.target.checked })}
                    className="rounded bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-0"
                  />
                  <span>Distingui maiuscole / minuscole (Case sensitive)</span>
                </label>
              </div>
            )}
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
            Filtra i file in base a parole chiave, prefissi, suffissi o espressioni regolari.
          </p>
        </div>

        {/* 3. DIMENSIONE FILE */}
        <div className="space-y-3 bg-slate-50 dark:bg-slate-950/40 p-4 rounded-lg border border-slate-200 dark:border-slate-800/60 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Maximize2 className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                Dimensione File
              </label>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                {criteria.sizeMode === 'any' ? 'Qualsiasi' : criteria.sizeMode}
              </span>
            </div>

            <div>
              <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">Regola dimensione:</label>
              <select
                value={criteria.sizeMode}
                onChange={(e) => onChange({ sizeMode: e.target.value as FilterSizeMode })}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="any">Qualsiasi dimensione</option>
                <option value="greater_than">Maggiore di (&gt;)</option>
                <option value="less_than">Minore di (&lt;)</option>
                <option value="between">Compreso nell&apos;intervallo (Da - A)</option>
              </select>
            </div>

            {criteria.sizeMode !== 'any' && (
              <div className="space-y-2">
                {(criteria.sizeMode === 'greater_than' || criteria.sizeMode === 'between') && (
                  <div>
                    <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">
                      {criteria.sizeMode === 'between' ? 'Dimensione minima:' : 'Soglia minima:'}
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={criteria.minSizeValue || ''}
                        onChange={(e) => onChange({ minSizeValue: parseFloat(e.target.value) || 0 })}
                        placeholder="Valore"
                        className="w-2/3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-200 font-mono"
                      />
                      <select
                        value={criteria.minSizeUnit}
                        onChange={(e) => onChange({ minSizeUnit: e.target.value as FilterSizeUnit })}
                        className="w-1/3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded px-2 py-1.5 text-xs text-slate-900 dark:text-slate-200 font-mono"
                      >
                        <option value="B">B</option>
                        <option value="KB">KB</option>
                        <option value="MB">MB</option>
                        <option value="GB">GB</option>
                      </select>
                    </div>
                  </div>
                )}

                {(criteria.sizeMode === 'less_than' || criteria.sizeMode === 'between') && (
                  <div>
                    <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">
                      {criteria.sizeMode === 'between' ? 'Dimensione massima:' : 'Soglia massima:'}
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={criteria.maxSizeValue || ''}
                        onChange={(e) => onChange({ maxSizeValue: parseFloat(e.target.value) || 0 })}
                        placeholder="Valore"
                        className="w-2/3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-200 font-mono"
                      />
                      <select
                        value={criteria.maxSizeUnit}
                        onChange={(e) => onChange({ maxSizeUnit: e.target.value as FilterSizeUnit })}
                        className="w-1/3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded px-2 py-1.5 text-xs text-slate-900 dark:text-slate-200 font-mono"
                      >
                        <option value="B">B</option>
                        <option value="KB">KB</option>
                        <option value="MB">MB</option>
                        <option value="GB">GB</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
            Utile per isolare file pesanti (video, archivi zip) o scartare file vuoti/piccoli.
          </p>
        </div>

        {/* 4. DATA DI MODIFICA */}
        <div className="space-y-3 bg-slate-50 dark:bg-slate-950/40 p-4 rounded-lg border border-slate-200 dark:border-slate-800/60 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                Data di Modifica
              </label>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                {criteria.dateMode === 'any' ? 'Qualsiasi' : criteria.dateMode}
              </span>
            </div>

            <div>
              <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">Periodo di modifica:</label>
              <select
                value={criteria.dateMode}
                onChange={(e) => onChange({ dateMode: e.target.value as FilterDateMode })}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="any">Qualsiasi data (nessun limite temporale)</option>
                <option value="last_days">Modificati negli ultimi N giorni</option>
                <option value="after">Modificati dopo una data specifica</option>
                <option value="before">Modificati prima di una data specifica</option>
                <option value="between">Intervallo di date (Da - A)</option>
              </select>
            </div>

            {criteria.dateMode === 'last_days' && (
              <div>
                <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">Numero di giorni:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    value={criteria.dateDays}
                    onChange={(e) => onChange({ dateDays: parseInt(e.target.value, 10) || 1 })}
                    className="w-24 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-200 font-mono"
                  />
                  <div className="flex gap-1">
                    {[7, 30, 90, 365].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => onChange({ dateDays: d })}
                        className={`text-[11px] px-2 py-1 rounded transition-colors ${
                          criteria.dateDays === d
                            ? 'bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40'
                            : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-300 dark:bg-slate-900 dark:text-slate-400 dark:hover:text-slate-200 dark:border-slate-800'
                        }`}
                      >
                        {d}g
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {(criteria.dateMode === 'after' || criteria.dateMode === 'between') && (
              <div>
                <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">A partire dalla data:</label>
                <input
                  type="date"
                  value={criteria.dateFrom}
                  onChange={(e) => onChange({ dateFrom: e.target.value })}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-200 font-mono"
                />
              </div>
            )}

            {(criteria.dateMode === 'before' || criteria.dateMode === 'between') && (
              <div>
                <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">Fino alla data:</label>
                <input
                  type="date"
                  value={criteria.dateTo}
                  onChange={(e) => onChange({ dateTo: e.target.value })}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-200 font-mono"
                />
              </div>
            )}
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
            Consente di archiviare file recenti oppure ripulire file vecchi non modificati da tempo.
          </p>
        </div>

        {/* 5. SOTTOCARTELLE */}
        <div className="space-y-3 bg-slate-50 dark:bg-slate-950/40 p-4 rounded-lg border border-slate-200 dark:border-slate-800/60 flex flex-col justify-between md:col-span-2 lg:col-span-2">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Folders className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                Gestione Sottocartelle & Profondità
              </label>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                {criteria.includeSubfolders ? 'Scansione ricorsiva attiva' : 'Solo cartella radice'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              {/* Checkbox include subfolders */}
              <div className="space-y-3">
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={criteria.includeSubfolders}
                    onChange={(e) => onChange({ includeSubfolders: e.target.checked })}
                    className="mt-0.5 rounded bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-0"
                  />
                  <div>
                    <span className="text-xs font-medium text-slate-800 dark:text-slate-200 block">
                      Includi file nelle sottocartelle
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Scansiona l&apos;alberatura della cartella di origine in profondità
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={criteria.ignoreHiddenFiles}
                    onChange={(e) => onChange({ ignoreHiddenFiles: e.target.checked })}
                    className="mt-0.5 rounded bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-0"
                  />
                  <div>
                    <span className="text-xs font-medium text-slate-800 dark:text-slate-200 block">
                      Ignora file nascosti e di sistema
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Esclude automaticamente .git, node_modules, .DS_Store, Thumbs.db
                    </span>
                  </div>
                </label>
              </div>

              {/* Max depth selector */}
              {criteria.includeSubfolders && (
                <div className="bg-white dark:bg-slate-900/60 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                  <label className="block text-[11px] text-slate-700 dark:text-slate-300 font-medium mb-1.5">
                    Profondità massima di scansione:
                  </label>
                  <select
                    value={criteria.maxDepth}
                    onChange={(e) => onChange({ maxDepth: parseInt(e.target.value, 10) || 0 })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                  >
                    <option value="0">Illimitata (tutti i livelli di profondità)</option>
                    <option value="1">Solo 1 sottocartella (Profondità 1)</option>
                    <option value="2">Massimo 2 livelli (Profondità 2)</option>
                    <option value="3">Massimo 3 livelli (Profondità 3)</option>
                  </select>
                  <p className="text-[11px] text-slate-500 mt-2">
                    0 = attraversa qualsiasi cartella figlia senza limiti.
                  </p>
                </div>
              )}
            </div>
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight pt-1">
            Se disattivi l&apos;inclusione sottocartelle, verranno presi in considerazione unicamente i file collocati direttamente nella cartella di origine.
          </p>
        </div>
      </div>
    </div>
  );
};
