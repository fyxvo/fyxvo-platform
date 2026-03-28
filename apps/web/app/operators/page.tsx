"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button, Notice } from "@fyxvo/ui";
import { AddressLink } from "../../components/address-link";
import { LoadingSkeleton } from "../../components/loading-skeleton";
import { RetryBanner } from "../../components/retry-banner";
import { getOperatorNetwork, registerOperator } from "../../lib/api";
import { protocolAddresses } from "../../lib/public-data";
import type { OperatorNetworkSummary, OperatorRegistration } from "../../lib/types";

const REGION_OPTIONS = [
  { value: "us-east-1", label: "US East (N. Virginia)" },
  { value: "eu-west-1", label: "EU West (Ireland)" },
  { value: "ap-southeast-1", label: "Asia Pacific (Singapore)" },
  { value: "other", label: "Other" }
] as const;

const INITIAL_FORM: {
  endpoint: string;
  operatorWalletAddress: string;
  name: string;
  region: string;
  contact: string;
} = {
  endpoint: "",
  operatorWalletAddress: "",
  name: "",
  region: REGION_OPTIONS[0].value,
  contact: ""
};

export default function OperatorsPage() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [networkLoading, setNetworkLoading] = useState(true);
  const [submitted, setSubmitted] = useState<OperatorRegistration | null>(null);
  const [network, setNetwork] = useState<OperatorNetworkSummary | null>(null);

  async function loadNetwork() {
    setNetworkLoading(true);
    setNetworkError(null);

    try {
      const summary = await getOperatorNetwork();
      setNetwork(summary);
    } catch (loadError) {
      setNetworkError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load the current operator network."
      );
    } finally {
      setNetworkLoading(false);
    }
  }

  useEffect(() => {
    void loadNetwork();
    const interval = window.setInterval(() => {
      void loadNetwork();
    }, 60_000);

    return () => window.clearInterval(interval);
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await registerOperator({
        endpoint: form.endpoint.trim(),
        operatorWalletAddress: form.operatorWalletAddress.trim(),
        name: form.name.trim(),
        region: form.region,
        contact: form.contact.trim()
      });

      setSubmitted(response.item);
      setForm(INITIAL_FORM);
      void loadNetwork();
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Unable to submit the operator registration."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <p className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-brand)]">Operators</p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight text-[var(--fyxvo-text)]">
        Join the Fyxvo operator network
      </h1>
      <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--fyxvo-text-soft)]">
        Fyxvo is live on Solana devnet with managed infrastructure today, and this operator layer
        is the path toward external node participation. Operators run reliable Solana RPC
        infrastructure, route gateway traffic, and earn a share of request fees as the network
        opens up.
      </p>

      <div className="mt-10 grid gap-5 lg:grid-cols-2">
        <div className="rounded-[2rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-6">
          <h2 className="text-2xl font-semibold text-[var(--fyxvo-text)]">What operators do</h2>
          <p className="mt-4 text-sm leading-7 text-[var(--fyxvo-text-soft)]">
            Operators provide healthy Solana RPC endpoints to the relay gateway. The gateway
            already supports multiple upstream nodes with failover and circuit breaking, so
            approved operators can be added to the live node pool without changing the request path
            for developers.
          </p>
          <p className="mt-4 text-sm leading-7 text-[var(--fyxvo-text-soft)]">
            Fyxvo routes 80 percent of request fees to node operators, 10 percent to the protocol
            treasury, and 10 percent to the infrastructure fund. The revenue split is already part
            of the protocol model, while the operator marketplace is opening in stages.
          </p>
          <div className="mt-6 space-y-3 text-sm text-[var(--fyxvo-text-soft)]">
            <p>
              Operator registry: <AddressLink address={protocolAddresses.operatorRegistry} chars={8} />
            </p>
            <p>
              Program ID: <AddressLink address={protocolAddresses.programId} chars={8} />
            </p>
            <p>
              Managed operator:{" "}
              <AddressLink address={protocolAddresses.managedOperatorWallet} chars={8} />
            </p>
          </div>
        </div>

        <div className="rounded-[2rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-6">
          <h2 className="text-2xl font-semibold text-[var(--fyxvo-text)]">How onboarding works</h2>
          <p className="mt-4 text-sm leading-7 text-[var(--fyxvo-text-soft)]">
            Submit a node endpoint, wallet, region, and contact email. The team reviews endpoint
            quality, checks the operator against the current devnet rollout requirements, and then
            approves the registration into the active upstream pool.
          </p>
          <p className="mt-4 text-sm leading-7 text-[var(--fyxvo-text-soft)]">
            The initial registration does not require a wallet signature. Approval adds the node to
            the gateway pool and the authenticated operator dashboard shows whether the registration
            is still pending review or already active in the network.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild variant="secondary">
              <Link href="/operators/dashboard">Open operator dashboard</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/docs">Read network docs</Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-10 grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div className="rounded-[2rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-6 sm:p-8">
          <h2 className="text-2xl font-semibold text-[var(--fyxvo-text)]">
            Register your operator node
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--fyxvo-text-soft)]">
            This form creates a live operator registration in the Fyxvo control plane. Once the
            team approves it, the gateway can start routing traffic to the endpoint.
          </p>

          <div className="mt-6">
            {submitted ? (
              <Notice tone="success">
                Registration {submitted.id} was received with status {submitted.status}. Fyxvo will
                review the node, contact {submitted.contact}, and activate the endpoint once it
                passes onboarding review.
              </Notice>
            ) : null}

            {error ? <Notice tone="danger">{error}</Notice> : null}

            <form className="mt-5 grid gap-5 md:grid-cols-2" onSubmit={(event) => void handleSubmit(event)}>
              <label className="block md:col-span-2">
                <span className="text-sm font-medium text-[var(--fyxvo-text)]">Node endpoint URL</span>
                <input
                  required
                  type="url"
                  placeholder="https://rpc.your-operator.net"
                  value={form.endpoint}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, endpoint: event.target.value }))
                  }
                  className="mt-2 h-11 w-full rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 text-sm text-[var(--fyxvo-text)] outline-none focus:border-[var(--fyxvo-brand)]"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-[var(--fyxvo-text)]">Display name</span>
                <input
                  required
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  className="mt-2 h-11 w-full rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 text-sm text-[var(--fyxvo-text)] outline-none focus:border-[var(--fyxvo-brand)]"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-[var(--fyxvo-text)]">Region</span>
                <select
                  value={form.region}
                  onChange={(event) => setForm((current) => ({ ...current, region: event.target.value }))}
                  className="mt-2 h-11 w-full rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 text-sm text-[var(--fyxvo-text)] outline-none focus:border-[var(--fyxvo-brand)]"
                >
                  {REGION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block md:col-span-2">
                <span className="text-sm font-medium text-[var(--fyxvo-text)]">Operator wallet address</span>
                <input
                  required
                  value={form.operatorWalletAddress}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      operatorWalletAddress: event.target.value
                    }))
                  }
                  className="mt-2 h-11 w-full rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 text-sm text-[var(--fyxvo-text)] outline-none focus:border-[var(--fyxvo-brand)]"
                />
              </label>

              <label className="block md:col-span-2">
                <span className="text-sm font-medium text-[var(--fyxvo-text)]">Contact email</span>
                <input
                  required
                  type="email"
                  value={form.contact}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, contact: event.target.value }))
                  }
                  className="mt-2 h-11 w-full rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 text-sm text-[var(--fyxvo-text)] outline-none focus:border-[var(--fyxvo-brand)]"
                />
              </label>

              <div className="flex flex-wrap gap-3 md:col-span-2">
                <Button type="submit" loading={submitting} disabled={submitting}>
                  Submit registration
                </Button>
                <Button asChild variant="secondary">
                  <Link href="/operators/dashboard">View operator status</Link>
                </Button>
              </div>
            </form>
          </div>
        </div>

        <div className="rounded-[2rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-6 sm:p-8">
          <h2 className="text-2xl font-semibold text-[var(--fyxvo-text)]">Live operator network</h2>
          <p className="mt-3 text-sm leading-6 text-[var(--fyxvo-text-soft)]">
            This view refreshes every 60 seconds and combines the active gateway node pool with the
            total operator count currently recorded in the on-chain registry.
          </p>

          {networkError ? <div className="mt-5"><RetryBanner message={networkError} onRetry={() => void loadNetwork()} /></div> : null}

          {networkLoading && !network ? (
            <div className="mt-6 space-y-4">
              <LoadingSkeleton className="h-20 rounded-2xl" />
              <LoadingSkeleton className="h-16 rounded-2xl" />
              <LoadingSkeleton className="h-16 rounded-2xl" />
            </div>
          ) : null}

          {network ? (
            <div className="mt-6 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">
                    Active operators
                  </p>
                  <p className="mt-2 text-3xl font-semibold text-[var(--fyxvo-text)]">
                    {network.activeOperatorCount}
                  </p>
                </div>
                <div className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">
                    On-chain registry total
                  </p>
                  <p className="mt-2 text-3xl font-semibold text-[var(--fyxvo-text)]">
                    {network.totalRegistered}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4">
                <p className="text-sm font-medium text-[var(--fyxvo-text)]">Approved operators</p>
                {network.operators.length === 0 ? (
                  <p className="mt-3 text-sm leading-6 text-[var(--fyxvo-text-soft)]">
                    The network is still running on managed infrastructure only. Approved external
                    operators will appear here as the active node pool expands.
                  </p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {network.operators.map((operator) => (
                      <div
                        key={`${operator.name}-${operator.endpointHost}`}
                        className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-4"
                      >
                        <p className="font-medium text-[var(--fyxvo-text)]">{operator.name}</p>
                        <p className="mt-1 text-sm text-[var(--fyxvo-text-soft)]">
                          {operator.region} · {operator.endpointHost}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
