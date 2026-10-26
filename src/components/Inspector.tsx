import type { ReactNode } from "react";
import type { ZodError } from "zod";
import { Trash2 } from "lucide-react";
import { useFlowStore } from "../store";
import { configSchemas } from "../types";
import type { FlowNodeData, Workflow } from "../types";
import { actionLabels, eventLabels, kindMeta, operatorLabels } from "./meta";

const inputCls =
  "w-full rounded-md border border-line bg-white px-2.5 py-1.5 text-sm focus:border-brand aria-[invalid=true]:border-err";

function issuesToMap(error: ZodError): Record<string, string> {
  const map: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "");
    if (!(key in map)) map[key] = issue.message;
  }
  return map;
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-err">{error}</span>}
    </label>
  );
}

function TextField({ label, value, onChange, error, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; error?: string; placeholder?: string;
}) {
  return (
    <Field label={label} error={error}>
      <input className={inputCls} value={value} placeholder={placeholder} aria-invalid={!!error} onChange={(e) => onChange(e.target.value)} />
    </Field>
  );
}

/** Generic select: the option keys flow through as `T`, so no casts at call sites. */
function SelectField<T extends string>({ label, value, options, onChange }: {
  label: string; value: T; options: Record<T, string>; onChange: (v: T) => void;
}) {
  return (
    <Field label={label}>
      <select className={inputCls} value={value} onChange={(e) => onChange(e.target.value as T)}>
        {(Object.entries(options) as [T, string][]).map(([key, text]) => (
          <option key={key} value={key}>{text}</option>
        ))}
      </select>
    </Field>
  );
}

export function Inspector({ wf }: { wf: Workflow }) {
  const updateNodeData = useFlowStore((s) => s.updateNodeData);
  const removeNode = useFlowStore((s) => s.removeNode);

  const node = wf.nodes.find((n) => n.selected);
  if (!node) {
    return <p className="p-4 text-sm text-mute">Select a node on the canvas to edit its settings.</p>;
  }

  const data = node.data;
  const update = (data: FlowNodeData) => updateNodeData(wf.id, node.id, data);
  const parsed = configSchemas[data.kind].safeParse(data.config);
  const errors = parsed.success ? {} : issuesToMap(parsed.error);
  const { label: kindLabel, Icon, text } = kindMeta[data.kind];

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-center gap-2">
        <Icon className={`size-4 ${text}`} aria-hidden />
        <h2 className="text-sm font-semibold">{kindLabel} settings</h2>
      </div>

      <TextField label="Name" value={data.label} onChange={(label) => update({ ...data, label })} />

      {data.kind === "trigger" && (
        <>
          <SelectField
            label="Event"
            value={data.config.event}
            options={eventLabels}
            onChange={(event) => update({ ...data, config: { ...data.config, event } })}
          />
          <Field label="Sample payload (JSON)" error={errors.samplePayload}>
            <textarea
              rows={6}
              className={`${inputCls} font-mono text-xs`}
              value={data.config.samplePayload}
              aria-invalid={!!errors.samplePayload}
              onChange={(e) => update({ ...data, config: { ...data.config, samplePayload: e.target.value } })}
            />
          </Field>
        </>
      )}

      {data.kind === "condition" && (
        <>
          <TextField
            label="Field"
            placeholder="order.total"
            value={data.config.field}
            error={errors.field}
            onChange={(field) => update({ ...data, config: { ...data.config, field } })}
          />
          <SelectField
            label="Operator"
            value={data.config.operator}
            options={operatorLabels}
            onChange={(operator) => update({ ...data, config: { ...data.config, operator } })}
          />
          <TextField
            label="Value"
            value={data.config.value}
            error={errors.value}
            onChange={(value) => update({ ...data, config: { ...data.config, value } })}
          />
        </>
      )}

      {data.kind === "action" && (
        <>
          <SelectField
            label="Action"
            value={data.config.actionType}
            options={actionLabels}
            onChange={(actionType) => update({ ...data, config: { ...data.config, actionType } })}
          />
          <TextField
            label={data.config.actionType === "http_request" ? "URL" : "Send to"}
            value={data.config.target}
            error={errors.target}
            placeholder={data.config.actionType === "http_request" ? "https://api.example.com/hook" : ""}
            onChange={(target) => update({ ...data, config: { ...data.config, target } })}
          />
          <p className="text-xs text-mute">Tip: a target containing "fail" makes this step fail, so you can test error handling.</p>
        </>
      )}

      <button
        onClick={() => removeNode(wf.id, node.id)}
        className="mt-1 flex items-center justify-center gap-1.5 rounded-md border border-err/40 px-3 py-1.5 text-sm font-medium text-err hover:bg-err/10"
      >
        <Trash2 className="size-4" aria-hidden /> Delete node
      </button>
    </div>
  );
}