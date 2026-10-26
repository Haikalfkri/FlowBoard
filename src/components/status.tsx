import { Circle, CircleCheck, CircleMinus, CircleX, Info, LoaderCircle } from "lucide-react";
import type { ExecutionResult, NodeStatus, WorkflowStatus } from "../types";
import { assertNever } from "../lib/simulation";

export function StatusIcon({ status, className = "size-4" }: { status: NodeStatus | "info"; className?: string }) {
  switch (status) {
    case "running": return <LoaderCircle className={`${className} animate-spin text-brand motion-reduce:animate-none`} aria-label="Running" />;
    case "success": return <CircleCheck className={`${className} text-ok`} aria-label="Succeeded" />;
    case "error": return <CircleX className={`${className} text-err`} aria-label="Failed" />;
    case "skipped": return <CircleMinus className={`${className} text-mute`} aria-label="Skipped" />;
    case "info": return <Info className={`${className} text-mute`} aria-label="Info" />;
    case "idle": return <Circle className={`${className} text-mute`} aria-label="Not run" />;
    default: return assertNever(status);
  }
}

const chip: Record<WorkflowStatus, { text: string; cls: string }> = {
  draft: { text: "Draft", cls: "bg-line/60 text-mute" },
  success: { text: "Last run passed", cls: "bg-ok/12 text-ok" },
  failed: { text: "Last run failed", cls: "bg-err/12 text-err" },
};

export function StatusChip({ status }: { status: WorkflowStatus }) {
  return <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${chip[status].cls}`}>{chip[status].text}</span>;
}

export function RunChip({ status }: { status: ExecutionResult["status"] }) {
  const ok = status === "success";
  return (
    <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${ok ? "bg-ok/12 text-ok" : "bg-err/12 text-err"}`}>
      {ok ? "Passed" : "Failed"}
    </span>
  );
}