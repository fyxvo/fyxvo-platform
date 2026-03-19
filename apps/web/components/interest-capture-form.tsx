"use client";

import { useState } from "react";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Notice } from "@fyxvo/ui";
import { submitInterest } from "../lib/api";
import { trackLaunchEvent } from "../lib/tracking";

const interestAreaOptions = [
  { value: "rpc", label: "Standard RPC" },
  { value: "priority-relay", label: "Priority relay" },
  { value: "analytics", label: "Analytics" },
  { value: "operator-participation", label: "Operator participation" }
] as const;

const requestVolumeOptions = [
  "Under 100k requests per day",
  "100k to 1M requests per day",
  "1M to 10M requests per day",
  "More than 10M requests per day"
] as const;

export function InterestCaptureForm({
  source,
  title = "Request founder follow-up",
  description = "Use this for launch fit, rollout planning, or higher-signal alpha interest. It captures the concrete workload, expected traffic, and the path you want to validate first."
}: {
  readonly source: string;
  readonly title?: string;
  readonly description?: string;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Developer");
  const [team, setTeam] = useState("");
  const [useCase, setUseCase] = useState("");
  const [expectedRequestVolume, setExpectedRequestVolume] = useState<string>(
    requestVolumeOptions[1]
  );
  const [interestAreas, setInterestAreas] = useState<string[]>(["rpc"]);
  const [operatorInterest, setOperatorInterest] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function toggleInterestArea(value: string) {
    setInterestAreas((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value]
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (interestAreas.length === 0) {
      setErrorMessage("Choose at least one area of interest before submitting.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await submitInterest({
        name,
        email,
        role,
        ...(team ? { team } : {}),
        useCase,
        expectedRequestVolume,
        interestAreas,
        operatorInterest,
        source
      });

      void trackLaunchEvent({
        name: "interest_form_submitted",
        source
      });
      setSuccessMessage(response.message);
      setName("");
      setEmail("");
      setRole("Developer");
      setTeam("");
      setUseCase("");
      setExpectedRequestVolume(requestVolumeOptions[1]);
      setInterestAreas(["rpc"]);
      setOperatorInterest(false);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "The request could not be submitted.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Notice tone="neutral" title="Use this for launch planning">
          This queue is for rollout fit, expected volume, priority-path interest, and managed
          operator conversations. Bugs or support issues belong in the feedback form instead.
        </Notice>
        {successMessage ? (
          <Notice tone="success" title="Request received">
            {successMessage}
          </Notice>
        ) : null}
        {errorMessage ? (
          <Notice tone="danger" title="Submission failed">
            {errorMessage}
          </Notice>
        ) : null}

        <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Jordan Lee"
              required
            />
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="jordan@northwind.dev"
              required
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Role"
              value={role}
              onChange={(event) => setRole(event.target.value)}
              placeholder="Developer"
              required
            />
            <Input
              label="Team"
              value={team}
              onChange={(event) => setTeam(event.target.value)}
              placeholder="Northwind"
            />
          </div>

          <label className="flex flex-col gap-2 text-sm">
            <span className="font-medium text-[var(--fyxvo-text-soft)]">Use case</span>
            <textarea
              className="min-h-32 rounded-[1.6rem] border border-[color:var(--fyxvo-border)] bg-[color:var(--fyxvo-panel-soft)] px-4 py-3 text-[var(--fyxvo-text)] outline-none transition focus:border-brand-400"
              value={useCase}
              onChange={(event) => setUseCase(event.target.value)}
              placeholder="Describe the workload you want to run, what success looks like, and whether you are testing standard RPC, priority relay, analytics visibility, or launch operations."
              required
            />
          </label>

          <label className="flex flex-col gap-2 text-sm">
            <span className="font-medium text-[var(--fyxvo-text-soft)]">Expected request volume</span>
            <select
              className="rounded-[1.6rem] border border-[color:var(--fyxvo-border)] bg-[color:var(--fyxvo-panel-soft)] px-4 py-3 text-[var(--fyxvo-text)] outline-none transition focus:border-brand-400"
              value={expectedRequestVolume}
              onChange={(event) => setExpectedRequestVolume(event.target.value)}
            >
              {requestVolumeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <div className="space-y-3">
            <div className="text-sm font-medium text-[var(--fyxvo-text-soft)]">Interest areas</div>
            <div className="flex flex-wrap gap-3">
              {interestAreaOptions.map((option) => {
                const selected = interestAreas.includes(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => toggleInterestArea(option.value)}
                    className={`rounded-full border px-4 py-2 text-sm transition ${
                      selected
                        ? "border-brand-500/40 bg-brand-500/12 text-brand-200"
                        : "border-[color:var(--fyxvo-border)] bg-[color:var(--fyxvo-panel-soft)] text-[var(--fyxvo-text-muted)] hover:text-[var(--fyxvo-text)]"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="flex items-center gap-3 rounded-[1.4rem] border border-[color:var(--fyxvo-border)] bg-[color:var(--fyxvo-panel-soft)] px-4 py-3 text-sm text-[var(--fyxvo-text-soft)]">
            <input
              type="checkbox"
              checked={operatorInterest}
              onChange={(event) => setOperatorInterest(event.target.checked)}
              className="h-4 w-4 accent-[var(--fyxvo-brand)]"
            />
            We are also interested in managed operator or future operator participation paths.
          </label>

          <Button type="submit" loading={submitting}>
            Request founder follow-up
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
