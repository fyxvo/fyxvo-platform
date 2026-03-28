import { use } from "react";
import Link from "next/link";
import { Button } from "@fyxvo/ui";

interface InvitePageProps {
  params: Promise<{ token: string }>;
}

export default function InvitePage({ params }: InvitePageProps) {
  const { token } = use(params);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-8 text-center">
        <h1 className="text-xl font-bold text-[var(--fyxvo-text)]">You&apos;re invited!</h1>
        <p className="mt-2 text-sm text-[var(--fyxvo-text-muted)]">
          Accept your invitation to join a Fyxvo project.
        </p>
        <p className="mt-4 font-mono text-xs text-[var(--fyxvo-text-muted)]">Token: {token}</p>
        <div className="mt-6 flex flex-col gap-2">
          <Button asChild variant="primary">
            <Link href="/dashboard">Accept invitation</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/">Decline</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
