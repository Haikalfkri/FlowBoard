export const formatDateTime = (ts: number) => 
    new Date(ts).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });

export const formatClock = (ts: number) =>
    new Date(ts).toLocaleString([], { hour: "2-digit", minute: "2-digit" });

export function timeAgo(ts: number, now = Date.now()): string {
    const seconds = Math.round((ts - now) / 1000);
    const abs = Math.abs(seconds);
    const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
    if (abs < 60) return "just now";
    if (abs < 3600) return rtf.format(Math.round(seconds / 60), "minute");
    if (abs < 86400) return rtf.format(Math.round(seconds / 3600), "hour");
    return rtf.format(Math.round(seconds / 86400), "day");
}