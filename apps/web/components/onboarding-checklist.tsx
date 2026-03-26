"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { Button } from "@fyxvo/ui";
import type { OnChainProjectSnapshot, PortalApiKey } from "../lib/types";
import { WelcomeModal } from "./welcome-modal";
import { updateMe } from "../lib/api";
import { usePortal } from "./portal-provider";

const WELCOME_SEEN_KEY = "fyxvo-welcome-seen";
const WELCOME_EVENT = "fyxvo:welcome-dismissed";

function subscribeWelcome(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleStorage = (event: StorageEvent) => {
    if (!event.key || event.key === WELCOME_SEEN_KEY) {
      onStoreChange();
    }
  };
  const handleWelcomeDismissed = () => onStoreChange();

  window.addEventListener("storage", handleStorage);
  window.addEventListener(WELCOME_EVENT, handleWelcomeDismissed);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(WELCOME_EVENT, handleWelcomeDismissed);
  };
}

function hasSeenWelcome() {
  if (typeof window === "undefined") {
    return false;
  }

  return Boolean(window.localStorage.getItem(WELCOME_SEEN_KEY));
}

interface ChecklistStep {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly done: boolean;
  readonly href?: string;
  readonly actionLabel?: string;
}

function StepRow({ step }: { readonly step: ChecklistStep }) {
  return (
    <div className={`flex items-start gap-4 rounded-xl border px-4 py-3.5 transition ${step.done ? "border-emerald-500/20 bg-emerald-500/5" : "border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)]"}`}>
      <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${step.done ? "border-emerald-500 bg-emerald-500" : "border-[var(--fyxvo-border)]"}`}>
        {step.done && (
          <svg viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2" className="h-3 w-3" aria-hidden="true">
            <path d="M2 6.5l2.5 2.5L10 3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-medium ${step.done ? "text-emerald-700 dark:text-emerald-400" : "text-[var(--fyxvo-text)]"}`}>
          {step.label}
        </p>
        <p className="mt-0.5 text-xs text-[var(--fyxvo-text-muted)]">{step.description}</p>
      </div>
      {!step.done && step.href && step.actionLabel && (
        <Button asChild variant="secondary" size="sm" className="shrink-0">
          <Link href={step.href}>{step.actionLabel}</Link>
        </Button>
      )}
    </div>
  );
}

export function OnboardingChecklist({
  projectId: _projectId,
  projectSlug,
  onchain,
  apiKeys,
  requestCount = 0
}: {
  readonly projectId: string;
  readonly projectSlug: string;
  readonly onchain: OnChainProjectSnapshot | null;
  readonly apiKeys: PortalApiKey[];
  readonly requestCount?: number;
}) {
  const { user, token } = usePortal();
  const isActivated = onchain?.projectAccountExists ?? false;
  const hasFunding = onchain?.balances
    ? parseFloat(onchain.balances.availableSolCredits) > 0 ||
      parseFloat(onchain.balances.totalSolFunded) > 0
    : (onchain?.treasurySolBalance ?? 0) > 0;
  const hasKey = apiKeys.length > 0;
  const hasTraffic = requestCount > 0;

  const steps: ChecklistStep[] = [
    {
      id: "created",
      label: "Project created",
      description: "Your project record exists and has an on-chain PDA assigned.",
      done: true
    },
    {
      id: "activated",
      label: "Activate project on chain",
      description: "Sign the activation transaction to register the project PDA with the Fyxvo program.",
      done: isActivated,
      href: `/projects/${projectSlug}`,
      actionLabel: "Activate"
    },
    {
      id: "funded",
      label: "Fund with SOL",
      description: "Send devnet SOL to the project treasury to enable relay access.",
      done: hasFunding,
      href: "/funding",
      actionLabel: "Fund project"
    },
    {
      id: "key",
      label: "Create an API key",
      description: "Issue a scoped credential for your application to authenticate with the relay.",
      done: hasKey,
      href: "/api-keys",
      actionLabel: "Create key"
    },
    {
      id: "traffic",
      label: "Send your first request",
      description: "POST a JSON-RPC request to the gateway with your API key in the header.",
      done: hasTraffic,
      href: "/docs",
      actionLabel: "View quickstart"
    }
  ];

  const completedCount = steps.filter((s) => s.done).length;
  const allDone = completedCount === steps.length;

  const welcomeSeen = useSyncExternalStore(subscribeWelcome, hasSeenWelcome, () => false);
  const showWelcome = !user?.onboardingDismissed && !welcomeSeen;

  function dismissWelcome() {
    window.localStorage.setItem(WELCOME_SEEN_KEY, "1");
    window.dispatchEvent(new Event(WELCOME_EVENT));
    // Sync dismissed state to server
    if (token) {
      void updateMe({ onboardingDismissed: true, token });
    }
  }

  if (allDone) return null;

  return (
    <>
      {showWelcome && <WelcomeModal onDismiss={dismissWelcome} />}
    <div className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[var(--fyxvo-text)]">Getting started</h3>
          <p className="mt-0.5 text-xs text-[var(--fyxvo-text-muted)]">
            {completedCount} of {steps.length} steps complete
          </p>
        </div>
        <div className="flex items-center gap-1">
          {steps.map((step) => (
            <div
              key={step.id}
              className={`h-1.5 w-6 rounded-full ${step.done ? "bg-emerald-500" : "bg-[var(--fyxvo-border)]"}`}
            />
          ))}
        </div>
      </div>
      <div className="space-y-2">
        {steps.map((step) => (
          <StepRow key={step.id} step={step} />
        ))}
      </div>
    </div>
    </>
  );
}
