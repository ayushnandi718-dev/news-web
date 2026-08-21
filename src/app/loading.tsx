export default function Loading() {
  return (
    <main className="mx-auto max-w-6xl animate-pulse px-4 py-6">
      <div className="h-8 w-40 rounded bg-slate-200" />
      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <div className="h-64 rounded-lg bg-slate-200" />
          <div className="h-6 w-3/4 rounded bg-slate-200" />
          <div className="h-4 w-full rounded bg-slate-100" />
          <div className="h-4 w-5/6 rounded bg-slate-100" />
          <div className="h-4 w-2/3 rounded bg-slate-100" />
        </div>
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded bg-slate-100" />
          ))}
        </div>
      </div>
    </main>
  );
}
