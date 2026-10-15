/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ShieldCheck, WifiOff, Lock } from 'lucide-react';

export const OfflineBanner: React.FC = () => {
  return (
    <div className="bg-slate-100/90 dark:bg-slate-900/60 border-y border-slate-200 dark:border-slate-800/80 px-6 py-2 transition-colors">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <WifiOff className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="font-semibold text-slate-800 dark:text-slate-300">Funzionamento 100% Offline:</span>
          <span>Nessun dato viene inviato a server esterni. Nessuna connessione internet richiesta.</span>
        </div>
        <div className="flex items-center gap-4 text-slate-600 dark:text-slate-400">
          <span className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            Zero telemetria
          </span>
          <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">·</span>
          <span className="flex items-center gap-1.5 font-medium text-emerald-700 dark:text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            Anteprima vincolante prima di spostare
          </span>
        </div>
      </div>
    </div>
  );
};
