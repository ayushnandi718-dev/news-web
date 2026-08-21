const TICK_MS = 60_000;

const globalForSched = globalThis as unknown as {
  newsSchedulerStarted?: boolean;
  newsSchedulerTimer?: ReturnType<typeof setInterval>;
};

async function maintenanceTick(): Promise<void> {
  try {
    const { expireBreakingNews, publishScheduled, transitionLifecycle } = await import(
      "./jobs/maintenance"
    );
    await expireBreakingNews();
    await publishScheduled();
    await transitionLifecycle();
  } catch (err) {
    console.error("[scheduler] maintenance tick failed:", err);
  }
}

async function ingestionTick(): Promise<void> {
  try {
    const { runDueSources } = await import("./ingestion/pipeline");
    await runDueSources();
  } catch (err) {
    console.error("[scheduler] ingestion tick failed:", err);
  }
}

export function startScheduler(): void {
  if (globalForSched.newsSchedulerStarted) return;
  globalForSched.newsSchedulerStarted = true;

  globalForSched.newsSchedulerTimer = setInterval(() => {
    void maintenanceTick();
    void ingestionTick();
  }, TICK_MS);

  console.log(`[scheduler] started: ingestion + maintenance every ${TICK_MS / 1000}s`);
}

export function stopScheduler(): void {
  if (globalForSched.newsSchedulerTimer) {
    clearInterval(globalForSched.newsSchedulerTimer);
    globalForSched.newsSchedulerTimer = undefined;
  }
  globalForSched.newsSchedulerStarted = false;
}
