import { useEffect, useState } from "react";

/**
 * Returns a human‑readable "time ago" string for a given Unix timestamp (in seconds).
 * Example: 1650000000 -> "2h ago"
 */
export function useTimeAgo(timestamp?: number | null): string {
  // Compute initial value synchronously instead of in an effect
  function computeTimeAgo(ts?: number | null) {
    if (!ts) return "";
    const now = Date.now() / 1000; // seconds
    const diff = Math.max(0, now - ts);
    const diffMins = Math.floor(diff / 60);
    const diffHours = Math.floor(diff / 3600);
    const diffDays = Math.floor(diff / 86400);

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMins > 0) return `${diffMins}m ago`;
    return "just now";
  }

  const [timeAgo, setTimeAgo] = useState<string>(() =>
    computeTimeAgo(timestamp)
  );

  useEffect(() => {
    if (!timestamp) {
      setTimeout(() => {
        setTimeAgo("");
      }, 0);
      return;
    }

    // Do not call setTimeAgo synchronously in the effect to avoid cascading renders.
    // Schedule to run on next tick.
    const timeout = setTimeout(() => {
      setTimeAgo(computeTimeAgo(timestamp));
    }, 0);

    const interval = setInterval(() => {
      setTimeAgo(computeTimeAgo(timestamp));
    }, 60_000);

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [timestamp]);

  return timeAgo;
}
