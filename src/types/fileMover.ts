/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type FilterExtensionMode = 'all' | 'include' | 'exclude';

export type FilterNameMode = 'any' | 'contains' | 'starts_with' | 'ends_with' | 'regex' | 'exact';

export type FilterSizeMode = 'any' | 'greater_than' | 'less_than' | 'between';

export type FilterSizeUnit = 'B' | 'KB' | 'MB' | 'GB';

export type FilterDateMode = 'any' | 'last_days' | 'after' | 'before' | 'between';

export type DestinationStrategyMode = 
  | 'preserve_structure' 
  | 'flatten' 
  | 'organize_by_extension' 
  | 'organize_by_date' 
  | 'custom_subfolder';

export type ConflictResolution = 'rename' | 'overwrite' | 'skip';

export type OperationAction = 'move' | 'copy';

export interface FilterCriteria {
  // Estensioni
  extensionMode: FilterExtensionMode;
  extensionList: string[]; // e.g. ['pdf', 'png', 'jpg']
  customExtensions: string;

  // Nome file
  nameMode: FilterNameMode;
  namePattern: string;
  nameCaseSensitive: boolean;

  // Dimensione
  sizeMode: FilterSizeMode;
  minSizeValue: number;
  minSizeUnit: FilterSizeUnit;
  maxSizeValue: number;
  maxSizeUnit: FilterSizeUnit;

  // Data di modifica
  dateMode: FilterDateMode;
  dateDays: number;
  dateFrom: string; // YYYY-MM-DD
  dateTo: string;   // YYYY-MM-DD

  // Sottocartelle
  includeSubfolders: boolean;
  maxDepth: number; // 0 = unconstrained
  ignoreHiddenFiles: boolean; // ignore .git, .DS_Store, etc.
}

export interface DestinationSettings {
  operation: OperationAction;
  strategy: DestinationStrategyMode;
  customSubfolderName: string;
  conflictResolution: ConflictResolution;
}

export interface FileItem {
  id: string;
  name: string;
  extension: string; // with dot, e.g. ".pdf" or empty
  size: number; // in bytes
  lastModified: number; // ms timestamp
  relativePath: string; // e.g. "fatture/2024/doc.pdf"
  fullPath?: string; // e.g. "C:\Users\giova\Desktop\doc.pdf"
  depth: number;
  handle?: FileSystemFileHandle;
  fileBlob?: File | Blob;
  
  // Destination calculation
  calculatedDestination: string;
  calculatedFilename: string;
  selectedForAction: boolean;
  
  // Matching explanation
  matchesFilter: boolean;
  matchedRules: string[];
  unmatchedRules: string[];
  
  // Conflict status
  hasConflict?: boolean;
  conflictResolvedName?: string;
  
  // Execution state
  status?: 'pending' | 'moving' | 'success' | 'error' | 'skipped';
  errorMessage?: string;
}

export interface FolderSource {
  name: string;
  type: 'native' | 'webkit' | 'server';
  fullPath?: string;
  handle?: FileSystemDirectoryHandle;
  totalFiles: number;
  totalSize: number;
}

export interface FolderDestination {
  name: string;
  type: 'native' | 'virtual' | 'server';
  fullPath?: string;
  handle?: FileSystemDirectoryHandle;
}

export interface ServerStatus {
  connected: boolean;
  platform?: string;
  userHome?: string;
  quickPaths?: {
    desktop?: string;
    downloads?: string;
    documents?: string;
    pictures?: string;
    home?: string;
  };
}

export interface SystemDrive {
  path: string;
  name: string;
}

export interface DirectoryItem {
  name: string;
  fullPath: string;
  mtimeMs?: number;
}

export interface ExecutionProgress {
  total: number;
  completed: number;
  successCount: number;
  errorCount: number;
  skippedCount: number;
  currentFileName: string;
  isExecuting: boolean;
  isComplete: boolean;
  logs: ExecutionLogEntry[];
}

export interface ExecutionLogEntry {
  id: string;
  timestamp: string;
  fileName: string;
  sourcePath: string;
  destPath: string;
  action: OperationAction;
  status: 'success' | 'error' | 'skipped';
  message: string;
}
