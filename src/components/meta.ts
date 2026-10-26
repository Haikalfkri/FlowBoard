import { GitBranch, Send, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ActionConfig, ConditionConfig, FlowNodeData, NodeKind, TriggerConfig } from "../types";
import { assertNever } from "../lib/simulation";

export const kindMeta: Record<NodeKind, { label: string; Icon: LucideIcon; text: string; tint: string }> = {
  trigger: { label: "Trigger", Icon: Zap, text: "text-trigger", tint: "bg-trigger/12" },
  condition: { label: "Condition", Icon: GitBranch, text: "text-condition", tint: "bg-condition/12" },
  action: { label: "Action", Icon: Send, text: "text-action", tint: "bg-action/12" },
};

export const eventLabels: Record<TriggerConfig["event"], string> = {
  webhook: "Webhook received",
  schedule: "Runs on a schedule",
  form_submitted: "Form submitted",
};
export const operatorLabels: Record<ConditionConfig["operator"], string> = {
  equals: "equals",
  not_equals: "does not equal",
  greater_than: "is greater than",
  less_than: "is less than",
  contains: "contains",
};
export const actionLabels: Record<ActionConfig["actionType"], string> = {
  send_email: "Send email",
  post_slack: "Post to Slack",
  http_request: "Call a URL",
};

export function nodeSummary(data: FlowNodeData): string {
  switch (data.kind) {
    case "trigger": return eventLabels[data.config.event];
    case "condition": return `${data.config.field || "?"} ${operatorLabels[data.config.operator]} ${data.config.value || "?"}`;
    case "action": return `${actionLabels[data.config.actionType]}: ${data.config.target || "?"}`;
    default: return assertNever(data);
  }
}