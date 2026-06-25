import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatProbability(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function getRiskColor(probability: number): string {
  if (probability >= 0.75) return "text-red-400";
  if (probability >= 0.5) return "text-orange-400";
  if (probability >= 0.25) return "text-yellow-400";
  return "text-emerald-400";
}

export function getRiskBg(probability: number): string {
  if (probability >= 0.75) return "bg-red-500/20 border-red-500/40";
  if (probability >= 0.5) return "bg-orange-500/20 border-orange-500/40";
  if (probability >= 0.25) return "bg-yellow-500/20 border-yellow-500/40";
  return "bg-emerald-500/20 border-emerald-500/40";
}

export function getRiskLabel(probability: number): string {
  if (probability >= 0.75) return "Critical";
  if (probability >= 0.5) return "High";
  if (probability >= 0.25) return "Moderate";
  return "Low";
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function hoursUntil(deadline: string): number {
  return Math.max(0, (new Date(deadline).getTime() - Date.now()) / 3_600_000);
}

export function daysUntil(deadline: string): number {
  return Math.ceil(hoursUntil(deadline) / 24);
}
