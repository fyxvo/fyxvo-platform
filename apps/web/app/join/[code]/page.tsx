import { use } from "react";
import Link from "next/link";
import { Button } from "@fyxvo/ui";

interface JoinPageProps {
  params: Promise<{ code: string }>;
}

export default function JoinPage({ params }: JoinPageProps) {
  const { code } = use(params);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-8 text-center">
        <h1 className="text-xl font-bold text-[var(--fyxvo-text)]">Join Project</h1>
        <p className="mt-2 text-sm text-[var(--fyxvo-text-muted)]">
          Use code <code className="font-mono text-[var(--fyxvo-brand)]">{code}</code> to join.
        </p>
        <div className="mt-6">
          <Button asChild variant="primary">
            <Link href="/dashboard">Continue</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
