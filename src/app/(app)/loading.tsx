/**
 * What you see the instant you click a nav link.
 *
 * Two things fall out of having it. The obvious one: the page paints its shape
 * straight away instead of the browser sitting on the old page while the server
 * talks to Supabase. The less obvious one: <Link> can only prefetch a dynamic
 * route as far as its nearest loading boundary, so without this file there is
 * nothing for Next to prefetch and every navigation starts from cold.
 */
export default function Loading() {
  return (
    <div className="flex animate-pulse flex-col gap-6" aria-hidden>
      <div className="h-8 w-48 rounded-lg bg-surface-muted" />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-[4.5rem] rounded-xl border border-border bg-surface" />
        ))}
      </div>

      <div className="rounded-xl border border-border bg-surface shadow-sm">
        <div className="border-b border-border px-4 py-3 sm:px-5">
          <div className="h-4 w-32 rounded bg-surface-muted" />
        </div>
        <div className="flex flex-col gap-3 p-4 sm:p-5">
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className="h-5 rounded bg-surface-muted" />
          ))}
        </div>
      </div>
    </div>
  );
}
