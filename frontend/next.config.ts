import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias: {
      pino: "pino/browser",
      "thread-stream": "pino/browser/thread-stream",
      "pino-pretty": "pino/browser/pino-pretty",
      "pino-std-serializers": "pino/browser/pino-std-serializers",
      tap: "pino/browser/tap",
      desm: "pino/browser/desm",
      "why-is-node-running": "pino/browser/why-is-node-running",
      fastbench: "pino/browser/fastbench",
      "sonic-boom": "pino/browser/sonic-boom",
    },
  },
};

export default nextConfig;
