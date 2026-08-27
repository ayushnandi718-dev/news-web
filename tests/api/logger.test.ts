import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createLogger } from "@/lib/logger";

describe("createLogger", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let debugSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates a logger with a tag", () => {
    const logger = createLogger("test");
    expect(typeof logger.info).toBe("function");
    expect(typeof logger.warn).toBe("function");
    expect(typeof logger.error).toBe("function");
    expect(typeof logger.debug).toBe("function");
  });

  it("info() logs a message with tag", () => {
    const logger = createLogger("mytag");
    logger.info("hello world");
    expect(logSpy).toHaveBeenCalledOnce();
    const output = logSpy.mock.calls[0][0] as string;
    expect(output).toContain("[mytag]");
    expect(output).toContain("hello world");
    expect(output).toContain("[INFO]");
  });

  it("warn() logs a warning with tag", () => {
    const logger = createLogger("sched");
    logger.warn("tick failed");
    expect(warnSpy).toHaveBeenCalledOnce();
    const output = warnSpy.mock.calls[0][0] as string;
    expect(output).toContain("[sched]");
    expect(output).toContain("[WARN]");
    expect(output).toContain("tick failed");
  });

  it("error() logs an error with tag", () => {
    const logger = createLogger("api");
    logger.error("boom");
    expect(errorSpy).toHaveBeenCalledOnce();
    const output = errorSpy.mock.calls[0][0] as string;
    expect(output).toContain("[api]");
    expect(output).toContain("[ERROR]");
  });

  it("debug() does not log when level is info (default)", () => {
    const logger = createLogger("dbg");
    logger.debug("trace info");
    expect(debugSpy).not.toHaveBeenCalled();
  });

  it("includes context object in output", () => {
    const logger = createLogger("ctx");
    logger.info("with context", { userId: "123", action: "login" });
    expect(logSpy).toHaveBeenCalledOnce();
    const output = logSpy.mock.calls[0][0] as string;
    expect(output).toContain("userId");
    expect(output).toContain("123");
  });

  it("includes ISO timestamp", () => {
    const logger = createLogger("ts");
    logger.info("timed");
    const output = logSpy.mock.calls[0][0] as string;
    // ISO timestamp pattern: 2026-08-25T...
    expect(output).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("handles empty context gracefully", () => {
    const logger = createLogger("empty");
    logger.info("no ctx", {});
    expect(logSpy).toHaveBeenCalledOnce();
  });
});
