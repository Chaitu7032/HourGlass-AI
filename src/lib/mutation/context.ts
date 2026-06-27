/**
 * Hourglass AI — Mutation Context & Options
 *
 * Defines the context object and options interface for all mutations.
 */

import type {
  MutationCategory,
  MutationName,
  MutationStatus,
  MutationPhase,
  MutationError,
  BackgroundTask,
  IntelligenceDependency,
} from "./types";

// ── Progress Stages ─────────────────────────────────────────────────────────

export interface ProgressStage {
  key: string;
  message: string;
  status: "pending" | "active" | "completed" | "error";
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
}

// ── Performance Metrics ─────────────────────────────────────────────────────

export interface PerformanceMetrics {
  validationMs: number;
  optimisticUpdateMs: number;
  firestoreWriteMs: number;
  totalMs: number;
  backgroundProcessingMs?: number;
}

// ── Mutation Context ────────────────────────────────────────────────────────

export interface MutationContext<TData = unknown, TSnapshot = unknown> {
  id: string;
  name: MutationName;
  category: MutationCategory;
  initiatedAt: string;
  status: MutationStatus;
  phase: MutationPhase;
  progressMessage: string;
  progressStages: ProgressStage[];
  activeStageIndex: number;
  data: TData;
  previousSnapshot?: TSnapshot;
  error?: MutationError;
  retryCount: number;
  performance: PerformanceMetrics;
  abortController: AbortController;
}

// ── Mutation Options ────────────────────────────────────────────────────────

export interface MutationOptions<TData = unknown, TResult = unknown> {
  name: MutationName;
  category: MutationCategory;
  validate?: (data: TData) => { valid: boolean; error?: string };
  optimisticUpdate: (data: TData) => void;
  rollback: () => void;
  firestoreWrite: (data: TData, signal: AbortSignal) => Promise<TResult>;
  onSuccess?: (result: TResult, data: TData) => void;
  onError?: (error: MutationError, data: TData) => void;
  backgroundTasks?: BackgroundTask[];
  timeoutMs?: number;
  maxRetries?: number;
  requiresNavigation?: boolean;
  navigateTo?: string;
  progressStages?: Omit<ProgressStage, "status">[];
  intelligenceDependencies?: IntelligenceDependency[];
}

// ── Mutation Result ─────────────────────────────────────────────────────────

export interface MutationResult<TData = unknown> {
  success: boolean;
  data?: TData;
  error?: MutationError;
  durationMs: number;
  mutationId: string;
}

// ── Loading State (User-facing) ─────────────────────────────────────────────

export interface LoadingState {
  isMutating: boolean;
  mutationName: MutationName | null;
  status: MutationStatus;
  progressMessage: string;
  progressStages: ProgressStage[];
  error: MutationError | null;
}
