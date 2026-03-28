import Link from "next/link";
import { getPublicUpdates } from "../../lib/public-data";

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="h-5 w-5">
      <path d="M18.901 2H22l-6.767 7.733L23.2 22h-6.24l-4.887-7.447L5.555 22H2.455l7.238-8.273L.8 2h6.398l4.418 6.738L18.901 2Zm-1.087 18h1.718L6.267 3.896H4.424L17.814 20Z" />
    </svg>
  );
}

function DiscordIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="h-5 w-5">
      <path d="M20.317 4.369A19.791 19.791 0 0 0 15.458 3a13.215 13.215 0 0 0-.676 1.374 18.27 18.27 0 0 0-5.565 0A13.036 13.036 0 0 0 8.541 3a19.736 19.736 0 0 0-4.86 1.37C.533 9.042-.319 13.58.107 18.057a19.93 19.93 0 0 0 5.993 2.943 14.34 14.34 0 0 0 1.285-2.11 12.98 12.98 0 0 1-2.023-.98c.17-.12.337-.246.498-.375 3.904 1.821 8.135 1.821 11.993 0 .163.135.33.261.499.375-.648.384-1.328.712-2.027.981.37.75.801 1.454 1.287 2.109a19.862 19.862 0 0 0 6-2.944c.5-5.186-.85-9.684-3.295-13.688ZM8.02 15.331c-1.17 0-2.13-1.068-2.13-2.381 0-1.314.94-2.382 2.13-2.382 1.2 0 2.148 1.078 2.13 2.382 0 1.313-.94 2.381-2.13 2.381Zm7.96 0c-1.17 0-2.13-1.068-2.13-2.381 0-1.314.94-2.382 2.13-2.382 1.2 0 2.148 1.078 2.13 2.382 0 1.313-.93 2.381-2.13 2.381Z" />
    </svg>
  );
}

export default async function UpdatesPage() {
  const livePosts = await getPublicUpdates();

  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <h1 className="text-3xl font-bold tracking-tight text-[var(--fyxvo-text)]">Updates</h1>
      <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--fyxvo-text-soft)]">
        Product and rollout notes for the live devnet deployment. When admin-authored update posts
        exist, they appear here automatically.
      </p>
      {livePosts.length > 0 ? (
        <div className="mt-8 space-y-6">
          {livePosts.map((u) => (
            <Link
              key={u.slug}
              href={`/updates/${u.slug}`}
              className="block rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-5 transition-colors hover:border-[var(--fyxvo-brand)]"
            >
              <p className="text-xs text-[var(--fyxvo-text-muted)]">
                {(u.publishedAt ?? "").slice(0, 10) || "Unscheduled"}
              </p>
              <h2 className="mt-1 font-semibold text-[var(--fyxvo-text)]">{u.title}</h2>
              <p className="mt-1 text-sm text-[var(--fyxvo-text-muted)]">{u.summary}</p>
            </Link>
          ))}
        </div>
      ) : (
        <div className="mt-8 rounded-3xl border border-dashed border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-8">
          <h2 className="text-xl font-semibold text-[var(--fyxvo-text)]">
            No published updates yet
          </h2>
          <p className="mt-3 text-sm leading-6 text-[var(--fyxvo-text-soft)]">
            Product updates will appear here as they are published. For live rollout notes and
            launch announcements, follow Fyxvo on X and join the Discord server.
          </p>
          <div className="mt-5 flex items-center gap-3">
            <a
              href="https://x.com/fyxvo"
              target="_blank"
              rel="noreferrer"
              aria-label="Fyxvo on X"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] text-[var(--fyxvo-text-muted)] transition-colors hover:border-[var(--fyxvo-brand)] hover:text-[var(--fyxvo-text)]"
            >
              <span className="sr-only">Fyxvo on X</span>
              <XIcon />
            </a>
            <a
              href="https://discord.gg/Uggu236Jgj"
              target="_blank"
              rel="noreferrer"
              aria-label="Fyxvo on Discord"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] text-[var(--fyxvo-text-muted)] transition-colors hover:border-[var(--fyxvo-brand)] hover:text-[var(--fyxvo-text)]"
            >
              <span className="sr-only">Fyxvo on Discord</span>
              <DiscordIcon />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
