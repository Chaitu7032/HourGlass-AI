"use client";

import { useState, useEffect } from "react";
import { Mic, MicOff, Volume2 } from "lucide-react";
import { DashboardShell } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { useHourglassStore } from "@/lib/store/hourglass-store";
import { motion } from "framer-motion";

export default function VoicePage() {
  const { orchestration, voiceEnabled, setVoiceEnabled } = useHourglassStore();
  const [speaking, setSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");

  const speak = (text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
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
  }, [voiceEnabled, orchestration?.voiceCoachMessage]);

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
      <div className="flex flex-col items-center justify-center p-6 lg:p-8 min-h-[70vh]">
        <h1 className="mb-2 text-2xl font-bold">Voice Coach</h1>
        <p className="mb-8 text-sm text-white/40">Gemini Live-ready voice interface</p>

        <motion.div
          animate={speaking ? { scale: [1, 1.05, 1] } : {}}
          transition={{ repeat: speaking ? Infinity : 0, duration: 1.5 }}
          className="relative flex h-40 w-40 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/20 to-violet-500/20 border border-white/10"
        >
          <div className="absolute inset-0 rounded-full bg-blue-500/10 animate-ping" style={{ animationDuration: "2s" }} />
          <Volume2 className="h-12 w-12 text-blue-400" />
        </motion.div>

        {orchestration?.voiceCoachMessage && (
          <p className="mt-8 max-w-lg text-center text-sm italic text-white/70">
            &ldquo;{orchestration.voiceCoachMessage}&rdquo;
          </p>
        )}

        <div className="mt-8 flex gap-4">
          <Button
            variant={voiceEnabled ? "default" : "outline"}
            onClick={() => {
              setVoiceEnabled(!voiceEnabled);
              if (orchestration?.voiceCoachMessage) speak(orchestration.voiceCoachMessage);
            }}
          >
            <Volume2 className="h-4 w-4" />
            {speaking ? "Speaking..." : "Play Briefing"}
          </Button>
          <Button variant="outline" onClick={startListening}>
            <Mic className="h-4 w-4" />
            Listen
          </Button>
        </div>

        {transcript && (
          <p className="mt-4 text-sm text-white/50">Heard: {transcript}</p>
        )}

        <p className="mt-8 text-xs text-white/30">
          Production: connect Gemini Live API for real-time voice coaching
        </p>
      </div>
    </DashboardShell>
  );
}
