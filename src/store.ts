import { create } from "zustand";
import { persist } from "zustand/middleware";
import { addEdge, applyEdgeChanges, applyNodeChanges } from "@xyflow/react";
import type { Connection, EdgeChange, NodeChange } from "@xyflow/react";
import { createNode } from "./types";
import type { Execution, ExecutionResult, FlowNode, FlowNodeData, LogEntry, NodeKind, NodeStatus, Workflow } from "./types";
import { runWorkflow } from "./lib/simulation";
import { createBlankWorkflow, createSampleWorkflow, uid } from "./lib/workflows";

const MAX_EXECUTIONS = 200;

type Runtime = {
  running: boolean;
  nodeStatuses: Record<string, NodeStatus>;
  logs: LogEntry[];
  result: ExecutionResult | null;
};
const emptyRuntime: Runtime = { running: false, nodeStatuses: {}, logs: [], result: null };

type FlowState = {
  workflows: Workflow[];
  executions: Execution[];
  runtime: Runtime;

  createWorkflow: (kind?: "blank" | "sample") => string;
  renameWorkflow: (id: string, name: string) => void;
  duplicateWorkflow: (id: string) => string | null;
  deleteWorkflow: (id: string) => void;

  onNodesChange: (id: string, changes: NodeChange<FlowNode>[]) => void;
  onEdgesChange: (id: string, changes: EdgeChange[]) => void;
  onConnect: (id: string, connection: Connection) => void;
  addNode: (id: string, kind: NodeKind, position: { x: number; y: number }) => void;
  updateNodeData: (id: string, nodeId: string, data: FlowNodeData) => void;
  removeNode: (id: string, nodeId: string) => void;

  runSimulation: (id: string) => Promise<void>;
  resetRun: () => void;
  clearExecutions: () => void;
};

type Mode = "silent" | "touch" | "edit";

const nodeMode = (changes: NodeChange<FlowNode>[]): Mode => 
    changes.some((c) => c.type === "remove" || c.type === "add" || c.type === "replace") ? "edit"
    : changes.some((c) => c.type === "position") ? "touch"
    : "silent";

const edgeMode = (changes: EdgeChange[]): Mode =>
  changes.some((c) => c.type === "remove" || c.type === "add" || c.type === "replace") ? "edit" : "silent";

let runToken = 0;
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export const useFlowStore = create<FlowState>()(
  persist(
    (set, get) => {
      const patchWorkflow = (id: string, fn: (w: Workflow) => Workflow, mode: Mode) =>
        set((s) => ({
          workflows: s.workflows.map((w) => {
            if (w.id !== id) return w;
            const next = fn(w);
            if (mode === "edit") return { ...next, status: "draft", updatedAt: Date.now() };
            if (mode === "touch") return { ...next, updatedAt: Date.now() };
            return next;
          }),
          ...(mode === "edit" && !s.runtime.running ? { runtime: emptyRuntime } : {}),
        }));

      return {
        workflows: [createSampleWorkflow()],
        executions: [],
        runtime: emptyRuntime,

        createWorkflow: (kind = "blank") => {
          const wf = kind === "sample" ? createSampleWorkflow() : createBlankWorkflow();
          set((s) => ({ workflows: [wf, ...s.workflows] }));
          return wf.id;
        },
        renameWorkflow: (id, name) =>
          set((s) => ({ workflows: s.workflows.map((w) => (w.id === id ? { ...w, name, updatedAt: Date.now() } : w)) })),
        duplicateWorkflow: (id) => {
          const source = get().workflows.find((w) => w.id === id);
          if (!source) return null;
          const copy: Workflow = {
            ...structuredClone(source), id: uid(), name: `${source.name} copy`,
            status: "draft", updatedAt: Date.now(),
          };
          set((s) => ({ workflows: [copy, ...s.workflows] }));
          return copy.id;
        },
        deleteWorkflow: (id) => set((s) => ({ workflows: s.workflows.filter((w) => w.id !== id) })),
                onNodesChange: (id, changes) =>
          patchWorkflow(id, (w) => ({ ...w, nodes: applyNodeChanges(changes, w.nodes) }), nodeMode(changes)),
        onEdgesChange: (id, changes) =>
          patchWorkflow(id, (w) => ({ ...w, edges: applyEdgeChanges(changes, w.edges) }), edgeMode(changes)),
        onConnect: (id, connection) =>
          patchWorkflow(id, (w) => ({ ...w, edges: addEdge(connection, w.edges) }), "edit"),
        addNode: (id, kind, position) =>
          patchWorkflow(id, (w) => ({ ...w, nodes: [...w.nodes, createNode(kind, uid(), position)] }), "edit"),
        updateNodeData: (id, nodeId, data) =>
          patchWorkflow(
            id,
            (w) => ({ ...w, nodes: w.nodes.map((n) => (n.id === nodeId ? ({ ...n, data } as FlowNode) : n)) }),
            "edit",
          ),
        removeNode: (id, nodeId) =>
          patchWorkflow(
            id,
            (w) => ({
              ...w,
              nodes: w.nodes.filter((n) => n.id !== nodeId),
              edges: w.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
            }),
            "edit",
          ),

        runSimulation: async (id) => {
          if (get().runtime.running) return;
          const wf = get().workflows.find((w) => w.id === id);
          if (!wf) return;

          const startedAt = Date.now();
          const result = runWorkflow(wf.nodes, wf.edges);
          const token = ++runToken;

          set({ runtime: { running: true, nodeStatuses: {}, logs: [], result: null } });

          // Play the precomputed log back step by step so the canvas animates.
          for (const entry of result.logs) {
            await sleep(entry.status === "running" ? 250 : 450);
            if (token !== runToken) return; // cancelled (user left the editor)
            set((s) => ({
              runtime: {
                ...s.runtime,
                logs: [...s.runtime.logs, entry],
                nodeStatuses:
                  entry.nodeId && entry.status !== "info"
                    ? { ...s.runtime.nodeStatuses, [entry.nodeId]: entry.status }
                    : s.runtime.nodeStatuses,
              },
            }));
          }
          if (token !== runToken) return;

          // A run blocked by validation is shown in the log but not recorded as an execution.
          const blocked = result.issues.length > 0;
          set((s) => ({
            runtime: { running: false, nodeStatuses: result.nodeStatuses, logs: result.logs, result },
            ...(blocked
              ? {}
              : {
                  executions: [
                    { id: uid(), workflowId: wf.id, workflowName: wf.name, startedAt, result },
                    ...s.executions,
                  ].slice(0, MAX_EXECUTIONS),
                  workflows: s.workflows.map((w) =>
                    w.id === id ? { ...w, status: result.status, updatedAt: Date.now() } : w,
                  ),
                }),
          }));
        },
        resetRun: () => {
          runToken++; // also cancels a run that is still playing
          set({ runtime: emptyRuntime });
        },
        clearExecutions: () => set({ executions: [] }),
      };
    },
    {
      name: "flowboard:v2",
      version: 1,
      partialize: (s) => ({ workflows: s.workflows, executions: s.executions }),
    },
  ),
);