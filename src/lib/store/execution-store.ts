import { create } from "zustand";
import type {
  Task,
  OrchestrationResult,
  UserProfile,
} from "@/types";
import type { ExecutionProfile } from "@/types/execution-profile";

interface ExecutionState {
  // Single source of truth for all execution data
  tasks: Task[];
  orchestration: OrchestrationResult | null;
  userProfile: UserProfile | null;
  executionProfile: ExecutionProfile | null;
  
  // Loading states
  isLoading: boolean;
  isOrchestrating: boolean;
  error: string | null;
  
  // Actions
  setTasks: (tasks: Task[]) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  addTask: (task: Task) => void;
  removeTask: (taskId: string) => void;
  setOrchestration: (result: OrchestrationResult | null) => void;
  setUserProfile: (profile: UserProfile | null) => void;
  setExecutionProfile: (profile: ExecutionProfile | null) => void;
  setLoading: (loading: boolean) => void;
  setOrchestrating: (orchestrating: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useExecutionStore = create<ExecutionState>((set) => ({
  tasks: [],
  orchestration: null,
  userProfile: null,
  executionProfile: null,
  isLoading: false,
  isOrchestrating: false,
  error: null,

  setTasks: (tasks) => set({ tasks }),
  
  updateTask: (taskId, updates) =>
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              ...updates,
              updatedAt: updates.updatedAt ?? new Date().toISOString(),
            }
          : task
      ),
    })),
  
  addTask: (task) =>
    set((state) => ({
      tasks: [...state.tasks, task],
    })),
  
  removeTask: (taskId) =>
    set((state) => ({
      tasks: state.tasks.filter((task) => task.id !== taskId),
    })),
  
  setOrchestration: (orchestration) => set({ orchestration }),
  
  setUserProfile: (userProfile) => set({ userProfile }),
  
  setExecutionProfile: (executionProfile) => set({ executionProfile }),
  
  setLoading: (isLoading) => set({ isLoading }),
  
  setOrchestrating: (isOrchestrating) => set({ isOrchestrating }),
  
  setError: (error) => set({ error }),
  
  reset: () =>
    set({
      tasks: [],
      orchestration: null,
      userProfile: null,
      executionProfile: null,
      isLoading: false,
      isOrchestrating: false,
      error: null,
    }),
}));
