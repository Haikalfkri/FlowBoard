import { configSchemas } from "../types";
import type {
  ActionConfig, ConditionConfig, ExecutionResult, FlowNode, LogEntry, NodeStatus, TriggerNode,
} from "../types";

export type EdgeLike = { source: string; target: string; sourceHandle?: string | null };

export function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${JSON.stringify(value)}`);
}

export function getByPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>(
    (acc, key) => (acc !== null && typeof acc === "object" ? (acc as Record<string, unknown>)[key] : undefined),
    obj,
  );
}

export function evaluateCondition(config: ConditionConfig, payload: unknown): boolean {
    const actual = getByPath(payload, config.field);
    if (actual == undefined) return false;
    const expected = config.value.trim();
    switch (config.operator) {
        case "equals": return String(actual) === expected;
        case "not_equals": return String(actual) !== expected;
        case "greater_than": return Number(actual) > Number(expected);
        case "less_than": return Number(actual) < Number(expected);
        case "contains": return String(actual).includes(expected);
        default: return assertNever(config.operator);
    }
}

function hasCycle(nodes: FlowNode[], edges: EdgeLike[]): boolean {
  const adjacency = new Map<string, string[]>(nodes.map((n) => [n.id, []]));
  edges.forEach((e) => adjacency.get(e.source)?.push(e.target));
  const state = new Map<string, 1 | 2>(); // 1 = visiting, 2 = done
  const visit = (id: string): boolean => {
    const s = state.get(id);
    if (s === 1) return true;
    if (s === 2) return false;
    state.set(id, 1);
    for (const next of adjacency.get(id) ?? []) if (visit(next)) return true;
    state.set(id, 2);
    return false;
  };
  return nodes.some((n) => visit(n.id));
}

export function validateWorkflow(nodes: FlowNode[], edges: EdgeLike[]): string[] {
    const issues: string[] = [];
    const triggers = nodes.filter((n): n is TriggerNode => n.data.kind === "trigger");

    if (triggers.length === 0) issues.push("Add a Trigger node to start the workflow.");
    if (triggers.length > 1) issues.push("Only one Trigger is allowed per workflow.");

    for (const node of nodes) {
        const parsed = configSchemas[node.data.kind].safeParse(node.data.config);
        if (!parsed.success) issues.push(`"${node.data.label}": ${parsed.error.issues[0]?.message ?? "invalid config"}`);
    }

    if (hasCycle(nodes, edges)) issues.push("The workflow contains a cycle. Remove the loop so it can finish.");

    if (triggers.length === 1) {
        const reached = new Set<string>([triggers[0].id]);
        const queue = [triggers[0].id];
        while (queue.length) {
        const id = queue.shift()!;
        for (const e of edges) if (e.source === id && !reached.has(e.target)) { reached.add(e.target); queue.push(e.target); }
        }
        for (const n of nodes) if (!reached.has(n.id)) issues.push(`"${n.data.label}" is not connected to the Trigger.`);
    }
    return issues;
}

type Outcome =
  | { ok: true; duration: number; message: string; branch?: "true" | "false" }
  | { ok: false; duration: number; message: string };

const ACTION_DURATION: Record<ActionConfig["actionType"], number> = { send_email: 220, post_slack: 140, http_request: 380 };
const ACTION_VERB: Record<ActionConfig["actionType"], string> = { send_email: "Sent email to", post_slack: "Posted to", http_request: "Called" };

function executeNode(node: FlowNode, payload: unknown): Outcome {
  const d = node.data;
  switch (d.kind) {
    case "trigger":
      return { ok: true, duration: 40, message: `Received "${d.config.event}" event` };
    case "condition": {
      const actual = getByPath(payload, d.config.field);
      const result = evaluateCondition(d.config, payload);
      const shown = actual === undefined ? "missing" : JSON.stringify(actual);
      return {
        ok: true, duration: 60, branch: result ? "true" : "false",
        message: `${d.config.field} = ${shown}, ${d.config.operator.replace("_", " ")} ${d.config.value} → ${result}`,
      };
    }
    case "action": {
      const { actionType, target } = d.config;
      const duration = ACTION_DURATION[actionType];
      if (target.toLowerCase().includes("fail"))
        return { ok: false, duration, message: `Could not deliver to "${target}"` };
      if (actionType === "http_request" && !/^https?:\/\//.test(target))
        return { ok: false, duration, message: `"${target}" is not a valid URL. Start it with http:// or https://` };
      return { ok: true, duration, message: `${ACTION_VERB[actionType]} ${target}` };
    }
    default:
      return assertNever(d);
  }
}

export function runWorkflow(nodes: FlowNode[], edges: EdgeLike[]): ExecutionResult {
  const logs: LogEntry[] = [];
  const statuses: Record<string, NodeStatus> = Object.fromEntries(nodes.map((n) => [n.id, "idle" as NodeStatus]));
  let clock = 0;
  const push = (entry: Omit<LogEntry, "index" | "at">) => logs.push({ ...entry, index: logs.length, at: clock });

  const issues = validateWorkflow(nodes, edges);
  if (issues.length > 0) {
    issues.forEach((message) => push({ nodeId: null, label: "Validation", status: "error", message }));
    return { status: "failed", durationMs: 0, logs, nodeStatuses: statuses, issues };
  }

  const trigger = nodes.find((n): n is TriggerNode => n.data.kind === "trigger")!;
  const payload: unknown = JSON.parse(trigger.data.config.samplePayload);
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const queue = [trigger.id];
  const visited = new Set<string>();
  let failed = false;

  while (queue.length > 0 && !failed) {
    const id = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    const node = byId.get(id)!;
    const label = node.data.label;

    statuses[id] = "running";
    push({ nodeId: id, label, status: "running", message: "Started" });

    const outcome = executeNode(node, payload);
    clock += outcome.duration;

    if (!outcome.ok) {
      statuses[id] = "error";
      push({ nodeId: id, label, status: "error", message: outcome.message });
      failed = true;
      break;
    }
    statuses[id] = "success";
    push({ nodeId: id, label, status: "success", message: outcome.message });

    for (const e of edges) {
      if (e.source !== id) continue;
      if (node.data.kind === "condition" && (e.sourceHandle ?? "true") !== outcome.branch) continue;
      queue.push(e.target);
    }
  }

  const skipped = nodes.filter((n) => !visited.has(n.id));
  skipped.forEach((n) => (statuses[n.id] = "skipped"));
  if (skipped.length > 0) {
    push({ nodeId: null, label: "Workflow", status: "info", message: `Skipped ${skipped.length} node(s) not on the active path` });
  }
  push({
    nodeId: null, label: "Workflow", status: failed ? "error" : "success",
    message: failed ? "Workflow stopped because a step failed" : "Workflow finished",
  });

  return { status: failed ? "failed" : "success", durationMs: clock, logs, nodeStatuses: statuses, issues: [] };
}