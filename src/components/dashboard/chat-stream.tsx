"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Loader2, Sparkles, AlertTriangle, Shield, Brain, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useHourglassStore } from "@/lib/store/hourglass-store";
import { Button } from "@/components/ui/button";
import type { ChatMessage } from "@/types";

const SUGGESTIONS = [
  "What's my highest risk task?",
  "Recommend a negotiation scenario",
  "Activate rescue plan",
  "What happens if I do nothing?",
  "What is my opportunity cost for the interview?",
  "How should I prioritize today?",
];

const QUICK_ACTIONS = [
  { label: "Analyze Risk", icon: AlertTriangle, color: "text-orange-400" },
  { label: "Rescue Mode", icon: Shield, color: "text-red-400" },
  { label: "Future Self", icon: Brain, color: "text-violet-400" },
  { label: "Schedule", icon: Clock, color: "text-blue-400" },
];

export function ChatStream() {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const { chatMessages, addChatMessage, isChatLoading, setIsChatLoading, orchestration } =
    useHourglassStore();
  const [streamingText, setStreamingText] = useState("");

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [chatMessages, streamingText]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isChatLoading) return;

    addChatMessage({ role: "user", content: text });
    setInput("");
    setIsChatLoading(true);
    setStreamingText("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, context: orchestration }),
      });
      const { reply } = await res.json();

      // Simulate streaming for UX
      const words = reply.split(" ");
      for (let i = 0; i < words.length; i++) {
        setStreamingText((prev) => prev + (i > 0 ? " " : "") + words[i]);
        await new Promise((r) => setTimeout(r, 15 + Math.random() * 20));
      }

      addChatMessage({ role: "assistant", content: reply, agentContext: "orchestrator" });
      setStreamingText("");
    } catch {
      addChatMessage({
        role: "assistant",
        content: "I encountered an issue connecting to the intelligence layer. Please try again.",
      });
    } finally {
      setIsChatLoading(false);
    }
  }, [addChatMessage, isChatLoading, setIsChatLoading, orchestration]);

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">AI Chief of Staff</h1>
          <p className="text-sm text-white/40">Professional, calm, strategic — powered by Gemini 2.5 Flash</p>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-1.5">
          <Sparkles className="h-3 w-3 text-blue-400" />
          <span className="text-xs text-white/40">Gemini Enhanced</span>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 space-y-4 overflow-y-auto rounded-2xl border border-white/10 bg-white/[0.02] p-4"
      >
        {chatMessages.length === 0 && !streamingText && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/20 to-violet-500/20">
              <Brain className="h-8 w-8 text-blue-400" />
            </div>
            <p className="max-w-md text-sm text-white/50">
              Ask about risk assessments, rescue plans, negotiation trade-offs, or your future self projection.
            </p>

            {/* Quick actions */}
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {QUICK_ACTIONS.map((action) => (
                <motion.button
                  key={action.label}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => sendMessage(`Run ${action.label}`)}
                  className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/60 hover:bg-white/10"
                >
                  <action.icon className={cn("h-3.5 w-3.5", action.color)} />
                  {action.label}
                </motion.button>
              ))}
            </div>

            {/* Suggestions */}
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/50 hover:bg-white/10 transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence>
          {chatMessages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              className={cn(
                "max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                msg.role === "user"
                  ? "ml-auto bg-blue-600/20 text-white border border-blue-500/20"
                  : "bg-white/5 text-white/80"
              )}
            >
              {msg.content}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Streaming text */}
        {streamingText && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-[88%] rounded-2xl bg-white/5 px-4 py-3 text-sm text-white/80"
          >
            {streamingText}
            <motion.span
              animate={{ opacity: [1, 0] }}
              transition={{ repeat: Infinity, duration: 0.8 }}
              className="ml-0.5 inline-block h-4 w-[2px] bg-blue-400"
            />
          </motion.div>
        )}

        {isChatLoading && !streamingText && (
          <div className="flex items-center gap-2 text-sm text-white/40">
            <Loader2 className="h-4 w-4 animate-spin" />
            Synthesizing response...
          </div>
        )}

        {orchestration && chatMessages.length === 0 && !isChatLoading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 rounded-xl border border-blue-500/20 bg-blue-500/5 p-3"
          >
            <p className="text-xs text-blue-400/80 font-medium">Context loaded</p>
            <p className="mt-1 text-xs text-white/40">
              {orchestration.executiveSummary.slice(0, 150)}...
            </p>
          </motion.div>
        )}
      </div>

      {/* Input bar */}
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
          disabled={isChatLoading}
          className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none transition-all focus:border-blue-500/50 focus:bg-white/10 disabled:opacity-50"
        />
        <Button type="submit" disabled={isChatLoading || !input.trim()}>
          {isChatLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>
    </div>
  );
}
