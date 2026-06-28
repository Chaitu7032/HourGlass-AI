"use client";

import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Moon,
  Sun,
  Zap,
  Brain,
  Coffee,
  Calendar,
  Gauge,
  Bell,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  ExecutionProfile,
  WorkingDays,
  BreakDuration,
  DeepWorkWindow,
  EnergyProfileType,
  Chronotype,
  WeekendWork,
  InterruptionLevel,
  WorkStyle,
  CommitmentStyle,
  NotificationPreference,
  StressTolerance,
  RecoveryHours,
} from "@/types/execution-profile";
import { createEmptyExecutionProfile } from "@/types/execution-profile";

interface StepConfig {
  id: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
}

const STEPS: StepConfig[] = [
  { id: "schedule", title: "Work Schedule", subtitle: "When do you work?", icon: Calendar },
  { id: "hours", title: "Daily Hours", subtitle: "Your workday rhythm", icon: Clock },
  { id: "energy", title: "Energy Profile", subtitle: "Your peak performance", icon: Zap },
  { id: "environment", title: "Work Environment", subtitle: "Your context", icon: Coffee },
  { id: "psychology", title: "Psychology", subtitle: "How you work best", icon: Brain },
  { id: "review", title: "Review", subtitle: "Confirm your profile", icon: CheckCircle2 },
];

const WEEKDAYS: Array<{ value: WorkingDays; label: string }> = [
  { value: "monday", label: "Mon" },
  { value: "tuesday", label: "Tue" },
  { value: "wednesday", label: "Wed" },
  { value: "thursday", label: "Thu" },
  { value: "friday", label: "Fri" },
  { value: "saturday", label: "Sat" },
  { value: "sunday", label: "Sun" },
];

const BREAK_OPTIONS: Array<{ value: BreakDuration; label: string }> = [
  { value: "15min", label: "15 min" },
  { value: "30min", label: "30 min" },
  { value: "45min", label: "45 min" },
  { value: "1hour", label: "1 hour" },
  { value: "custom", label: "Custom" },
];

const ENERGY_TYPES: Array<{ value: EnergyProfileType; label: string; icon: LucideIcon }> = [
  { value: "morning", label: "Morning", icon: Sun },
  { value: "afternoon", label: "Afternoon", icon: Sun },
  { value: "night", label: "Night", icon: Moon },
  { value: "mixed", label: "Mixed", icon: Zap },
];

const CHRONOTYPES: Array<{ value: Chronotype; label: string; icon: LucideIcon }> = [
  { value: "early_bird", label: "Early Bird", icon: Sun },
  { value: "balanced", label: "Balanced", icon: Zap },
  { value: "night_owl", label: "Night Owl", icon: Moon },
];

const WEEKEND_OPTIONS: Array<{ value: WeekendWork; label: string }> = [
  { value: "never", label: "Never" },
  { value: "saturday_only", label: "Saturday only" },
  { value: "sunday_only", label: "Sunday only" },
  { value: "both", label: "Both days" },
  { value: "flexible", label: "Flexible" },
];

const INTERRUPTION_OPTIONS: Array<{ value: InterruptionLevel; label: string }> = [
  { value: "rarely", label: "Rarely" },
  { value: "sometimes", label: "Sometimes" },
  { value: "frequently", label: "Frequently" },
  { value: "constantly", label: "Constantly" },
];

const WORK_STYLES: Array<{ value: WorkStyle; label: string }> = [
  { value: "student", label: "Student" },
  { value: "software_engineer", label: "Software Engineer" },
  { value: "researcher", label: "Researcher" },
  { value: "founder", label: "Founder" },
  { value: "freelancer", label: "Freelancer" },
  { value: "corporate", label: "Corporate" },
  { value: "custom", label: "Custom" },
];

const COMMITMENT_STYLES: Array<{ value: CommitmentStyle; label: string }> = [
  { value: "optimistically", label: "Optimistically" },
  { value: "realistically", label: "Realistically" },
  { value: "conservatively", label: "Conservatively" },
  { value: "not_sure", label: "Not sure" },
];

const NOTIFICATION_OPTIONS: Array<{ value: NotificationPreference; label: string }> = [
  { value: "minimal", label: "Minimal" },
  { value: "balanced", label: "Balanced" },
  { value: "aggressive", label: "Aggressive" },
  { value: "ai_decides", label: "AI decides" },
];

const DEEP_WORK_OPTIONS: Array<{ value: DeepWorkWindow; label: string }> = [
  { value: "morning", label: "Morning (6-10 AM)" },
  { value: "afternoon", label: "Afternoon (1-4 PM)" },
  { value: "evening", label: "Evening (5-8 PM)" },
  { value: "night", label: "Night (9-11 PM)" },
  { value: "custom", label: "Custom time range" },
];

interface ExecutionProfileFormProps {
  initialProfile?: Partial<ExecutionProfile>;
  onSave: (profile: ExecutionProfile) => Promise<void>;
  onSkip?: () => void;
}

export function ExecutionProfileForm({ initialProfile, onSave, onSkip }: ExecutionProfileFormProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [profile, setProfile] = useState<ExecutionProfile>(() => ({
    ...createEmptyExecutionProfile(),
    ...initialProfile,
  }));

  const isComplete = currentStep >= STEPS.length;

  const updateField = useCallback(<K extends keyof ExecutionProfile>(
    key: K,
    value: ExecutionProfile[K]
  ) => {
    setProfile((prev) => ({ ...prev, [key]: value }));
  }, []);

  const toggleDay = useCallback((day: WorkingDays) => {
    setProfile((prev) => {
      const exists = prev.workingDays.includes(day);
      return {
        ...prev,
        workingDays: exists
          ? prev.workingDays.filter((d) => d !== day)
          : [...prev.workingDays, day],
      };
    });
  }, []);

  const canProceed = useMemo(() => {
    switch (currentStep) {
      case 0: // Schedule
        return profile.workingDays.length > 0;
      case 1: // Hours
        return profile.workStartTime && profile.workEndTime && profile.productiveHours > 0;
      case 2: // Energy
        return profile.energyProfileType && profile.chronotype && profile.deepWorkWindow;
      case 3: // Environment
        return profile.interruptionLevel && profile.workStyle;
      case 4: // Psychology
        return profile.commitmentStyle && profile.stressTolerance && profile.recoveryHours;
      default:
        return false;
    }
  }, [currentStep, profile]);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      void handleSave();
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const completeProfile: ExecutionProfile = {
        ...profile,
        profileComplete: true,
        lastUpdated: new Date().toISOString(),
      };
      await onSave(completeProfile);
      // Advance to the success screen
      setCurrentStep(STEPS.length);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const renderStep = () => {
    const step = STEPS[currentStep];

    return (
      <motion.div
        key={step.id}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="space-y-6"
      >
        {/* Step header */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-400/10 text-sky-300">
            <step.icon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">{step.title}</h3>
            <p className="text-sm text-white/50">{step.subtitle}</p>
          </div>
        </div>

        {/* Step content */}
        {currentStep === 0 && renderScheduleStep()}
        {currentStep === 1 && renderHoursStep()}
        {currentStep === 2 && renderEnergyStep()}
        {currentStep === 3 && renderEnvironmentStep()}
        {currentStep === 4 && renderPsychologyStep()}
        {currentStep === 5 && renderReviewStep()}
      </motion.div>
    );
  };

  function renderScheduleStep() {
    return (
      <div className="space-y-6">
        <div>
          <p className="mb-3 text-sm font-medium text-white/70">Working Days</p>
          <div className="flex flex-wrap gap-2">
            {WEEKDAYS.map((day) => {
              const selected = profile.workingDays.includes(day.value);
              return (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => toggleDay(day.value)}
                  className={cn(
                    "rounded-xl border px-4 py-3 text-sm font-medium transition-all",
                    selected
                      ? "border-sky-400/50 bg-sky-400/15 text-sky-200 shadow-sm shadow-sky-400/10"
                      : "border-white/10 bg-white/[0.04] text-white/50 hover:border-white/20 hover:text-white/70"
                  )}
                >
                  {day.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="mb-3 text-sm font-medium text-white/70">Do you usually work weekends?</p>
          <div className="flex flex-wrap gap-2">
            {WEEKEND_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => updateField("weekendWork", opt.value)}
                className={cn(
                  "rounded-xl border px-4 py-3 text-sm font-medium transition-all",
                  profile.weekendWork === opt.value
                    ? "border-sky-400/50 bg-sky-400/15 text-sky-200"
                    : "border-white/10 bg-white/[0.04] text-white/50 hover:border-white/20 hover:text-white/70"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  function renderHoursStep() {
    return (
      <div className="space-y-6">
        {/* Work start/end */}
        <div className="grid grid-cols-2 gap-4">
          <label className="block space-y-2">
            <span className="text-sm text-white/65">Start time</span>
            <input
              type="time"
              value={profile.workStartTime}
              onChange={(e) => updateField("workStartTime", e.target.value)}
              className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-white outline-none transition focus:border-sky-400/50"
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm text-white/65">End time</span>
            <input
              type="time"
              value={profile.workEndTime}
              onChange={(e) => updateField("workEndTime", e.target.value)}
              className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-white outline-none transition focus:border-sky-400/50"
            />
          </label>
        </div>

        {/* Break duration */}
        <div>
          <p className="mb-3 text-sm font-medium text-white/70">Daily break duration</p>
          <div className="flex flex-wrap gap-2">
            {BREAK_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => updateField("breakDuration", opt.value)}
                className={cn(
                  "rounded-xl border px-4 py-3 text-sm font-medium transition-all",
                  profile.breakDuration === opt.value
                    ? "border-sky-400/50 bg-sky-400/15 text-sky-200"
                    : "border-white/10 bg-white/[0.04] text-white/50 hover:border-white/20 hover:text-white/70"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {profile.breakDuration === "custom" && (
            <label className="mt-3 block space-y-2">
              <span className="text-sm text-white/65">Custom break minutes</span>
              <input
                type="number"
                min={5}
                max={180}
                value={profile.customBreakMinutes ?? 60}
                onChange={(e) => updateField("customBreakMinutes", Math.max(5, Math.min(180, Number(e.target.value))))}
                className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-white outline-none transition focus:border-sky-400/50"
              />
            </label>
          )}
        </div>

        {/* Productive hours */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-medium text-white/70">Productive hours per day</span>
            <span className="text-2xl font-semibold text-sky-300 tabular-nums">{profile.productiveHours}h</span>
          </div>
          <p className="mb-3 text-xs text-white/40">
            This is NOT your working hours. This is how many hours you can realistically perform focused work.
          </p>
          <input
            type="range"
            min={1}
            max={12}
            value={profile.productiveHours}
            onChange={(e) => updateField("productiveHours", Number(e.target.value))}
            className="h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-sky-400"
          />
          <div className="mt-1 flex justify-between text-xs text-white/30">
            <span>1h</span>
            <span>12h</span>
          </div>
        </div>

        {/* Bed/Wake */}
        <div className="grid grid-cols-2 gap-4">
          <label className="block space-y-2">
            <span className="text-sm text-white/65">Typical bedtime</span>
            <input
              type="time"
              value={profile.bedtime}
              onChange={(e) => updateField("bedtime", e.target.value)}
              className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-white outline-none transition focus:border-sky-400/50"
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm text-white/65">Typical wake time</span>
            <input
              type="time"
              value={profile.wakeTime}
              onChange={(e) => updateField("wakeTime", e.target.value)}
              className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-white outline-none transition focus:border-sky-400/50"
            />
          </label>
        </div>
      </div>
    );
  }

  function renderEnergyStep() {
    return (
      <div className="space-y-6">
        {/* Deep work preference */}
        <div>
          <p className="mb-3 text-sm font-medium text-white/70">Preferred Deep Work Window</p>
          <div className="flex flex-wrap gap-2">
            {DEEP_WORK_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => updateField("deepWorkWindow", opt.value)}
                className={cn(
                  "rounded-xl border px-4 py-3 text-sm font-medium transition-all",
                  profile.deepWorkWindow === opt.value
                    ? "border-sky-400/50 bg-sky-400/15 text-sky-200"
                    : "border-white/10 bg-white/[0.04] text-white/50 hover:border-white/20 hover:text-white/70"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {profile.deepWorkWindow === "custom" && (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="block space-y-2">
                <span className="text-sm text-white/65">Start</span>
                <input
                  type="time"
                  value={profile.customDeepWorkStart ?? "09:00"}
                  onChange={(e) => updateField("customDeepWorkStart", e.target.value)}
                  className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-white outline-none transition focus:border-sky-400/50"
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm text-white/65">End</span>
                <input
                  type="time"
                  value={profile.customDeepWorkEnd ?? "12:00"}
                  onChange={(e) => updateField("customDeepWorkEnd", e.target.value)}
                  className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-white outline-none transition focus:border-sky-400/50"
                />
              </label>
            </div>
          )}
        </div>

        {/* Energy profile */}
        <div>
          <p className="mb-3 text-sm font-medium text-white/70">When are you most productive?</p>
          <div className="flex flex-wrap gap-2">
            {ENERGY_TYPES.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => updateField("energyProfileType", opt.value)}
                className={cn(
                  "flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-all",
                  profile.energyProfileType === opt.value
                    ? "border-sky-400/50 bg-sky-400/15 text-sky-200"
                    : "border-white/10 bg-white/[0.04] text-white/50 hover:border-white/20 hover:text-white/70"
                )}
              >
                <opt.icon className="h-4 w-4" />
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Chronotype */}
        <div>
          <p className="mb-3 text-sm font-medium text-white/70">Chronotype</p>
          <div className="flex flex-wrap gap-2">
            {CHRONOTYPES.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => updateField("chronotype", opt.value)}
                className={cn(
                  "flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-all",
                  profile.chronotype === opt.value
                    ? "border-sky-400/50 bg-sky-400/15 text-sky-200"
                    : "border-white/10 bg-white/[0.04] text-white/50 hover:border-white/20 hover:text-white/70"
                )}
              >
                <opt.icon className="h-4 w-4" />
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  function renderEnvironmentStep() {
    return (
      <div className="space-y-6">
        {/* Work style */}
        <div>
          <p className="mb-3 text-sm font-medium text-white/70">Work Style</p>
          <div className="flex flex-wrap gap-2">
            {WORK_STYLES.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => updateField("workStyle", opt.value)}
                className={cn(
                  "rounded-xl border px-4 py-3 text-sm font-medium transition-all",
                  profile.workStyle === opt.value
                    ? "border-sky-400/50 bg-sky-400/15 text-sky-200"
                    : "border-white/10 bg-white/[0.04] text-white/50 hover:border-white/20 hover:text-white/70"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {profile.workStyle === "custom" && (
            <label className="mt-3 block space-y-2">
              <span className="text-sm text-white/65">Custom work style</span>
              <input
                type="text"
                value={profile.customWorkStyle ?? ""}
                onChange={(e) => updateField("customWorkStyle", e.target.value)}
                className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-white outline-none transition focus:border-sky-400/50"
                placeholder="Describe your work style"
              />
            </label>
          )}
        </div>

        {/* Interruption level */}
        <div>
          <p className="mb-3 text-sm font-medium text-white/70">How often are you interrupted?</p>
          <div className="flex flex-wrap gap-2">
            {INTERRUPTION_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => updateField("interruptionLevel", opt.value)}
                className={cn(
                  "rounded-xl border px-4 py-3 text-sm font-medium transition-all",
                  profile.interruptionLevel === opt.value
                    ? "border-sky-400/50 bg-sky-400/15 text-sky-200"
                    : "border-white/10 bg-white/[0.04] text-white/50 hover:border-white/20 hover:text-white/70"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Notification preference */}
        <div>
          <p className="mb-3 flex items-center gap-2 text-sm font-medium text-white/70">
            <Bell className="h-4 w-4" />
            Preferred reminder style
          </p>
          <div className="flex flex-wrap gap-2">
            {NOTIFICATION_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => updateField("notificationPreference", opt.value)}
                className={cn(
                  "rounded-xl border px-4 py-3 text-sm font-medium transition-all",
                  profile.notificationPreference === opt.value
                    ? "border-sky-400/50 bg-sky-400/15 text-sky-200"
                    : "border-white/10 bg-white/[0.04] text-white/50 hover:border-white/20 hover:text-white/70"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  function renderPsychologyStep() {
    return (
      <div className="space-y-6">
        {/* Commitment style */}
        <div>
          <p className="mb-3 text-sm font-medium text-white/70">How do you normally estimate work?</p>
          <div className="flex flex-wrap gap-2">
            {COMMITMENT_STYLES.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => updateField("commitmentStyle", opt.value)}
                className={cn(
                  "rounded-xl border px-4 py-3 text-sm font-medium transition-all",
                  profile.commitmentStyle === opt.value
                    ? "border-sky-400/50 bg-sky-400/15 text-sky-200"
                    : "border-white/10 bg-white/[0.04] text-white/50 hover:border-white/20 hover:text-white/70"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Stress tolerance */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm font-medium text-white/70">
              <Gauge className="h-4 w-4" />
              Stress tolerance
            </span>
            <span className="text-sm font-medium text-white/60">
              {profile.stressTolerance === 1 ? "Low" : profile.stressTolerance === 2 ? "Medium" : "High"}
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={3}
            value={profile.stressTolerance}
            onChange={(e) => updateField("stressTolerance", Number(e.target.value) as StressTolerance)}
            className="h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-sky-400"
          />
          <div className="mt-1 flex justify-between text-xs text-white/30">
            <span>Low</span>
            <span>High</span>
          </div>
        </div>

        {/* Recovery hours */}
        <div>
          <p className="mb-3 text-sm font-medium text-white/70">
            Minimum recovery hours required after intense work
          </p>
          <div className="flex flex-wrap gap-2">
            {([1, 2, 4, 6, 8] as RecoveryHours[]).map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => updateField("recoveryHours", h)}
                className={cn(
                  "rounded-xl border px-4 py-3 text-sm font-medium transition-all",
                  profile.recoveryHours === h
                    ? "border-sky-400/50 bg-sky-400/15 text-sky-200"
                    : "border-white/10 bg-white/[0.04] text-white/50 hover:border-white/20 hover:text-white/70"
                )}
              >
                {h} {h === 1 ? "hour" : "hours"}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  function renderReviewStep() {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
          <h4 className="mb-4 text-sm font-semibold text-white">Your Execution Profile</h4>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-3">
              <span className="text-sm text-white/60">Working Days</span>
              <span className="text-sm font-medium text-white">
                {profile.workingDays.map((d) => d.charAt(0).toUpperCase() + d.slice(1, 3)).join(", ")}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-3">
              <span className="text-sm text-white/60">Work Hours</span>
              <span className="text-sm font-medium text-white">
                {profile.workStartTime} - {profile.workEndTime}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-3">
              <span className="text-sm text-white/60">Productive Capacity</span>
              <span className="text-sm font-medium text-sky-300">{profile.productiveHours}h/day</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-3">
              <span className="text-sm text-white/60">Deep Work Window</span>
              <span className="text-sm font-medium text-white">{profile.deepWorkWindow}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-3">
              <span className="text-sm text-white/60">Chronotype</span>
              <span className="text-sm font-medium text-white">
                {profile.chronotype === "early_bird" ? "Early Bird" : profile.chronotype === "night_owl" ? "Night Owl" : "Balanced"}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-3">
              <span className="text-sm text-white/60">Work Style</span>
              <span className="text-sm font-medium text-white">{profile.workStyle}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-3">
              <span className="text-sm text-white/60">Stress Tolerance</span>
              <span className="text-sm font-medium text-white">
                {profile.stressTolerance === 1 ? "Low" : profile.stressTolerance === 2 ? "Medium" : "High"}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-3">
              <span className="text-sm text-white/60">Recovery Hours</span>
              <span className="text-sm font-medium text-white">{profile.recoveryHours}h</span>
            </div>
          </div>
        </div>

        {profile.workingDays.length > 0 && (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
              <div>
                <p className="text-sm font-medium text-emerald-200">Profile complete</p>
                <p className="mt-1 text-xs text-emerald-300/70">
                  Your Execution Profile is ready. Hourglass will use this to compute capacity, risk, and recommendations.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (isComplete) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/20">
          <Check className="h-8 w-8 text-emerald-400" />
        </div>
        <h3 className="text-xl font-semibold text-white">Profile saved</h3>
        <p className="mt-2 text-sm text-white/50">
          Your execution profile is now powering your analytics.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-white/40">
            Step {currentStep + 1} of {STEPS.length}
          </span>
          <span className="text-xs text-white/40">
            {Math.round(((currentStep + 1) / STEPS.length) * 100)}%
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-sky-400 to-violet-400"
            initial={{ width: 0 }}
            animate={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-1 overflow-x-auto">
        {STEPS.map((step, index) => (
          <button
            key={step.id}
            type="button"
            onClick={() => setCurrentStep(index)}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition-all",
              index === currentStep
                ? "border-sky-400/30 bg-sky-400/10 text-sky-200"
                : index < currentStep
                  ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                  : "border-white/10 bg-white/[0.04] text-white/40"
            )}
          >
            {index < currentStep ? (
              <Check className="h-3 w-3" />
            ) : (
              <span className="h-3 w-3 rounded-full border border-current text-center leading-[10px]">
                {index + 1}
              </span>
            )}
            <span className="hidden sm:inline">{step.title}</span>
          </button>
        ))}
      </div>

      {/* Step content */}
      <AnimatePresence mode="wait">{renderStep()}</AnimatePresence>

      {/* Navigation */}
      <div className="flex flex-col gap-3 pt-4">
        {saveError && (
          <p className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">
            {saveError}
          </p>
        )}
        <div className="flex items-center justify-between">
          <div>
            {currentStep > 0 ? (
              <Button
                variant="outline"
                onClick={() => setCurrentStep((s) => s - 1)}
                className="border-white/10"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            ) : onSkip ? (
              <Button variant="outline" onClick={onSkip} className="border-white/10 text-white/50">
                Skip for now
              </Button>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            {currentStep === STEPS.length - 1 ? (
              <Button onClick={() => void handleSave()} disabled={saving} className="min-w-[180px]">
                {saving ? (
                  <span className="flex items-center gap-2">
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Saving profile...
                  </span>
                ) : (
                  <>
                    Save Profile
                    <Check className="h-4 w-4" />
                  </>
                )}
              </Button>
            ) : (
              <Button onClick={handleNext} disabled={!canProceed} className="min-w-[120px]">
                Continue
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
