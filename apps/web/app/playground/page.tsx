export default function PlaygroundPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <h1 className="text-3xl font-bold tracking-tight text-[var(--fyxvo-text)]">Playground</h1>
      <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--fyxvo-text-soft)]">
        The playground is where you send live JSON-RPC requests through the Fyxvo relay, inspect
        responses, test the priority path, and validate whether an API key has the right scopes.
      </p>
      <div className="mt-8 rounded-3xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-6">
        <h2 className="text-xl font-semibold text-[var(--fyxvo-text)]">What it is for</h2>
        <ul className="mt-4 space-y-3 text-sm leading-6 text-[var(--fyxvo-text-soft)]">
          <li>Testing `rpc.fyxvo.com/rpc` and `rpc.fyxvo.com/priority` without writing app code first</li>
          <li>Verifying JSON-RPC method behavior and response shape with a live API key</li>
          <li>Checking funding and scope issues before they affect production traffic</li>
          <li>Running simulation-mode requests when you need a safer preview path</li>
        </ul>
      </div>
    </div>
  );
}
