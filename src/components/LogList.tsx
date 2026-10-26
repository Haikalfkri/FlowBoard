import type { LogEntry } from "../types";
import { StatusIcon } from "./status";

export function LogList({ logs, live = false }: { logs: LogEntry[]; live?: boolean }) {
  return (
    <ol className="flex flex-col gap-2" aria-live={live ? "polite" : undefined}>
      {logs.map((entry) => (
        <li key={entry.index} className={`flex gap-2 text-sm ${entry.status === "running" ? "text-mute" : ""}`}>
          <StatusIcon status={entry.status} className="mt-0.5 size-4 shrink-0" />
          <div className="min-w-0">
            <p className="leading-snug">
              <span className="font-semibold">{entry.label}</span>
              <span className="ml-2 text-xs text-mute">+{entry.at} ms</span>
            </p>
            <p className="break-words text-xs text-mute">{entry.message}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}