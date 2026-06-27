"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  AlertTriangle,
  Calendar,
  MessageSquare,
  TrendingDown,
  Shield,
  Hourglass,
  Mic,
  ChevronLeft,
  ChevronRight,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useHourglassStore } from "@/lib/store/hourglass-store";
import { useAuth } from "@/components/auth/auth-provider";

const navItems = [
  { href: "/dashboard", label: "Mission Control", icon: LayoutDashboard },
  { href: "/dashboard/risk", label: "Risk Heatmap", icon: AlertTriangle },
  { href: "/dashboard/calendar", label: "Timeline", icon: Calendar },
  { href: "/dashboard/future-self", label: "Future Self", icon: TrendingDown },
  { href: "/dashboard/rescue", label: "Rescue Mode", icon: Shield },
  { href: "/dashboard/chat", label: "AI Chief of Staff", icon: MessageSquare },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const store = useHourglassStore();
  const auth = useAuth();
  const sidebarOpen = store.sidebarOpen;
  const setSidebarOpen = store.setSidebarOpen;
  const rescueModeActive = store.rescueModeActive;
  const orchestration = store.orchestration;
  const profile = auth.profile;
  const signOutUser = auth.signOutUser;

  return (
    <>
      <AnimatePresence mode="wait">
        {sidebarOpen && (
          <motion.aside
            initial={{ x: -260, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -260, opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 220, mass: 0.8 }}
            className="fixed left-0 top-0 z-40 flex h-full w-[240px] flex-col border-r border-white/10 bg-zinc-950/80 backdrop-blur-2xl lg:w-[220px] xl:w-[240px]"
          >
            <div className="flex items-center gap-2.5 border-b border-white/10 px-4 py-4 lg:px-5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 shadow-lg shadow-blue-500/25">
                <Hourglass className="h-4 w-4 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm font-semibold text-white truncate">Hourglass AI</h1>
                <p className="text-[9px] text-white/40 truncate">Predictive Execution OS</p>
              </div>
            </div>

            {rescueModeActive && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mx-3 mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2"
              >
                <p className="text-xs font-medium text-red-400">Rescue Mode Active</p>
                <p className="text-[10px] text-red-400/70">
                  {orchestration?.rescuePlans.length ?? 0} intervention(s)
                </p>
              </motion.div>
            )}

            <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3 lg:px-3">
              {navItems.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-150",
                      active
                        ? "bg-white/10 text-white shadow-sm"
                        : "text-white/50 hover:bg-white/5 hover:text-white/80 active:scale-[0.98]"
                    )}
                  >
                    <item.icon className={cn("h-4 w-4 shrink-0 transition-transform duration-150", active ? "scale-105" : "")} />
                    <span className="truncate">{item.label}</span>
                    {active && (
                      <motion.div
                        layoutId="nav-indicator"
                        className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400"
                      />
                    )}
                  </Link>
                );
              })}
            </nav>

            <div className="border-t border-white/10 px-2 py-2 lg:px-3">
              <Link
                href="/dashboard/voice"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/50 hover:bg-white/5 hover:text-white/80 transition-all"
              >
                <Mic className="h-4 w-4 shrink-0" />
                <span className="truncate">Voice Coach</span>
              </Link>

              <div className="mt-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5">
                <p className="truncate text-sm font-medium text-white">
                  {profile?.displayName ?? "User"}
                </p>
                <p className="truncate text-[10px] text-white/45">
                  {profile?.email ?? "Protected"}
                </p>
                <button
                  onClick={() => void signOutUser()}
                  className="mt-2 w-full rounded-lg px-2 py-1.5 text-xs text-white/40 hover:bg-white/5 hover:text-white/70 transition-all text-left"
                >
                  Sign out
                </button>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Mobile toggle button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className={cn(
          "fixed z-50 flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-zinc-950/80 backdrop-blur-xl text-white/50 hover:text-white transition-all",
          sidebarOpen ? "left-[248px] top-4 lg:left-[228px] xl:left-[248px]" : "left-4 top-4"
        )}
        aria-label="Toggle sidebar"
      >
        {sidebarOpen ? <ChevronLeft className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
      </button>
    </>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { sidebarOpen } = useHourglassStore();

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Ambient background - smaller blobs for better performance */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -left-32 -top-32 h-64 w-64 rounded-full bg-blue-600/15 blur-[100px]" />
        <div className="absolute -right-32 top-1/4 h-72 w-72 rounded-full bg-violet-600/10 blur-[100px]" />
        <div className="absolute bottom-0 left-1/4 h-48 w-48 rounded-full bg-cyan-600/8 blur-[80px]" />
      </div>
      <Sidebar />
      <main
        className={cn(
          "relative min-h-screen transition-all duration-300 ease-out",
          sidebarOpen ? "lg:pl-[220px] xl:pl-[240px]" : "pl-0"
        )}
      >
        <div className="mx-auto max-w-[1400px]">
          {children}
        </div>
      </main>
    </div>
  );
}