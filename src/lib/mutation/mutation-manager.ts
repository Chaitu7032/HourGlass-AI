/**
 * Mutation Manager — Central pipeline for all Firestore writes.
 */
import type { MutationName, MutationError, ErrorCategory } from "./types";
import type { MutationContext, MutationOptions, MutationResult, ProgressStage, PerformanceMetrics } from "./context";
import { DEFAULT_MUTATION_TIMEOUT, DEFAULT_MAX_RETRIES, RETRY_DELAY_BASE, RETRY_DELAY_MAX, PROGRESS_STAGES_BY_MUTATION } from "./constants";
import { mutationLogger } from "./logger";
import { backgroundProcessor } from "./background-processor";
import { cacheStrategy } from "./cache-strategy";

export class MutationManager {
  private active = new Map<string, MutationContext>();
  private cbs = new Map<string, { onProgress?(s: ProgressStage[], i: number, m: string): void; onComplete?(r: MutationResult): void }>();
  private count = 0;

  async exec<T, R>(data: T, opts: MutationOptions<T, R>, callbacks?: { onProgress?(s: ProgressStage[], i: number, m: string): void; onComplete?(r: MutationResult): void }): Promise<MutationResult> {
    const id = `m-${Date.now()}-${++this.count}-${Math.random().toString(36).slice(2, 6)}`;
    const t0 = Date.now();
    const perf: PerformanceMetrics = { validationMs: 0, optimisticUpdateMs: 0, firestoreWriteMs: 0, totalMs: 0 };
    const res: MutationResult = { success: false, durationMs: 0, mutationId: id };
    if (callbacks) this.cbs.set(id, callbacks);
    mutationLogger.mutationStarted(opts.name, opts.category, id, data);
    const ctx = this.makeCtx(id, data, opts);
    this.active.set(id, ctx);

    try {
      // 1 - Validation
      const v0 = Date.now(); this.setPhase(ctx, "initiated", "validating", 0);
      if (opts.validate) {
        const v = opts.validate(data); perf.validationMs = Date.now() - v0;
        mutationLogger.mutationValidated(opts.name, id, perf.validationMs, v.valid);
        if (!v.valid) return this.fail(ctx, res, this.err("validation", v.error ?? "Validation failed", "invalid", false), perf, opts);
      } else perf.validationMs = Date.now() - v0;

      // 2 - Optimistic update
      const o0 = Date.now(); this.setPhase(ctx, "optimistic_update", "writing", 1);
      try { opts.optimisticUpdate(data); } catch (e) {
        perf.optimisticUpdateMs = Date.now() - o0;
        return this.fail(ctx, res, this.err("unknown", "UI update failed", `${e}`, true), perf, opts);
      }
      perf.optimisticUpdateMs = Date.now() - o0;

      // 3 - Firestore write with retry
      const w0 = Date.now(); this.setPhase(ctx, "firestore_write", "writing", 2);
      const timeout = opts.timeoutMs ?? DEFAULT_MUTATION_TIMEOUT;
      const mr = opts.maxRetries ?? DEFAULT_MAX_RETRIES;
      let wr: R | undefined, wErr: MutationError | undefined, wOk = false;
      for (let att = 0; att <= mr; att++) {
        if (ctx.abortController.signal.aborted) { wErr = this.err("timeout", "Cancelled", "aborted", false); break; }
        try {
          const tp = new Promise<never>((_, rj) => {
            const t = setTimeout(() => rj(new Error("timed out")), timeout);
            ctx.abortController.signal.addEventListener("abort", () => { clearTimeout(t); rj(new Error("aborted")); });
          });
          wr = await Promise.race([opts.firestoreWrite(data, ctx.abortController.signal), tp]);
          wOk = true; break;
        } catch (e) {
          wErr = this.cls(e); ctx.retryCount = att + 1;
          if (att < mr && wErr.retryable) { await new Promise((r) => setTimeout(r, Math.min(RETRY_DELAY_BASE * Math.pow(2, att), RETRY_DELAY_MAX))); continue; }
          break;
        }
      }
      perf.firestoreWriteMs = Date.now() - w0;
      mutationLogger.mutationFirestoreWrite(opts.name, id, perf.firestoreWriteMs, wOk);
      if (!wOk || wErr) {
        try { opts.rollback(); mutationLogger.mutationRollback(opts.name, id, "write failed"); } catch {}
        return this.fail(ctx, res, wErr ?? this.err("unknown", "Write failed", "no error", false), perf, opts);
      }

      // 4 - Success
      ctx.status = "success"; res.success = true; res.data = wr;
      perf.totalMs = Date.now() - t0; res.durationMs = perf.totalMs;
      mutationLogger.mutationCompleted(opts.name, id, perf);
      if (opts.onSuccess && wr !== undefined) try { opts.onSuccess(wr, data); } catch {}
      this.tickProgress(ctx, ctx.progressStages.length - 1);

      // 5 - Background
      ctx.phase = "background_processing";
      if (opts.backgroundTasks?.length) backgroundProcessor.scheduleTasks(opts.backgroundTasks);
      if (opts.intelligenceDependencies?.length) {
        cacheStrategy.invalidate(typeof data === "object" && data !== null ? Object.keys(data as any) : []);
      }

      // 6 - Navigation (non-blocking)
      if (opts.requiresNavigation && opts.navigateTo && typeof window !== "undefined") {
        setTimeout(() => { mutationLogger.navigationStarted(location.pathname, opts.navigateTo!); location.href = opts.navigateTo!; }, 50);
      }

      if (callbacks?.onComplete) callbacks.onComplete(res);
      this.cleanup(id);
      return res;
    } catch (e) { return this.fail(ctx, res, this.cls(e), perf, opts); }
  }

  getLoadingState(mn: MutationName) {
    for (const [, c] of this.active) if (c.name === mn) return { isMutating: true, progressMessage: c.progressMessage, progressStages: c.progressStages };
    return { isMutating: false, progressMessage: "", progressStages: [] };
  }
  cancelAll() { for (const [id, c] of this.active) { c.abortController.abort(); this.active.delete(id); } backgroundProcessor.cancelAll(); }
  getActiveCount() { return this.active.size; }
