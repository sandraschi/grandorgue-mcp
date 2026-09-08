/**
 * Minimal client-side logger context (shape-compatible with the vendored
 * LogsPage template: entries/log/clear/LogLevel).
 */

import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useMemo, useState } from "react";

export type LogLevel = "info" | "warn" | "error" | "debug";

export interface ClientLogEntry {
  id: string;
  ts: number;
  level: LogLevel;
  message: string;
}

interface LoggerValue {
  entries: ClientLogEntry[];
  log: (level: LogLevel, message: string) => void;
  clear: () => void;
}

const LoggerContext = createContext<LoggerValue>({
  entries: [],
  log: () => {},
  clear: () => {},
});

let nextId = 1;

export function LoggerProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<ClientLogEntry[]>([]);

  const log = useCallback((level: LogLevel, message: string) => {
    const entry: ClientLogEntry = {
      id: `c${nextId++}`,
      ts: Date.now(),
      level,
      message,
    };
    setEntries((prev) => [...prev.slice(-499), entry]);
  }, []);

  const clear = useCallback(() => setEntries([]), []);

  const value = useMemo(() => ({ entries, log, clear }), [entries, log, clear]);
  return <LoggerContext.Provider value={value}>{children}</LoggerContext.Provider>;
}

export function useLogger(): LoggerValue {
  return useContext(LoggerContext);
}
