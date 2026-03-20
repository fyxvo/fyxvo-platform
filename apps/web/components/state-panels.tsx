import Link from "next/link";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Notice, Skeleton } from "@fyxvo/ui";
import { AlertIcon, SparklesIcon, WalletIcon } from "./icons";

export function AuthGate({
  title = "Connect a wallet to continue.",
  body = "Wallet authentication keeps project activation, funding, API key management, and analytics tied to the same session boundary without exposing private keys."
}: {
  readonly title?: string;
  readonly body?: string;
}) {
  return (
    <Notice tone="brand" title={title} icon={<WalletIcon className="h-4 w-4" />}>
      {body}
    </Notice>
  );
}

export function ErrorPanel({
  title = "Something went wrong",
  message,
  details,
  retry,
}: {
  title?: string;
  message?: string;
  details?: string;
  retry?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-6 text-center">
      <AlertIcon className="mx-auto mb-3 h-8 w-8 text-rose-400" />
      <h3 className="font-medium text-[var(--fyxvo-text)]">{title}</h3>
      {message && <p className="mt-1 text-sm text-[var(--fyxvo-text-muted)]">{message}</p>}
      {details && <p className="mt-2 text-xs text-[var(--fyxvo-text-muted)] italic">{details}</p>}
      {retry && (
        <button
          onClick={retry}
          className="mt-4 rounded-lg border border-[var(--fyxvo-border)] px-4 py-2 text-sm text-[var(--fyxvo-text-muted)] hover:text-[var(--fyxvo-text)] transition-colors"
        >
          Try again
        </button>
      )}
    </div>
  );
}

export function LoadingGrid() {
  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={index} className="fyxvo-surface border-white/5">
          <CardHeader>
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-9 w-40" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function EmptyProjectState() {
  return (
    <Card className="fyxvo-surface border-white/5">
      <CardHeader>
        <CardTitle>No projects connected yet</CardTitle>
        <CardDescription>
          Start by creating one project from the dashboard. Once the activation transaction confirms, funding, API keys, request logs, and analytics all unlock from the same place.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-3">
        <Button asChild variant="secondary">
          <Link href="/docs">Open quickstart</Link>
        </Button>
        <Button asChild variant="ghost">
          <Link href="/funding">Review funding flow</Link>
        </Button>
        <Button asChild variant="ghost">
          <Link href="/contact">Get alpha support</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export function PremiumCallout() {
  return (
    <Notice tone="neutral" title="Designed for devnet operations" icon={<SparklesIcon className="h-4 w-4" />}>
      The interface stays opinionated, calm, and operational so engineering, operator, and treasury work can move through one product instead of a stitched admin panel.
    </Notice>
  );
}
