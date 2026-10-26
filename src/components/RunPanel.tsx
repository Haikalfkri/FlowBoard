import { useMemo } from "react";
import { useFlowStore } from "../store";
import { validateWorkflow } from "../lib/simulation";
import type { Workflow } from "../types";
import { LogList } from "./LogList";

export function RunPanel({ wf }: { wf: Workflow }) {
    const { running, logs, result } = useFlowStore((s) => s.runtime);
    const issues = useMemo(() => validateWorkflow(wf.nodes, wf.edges), [wf.nodes, wf.edges]);

    return (
        <div className="flex flex-col gap-3 p-4">
            {result && !running && (
                <div className={`rounded-md p-3 text-sm ${result.status === "success" ? "bg-ok/10 text-ok" : "bg-err/10 text-err"}`}>
                    <p className="font-semibold">{result.status === "success" ? "Run passed" : "Run failed"}</p>
                    <p className="text-xs">Simulated time: {result.durationMs} ms</p>
                </div>
            )}

            {issues.length > 0 && !running && (
                <div className="rounded-md border border-trigger/40 bg-trigger/10 p-3 text-sm">
                    <p className="font-semibold">Fix before running</p>
                    <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs">
                        {issues.map((issue) => <li key={issue}>{issue}</li>)}
                    </ul>
                </div>
            )}

            {logs.length === 0 ? (
                <p className="text-sm text-mute">Press Run simulation to see each step execute here.</p>
            ) : (
                <LogList logs={logs} live />
            )}
        </div>
    )
}