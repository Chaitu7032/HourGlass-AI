"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Mic, Volume2, Sparkles, FileText, AlertTriangle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useHourglassStore } from "@/lib/store/hourglass-store";

export default function VoicePage() {
  const { orchestration, voiceEnabled, setVoiceEnabled } = useHourglassStore();
  const [speaking, setSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");

  const stopSpeaking = () => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  };

  const speak = (text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    stopSpeaking();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    if (voiceEnabled && orchestration?.voiceCoachMessage) {
      speak(orchestration.voiceCoachMessage);
    }
    if (!voiceEnabled) {
      stopSpeaking();
    }
  }, [voiceEnabled, orchestration?.voiceCoachMessage]);

  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, []);

  const startListening = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Win = window as any;
    const SpeechRecognition = Win.webkitSpeechRecognition || Win.SpeechRecognition;

    if (!SpeechRecognition) {
      setTranscript("Speech recognition not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event: { results: { [key: number]: { [key: number]: { transcript: string } } } }) => {
      setTranscript(event.results[0][0].transcript);
    };
    recognition.start();
  };

  return (
    <DashboardShell>
      <div className="p-6 lg:p-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors">
            <ArrowLeft className="h-3 w-3" />
            Back to Mission Control
          </Link>
        </motion.div>

        <div className="flex min-h-[60vh] flex-col items-center justify-center px-6">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold">Voice Coach</h1>
            <p className="mt-1 text-sm text-white/40">
              Audio briefing and speech interface powered by Gemini
            </p>
          </div>

          <motion.div
            animate={speaking ? { scale: [1, 1.05, 1] } : {}}
            transition={{ repeat: speaking ? Infinity : 0, duration: 1.5 }}
            className="relative flex h-40 w-40 items-center justify-center rounded-full border border-white/10 bg-gradient-to-br from-blue-500/20 to-violet-500/20"
          >
            <motion.div
              animate={speaking ? { opacity: [0.3, 0.6, 0.3], scale: [1, 1.3, 1] } : { opacity: 0.3 }}
              transition={{ repeat: speaking ? Infinity : 0, duration: 2 }}
              className="absolute inset-0 rounded-full bg-blue-500/20"
            />
            <Volume2 className={cn("h-12 w-12", speaking ? "text-blue-400" : "text-white/40")} />
          </motion.div>

          {orchestration?.voiceCoachMessage ? (
            <>
              <div className="mt-8 max-w-lg text-center">
                <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-400/20 bg-blue-400/10 px-3 py-1 text-[10px] font-medium text-blue-300 mb-3">
                  <Sparkles className="h-3 w-3" />
                  Chief of Staff Briefing
                </div>
                <p className="text-sm italic leading-relaxed text-white/70">
                  &ldquo;{orchestration.voiceCoachMessage}&rdquo;
                </p>
              </div>

              {orchestration.rescuePlans.length > 0 && (
                <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2">
                  <AlertTriangle className="h-4 w-4 text-red-400" />
                  <span className="text-xs text-red-200">{orchestration.rescuePlans.length} active rescue plan(s)</span>
                </div>
              )}
            </>
          ) : (
            <p className="mt-8 max-w-md text-center text-sm text-white/50">
              Run planning from Mission Control to generate a voice briefing. The Chief of Staff will summarize your current risk posture, next steps, and execution health.
            </p>
          )}

          <div className="mt-8 flex gap-4">
            <Button
              variant={voiceEnabled || speaking ? "default" : "outline"}
              onClick={() => {
                if (speaking || voiceEnabled) {
                  setVoiceEnabled(false);
                  stopSpeaking();
                  return;
                }

                setVoiceEnabled(true);
              }}
              disabled={!orchestration?.voiceCoachMessage}
            >
              <Volume2 className="h-4 w-4" />
              {speaking || voiceEnabled ? "Stop Briefing" : "Play Briefing"}
            </Button>
            <Button variant="outline" onClick={startListening}>
              <Mic className="h-4 w-4" />
              Listen
            </Button>
          </div>

          {transcript && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3"
            >
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-white/40 mb-1">
                <FileText className="h-3 w-3" />
                Transcript
              </div>
              <p className="text-sm text-white/70">{transcript}</p>
            </motion.div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
