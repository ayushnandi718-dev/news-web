/**
 * Structured logger with context — replaces raw console.log calls.
 * Logs are JSON-parseable in production, human-readable in development.
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  [key: string]: unknown;
}

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const MIN_LEVEL: LogLevel = (process.env.LOG_LEVEL as LogLevel) || "info";

function shouldLog(level: LogLevel): boolean {
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[MIN_LEVEL];
}

function formatMessage(level: LogLevel, tag: string, message: string, ctx?: LogContext): string {
  const ts = new Date().toISOString();
  if (process.env.NODE_ENV === "production") {
    const entry: Record<string, unknown> = { ts, level, tag, msg: message };
    if (ctx && Object.keys(ctx).length > 0) entry.ctx = ctx;
    return JSON.stringify(entry);
  }
  const ctxStr = ctx && Object.keys(ctx).length > 0 ? " " + JSON.stringify(ctx) : "";
  return `${ts} [${level.toUpperCase()}] [${tag}] ${message}${ctxStr}`;
}

function createLogger(tag: string) {
  return {
    debug: (msg: string, ctx?: LogContext) => {
      if (shouldLog("debug")) console.debug(formatMessage("debug", tag, msg, ctx));
    },
    info: (msg: string, ctx?: LogContext) => {
      if (shouldLog("info")) console.log(formatMessage("info", tag, msg, ctx));
    },
    warn: (msg: string, ctx?: LogContext) => {
      if (shouldLog("warn")) console.warn(formatMessage("warn", tag, msg, ctx));
    },
    error: (msg: string, ctx?: LogContext) => {
      if (shouldLog("error")) console.error(formatMessage("error", tag, msg, ctx));
    },
  };
}

export { createLogger };
export type { LogLevel, LogContext };
