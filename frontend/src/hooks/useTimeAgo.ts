import { useEffect, useState } from "react";

/**
 * Returns a human‑readable "time ago" string for a given Unix timestamp (in seconds).
 * Example: 1650000000 -> "2h ago"
 */
export function useTimeAgo(timestamp?: number | null): string {
    const [timeAgo, setTimeAgo] = useState<string>("");

    useEffect(() => {
        if (!timestamp) {
            setTimeAgo("");
            return;
        }

        const update = () => {
            const now = Date.now() / 1000; // seconds
            const diff = Math.max(0, now - timestamp);
            const diffMins = Math.floor(diff / 60);
            const diffHours = Math.floor(diff / 3600);
            const diffDays = Math.floor(diff / 86400);

            let result = "";
            if (diffDays > 0) result = `${diffDays}d ago`;
            else if (diffHours > 0) result = `${diffHours}h ago`;
            else if (diffMins > 0) result = `${diffMins}m ago`;
            else result = "just now";

            setTimeAgo(result);
        };

        update();
        const interval = setInterval(update, 60_000); // refresh every minute
        return () => clearInterval(interval);
    }, [timestamp]);

    return timeAgo;
}
