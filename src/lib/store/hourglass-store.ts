import { create } from "zustand";
import type {
  Task,
  OrchestrationResult,
  AgentLogEntry,
  ChatMessage,
} from "@/types";
import { DEMO_TASKS } from "@/lib/demo-data";
import { generateId } from "@/lib/utils";

interface HourglassState {
  tasks: Task[];
  orchestration: OrchestrationResult | null;
  isOrchestrating: boolean;
  orchestrationProgress: AgentLogEntry[];
  chatMessages: ChatMessage[];
  isChatLoading: boolean;
  demoMode: boolean;
  sidebarOpen: boolean;
  rescueModeActive: boolean;
  voiceEnabled: boolean;

  setTasks: (tasks: Task[]) => void;
  addTask: (task: Task) => void;
  setOrchestration: (result: OrchestrationResult | null) => void;
  setIsOrchestrating: (v: boolean) => void;
  appendOrchestrationLog: (log: AgentLogEntry) => void;
  clearOrchestrationProgress: () => void;
  addChatMessage: (msg: Omit<ChatMessage, "id" | "timestamp">) => void;
  setIsChatLoading: (v: boolean) => void;
  setDemoMode: (v: boolean) => void;
  setSidebarOpen: (v: boolean) => void;
  setRescueModeActive: (v: boolean) => void;
  setVoiceEnabled: (v: boolean) => void;
  loadDemo: () => void;
  reset: () => void;
}

export const useHourglassStore = create<HourglassState>((set) => ({
  tasks: [],
  orchestration: null,
  isOrchestrating: false,
  orchestrationProgress: [],
  chatMessages: [],
  isChatLoading: false,
  demoMode: false,
  sidebarOpen: true,
  rescueModeActive: false,
  voiceEnabled: false,

  setTasks: (tasks) => set({ tasks }),
  addTask: (task) => set((s) => ({ tasks: [...s.tasks, task] })),
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
  setDemoMode: (demoMode) => set({ demoMode }),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setRescueModeActive: (rescueModeActive) => set({ rescueModeActive }),
  setVoiceEnabled: (voiceEnabled) => set({ voiceEnabled }),
  loadDemo: () =>
    set({
      tasks: DEMO_TASKS,
      demoMode: true,
      chatMessages: [
        {
          id: generateId(),
          role: "assistant",
          content:
            "Demo loaded. 4 commitments detected — 54 hours required, 28 available. Initiating multi-agent analysis...",
          timestamp: new Date().toISOString(),
          agentContext: "orchestrator",
        },
      ],
    }),
  reset: () =>
    set({
      tasks: [],
      orchestration: null,
      isOrchestrating: false,
      orchestrationProgress: [],
      chatMessages: [],
      demoMode: false,
      rescueModeActive: false,
    }),
}));
