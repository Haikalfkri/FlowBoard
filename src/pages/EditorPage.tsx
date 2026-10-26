import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { ReactFlowProvider } from "@xyflow/react";
import { Play, RotateCcw } from "lucide-react";
import { useFlowStore } from "../store";
import type { Workflow } from "../types";
import { Canvas } from "../components/Canvas";
import { Inspector } from "../components/Inspector";
import { RunPanel } from "../components/RunPanel";
import { SaveIndicator } from "../components/SaveIndicator";
import { StatusChip } from "../components/status";
import NotFoundPage from "./NotFoundPage";

type Tab = "inspector" | "run";

export default function EditorPage() {
  const { id } = useParams();
  const wf = useFlowStore((s) => s.workflows.find((w) => w.id === id));

  if (!wf) {
    return <NotFoundPage title="Workflow not found" message="It may have been deleted, or the link is wrong." />;
  }
  return <Editor key={wf.id} wf={wf} />;
}

function Editor({ wf }: { wf: Workflow }) {
  const running = useFlowStore((s) => s.runtime.running);
  const hasRun = useFlowStore((s) => s.runtime.logs.length > 0);
  const { renameWorkflow, runSimulation, resetRun } = useFlowStore.getState();

  const [tab, setTab] = useState<Tab>("inspector");
  const selectedId = wf.nodes.find((n) => n.selected)?.id;
  const [prevSelectedId, setPrevSelectedId] = useState(selectedId);
  if (selectedId !== prevSelectedId) {
    setPrevSelectedId(selectedId);
    if (selectedId) setTab("inspector");
  }

  // Leaving the editor cancels a run in progress and clears the node highlights.
  useEffect(() => () => useFlowStore.getState().resetRun(), []);

  const run = () => {
    setTab("run");
    void runSimulation(wf.id);
  };

  return (
    <div className="flex min-h-full flex-col lg:h-full">
      <header className="flex flex-wrap items-center gap-3 border-b border-line bg-white px-4 py-2.5">
        <input
          aria-label="Workflow name"
          value={wf.name}
          onChange={(e) => renameWorkflow(wf.id, e.target.value)}
          className="min-w-0 flex-1 rounded-md border border-transparent px-2 py-1 text-base font-semibold hover:border-line focus:border-brand"
        />
        <SaveIndicator id={wf.id} updatedAt={wf.updatedAt} />
        <StatusChip status={wf.status} />
        {hasRun && (
          <button
            onClick={resetRun}
            className="flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-sm font-medium hover:bg-paper"
          >
            <RotateCcw className="size-4" aria-hidden /> Clear run
          </button>
        )}
        <button
          onClick={run}
          disabled={running}
          className="flex items-center gap-1.5 rounded-md bg-brand px-3.5 py-1.5 text-sm font-semibold text-white hover:bg-brand/90 disabled:opacity-60"
        >
          <Play className="size-4" aria-hidden /> {running ? "Running…" : "Run simulation"}
        </button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="h-[60vh] lg:h-auto">
          <ReactFlowProvider>
            <Canvas wf={wf} />
          </ReactFlowProvider>
        </div>

        <section className="flex min-h-0 flex-col border-t border-line bg-white lg:border-l lg:border-t-0">
          <div className="flex border-b border-line" role="tablist">
            {(["inspector", "run"] as const).map((t) => (
              <button
                key={t}
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={`flex-1 px-3 py-2.5 text-sm font-semibold ${tab === t ? "border-b-2 border-ink" : "text-mute hover:text-ink"}`}
              >
                {t === "inspector" ? "Settings" : "Run log"}
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {tab === "inspector" ? <Inspector wf={wf} /> : <RunPanel wf={wf} />}
          </div>
        </section>
      </div>
    </div>
  );
}