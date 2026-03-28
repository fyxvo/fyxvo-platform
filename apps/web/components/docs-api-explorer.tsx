"use client";

import { useMemo, useState } from "react";
import { Button } from "@fyxvo/ui";
import { API_BASE } from "../lib/env";
import { JsonResponseView } from "./json-response-view";

const ENDPOINT_OPTIONS = [
  { label: "Health check", value: "/health", method: "GET", auth: false },
  { label: "Network stats", value: "/v1/network/stats", method: "GET", auth: false },
  { label: "List projects", value: "/v1/projects", method: "GET", auth: true },
  { label: "Analytics overview", value: "/v1/analytics/overview", method: "GET", auth: true },
] as const;

export function DocsApiExplorer() {
  const [jwt, setJwt] = useState("");
  const [endpointValue, setEndpointValue] = useState<(typeof ENDPOINT_OPTIONS)[number]["value"]>(
    "/health"
  );
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<number | null>(null);
  const [responseBody, setResponseBody] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedEndpoint = useMemo(
    () => ENDPOINT_OPTIONS.find((option) => option.value === endpointValue) ?? ENDPOINT_OPTIONS[0],
    [endpointValue]
  );

  async function handleSend() {
    setSubmitting(true);
    setError(null);
    setStatus(null);

    try {
      const response = await fetch(`${API_BASE}${selectedEndpoint.value}`, {
        method: selectedEndpoint.method,
        headers: {
          Accept: "application/json",
          ...(selectedEndpoint.auth && jwt.trim()
            ? { Authorization: `Bearer ${jwt.trim()}` }
            : {}),
        },
      });

      const rawText = await response.text();
      let parsed: unknown = {};
      try {
        parsed = rawText ? JSON.parse(rawText) : {};
      } catch {
        parsed = rawText;
      }
      setStatus(response.status);
      setResponseBody(parsed);
    } catch (requestError) {
      setResponseBody(null);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to contact the selected endpoint."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-[2rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-6 sm:p-8">
      <div className="max-w-2xl">
        <p className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-brand)]">
          API Explorer
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--fyxvo-text)]">
          Send a real request from the docs
        </h2>
        <p className="mt-4 text-sm leading-6 text-[var(--fyxvo-text-soft)]">
          Paste a JWT if you want to test authenticated routes. Public routes can be called without
          a token. Responses are shown below exactly as the live API returns them.
        </p>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-5">
          <label className="block">
            <span className="text-sm font-medium text-[var(--fyxvo-text)]">Endpoint</span>
            <select
              value={selectedEndpoint.value}
              onChange={(event) =>
                setEndpointValue(event.target.value as (typeof ENDPOINT_OPTIONS)[number]["value"])
              }
              className="mt-2 h-11 w-full rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 text-sm text-[var(--fyxvo-text)] outline-none focus:border-[var(--fyxvo-brand)]"
            >
              {ENDPOINT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-[var(--fyxvo-text)]">JWT</span>
            <textarea
              rows={6}
              value={jwt}
              onChange={(event) => setJwt(event.target.value)}
              className="mt-2 w-full rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-3 text-sm text-[var(--fyxvo-text)] outline-none focus:border-[var(--fyxvo-brand)]"
              placeholder="Paste a JWT to call protected routes."
            />
          </label>

          <div className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-3 text-sm text-[var(--fyxvo-text-soft)]">
            This request will call <span className="font-mono text-[var(--fyxvo-text)]">{`${API_BASE}${selectedEndpoint.value}`}</span>.
          </div>

          <Button type="button" onClick={() => void handleSend()} loading={submitting} disabled={submitting}>
            Send request
          </Button>
          {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm font-medium text-[var(--fyxvo-text)]">Response</p>
            {status != null ? (
              <span className="rounded-full border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-3 py-1 text-xs text-[var(--fyxvo-text-muted)]">
                HTTP {status}
              </span>
            ) : null}
          </div>
          <JsonResponseView value={responseBody} emptyMessage="Choose an endpoint and send a request to see live JSON here." />
        </div>
      </div>
    </div>
  );
}
