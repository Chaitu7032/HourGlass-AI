/**
 * Hourglass AI — Background Processor
 *
 * Schedules and manages background tasks that run after a successful mutation.
 * Tasks are independent, non-blocking, and have timeout protection.
 * The UI never waits for background processing to complete.
 */

import type { BackgroundTask } from "./types";
import { BACKGROUND_TASK_TIMEOUT } from "./constants";
import { mutationLogger } from "./logger";

interface ScheduledTask {
  task: BackgroundTask;
  abortController: AbortController;
  startTime: number;
  status: "pending" | "running" | "completed" | "failed" | "timed_out";
}

class BackgroundProcessor {
  private scheduledTasks: Map<string, ScheduledTask> = new Map();
  private isProcessing = false;
  private taskQueue: BackgroundTask[] = [];

  /**
   * Schedule background tasks to run after a mutation.
   * Tasks are executed asynchronously and never block the caller.
   */
  scheduleTasks(tasks: BackgroundTask[]): void {
    if (tasks.length === 0) return;

    // Filter out any already-scheduled tasks
    const newTasks = tasks.filter((task) => !this.scheduledTasks.has(task.id));

    if (newTasks.length === 0) return;

    this.taskQueue.push(...newTasks);

    if (!this.isProcessing) {
      this.processNext();
    }
  }

  /**
   * Cancel a specific background task by ID.
   */
  cancelTask(taskId: string): void {
    const scheduled = this.scheduledTasks.get(taskId);
    if (scheduled) {
      scheduled.abortController.abort();
      scheduled.status = "failed";
      this.scheduledTasks.delete(taskId);
    }
    this.taskQueue = this.taskQueue.filter((t) => t.id !== taskId);
  }

  /**
   * Cancel all running background tasks.
   */
  cancelAll(): void {
    for (const [id, scheduled] of this.scheduledTasks) {
      scheduled.abortController.abort();
      scheduled.status = "failed";
      this.scheduledTasks.delete(id);
    }
    this.taskQueue = [];
    this.isProcessing = false;
  }

  /**
   * Get the status of all scheduled tasks.
   */
  getTaskStatus(): Array<{ id: string; name: string; status: string; durationMs?: number }> {
    return Array.from(this.scheduledTasks.entries()).map(([id, scheduled]) => ({
      id,
      name: scheduled.task.name,
      status: scheduled.status,
      durationMs: scheduled.status === "completed" ? Date.now() - scheduled.startTime : undefined,
    }));
  }

  private async processNext(): Promise<void> {
    if (this.isProcessing || this.taskQueue.length === 0) return;

    this.isProcessing = true;

    while (this.taskQueue.length > 0) {
      const task = this.taskQueue.shift()!;
      await this.executeTask(task);
    }

    this.isProcessing = false;
  }

  private async executeTask(task: BackgroundTask): Promise<void> {
    const abortController = new AbortController();
    const startTime = Date.now();
    const timeout = task.timeoutMs ?? BACKGROUND_TASK_TIMEOUT;

    const scheduled: ScheduledTask = {
      task,
      abortController,
      startTime,
      status: "pending",
    };

    this.scheduledTasks.set(task.id, scheduled);

    mutationLogger.backgroundTaskStarted(task.name, task.id);

    // Check dependencies are satisfied (all completed)
    if (task.dependencies && task.dependencies.length > 0) {
      const allDepsMet = task.dependencies.every((depId) => {
        const dep = this.scheduledTasks.get(depId);
        return dep && dep.status === "completed";
      });

      if (!allDepsMet) {
        // Re-queue at the end to wait for dependencies
        this.taskQueue.push(task);
        this.scheduledTasks.delete(task.id);
        return;
      }
    }

    // Set timeout
    const timeoutId = setTimeout(() => {
      abortController.abort();
      scheduled.status = "timed_out";
      mutationLogger.backgroundTaskTimeout(task.name, task.id, timeout);
    }, timeout);

    try {
      scheduled.status = "running";
      await task.execute(abortController.signal);
      clearTimeout(timeoutId);
      scheduled.status = "completed";
      const duration = Date.now() - startTime;
      mutationLogger.backgroundTaskCompleted(task.name, task.id, duration);
      mutationLogger.slowOperation(`background task: ${task.name}`, duration, timeout * 0.5);
    } catch (err) {
      clearTimeout(timeoutId);
      if (abortController.signal.aborted) {
        // Already handled by timeout
      } else {
        scheduled.status = "failed";
        mutationLogger.backgroundTaskFailed(
          task.name,
          task.id,
          err instanceof Error ? err.message : "Unknown error"
        );
      }
    } finally {
      // Keep in map for status but mark as complete
      setTimeout(() => {
        this.scheduledTasks.delete(task.id);
      }, 5_000); // Clean up after 5 seconds
    }
  }
}

/** Singleton background processor instance */
export const backgroundProcessor = new BackgroundProcessor();

/**
 * Create a background task with a unique ID and execution function.
 */
export function createBackgroundTask(
  name: string,
  execute: (signal: AbortSignal) => Promise<void>,
  options?: {
    priority?: BackgroundTask["priority"];
    timeoutMs?: number;
    dependencies?: string[];
  }
): BackgroundTask {
  return {
    id: `${name}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name,
    priority: options?.priority ?? "normal",
    execute,
    timeoutMs: options?.timeoutMs,
    dependencies: options?.dependencies,
  };
}
