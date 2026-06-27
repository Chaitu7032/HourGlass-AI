/**
 * Hourglass AI — Structured Logger
 *
 * Provides structured logging with performance timing, mutation tracking,
 * and observability. Logs to console in development and can be extended
 * to send to analytics services in production.
 */

import type { MutationName, MutationCategory, MutationError } from "./types";
import type { PerformanceMetrics } from "./context";

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  module: string;
  message: string;
  data?: Record<string, unknown>;
}

class MutationLogger {
  private logs: LogEntry[] = [];
  private maxLogEntries = 500;
  private isDevelopment = typeof window !== "undefined"
    ? process.env.NODE_ENV === "development"
    : false;

  private createEntry(
    level: LogLevel,
    module: string,
    message: string,
    data?: Record<string, unknown>
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      module,
      message,
      data,
    };
  }

  private log(entry: LogEntry): void {
    this.logs.push(entry);
    if (this.logs.length > this.maxLogEntries) {
      this.logs.shift();
    }

    if (this.isDevelopment) {
      const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.module}]`;
      switch (entry.level) {
        case "error":
          console.error(prefix, entry.message, entry.data ?? "");
          break;
        case "warn":
          console.warn(prefix, entry.message, entry.data ?? "");
          break;
        default:
          console.log(prefix, entry.message, entry.data ?? "");
      }
    }
  }

  // ── Mutation Logging ──────────────────────────────────────────────────────

  mutationStarted(name: MutationName, category: MutationCategory, mutationId: string, data?: unknown): void {
    this.log(this.createEntry("info", "mutation", `${name} started`, {
      mutationId,
      category,
      dataSize: data ? JSON.stringify(data).length : 0,
    }));
  }

  mutationValidated(name: MutationName, mutationId: string, durationMs: number, valid: boolean): void {
    this.log(this.createEntry("debug", "mutation", `${name} validation ${valid ? "passed" : "failed"}`, {
      mutationId,
      durationMs,
      valid,
    }));
  }

  mutationOptimisticUpdate(name: MutationName, mutationId: string, durationMs: number): void {
    this.log(this.createEntry("debug", "mutation", `${name} optimistic update applied`, {
      mutationId,
      durationMs,
    }));
  }

  mutationFirestoreWrite(name: MutationName, mutationId: string, durationMs: number, success: boolean): void {
    this.log(this.createEntry(success ? "info" : "error", "mutation", `${name} Firestore write ${success ? "succeeded" : "failed"}`, {
      mutationId,
      durationMs,
      success,
    }));
  }

  mutationRollback(name: MutationName, mutationId: string, reason: string): void {
    this.log(this.createEntry("warn", "mutation", `${name} rolled back`, {
      mutationId,
      reason,
    }));
  }

  mutationCompleted(name: MutationName, mutationId: string, metrics: PerformanceMetrics): void {
    this.log(this.createEntry("info", "mutation", `${name} completed`, {
      mutationId,
      totalMs: metrics.totalMs,
      validationMs: metrics.validationMs,
      optimisticUpdateMs: metrics.optimisticUpdateMs,
      firestoreWriteMs: metrics.firestoreWriteMs,
    }));
  }

  mutationError(name: MutationName, mutationId: string, error: MutationError, metrics: PerformanceMetrics): void {
    this.log(this.createEntry("error", "mutation", `${name} failed: ${error.userMessage}`, {
      mutationId,
      category: error.category,
      retryable: error.retryable,
      totalMs: metrics.totalMs,
      technical: error.technical,
    }));
  }

  // ── Background Task Logging ───────────────────────────────────────────────

  backgroundTaskStarted(taskName: string, taskId: string): void {
    this.log(this.createEntry("info", "background", `Task ${taskName} started`, { taskId }));
  }

  backgroundTaskCompleted(taskName: string, taskId: string, durationMs: number): void {
    this.log(this.createEntry("info", "background", `Task ${taskName} completed`, { taskId, durationMs }));
  }

  backgroundTaskFailed(taskName: string, taskId: string, error: string): void {
    this.log(this.createEntry("error", "background", `Task ${taskName} failed: ${error}`, { taskId }));
  }

  backgroundTaskTimeout(taskName: string, taskId: string, timeoutMs: number): void {
    this.log(this.createEntry("warn", "background", `Task ${taskName} timed out after ${timeoutMs}ms`, { taskId, timeoutMs }));
  }

  // ── Performance Warnings ──────────────────────────────────────────────────

  slowOperation(operation: string, durationMs: number, thresholdMs: number): void {
    if (durationMs > thresholdMs) {
      this.log(this.createEntry("warn", "performance", `Slow operation: ${operation}`, {
        durationMs,
        thresholdMs,
        exceededBy: durationMs - thresholdMs,
      }));
    }
  }

  // ── Navigation Logging ────────────────────────────────────────────────────

  navigationStarted(from: string, to: string): void {
    this.log(this.createEntry("info", "navigation", `Navigating from ${from} to ${to}`));
  }

  navigationCompleted(from: string, to: string, durationMs: number): void {
    this.log(this.createEntry("info", "navigation", `Navigation completed to ${to}`, { from, durationMs }));
    this.slowOperation(`navigation to ${to}`, durationMs, 500);
  }

  // ── Accessors ─────────────────────────────────────────────────────────────

  getRecentLogs(count = 50): LogEntry[] {
    return this.logs.slice(-count);
  }

  clearLogs(): void {
    this.logs = [];
  }
}

/** Singleton logger instance */
export const mutationLogger = new MutationLogger();
