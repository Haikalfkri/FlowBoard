import { createNode } from "../types";
import type { Workflow } from "../types";

export const uid = () => crypto.randomUUID();

export function createBlankWorkflow(name = "Untitled workflow"): Workflow {
  return { id: uid(), name, nodes: [], edges: [], status: "draft", updatedAt: Date.now() };
}

// Order routing: big orders email the VIP team, the rest go to Slack. 
export function createSampleWorkflow(): Workflow {
  const trigger = createNode("trigger", "trigger-1", { x: 240, y: 0 });
  const condition = createNode("condition", "condition-1", { x: 240, y: 170 });
  const vip = createNode("action", "action-vip", { x: 20, y: 360 });
  const regular = createNode("action", "action-regular", { x: 460, y: 360 });

  if (trigger.data.kind === "trigger") {
    trigger.data.label = "New order received";
    trigger.data.config.samplePayload = '{"order":{"total":150,"country":"ID"}}';
  }
  if (condition.data.kind === "condition") condition.data.label = "Order over 100?";
  if (vip.data.kind === "action") { vip.data.label = "Email VIP team"; vip.data.config.target = "vip@shop.com"; }
  if (regular.data.kind === "action") {
    regular.data.label = "Post to #orders";
    regular.data.config.actionType = "post_slack";
    regular.data.config.target = "#orders";
  }

  return {
    id: uid(),
    name: "Order routing",
    nodes: [trigger, condition, vip, regular],
    edges: [
      { id: "e1", source: "trigger-1", target: "condition-1" },
      { id: "e2", source: "condition-1", target: "action-vip", sourceHandle: "true" },
      { id: "e3", source: "condition-1", target: "action-regular", sourceHandle: "false" },
    ],
    status: "draft",
    updatedAt: Date.now(),
  };
}