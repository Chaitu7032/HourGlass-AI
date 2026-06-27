/**
 * Hourglass AI — Mutation Architecture Types
 *
 * Central type definitions for the mutation pipeline.
 */

// ── Error Classification ────────────────────────────────────────────────────

export type ErrorCategory =
  | "validation"
  | "network"
  | "firestore"
  | "authentication"
  | "permission"
  | "conflict"
  | "timeout"
  | "unknown";

export interface MutationError {
  category: ErrorCategory;
  userMessage: string;
  technical: string;
  retryable: boolean;
  timestamp: string;
  originalError?: unknown;
}

// ── Mutation Status & Phase ─────────────────────────────────────────────────

export type MutationCategory =
  | "commitment"
  | "execution_profile"
  | "user_settings"
  | "onboarding"
  | "calendar"
  | "rescue"
  | "ai_feedback"
  | "user_preferences";

export type MutationName =
  | "create_commitment"
  | "update_commitment"
  | "delete_commitment"
  | "complete_commitment"
  | "save_execution_profile"
  | "update_settings"
  | "complete_onboarding"
  | "sign_out"
  | "update_user_profile";

export type MutationStatus =
  | "idle"
  | "validating"
  | "writing"
  | "success"
  | "error"
  | "rollback";

export type MutationPhase =
  | "initiated"
  | "validated"
  | "optimistic_update"
  | "firestore_write"
  | "background_processing"
  | "completed"
  | "failed";

// ── Intelligence Dependencies ───────────────────────────────────────────────

export type IntelligenceDependency =
  | "capacity"
  | "timeline"
  | "risk"
  | "commitment_score"
  | "future_self"
  | "rescue"
  | "opportunity"
  | "behavior_patterns"
  | "dashboard_hydration"
  | "ai_chief_of_staff"
  | "none";

// ── Background Tasks ────────────────────────────────────────────────────────

export type BackgroundTaskPriority = "critical" | "high" | "normal" | "low";

export interface BackgroundTask {
  id: string;
  name: string;
  priority: BackgroundTaskPriority;
  execute: (signal: AbortSignal) => Promise<void>;
  timeoutMs?: number;
  dependencies?: string[];
}

// ── Cache Invalidation Rules ────────────────────────────────────────────────

export interface CacheInvalidationRule {
  changedField: string;
  invalidates: IntelligenceDependency[];
  reason: string;
}

