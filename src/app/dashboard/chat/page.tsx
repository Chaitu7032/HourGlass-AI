"use client";

import { DashboardShell } from "@/components/layout/sidebar";
import { ChatStream } from "@/components/dashboard/chat-stream";

export default function ChatPage() {
  return (
    <DashboardShell>
      <div className="p-6 lg:p-8">
        <ChatStream />
      </div>
    </DashboardShell>
  );
}
