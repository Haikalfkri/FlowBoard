import { z } from "zod";
import type { Edge, Node } from "@xyflow/react";

// Zod schemas are the single source of truth for node configuration
const isJson = (value: string) => {
    try {
        JSON.parse(value);
        return value;
    } catch {
        return false;
    }
}

export const triggerConfigSchema = z.object({
    event: z.enum(["webhook", "schedule", "form_submitted"]),
    samplePayload: z.string().refine(isJson, "Sample payload must be valid JSON"),
});

export const conditionConfigSchema = z.object({
    field: z.string().trim().min(1, "Field is required"),
    operator: z.enum(["equals", "not_equals", "greater_than", "less_than", "contains"]),
    value: z.string().trim().min(1, "Value is required"),
});

export const actionConfigSchema = z.object({
    actionType: z.enum(["send_email", "post_slack", "http_request"]),
    target: z.string().trim().min(1, "Target is required"),
});

export type TriggerConfig = z.infer<typeof triggerConfigSchema>;
export type ConditionConfig = z.infer<typeof conditionConfigSchema>;
export type ActionConfig = z.infer<typeof actionConfigSchema>;

// Node data is a discriminated union on kind
export type TriggerNodeData = { kind: "trigger"; label: string; config: TriggerConfig };
export type ConditionNodeData = { kind: "condition"; label: string; config: ConditionConfig };
export type ActionNodeData = { kind: "action"; label: string; config: ActionConfig };

export type TriggerNode = Node<TriggerNodeData, "trigger">;
export type ConditionNode = Node<ConditionNodeData, "condition">;
export type ActionNode = Node<ActionNodeData, "action">;

export type FlowNode = TriggerNode | ConditionNode | ActionNode;
export type FlowNodeData = FlowNode["data"];
export type NodeKind = FlowNodeData["kind"];
export type ConfigFor<K extends NodeKind> = Extract<FlowNodeData, { kind: K }>["config"];

// The compiler checks that every kind has a schema matching its config type
export const configSchemas = {
    trigger: triggerConfigSchema,
    condition: conditionConfigSchema,
    action: actionConfigSchema,
} satisfies { [K in NodeKind]: z.ZodType<ConfigFor<K>> };

export function createNode(kind: NodeKind, id: string, position: { x: number; y: number }): FlowNode {
    switch (kind) {
        case "trigger":
            return {
                id, type: "trigger", position,
                data: { kind, label: "New trigger", config: { event: "webhook", samplePayload: '{"order":{"total":120}}' } },
            };
        case "condition":
            return {
                id, type: "condition", position,
                data: { kind, label: "New condition", config: { field: "order.total", operator: "greater_than", value: "100" } },
            };
        case "action":
            return {
                id, type: "action", position,
                data: { kind, label: "New action", config: { actionType: "send_email", target: "team@example.com" } },
            };
    }
}

// Simulation, workflow, and execution history
export type NodeStatus = "idle" | "running" | "success" | "error" | "skipped";

export type LogEntry = {
    index: number;
    nodeId: string | null;
    label: string;
    status: NodeStatus | "info";
    message: string;
    at: number;
};

export type ExecutionResult = {
    status: "success" | "failed";
    durationMs: number;
    logs: LogEntry[];
    nodeStatuses: Record<string, NodeStatus>;
    issues: string[];
};

export type WorkflowStatus = "draft" | "success" | "failed";

export type Workflow = {
    id: string;
    name: string;
    nodes: FlowNode[];
    edges: Edge[];
    status: WorkflowStatus;
    updatedAt: number;
}

export type Execution = {
  id: string;
  workflowId: string;
  workflowName: string;
  startedAt: number;
  result: ExecutionResult;
};