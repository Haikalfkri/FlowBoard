import { useMemo, useState } from "react";
import { Link } from "react-router";
import { ChevronDown } from "lucide-react";
import { useFlowStore } from "../store";
import { LogList } from "../components/LogList";
import { RunChip } from "../components/status";
import { formatDateTime } from "../lib/format";

type Filter = "all" | "success" | "failed";
const filters: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "success", label: "Passed" },
  { value: "failed", label: "Failed" },
];

export default function ExecutionsPage() {
  const executions = useFlowStore((s) => s.executions);
  const workflows = useFlowStore((s) => s.workflows);
  const { clearExecutions } = useFlowStore.getState();

  const [filter, setFilter] = useState<Filter>("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const existing = useMemo(() => new Set(workflows.map((w) => w.id)), [workflows]);
  const count = (f: Filter) => (f === "all" ? executions.length : executions.filter((e) => e.result.status === f).length);
  const shown = executions.filter((e) => filter === "all" || e.result.status === filter);

    return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-4 sm:p-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Executions</h1>
          <p className="mt-1 text-sm text-mute">Every simulation you have run, newest first.</p>
        </div>
        {executions.length > 0 && (
          <button
            onClick={() => window.confirm("Clear all execution history?") && clearExecutions()}
            className="rounded-md border border-line px-3 py-1.5 text-sm font-medium hover:bg-paper"
          >
            Clear history
          </button>
        )}
      </header>

      {executions.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line bg-white p-8 text-center">
          <p className="font-semibold">No runs yet</p>
          <p className="mt-1 text-sm text-mute">Open a workflow and press Run simulation. Each run shows up here.</p>
          <Link to="/" className="mt-4 inline-block rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white">
            Go to dashboard
          </Link>
        </div>
      ) : (
        <>
          <div className="flex gap-1.5" role="group" aria-label="Filter by result">
            {filters.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                aria-pressed={filter === f.value}
                className={`rounded-md border px-3 py-1.5 text-sm font-medium ${
                  filter === f.value ? "border-ink bg-ink text-white" : "border-line bg-white hover:bg-paper"
                }`}
              >
                {f.label} <span className="opacity-70">{count(f.value)}</span>
              </button>
            ))}
          </div>

          {shown.length === 0 ? (
            <p className="text-sm text-mute">No runs match this filter.</p>
          ) : (
            <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-white">
              {shown.map((e) => {
                const open = openId === e.id;
                return (
                  <li key={e.id}>
                    <button
                      onClick={() => setOpenId(open ? null : e.id)}
                      aria-expanded={open}
                      className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 p-3 text-left hover:bg-paper"
                    >
                      <ChevronDown className={`size-4 text-mute transition-transform ${open ? "" : "-rotate-90"}`} aria-hidden />
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">{e.workflowName || "Untitled workflow"}</span>
                        <span className="text-xs text-mute">{formatDateTime(e.startedAt)}</span>
                      </span>
                      <span className="flex flex-col items-end gap-1">
                        <RunChip status={e.result.status} />
                        <span className="text-xs tabular-nums text-mute">{e.result.durationMs} ms</span>
                      </span>
                    </button>

                    {open && (
                      <div className="border-t border-line bg-paper/50 p-4">
                        <p className="mb-3 text-xs text-mute">
                          {existing.has(e.workflowId) ? (
                            <Link to={`/workflows/${e.workflowId}`} className="font-semibold text-brand underline">
                              Open workflow
                            </Link>
                          ) : (
                            "This workflow has been deleted."
                          )}
                        </p>
                        <LogList logs={e.result.logs} />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}