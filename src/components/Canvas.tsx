import { useMemo, useRef } from "react";
import type { DragEvent } from "react";
import { Background, Controls, MarkerType, ReactFlow, useReactFlow } from "@xyflow/react";
import type { Edge } from "@xyflow/react";
import { useFlowStore } from "../store";
import type { NodeKind, Workflow } from "../types";
import { kindMeta } from "./meta";
import { nodeTypes } from "./nodeTypes";

type ConnectionLike = { source: string; target: string; sourceHandle?: string | null };

const KIND_MIME = "application/flowboard-kind";
const isNodeKind = (value: string): value is NodeKind => value in kindMeta;

export function Canvas({ wf }: { wf: Workflow }) {
  const statuses = useFlowStore((s) => s.runtime.nodeStatuses);
  const running = useFlowStore((s) => s.runtime.running);
  const onNodesChange = useFlowStore((s) => s.onNodesChange);
  const onEdgesChange = useFlowStore((s) => s.onEdgesChange);
  const onConnect = useFlowStore((s) => s.onConnect);
  const addNode = useFlowStore((s) => s.addNode);

  const wrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  // Light up the edges the simulation has already travelled.
  const edges = useMemo<Edge[]>(
    () =>
      wf.edges.map((e) => {
        const target = statuses[e.target];
        const travelled = statuses[e.source] === "success" && !!target && target !== "idle" && target !== "skipped";
        return travelled ? { ...e, animated: running, style: { stroke: "#2f5bea", strokeWidth: 2.5 } } : e;
      }),
    [wf.edges, statuses, running],
  );
    const isValidConnection = (c: ConnectionLike) =>
    c.source !== c.target &&
    wf.nodes.find((n) => n.id === c.target)?.data.kind !== "trigger" &&
    !wf.edges.some((e) => e.source === c.source && e.target === c.target && e.sourceHandle === (c.sourceHandle ?? undefined));

  const add = (kind: NodeKind) => {
    const rect = wrapper.current?.getBoundingClientRect();
    if (!rect) return;
    const jitter = () => Math.round((Math.random() - 0.5) * 80);
    addNode(wf.id, kind, screenToFlowPosition({ x: rect.left + rect.width / 2 + jitter(), y: rect.top + rect.height / 3 + jitter() }));
  };

  const onDragOver = (e: DragEvent) => {
    e.preventDefault(); // without this the browser refuses the drop
    e.dataTransfer.dropEffect = "move";
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    const kind = e.dataTransfer.getData(KIND_MIME);
    if (!isNodeKind(kind)) return;
    addNode(wf.id, kind, screenToFlowPosition({ x: e.clientX, y: e.clientY }));
  };
    return (
    <div ref={wrapper} className="relative h-full w-full" onDragOver={onDragOver} onDrop={onDrop}>
      <ReactFlow
        nodes={wf.nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={(changes) => onNodesChange(wf.id, changes)}
        onEdgesChange={(changes) => onEdgesChange(wf.id, changes)}
        onConnect={(connection) => onConnect(wf.id, connection)}
        isValidConnection={isValidConnection}
        defaultEdgeOptions={{ type: "smoothstep", markerEnd: { type: MarkerType.ArrowClosed } }}
        deleteKeyCode={["Backspace", "Delete"]}
        fitView
        fitViewOptions={{ padding: 0.3, maxZoom: 1 }}
      >
        <Background gap={20} color="#b9c4d4" />
        <Controls showInteractive={false} />
      </ReactFlow>

      <div className="absolute left-3 top-3 z-10 flex gap-1.5 rounded-lg border border-line bg-white p-1.5 shadow-sm" role="toolbar" aria-label="Add node">
        {(Object.keys(kindMeta) as NodeKind[]).map((kind) => {
          const { Icon, label, text } = kindMeta[kind];
          return (
            <button
              key={kind}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData(KIND_MIME, kind);
                e.dataTransfer.effectAllowed = "move";
              }}
              onClick={() => add(kind)}
              className="flex cursor-grab items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium hover:bg-paper"
            >
              <Icon className={`size-4 ${text}`} aria-hidden />
              {label}
            </button>
          );
        })}
      </div>

      {wf.nodes.length === 0 && (
        <p className="pointer-events-none absolute inset-0 grid place-items-center text-center text-sm text-mute">
          This workflow is empty.<br />Add a Trigger from the toolbar to begin.
        </p>
      )}
    </div>
  );
}