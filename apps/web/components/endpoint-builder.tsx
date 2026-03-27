"use client";

import { useState } from "react";
import { CopyButton } from "./copy-button";
import { webEnv } from "../lib/env";

type RelayMode = "standard" | "priority";

function CodeBlock({ label, code }: { readonly label: string; readonly code: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)]">
      <div className="flex items-center justify-between border-b border-[var(--fyxvo-border)] px-4 py-2">
        <span className="text-xs uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">{label}</span>
        <CopyButton value={code} label="Copy" />
      </div>
      <pre className="overflow-x-auto p-4 text-xs leading-6 text-[var(--fyxvo-text-soft)]">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export function EndpointBuilder({ apiKey }: { readonly apiKey?: string }) {
  const [mode, setMode] = useState<RelayMode>("standard");
  const displayKey = apiKey ?? "YOUR_API_KEY";
  const baseUrl = mode === "standard"
    ? `${webEnv.gatewayBaseUrl}/rpc`
    : `${webEnv.gatewayBaseUrl}/priority`;

  const endpointUrl = `${baseUrl}`;

  const curlSnippet = `curl -X POST ${endpointUrl} \\
  -H "content-type: application/json" \\
  -H "x-api-key: ${displayKey}" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"getLatestBlockhash","params":[{"commitment":"finalized"}]}'`;

  const jsSnippet = `import { Connection } from "@solana/web3.js";

const connection = new Connection(
  "${endpointUrl}",
  {
    httpHeaders: { "x-api-key": "${displayKey}" },
    commitment: "confirmed"
  }
);

const blockhash = await connection.getLatestBlockhash();
console.log(blockhash);`;

  const pySnippet = `from solana.rpc.api import Client

client = Client(
    endpoint="${endpointUrl}",
    extra_headers={"x-api-key": "${displayKey}"},
)

resp = client.get_latest_blockhash()
print(resp)`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-[var(--fyxvo-text)]">Relay mode</span>
        <div className="flex overflow-hidden rounded-lg border border-[var(--fyxvo-border)]">
          {(["standard", "priority"] as RelayMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`px-4 py-1.5 text-xs font-medium transition ${mode === m
                ? "bg-[var(--fyxvo-brand)] text-white"
                : "bg-[var(--fyxvo-panel-soft)] text-[var(--fyxvo-text-muted)] hover:text-[var(--fyxvo-text)]"
              }`}
            >
              {m === "standard" ? "Standard /rpc" : "Priority /priority"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">
            {mode === "standard" ? "Standard RPC endpoint" : "Priority relay endpoint"}
          </div>
          <div className="mt-1 break-all font-mono text-sm font-medium text-[var(--fyxvo-text)]">
            {endpointUrl}
          </div>
        </div>
        <CopyButton value={endpointUrl} className="shrink-0" />
      </div>

      <div className="space-y-3">
        <CodeBlock label="curl" code={curlSnippet} />
        <CodeBlock label="JavaScript · @solana/web3.js" code={jsSnippet} />
        <CodeBlock label="Python · solana-py" code={pySnippet} />
      </div>

      {mode === "priority" && (
        <p className="text-xs text-[var(--fyxvo-text-muted)]">
          Priority relay requires a key with both <code className="rounded bg-[var(--fyxvo-panel-soft)] px-1 py-0.5">rpc:request</code> and{" "}
          <code className="rounded bg-[var(--fyxvo-panel-soft)] px-1 py-0.5">priority:relay</code> scopes.
        </p>
      )}
    </div>
  );
}
