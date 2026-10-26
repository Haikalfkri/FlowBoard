import { useMemo } from "react";
import { Link, useNavigate } from "react-router";
import { Copy, Plus, Trash2 } from "lucide-react";
import { useFlowStore } from "../store";
import { StatusChip } from "../components/status";
import { timeAgo } from "../lib/format";

function Stat({ label, value, tone = "" }: { label: string; value: number; tone?: string }) {
  return (
    <div className="bg-white p-4">
      <dt className="text-xs text-mute">{label}</dt>
      <dd className={`mt-1 text-3xl font-bold tabular-nums ${tone}`}>{value}</dd>
    </div>
  );
}

export default function DashboardPage() {
  const workflows = useFlowStore((s) => s.workflows);
  const executions = useFlowStore((s) => s.executions);
  const { createWorkflow, duplicateWorkflow, deleteWorkflow } = useFlowStore.getState();
  const navigate = useNavigate();

  const stats = useMemo(() => {
    const success = executions.filter((e) => e.result.status === "success").length;
    return { runs: executions.length, success, failed: executions.length - success };
  }, [executions]);

  const recent = useMemo(() => [...workflows].sort((a, b) => b.updatedAt - a.updatedAt), [workflows]);

  const create = (kind: "blank" | "sample") => navigate(`/workflows/${createWorkflow(kind)}`);

    return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 p-4 sm:p-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-mute">Build workflows, simulate them, and review every run.</p>
        </div>
        <button
          onClick={() => create("blank")}
          className="flex items-center gap-1.5 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand/90"
        >
          <Plus className="size-4" aria-hidden /> New workflow
        </button>
      </header>

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-4">
        <Stat label="Workflows" value={workflows.length} />
        <Stat label="Total runs" value={stats.runs} />
        <Stat label="Successful runs" value={stats.success} tone="text-ok" />
        <Stat label="Failed runs" value={stats.failed} tone="text-err" />
      </dl>

      <section>
        <h2 className="mb-3 text-sm font-semibold">Recent workflows</h2>

        {recent.length === 0 ? (
          <div className="rounded-lg border border-dashed border-line bg-white p-8 text-center">
            <p className="font-semibold">No workflows yet</p>
            <p className="mt-1 text-sm text-mute">Start from a blank canvas, or load the order-routing example.</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <button onClick={() => create("blank")} className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white">
                Create blank workflow
              </button>
              <button onClick={() => create("sample")} className="rounded-md border border-line px-4 py-2 text-sm font-semibold hover:bg-paper">
                Add the example
              </button>
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-white">
            {recent.map((w) => (
              <li key={w.id} className="flex items-center gap-2 p-3">
                <Link to={`/workflows/${w.id}`} className="min-w-0 flex-1 rounded-md px-1 py-0.5 hover:bg-paper">
                  <span className="block truncate font-semibold">{w.name || "Untitled workflow"}</span>
                  <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-mute">
                    <StatusChip status={w.status} />
                    <span>{w.nodes.length} nodes</span>
                    <span>Edited {timeAgo(w.updatedAt)}</span>
                  </span>
                </Link>
                <button
                  onClick={() => navigate(`/workflows/${duplicateWorkflow(w.id)}`)}
                  aria-label={`Duplicate ${w.name}`}
                  className="rounded p-2 text-mute hover:bg-line/60 hover:text-ink"
                >
                  <Copy className="size-4" />
                </button>
                <button
                  onClick={() => window.confirm(`Delete "${w.name}"? This can't be undone.`) && deleteWorkflow(w.id)}
                  aria-label={`Delete ${w.name}`}
                  className="rounded p-2 text-mute hover:bg-err/10 hover:text-err"
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}