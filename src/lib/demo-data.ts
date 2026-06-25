import type { DemoScenario, Task } from "@/types";
import { generateId } from "@/lib/utils";

const now = new Date();

function deadlineInDays(days: number): string {
  const d = new Date(now);
  d.setDate(d.getDate() + days);
  d.setHours(23, 59, 0, 0);
  return d.toISOString();
}

/** Hackathon demo scenario — student overload */
export const DEMO_TASKS: Task[] = [
  {
    id: "task-exam",
    title: "CS Final Exam",
    description: "Data Structures & Algorithms — comprehensive final",
    deadline: deadlineInDays(7),
    estimatedHours: 18,
    completedHours: 2,
    priority: "critical",
    category: "exam",
    complexity: 9,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  },
  {
    id: "task-interview",
    title: "Google SWE Interview",
    description: "Technical phone screen — system design + coding",
    deadline: deadlineInDays(5),
    estimatedHours: 12,
    completedHours: 1,
    priority: "critical",
    category: "interview",
    complexity: 8,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  },
  {
    id: "task-hackathon",
    title: "VIBE2SHIP Hackathon Submission",
    description: "Hourglass AI — full demo + pitch deck",
    deadline: deadlineInDays(4),
    estimatedHours: 16,
    completedHours: 4,
    priority: "high",
    category: "hackathon",
    complexity: 7,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  },
  {
    id: "task-assignment",
    title: "ML Assignment — Neural Networks",
    description: "Implement backprop from scratch + report",
    deadline: deadlineInDays(3),
    estimatedHours: 8,
    completedHours: 0,
    priority: "high",
    category: "assignment",
    complexity: 6,
    dependencies: ["task-exam"],
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  },
];

export const DEMO_SCENARIO: DemoScenario = {
  label: "Student Overload",
  description:
    "4 critical commitments, 54 hours required, 28 hours available — failure predicted.",
  tasks: DEMO_TASKS,
};
