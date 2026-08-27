import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: process.env.NODE_ENV === "production" && !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1.0,
  integrations: [
    Sentry.browserTracingIntegration(),
  ],
  environment: process.env.NODE_ENV,
  release: process.env.npm_package_version,
  beforeSend(event) {
    if (event.request?.cookies) delete event.request.cookies;
    return event;
  },
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
