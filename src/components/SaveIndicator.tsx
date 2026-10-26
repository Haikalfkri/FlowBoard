import { useEffect, useRef, useState } from "react";
import { Check, LoaderCircle } from "lucide-react";
import { formatClock } from "../lib/format";

export function SaveIndicator({ id, updatedAt }: { id: string; updatedAt: number }) {
  const [saving, setSaving] = useState(false);
  const prev = useRef({ id, updatedAt });

  useEffect(() => {
    if (prev.current.id !== id) {
      prev.current = { id, updatedAt };
      setSaving(false);
      return;
    }
    if (prev.current.updatedAt === updatedAt) return;
    prev.current = { id, updatedAt };
    setSaving(true);
    const timer = window.setTimeout(() => setSaving(false), 600);
    return () => window.clearTimeout(timer);
  }, [id, updatedAt]);

  return (
    <span role="status" className="flex items-center gap-1.5 text-xs text-mute">
      {saving ? (
        <>
          <LoaderCircle className="size-3.5 animate-spin motion-reduce:animate-none" aria-hidden /> Saving…
        </>
      ) : (
        <>
          <Check className="size-3.5 text-ok" aria-hidden /> Saved at {formatClock(updatedAt)}
        </>
      )}
    </span>
  );
}