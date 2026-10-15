/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  ShieldCheck,
  HardDrive,
  RefreshCw,
  WifiOff,
  ExternalLink,
  Sun,
  Moon,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface HeaderProps {
  onReset: () => void;
  hasFiles: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onReset, hasFiles }) => {
  const isInIframe = typeof window !== 'undefined' && window.self !== window.top;
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/80 backdrop-blur-md sticky top-0 z-30 px-6 py-3.5 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-8">
        {/* Zone 1: Single text wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-600/20 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <HardDrive className="w-5 h-5" />
          </div>
          <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap">
            FileMover Pro
          </span>
        </div>

        {/* Zone 2: Informational / Workflow navigation indicators */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-500 dark:text-slate-400">
          <span className="text-slate-800 dark:text-slate-300 font-semibold">1. Cartelle</span>
          <span className="text-slate-300 dark:text-slate-600">→</span>
          <span className="text-slate-800 dark:text-slate-300 font-semibold">2. Criteri</span>
          <span className="text-slate-300 dark:text-slate-600">→</span>
          <span className="text-slate-800 dark:text-slate-300 font-semibold">3. Destinazione</span>
          <span className="text-slate-300 dark:text-slate-600">→</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            4. Anteprima Obbligatoria
          </span>
        </nav>

        {/* Zone 3: 1 primary action or action cluster */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Theme switcher button */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-1.5 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-800 transition-colors flex items-center gap-1.5 text-xs font-medium"
            title={theme === 'dark' ? 'Passa al Tema Chiaro' : 'Passa al Tema Scuro'}
            aria-label="Cambia tema chiaro/scuro"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-4 h-4 text-amber-400" />
                <span className="hidden sm:inline">Chiaro</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-indigo-600" />
                <span className="hidden sm:inline">Scuro</span>
              </>
            )}
          </button>

          {isInIframe && (
            <a
              href={window.location.href}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 text-xs font-medium text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 dark:text-indigo-300 dark:hover:text-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800/60 rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap"
              title="Apri a schermo intero per sbloccare l'accesso diretto in scrittura ai dischi locali"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Apri in Nuova Scheda
            </a>
          )}

          {hasFiles && (
            <button
              onClick={onReset}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 dark:text-slate-400 dark:hover:text-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800/80 rounded-md border border-slate-200 dark:border-slate-800 transition-colors whitespace-nowrap"
              title="Resetta cartelle e criteri"
            >
              <RefreshCw className="w-3.5 h-3.5 inline mr-1.5" />
              Azzera Tutto
            </button>
          )}

          <span className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 dark:text-emerald-400/90 dark:bg-emerald-950/40 dark:border-emerald-800/40 px-2.5 py-1.5 rounded-md flex items-center gap-1.5">
            <WifiOff className="w-3.5 h-3.5" />
            100% Offline
          </span>
        </div>
      </div>
    </header>
  );
};
