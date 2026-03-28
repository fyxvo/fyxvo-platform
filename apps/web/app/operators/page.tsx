"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, Notice } from "@fyxvo/ui";
import { AddressLink } from "../../components/address-link";
import { API_BASE } from "../../lib/env";
import { protocolAddresses } from "../../lib/public-data";

export default function OperatorsPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/v1/interest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          role: "Operator",
          team: "",
          useCase: form.message.trim(),
          expectedRequestVolume: "Operator onboarding",
          interestAreas: ["operator-participation"],
          operatorInterest: true,
          source: "operators-page",
        }),
      });

      const body = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!response.ok) {
        throw new Error(body.message ?? body.error ?? "Unable to register operator interest.");
      }

      setSubmitted(true);
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Unable to register operator interest."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <p className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-brand)]">Operators</p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight text-[var(--fyxvo-text)]">
        Help build the Fyxvo operator network
      </h1>
      <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--fyxvo-text-soft)]">
        A Fyxvo node operator routes Solana RPC traffic for the network and earns a share of
        request fees. The live devnet deployment still runs on managed infrastructure today, but
        this page is the public onboarding surface for operators who want to participate as the
        protocol matures toward broader external participation.
      </p>

      <div className="mt-10 grid gap-5 lg:grid-cols-2">
        <div className="rounded-[2rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-6">
          <h2 className="text-2xl font-semibold text-[var(--fyxvo-text)]">What operators do</h2>
          <p className="mt-4 text-sm leading-7 text-[var(--fyxvo-text-soft)]">
            Operators are expected to run reliable Solana infrastructure, route RPC and relay
            traffic, surface healthy latency, and earn network fees for doing that work. The
            long-term design is for traffic to move through an operator pool instead of staying on
            one managed stack.
          </p>
          <p className="mt-4 text-sm leading-7 text-[var(--fyxvo-text-soft)]">
            The current live state is simpler. Fyxvo runs managed infrastructure on devnet while
            the operator marketplace, self-service onboarding, and governed authority model are
            still being prepared. Interested operators can register now so the team can shape the
            next phase with real infrastructure partners.
          </p>
        </div>

        <div className="rounded-[2rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-6">
          <h2 className="text-2xl font-semibold text-[var(--fyxvo-text)]">Economics</h2>
          <p className="mt-4 text-sm leading-7 text-[var(--fyxvo-text-soft)]">
            The planned fee split routes 80 percent of request fees to node operators who carry the
            traffic, 10 percent to the protocol treasury, and 10 percent to the infrastructure
            fund. That split describes the network direction as operator participation opens up,
            not a claim that a public operator marketplace is live today.
          </p>
          <p className="mt-4 text-sm leading-7 text-[var(--fyxvo-text-soft)]">
            The current on-chain protocol already exposes the operator registry and managed
            authority addresses on devnet, so interested operators can verify the live deployment
            boundary today.
          </p>
          <div className="mt-6 space-y-3 text-sm text-[var(--fyxvo-text-soft)]">
            <p>
              Operator registry: <AddressLink address={protocolAddresses.operatorRegistry} chars={8} />
            </p>
            <p>
              Program ID: <AddressLink address={protocolAddresses.programId} chars={8} />
            </p>
            <p>
              Protocol authority:{" "}
              <AddressLink address={protocolAddresses.protocolAuthority} chars={8} />
            </p>
          </div>
        </div>
      </div>

      <div className="mt-10 rounded-[2rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-6 sm:p-8">
        <h2 className="text-2xl font-semibold text-[var(--fyxvo-text)]">
          Register operator interest
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--fyxvo-text-soft)]">
          Register here if you run Solana infrastructure and want to participate when external
          operator onboarding opens. This form posts to the live Fyxvo interest endpoint and goes
          straight into the team review workflow.
        </p>

        <div className="mt-6">
          {submitted ? (
            <Notice tone="success">
              Operator interest received. Fyxvo will follow up at {form.email} as the external
              operator phase takes shape.
            </Notice>
          ) : (
            <form className="grid gap-5 md:grid-cols-2" onSubmit={(event) => void handleSubmit(event)}>
              {error ? (
                <div className="md:col-span-2">
                  <Notice tone="danger">{error}</Notice>
                </div>
              ) : null}

              <label className="block">
                <span className="text-sm font-medium text-[var(--fyxvo-text)]">Name</span>
                <input
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  required
                  className="mt-2 h-11 w-full rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 text-sm text-[var(--fyxvo-text)] outline-none focus:border-[var(--fyxvo-brand)]"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-[var(--fyxvo-text)]">Email</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                  required
                  className="mt-2 h-11 w-full rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 text-sm text-[var(--fyxvo-text)] outline-none focus:border-[var(--fyxvo-brand)]"
                />
              </label>

              <label className="block md:col-span-2">
                <span className="text-sm font-medium text-[var(--fyxvo-text)]">
                  Tell us about your infrastructure
                </span>
                <textarea
                  rows={6}
                  value={form.message}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, message: event.target.value }))
                  }
                  required
                  className="mt-2 w-full rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-3 text-sm text-[var(--fyxvo-text)] outline-none focus:border-[var(--fyxvo-brand)]"
                />
              </label>

              <div className="flex flex-wrap gap-3 md:col-span-2">
                <Button type="submit" loading={submitting} disabled={submitting}>
                  Register interest
                </Button>
                <Button asChild variant="secondary">
                  <Link href="/docs">Read the network docs</Link>
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
