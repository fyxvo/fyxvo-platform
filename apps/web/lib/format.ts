export function formatSol(lamports: number): string {
  const sol = lamports / 1_000_000_000;
  return `${sol.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 })} SOL`;
}

export function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

export function formatPct(n: number): string {
  return `${(n * 100).toFixed(2)}%`;
}

export function formatMs(ms: number): string {
  return `${ms}ms`;
}

export function shortAddress(address: string, chars = 4): string {
  if (address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars)}…${address.slice(-chars)}`;
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatRelative(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
