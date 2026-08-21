import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-md px-4 py-20 text-center">
      <p className="text-5xl font-black text-slate-300">404</p>
      <h1 className="mt-2 text-xl font-black text-brand-ink">Story not found</h1>
      <p className="mt-2 text-sm text-slate-600">
        This page may have been moved. Try the latest feed or search the archive.
      </p>
      <div className="mt-5 flex justify-center gap-3 text-sm font-semibold">
        <Link href="/" className="rounded bg-brand px-4 py-2 text-white hover:bg-brand-dark">Latest news</Link>
        <Link href="/archive" className="rounded border border-slate-300 px-4 py-2 text-slate-700 hover:border-brand hover:text-brand">
          Browse archive
        </Link>
      </div>
    </main>
  );
}
