"use client";

import { useMemo, useState } from "react";
import { Button } from "@fyxvo/ui";
import { JsonResponseView } from "../../components/json-response-view";
import { GATEWAY_BASE } from "../../lib/env";

const METHOD_OPTIONS = [
  {
    value: "getHealth",
    label: "getHealth",
    params: [],
    explanation: "Confirm the upstream Solana node is answering JSON-RPC health checks.",
  },
  {
    value: "getLatestBlockhash",
    label: "getLatestBlockhash",
    params: [{ commitment: "confirmed" }],
    explanation: "Fetch a fresh blockhash through the standard relay path.",
  },
  {
    value: "getVersion",
    label: "getVersion",
    params: [],
    explanation: "Inspect the Solana node version returned by the gateway.",
  },
  {
    value: "getSlot",
    label: "getSlot",
    params: [{ commitment: "confirmed" }],
    explanation: "Check current devnet slot progress through your API key.",
  },
] as const;

export default function PlaygroundPage() {
  const [apiKey, setApiKey] = useState("");
  const [lane, setLane] = useState<"rpc" | "priority">("rpc");
  const [method, setMethod] =
    useState<(typeof METHOD_OPTIONS)[number]["value"]>("getHealth");
  const [paramsText, setParamsText] = useState("[]");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [responseBody, setResponseBody] = useState<unknown>(null);

  const methodConfig = useMemo(
    () => METHOD_OPTIONS.find((option) => option.value === method) ?? METHOD_OPTIONS[0],
    [method]
  );

  async function handleSend() {
    setSubmitting(true);
    setError(null);

    try {
      if (!apiKey.trim()) {
        throw new Error("Enter an API key before sending a gateway request.");
      }

      let parsedParams: unknown = [];
      parsedParams = paramsText.trim().length > 0 ? JSON.parse(paramsText) : [];

      if (!Array.isArray(parsedParams)) {
        throw new Error("JSON-RPC params must be a JSON array.");
      }

      const requestBody = {
        jsonrpc: "2.0",
        id: Date.now(),
        method,
        params: parsedParams,
      };

      const response = await fetch(`${GATEWAY_BASE}/${lane}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey.trim(),
        },
        body: JSON.stringify(requestBody),
      });

      const rawText = await response.text();
      let parsed: unknown = {};
      try {
        parsed = rawText ? JSON.parse(rawText) : {};
      } catch {
        parsed = rawText;
      }
      setResponseBody(parsed);

      if (!response.ok) {
        throw new Error(
          (parsed as { error?: { message?: string }; message?: string })?.error?.message ??
            (parsed as { message?: string })?.message ??
            `Gateway request failed with status ${response.status}.`
        );
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to send the JSON-RPC request."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-16">
      <div className="max-w-3xl">
        <h1 className="text-3xl font-bold tracking-tight text-[var(--fyxvo-text)]">Playground</h1>
        <p className="mt-4 text-base leading-7 text-[var(--fyxvo-text-soft)]">
          Send live JSON-RPC traffic through the Fyxvo gateway, confirm your API key scopes, and
          inspect the exact response before you wire the relay into your own application.
        </p>
      </div>

      <div className="mt-10 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[2rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-6">
          <div className="space-y-5">
            <label className="block">
              <span className="text-sm font-medium text-[var(--fyxvo-text)]">API key</span>
              <input
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder="fyxvo_live_..."
                className="mt-2 h-11 w-full rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 text-sm text-[var(--fyxvo-text)] outline-none focus:border-[var(--fyxvo-brand)]"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-[var(--fyxvo-text)]">Relay lane</span>
              <select
                value={lane}
                onChange={(event) => setLane(event.target.value as "rpc" | "priority")}
                className="mt-2 h-11 w-full rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 text-sm text-[var(--fyxvo-text)] outline-none focus:border-[var(--fyxvo-brand)]"
              >
                <option value="rpc">Standard /rpc</option>
                <option value="priority">Priority /priority</option>
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-[var(--fyxvo-text)]">Method</span>
              <select
                value={method}
                onChange={(event) => {
                  const nextMethod = event.target.value as (typeof METHOD_OPTIONS)[number]["value"];
                  setMethod(nextMethod);
                  const nextConfig =
                    METHOD_OPTIONS.find((option) => option.value === nextMethod) ?? METHOD_OPTIONS[0];
                  setParamsText(JSON.stringify(nextConfig.params, null, 2));
                }}
                className="mt-2 h-11 w-full rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 text-sm text-[var(--fyxvo-text)] outline-none focus:border-[var(--fyxvo-brand)]"
              >
                {METHOD_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-sm leading-6 text-[var(--fyxvo-text-muted)]">
                {methodConfig.explanation}
              </p>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-[var(--fyxvo-text)]">Params JSON</span>
              <textarea
                rows={8}
                value={paramsText}
                onChange={(event) => setParamsText(event.target.value)}
                className="mt-2 w-full rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-3 font-mono text-sm text-[var(--fyxvo-text)] outline-none focus:border-[var(--fyxvo-brand)]"
              />
            </label>

            <div className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-3 text-sm text-[var(--fyxvo-text-soft)]">
              This request will be sent to <span className="font-mono text-[var(--fyxvo-text)]">{`${GATEWAY_BASE}/${lane}`}</span> using the entered API key as the <span className="font-mono text-[var(--fyxvo-text)]">x-api-key</span> header.
            </div>

            <Button type="button" onClick={() => void handleSend()} loading={submitting} disabled={submitting}>
              Send request
            </Button>
            {error ? <p className="text-sm text-rose-300">{error}</p> : null}
          </div>
        </div>

        <div className="rounded-[2rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold text-[var(--fyxvo-text)]">Gateway response</h2>
            <span className="rounded-full border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-3 py-1 text-xs text-[var(--fyxvo-text-muted)]">
              Live JSON
            </span>
          </div>
          <div className="mt-6">
            <JsonResponseView
              value={responseBody}
              emptyMessage="Enter a key, choose a method, and send a request to inspect the live gateway response."
            />
          </div>
        </div>
      </div>
    </div>
  );
}
