/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  FolderTree,
  Scissors,
  Copy,
  AlertTriangle,
  FolderPlus,
  ArrowDown,
} from 'lucide-react';
import {
  DestinationSettings,
} from '../types/fileMover';

interface DestinationSettingsPanelProps {
  settings: DestinationSettings;
  onChange: (updated: Partial<DestinationSettings>) => void;
  destFolderName: string;
}

export const DestinationSettingsPanel: React.FC<DestinationSettingsPanelProps> = ({
  settings,
  onChange,
  destFolderName,
}) => {
  return (
    <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-6 shadow-sm transition-colors">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800/80 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <FolderTree className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              3. Regole di Collocazione nella Destinazione
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Configura l&apos;alberatura delle cartelle e il tipo di trasferimento
            </p>
          </div>
        </div>

        {/* Modalità Operazione (Segmented Control chiaramente etichettato come OPZIONE) */}
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-950/80 p-1.5 rounded-lg border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 px-2">Modalità:</span>
          <button
            type="button"
            onClick={() => onChange({ operation: 'move' })}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors flex items-center gap-1.5 ${
              settings.operation === 'move'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Scissors className="w-3.5 h-3.5" />
            Sposta (Taglia originali)
          </button>
          <button
            type="button"
            onClick={() => onChange({ operation: 'copy' })}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors flex items-center gap-1.5 ${
              settings.operation === 'copy'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Copy className="w-3.5 h-3.5" />
            Copia (Conserva originali)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Strategia di alberatura */}
        <div className="space-y-3 bg-slate-50 dark:bg-slate-950/40 p-4 rounded-lg border border-slate-200 dark:border-slate-800/60">
          <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <FolderTree className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            Alberatura nella Destinazione
          </label>

          <div className="space-y-2">
            {[
              {
                id: 'preserve_structure',
                title: 'Mantieni struttura cartelle originale',
                desc: 'Ricrea la medesima gerarchia di sottocartelle presente nella cartella sorgente',
              },
              {
                id: 'flatten',
                title: 'Appiattisci tutti i file nella radice',
                desc: 'Tutti i file vengono posizionati direttamente nella cartella di destinazione',
              },
              {
                id: 'organize_by_extension',
                title: 'Raggruppa per estensione',
                desc: 'Crea automaticamente cartelle dedicate (es. PDF/, JPG/, DOCX/)',
              },
              {
                id: 'organize_by_date',
                title: 'Raggruppa per data di modifica (AAAA/MM)',
                desc: 'Suddivide i file in cartelle per anno e mese (es. 2025/01/)',
              },
              {
                id: 'custom_subfolder',
                title: 'Raccogli in una sottocartella specifica',
                desc: 'Posiziona tutti i file selezionati all\'interno di una sottocartella a tua scelta',
              },
            ].map((opt) => (
              <label
                key={opt.id}
                className={`flex items-start gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                  settings.strategy === opt.id
                    ? 'bg-white dark:bg-slate-900 border-indigo-500 shadow-sm text-slate-900 dark:text-slate-100'
                    : 'bg-white/60 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800/80 hover:bg-slate-100/60 dark:hover:bg-slate-900/40 text-slate-600 dark:text-slate-400'
                }`}
              >
                <input
                  type="radio"
                  name="destination_strategy"
                  value={opt.id}
                  checked={settings.strategy === opt.id}
                  onChange={() => onChange({ strategy: opt.id as DestinationSettings['strategy'] })}
                  className="mt-1 text-indigo-600 focus:ring-0"
                />
                <div className="text-xs">
                  <span className="font-semibold block text-slate-800 dark:text-slate-200">{opt.title}</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">{opt.desc}</span>
                </div>
              </label>
            ))}
          </div>

          {settings.strategy === 'custom_subfolder' && (
            <div className="pt-2">
              <label className="block text-[11px] text-slate-700 dark:text-slate-300 font-medium mb-1">
                Nome della sottocartella specifica:
              </label>
              <div className="flex items-center gap-2">
                <FolderPlus className="w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={settings.customSubfolderName}
                  onChange={(e) => onChange({ customSubfolderName: e.target.value })}
                  placeholder="Es. Archivio_Fatture_2025"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 font-mono focus:outline-none focus:border-indigo-500 shadow-inner"
                />
              </div>
            </div>
          )}
        </div>

        {/* Gestione Conflitti Nomi */}
        <div className="space-y-3 bg-slate-50 dark:bg-slate-950/40 p-4 rounded-lg border border-slate-200 dark:border-slate-800/60 flex flex-col justify-between">
          <div className="space-y-3">
            <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              Risoluzione Conflitti di Omonimia
            </label>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Se nella destinazione è già presente un file con lo stesso nome:
            </p>

            <div className="space-y-2">
              {[
                {
                  id: 'rename',
                  title: 'Rinomina con suffisso progressivo (Consigliato)',
                  desc: 'Aggiunge un contatore al nome: es. documento (1).pdf',
                },
                {
                  id: 'overwrite',
                  title: 'Sovrascrivi file esistente',
                  desc: 'Sostituisce il file presente nella destinazione con quello nuovo',
                },
                {
                  id: 'skip',
                  title: 'Salta file in conflitto',
                  desc: 'Mantiene il file esistente intatto e salta il trasferimento del file corrente',
                },
              ].map((opt) => (
                <label
                  key={opt.id}
                  className={`flex items-start gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                    settings.conflictResolution === opt.id
                      ? 'bg-white dark:bg-slate-900 border-indigo-500 shadow-sm text-slate-900 dark:text-slate-100'
                      : 'bg-white/60 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800/80 hover:bg-slate-100/60 dark:hover:bg-slate-900/40 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <input
                    type="radio"
                    name="conflict_resolution"
                    value={opt.id}
                    checked={settings.conflictResolution === opt.id}
                    onChange={() => onChange({ conflictResolution: opt.id as DestinationSettings['conflictResolution'] })}
                    className="mt-1 text-indigo-600 focus:ring-0"
                  />
                  <div className="text-xs">
                    <span className="font-semibold block text-slate-800 dark:text-slate-200">{opt.title}</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">{opt.desc}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="p-3 bg-slate-100 dark:bg-slate-900/80 rounded border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 flex items-center justify-between gap-2">
            <div>
              <span className="text-slate-800 dark:text-slate-300 font-medium block mb-0.5">Esempio destinazione calcolata:</span>
              <code className="text-emerald-700 dark:text-emerald-400 font-mono break-all text-[11px]">
                {destFolderName || 'Destinazione'}
                {settings.strategy === 'preserve_structure'
                  ? '/subcartella/file.pdf'
                  : settings.strategy === 'organize_by_extension'
                  ? '/PDF/file.pdf'
                  : settings.strategy === 'organize_by_date'
                  ? '/2025/05/file.pdf'
                  : settings.strategy === 'custom_subfolder'
                  ? `/${settings.customSubfolderName || 'File_Spostati'}/file.pdf`
                  : '/file.pdf'}
              </code>
            </div>
            <a
              href="#anteprima"
              className="text-xs text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium shrink-0 flex items-center gap-1 hover:underline"
            >
              <ArrowDown className="w-3.5 h-3.5" />
              Vedi Anteprima
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
