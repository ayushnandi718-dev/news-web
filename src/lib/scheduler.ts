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

async function newsletterTick(): Promise<void> {
  try {
    const { maybeSendDailyDigest } = await import("./newsletter");
    await maybeSendDailyDigest();
  } catch (err) {
    console.error("[scheduler] newsletter tick failed:", err);
  }
}

export function startScheduler(): void {
  if (globalForSched.newsSchedulerStarted) return;
  globalForSched.newsSchedulerStarted = true;
  (globalThis as Record<string, unknown>).__schedulerRunning = true;

  globalForSched.newsSchedulerTimer = setInterval(() => {
    void maintenanceTick();
    void ingestionTick();
    void newsletterTick();
  }, TICK_MS);

  console.log(`[scheduler] started: ingestion + maintenance + newsletter every ${TICK_MS / 1000}s`);
}

export function stopScheduler(): void {
  if (globalForSched.newsSchedulerTimer) {
    clearInterval(globalForSched.newsSchedulerTimer);
    globalForSched.newsSchedulerTimer = undefined;
  }
  globalForSched.newsSchedulerStarted = false;
}
