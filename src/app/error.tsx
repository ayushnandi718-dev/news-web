"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto max-w-md px-4 py-20 text-center">
      <h1 className="text-xl font-black text-brand-ink">Something went wrong</h1>
      <p className="mt-2 text-sm text-slate-600">
        We could not load this section. External sources or the database may be temporarily unavailable.
      </p>
      <button
        onClick={reset}
        className="mt-5 rounded bg-brand px-5 py-2 text-sm font-bold text-white hover:bg-brand-dark"
      >
        Try again
      </button>
    </main>
  );
}
