export default function VerifyEmailPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-8 text-center">
        <h1 className="text-xl font-bold text-[var(--fyxvo-text)]">Verify your email</h1>
        <p className="mt-2 text-sm text-[var(--fyxvo-text-muted)]">
          Check your inbox for a verification link. Once verified, your email will be confirmed.
        </p>
      </div>
    </div>
  );
}
