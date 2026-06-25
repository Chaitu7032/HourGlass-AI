"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2 } from "lucide-react";
import { DashboardShell } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { useHourglassStore } from "@/lib/store/hourglass-store";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const SUGGESTIONS = [
  "What's my highest risk task?",
  "Recommend a negotiation scenario",
  "Activate rescue plan",
  "What happens if I do nothing?",
];

export default function ChatPage() {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const { chatMessages, addChatMessage, isChatLoading, setIsChatLoading, orchestration } =
    useHourglassStore();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [chatMessages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isChatLoading) return;

    addChatMessage({ role: "user", content: text });
    setInput("");
    setIsChatLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, context: orchestration }),
      });
      const { reply } = await res.json();
      addChatMessage({ role: "assistant", content: reply, agentContext: "orchestrator" });
    } catch {
      addChatMessage({
        role: "assistant",
        content: "I encountered an issue. Please try again.",
      });
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <DashboardShell>
      <div className="flex h-[calc(100vh-2rem)] flex-col p-6 lg:p-8">
        <div className="mb-4">
          <h1 className="text-2xl font-bold">AI Chief of Staff</h1>
          <p className="text-sm text-white/40">Professional, calm, strategic — powered by Gemini</p>
        </div>

        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto rounded-2xl glass p-4">
          {chatMessages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <p className="text-white/50">Ask about risk, rescue plans, or negotiation trade-offs.</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/60 hover:bg-white/10"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {chatMessages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "max-w-[85%] rounded-2xl px-4 py-3 text-sm",
                msg.role === "user"
                  ? "ml-auto bg-blue-600/30 text-white"
                  : "bg-white/5 text-white/80"
              )}
            >
              {msg.content}
            </motion.div>
          ))}
          {isChatLoading && (
            <div className="flex items-center gap-2 text-sm text-white/40">
              <Loader2 className="h-4 w-4 animate-spin" />
              Hourglass is thinking...
            </div>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(input);
          }}
          className="mt-4 flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask your Chief of Staff..."
            className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-blue-500/50"
          />
          <Button type="submit" disabled={isChatLoading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </DashboardShell>
  );
}
