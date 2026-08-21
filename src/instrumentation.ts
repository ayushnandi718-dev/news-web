export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.INGEST_ENABLED === "false") return;
  const { startScheduler } = await import("./lib/scheduler");
  const { runDueSources } = await import("./lib/ingestion/pipeline");
  startScheduler();
  if (process.env.INGEST_RUN_ON_START === "true") {
    setTimeout(() => {
      runDueSources().catch((e) => console.error("[ingest] initial run failed:", e));
    }, 3000);
  }
}
