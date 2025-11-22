import { useState, useEffect } from "react";

export function useTimeAgo(timestamp: number | string): string {
    const [timeAgo, setTimeAgo] = useState<string>("");

    useEffect(() => {
        const updateTimeAgo = () => {
            const now = Date.now();
            const ts = typeof timestamp === "string" ? parseInt(timestamp, 10) : timestamp;
            const diff = now - ts;

            const seconds = Math.floor(diff / 1000);
            const minutes = Math.floor(seconds / 60);
            const hours = Math.floor(minutes / 60);
            const days = Math.floor(hours / 24);

            if (days > 0) {
                setTimeAgo(`${days}d ago`);
            } else if (hours > 0) {
                setTimeAgo(`${hours}h ago`);
            } else if (minutes > 0) {
                setTimeAgo(`${minutes}m ago`);
            } else {
                setTimeAgo("Just now");
            }
        };

        updateTimeAgo();
        const interval = setInterval(updateTimeAgo, 60000); // Update every minute

        return () => clearInterval(interval);
    }, [timestamp]);

    return timeAgo;
}
