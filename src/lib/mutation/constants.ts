/**
 * Hourglass AI — Mutation Constants
 *
 * Shared constants, progress stage definitions, cache invalidation rules.
 */

import type { MutationName, CacheInvalidationRule, IntelligenceDependency } from "./types";

// ── Numeric Constants ───────────────────────────────────────────────────────

export const DEFAULT_MUTATION_TIMEOUT = 15_000;
export const DEFAULT_MAX_RETRIES = 2;
export const BACKGROUND_TASK_TIMEOUT = 30_000;
export const NAVIGATION_TIMEOUT = 5_000;
export const RETRY_DELAY_BASE = 1_000;
export const RETRY_DELAY_MAX = 10_000;

export const PROGRESS_STAGES_BY_MUTATION: Record<
  MutationName,
  Array<{ key: string; message: string }>
> = {
  create_commitment: [
    { key: "validating", message: "Validating commitment..." },
    { key: "saving", message: "Saving commitment..." },
    { key: "analyzing_workload", message: "Analyzing workload..." },
    { key: "generating_strategy", message: "Generating execution strategy..." },
    { key: "optimizing_schedule", message: "Optimizing schedule..." },
    { key: "planning_complete", message: "Planning complete" },
  ],
  update_commitment: [
    { key: "validating", message: "Validating changes..." },
    { key: "saving", message: "Updating commitment..." },
    { key: "recalculating", message: "Recalculating analytics..." },
    { key: "update_complete", message: "Update complete" },
  ],
  delete_commitment: [
    { key: "validating", message: "Preparing removal..." },
    { key: "removing", message: "Removing commitment..." },
    { key: "recalculating", message: "Recalculating analytics..." },
    { key: "removal_complete", message: "Removal complete" },
  ],
  complete_commitment: [
    { key: "validating", message: "Recording completion..." },
    { key: "saving", message: "Saving progress..." },
    { key: "updating_score", message: "Updating commitment score..." },
    { key: "complete", message: "Well done! Commitment completed." },
  ],
  save_execution_profile: [
    { key: "validating", message: "Validating profile..." },
    { key: "saving", message: "Saving profile..." },
    { key: "recomputing_capacity", message: "Recomputing capacity..." },
    { key: "recomputing_timeline", message: "Recomputing timeline..." },
    { key: "recomputing_risk", message: "Recomputing risk..." },
    { key: "profile_saved", message: "Profile saved successfully" },
  ],
  update_settings: [
    { key: "validating", message: "Validating settings..." },
    { key: "saving", message: "Saving settings..." },
    { key: "settings_saved", message: "Settings saved" },
  ],
  complete_onboarding: [
    { key: "validating", message: "Validating information..." },
    { key: "saving", message: "Setting up workspace..." },
    { key: "initializing", message: "Initializing AI systems..." },
    { key: "onboarding_complete", message: "Welcome to Hourglass AI!" },
  ],
  sign_out: [
    { key: "cleaning_up", message: "Cleaning up..." },
    { key: "signed_out", message: "Signed out" },
  ],
  update_user_profile: [
    { key: "validating", message: "Validating profile..." },
    { key: "saving", message: "Saving profile..." },
    { key: "profile_updated", message: "Profile updated" },
  ],
};

// ── Cache Invalidation Map ──────────────────────────────────────────────────

export type ChangedField = string;

export const CACHE_INVALIDATION_RULES: CacheInvalidationRule[] = [
  { changedField: "title", invalidates: ["none"], reason: "Title is metadata only" },
  { changedField: "description", invalidates: ["none"], reason: "Description is metadata only" },
  { changedField: "category", invalidates: ["none"], reason: "Category is metadata only" },

  { changedField: "estimatedHours", invalidates: ["capacity", "timeline", "risk", "rescue", "commitment_score"], reason: "Hours affect all calculations" },
  { changedField: "deadline", invalidates: ["timeline", "risk", "rescue"], reason: "Deadline affects timeline and risk" },
  { changedField: "priority", invalidates: ["risk", "rescue", "commitment_score"], reason: "Priority affects risk weighting" },
  { changedField: "complexity", invalidates: ["capacity", "risk"], reason: "Complexity affects capacity planning" },
  { changedField: "completedHours", invalidates: ["capacity", "timeline", "risk", "commitment_score"], reason: "Progress affects all calculations" },

  { changedField: "workingDays", invalidates: ["capacity", "timeline", "risk"], reason: "Schedule affects capacity" },
  { changedField: "workStartTime", invalidates: ["capacity"], reason: "Start time affects daily capacity" },
  { changedField: "workEndTime", invalidates: ["capacity"], reason: "End time affects daily capacity" },
  { changedField: "productiveHours", invalidates: ["capacity", "timeline"], reason: "Productivity affects output" },
  { changedField: "breakDuration", invalidates: ["capacity"], reason: "Breaks affect available time" },
  { changedField: "chronotype", invalidates: ["capacity"], reason: "Chronotype affects scheduling" },
  { changedField: "energyProfileType", invalidates: ["capacity"], reason: "Energy affects peak hours" },

  { changedField: "theme", invalidates: ["none"], reason: "Theme is display only" },
  { changedField: "notificationPreference", invalidates: ["none"], reason: "Notifications don't affect calculation" },
  { changedField: "calendarConnected", invalidates: ["capacity", "timeline"], reason: "Calendar integration affects scheduling" },
];

export function getInvalidatedDependencies(
  changedFields: string[]
): Set<IntelligenceDependency> {
  const deps = new Set<IntelligenceDependency>();
  for (const field of changedFields) {
    for (const rule of CACHE_INVALIDATION_RULES) {
      if (rule.changedField === field) {
        for (const dep of rule.invalidates) {
          deps.add(dep);
        }
      }
    }
  }
  return deps;
}
