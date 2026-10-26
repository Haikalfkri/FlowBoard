import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import type { ReactNode } from "react";
import { useFlowStore } from "../store";
import type { ActionNode, ConditionNode, FlowNodeData, TriggerNode } from "../types";
import { kindMeta, nodeSummary } from "./meta";
import { StatusIcon } from "./status";

function Shell({ id, data, selected, children }: { id: string; data: FlowNodeData; selected?: boolean; children?: ReactNode }) {
  const status = useFlowStore((s) => s.runtime.nodeStatuses[id]);
  const { Icon, text, tint, label } = kindMeta[data.kind];

  const border =
    status === "error" ? "border-err" :
    status === "success" ? "border-ok" :
    status === "running" ? "border-brand" :
    selected ? "border-ink" : "border-line";

  return (
    <div
      className={`w-56 rounded-lg border-2 bg-white px-3 py-2.5 shadow-sm transition-opacity ${border}
        ${status === "running" ? "node-running" : ""} ${status === "skipped" ? "opacity-50" : ""}`}
    >
      <div className="flex items-center gap-2">
        <span className={`grid size-7 shrink-0 place-items-center rounded-md ${tint} ${text}`}>
          <Icon className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-tight">{data.label}</p>
          <p className="text-xs text-mute">{label}</p>
        </div>
        {status && status !== "idle" && <StatusIcon status={status} />}
      </div>
      <p className="mt-2 truncate text-xs text-mute">{nodeSummary(data)}</p>
      {children}
    </div>
  );
}

export function TriggerNodeView({ id, data, selected }: NodeProps<TriggerNode>) {
  return (
    <>
      <Shell id={id} data={data} selected={selected} />
      <Handle type="source" position={Position.Bottom} />
    </>
  );
}

export function ConditionNodeView({ id, data, selected }: NodeProps<ConditionNode>) {
  return (
    <>
      <Handle type="target" position={Position.Top} />
      <Shell id={id} data={data} selected={selected}>
        <div className="mt-2 flex justify-between px-4 text-xs font-medium">
          <span className="text-ok">True</span>
          <span className="text-err">False</span>
        </div>
      </Shell>
      <Handle id="true" type="source" position={Position.Bottom} style={{ left: "27%" }} />
      <Handle id="false" type="source" position={Position.Bottom} style={{ left: "73%" }} />
    </>
  );
}

export function ActionNodeView({ id, data, selected }: NodeProps<ActionNode>) {
  return (
    <>
      <Handle type="target" position={Position.Top} />
      <Shell id={id} data={data} selected={selected} />
      <Handle type="source" position={Position.Bottom} />
    </>
  );
}