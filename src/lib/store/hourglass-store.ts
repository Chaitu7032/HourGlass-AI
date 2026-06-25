import { create } from "zustand";
import type {
  Task,
  OrchestrationResult,
  AgentLogEntry,
  ChatMessage,
} from "@/types";
import { generateId } from "@/lib/utils";

interface HourglassState {
  tasks: Task[];
  orchestration: OrchestrationResult | null;
  isOrchestrating: boolean;
  orchestrationProgress: AgentLogEntry[];
  chatMessages: ChatMessage[];
  isChatLoading: boolean;
  sidebarOpen: boolean;
  rescueModeActive: boolean;
  voiceEnabled: boolean;
  workspaceHydrated: boolean;

  setTasks: (tasks: Task[]) => void;
  addTask: (task: Task) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  removeTask: (taskId: string) => void;
  setOrchestration: (result: OrchestrationResult | null) => void;
  setIsOrchestrating: (v: boolean) => void;
  appendOrchestrationLog: (log: AgentLogEntry) => void;
  clearOrchestrationProgress: () => void;
  addChatMessage: (msg: Omit<ChatMessage, "id" | "timestamp">) => void;
  setIsChatLoading: (v: boolean) => void;
  setSidebarOpen: (v: boolean) => void;
  setRescueModeActive: (v: boolean) => void;
  setVoiceEnabled: (v: boolean) => void;
  setWorkspaceHydrated: (v: boolean) => void;
  reset: () => void;
}

export const useHourglassStore = create<HourglassState>((set) => ({
  tasks: [],
  orchestration: null,
  isOrchestrating: false,
  orchestrationProgress: [],
  chatMessages: [],
  isChatLoading: false,
  sidebarOpen: true,
  rescueModeActive: false,
  voiceEnabled: false,
  workspaceHydrated: false,

  setTasks: (tasks) => set({ tasks }),
  addTask: (task) =>
    set((s) => ({
      tasks: [...s.tasks, { ...task, id: task.id || generateId() }],
    })),
  updateTask: (taskId, updates) =>
    set((s) => ({
      tasks: s.tasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              ...updates,
              updatedAt: updates.updatedAt ?? new Date().toISOString(),
            }
          : task
      ),
    })),
  removeTask: (taskId) =>
    set((s) => ({ tasks: s.tasks.filter((task) => task.id !== taskId) })),
  setOrchestration: (orchestration) =>
    set({
      orchestration,
      rescueModeActive: (orchestration?.rescuePlans.length ?? 0) > 0,
    }),
  setIsOrchestrating: (isOrchestrating) => set({ isOrchestrating }),
  appendOrchestrationLog: (log) =>
    set((s) => ({ orchestrationProgress: [...s.orchestrationProgress, log] })),
  clearOrchestrationProgress: () => set({ orchestrationProgress: [] }),
  addChatMessage: (msg) =>
    set((s) => ({
      chatMessages: [
        ...s.chatMessages,
        { ...msg, id: generateId(), timestamp: new Date().toISOString() },
      ],
    })),
  setIsChatLoading: (isChatLoading) => set({ isChatLoading }),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setRescueModeActive: (rescueModeActive) => set({ rescueModeActive }),
  setVoiceEnabled: (voiceEnabled) => set({ voiceEnabled }),
  setWorkspaceHydrated: (workspaceHydrated) => set({ workspaceHydrated }),
  reset: () =>
    set({
      tasks: [],
      orchestration: null,
      isOrchestrating: false,
      orchestrationProgress: [],
      chatMessages: [],
      rescueModeActive: false,
      workspaceHydrated: false,
    }),
}));