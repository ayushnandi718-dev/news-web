export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    process.on("uncaughtException", (err) => {
      const code = (err as NodeJS.ErrnoException)?.code;
      const name = err?.constructor?.name ?? (err as Error)?.name;
      const msg = String(err?.message ?? "");
      const stack = String(err?.stack ?? "");
      if (
        code === "ERR_ASSERTION" ||
        code === "ABORT_ERR" ||
        name === "TimeoutError" ||
        name === "AssertionError" ||
        stack.includes("undici") ||
        msg.includes("false == true")
      ) {
        return;
      }
      console.error("[FATAL] uncaughtException (server kept alive):", err);
    });
    process.on("unhandledRejection", (reason) => {
      console.error("[FATAL] unhandledRejection (server kept alive):", reason);
    });

    const Sentry = await import("@sentry/nextjs");
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      enabled: process.env.NODE_ENV === "production" && !!process.env.SENTRY_DSN,
      tracesSampleRate: 0.1,
      environment: process.env.NODE_ENV,
      release: process.env.npm_package_version,
      beforeSend(event) {
        if (event.request?.cookies) delete event.request.cookies;
        return event;
      },
    });

    if (process.env.INGEST_ENABLED !== "false") {
      const { startScheduler } = await import("./lib/scheduler");
      const { runDueSources } = await import("./lib/ingestion/pipeline");
      startScheduler();
      if (process.env.INGEST_RUN_ON_START === "true") {
        setTimeout(() => {
          runDueSources().catch((e) => console.error("[ingest] initial run failed:", e));
        }, 3000);
      }
    }
  } else if (process.env.NEXT_RUNTIME === "edge") {
    const Sentry = await import("@sentry/nextjs");
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      enabled: process.env.NODE_ENV === "production" && !!process.env.SENTRY_DSN,
      tracesSampleRate: 0.1,
      environment: process.env.NODE_ENV,
      release: process.env.npm_package_version,
    });
  }
}

export const onRequestError = async (err: unknown) => {
  const Sentry = await import("@sentry/nextjs");
  Sentry.captureException(err);
};
