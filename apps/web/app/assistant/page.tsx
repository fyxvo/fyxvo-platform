"use client";

import { Card, CardContent } from "@fyxvo/ui";
import { AssistantWorkspace } from "../../components/assistant-workspace";

export default function AssistantPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--fyxvo-text)]">
            Fyxvo Assistant
          </h1>
          <p className="mt-1 text-sm text-[var(--fyxvo-text-muted)]">
            Ask about onboarding, debugging, relay behavior, or your live project state.
          </p>
        </div>

        <Card>
          <CardContent>
            <AssistantWorkspace />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
