import { describe, expect, it } from "vitest";
import { createNode } from "../types";
import type { ConfigFor, FlowNode, NodeKind } from "../types";
import { evaluateCondition, runWorkflow, validateWorkflow } from "./simulation";

function node<K extends NodeKind>(kind: K, id: string, config: Partial<ConfigFor<K>> = {}): FlowNode {
  const base = createNode(kind, id, { x: 0, y: 0 });
  return { ...base, data: { ...base.data, config: { ...base.data.config, ...config } } } as FlowNode;
}
const edge = (source: string, target: string, sourceHandle?: string) => ({ source, target, sourceHandle });

const build = (conditionValue = "100", actionTarget = "vip@shop.com") => ({
  nodes: [
    node("trigger", "t", { samplePayload: '{"order":{"total":150}}' }),
    node("condition", "c", { field: "order.total", operator: "greater_than", value: conditionValue }),
    node("action", "a1", { target: actionTarget }),
    node("action", "a2", { actionType: "post_slack", target: "#orders" }),
  ],
  edges: [edge("t", "c"), edge("c", "a1", "true"), edge("c", "a2", "false")],
});

describe("runWorkflow", () => {
  it("follows the true branch and skips the other", () => {
    const { nodes, edges } = build();
    const r = runWorkflow(nodes, edges);
    expect(r.status).toBe("success");
    expect(r.nodeStatuses).toMatchObject({ t: "success", c: "success", a1: "success", a2: "skipped" });
    expect(r.durationMs).toBe(40 + 60 + 220);
  });

  it("follows the false branch", () => {
    const { nodes, edges } = build("500");
    const r = runWorkflow(nodes, edges);
    expect(r.nodeStatuses).toMatchObject({ a1: "skipped", a2: "success" });
  });

  it("fails when an action cannot deliver", () => {
    const { nodes, edges } = build("100", "fail@shop.com");
    const r = runWorkflow(nodes, edges);
    expect(r.status).toBe("failed");
    expect(r.nodeStatuses.a1).toBe("error");
  });

  it("refuses to run an invalid workflow", () => {
    const r = runWorkflow([node("action", "a")], []);
    expect(r.status).toBe("failed");
    expect(r.logs[0].nodeId).toBeNull();
  });
});

describe("validateWorkflow", () => {
  it("detects cycles", () => {
    const { nodes, edges } = build();
    const issues = validateWorkflow(nodes, [...edges, edge("a1", "c")]);
    expect(issues.some((i) => /cycle/i.test(i))).toBe(true);
  });

  it("requires exactly one trigger", () => {
    expect(validateWorkflow([], [])[0]).toMatch(/Trigger/);
    const two = [node("trigger", "t1"), node("trigger", "t2")];
    expect(validateWorkflow(two, []).some((i) => /Only one/.test(i))).toBe(true);
  });

  it("reports invalid config and unreachable nodes", () => {
    const nodes = [node("trigger", "t", { samplePayload: "{oops" }), node("action", "a")];
    const issues = validateWorkflow(nodes, []);
    expect(issues.some((i) => /valid JSON/.test(i))).toBe(true);
    expect(issues.some((i) => /not connected/.test(i))).toBe(true);
  });
});

describe("evaluateCondition", () => {
  const payload = { user: { age: 20, name: "Rina" } };
  const check = (operator: ConfigFor<"condition">["operator"], field: string, value: string) =>
    evaluateCondition({ operator, field, value }, payload);

  it("supports every operator", () => {
    expect(check("equals", "user.name", "Rina")).toBe(true);
    expect(check("not_equals", "user.name", "Budi")).toBe(true);
    expect(check("greater_than", "user.age", "18")).toBe(true);
    expect(check("less_than", "user.age", "18")).toBe(false);
    expect(check("contains", "user.name", "in")).toBe(true);
  });

  it("treats a missing field as false", () => {
    expect(check("equals", "user.email", "x")).toBe(false);
  });
});