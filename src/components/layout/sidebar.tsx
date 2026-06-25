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
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useHourglassStore } from "@/lib/store/hourglass-store";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/dashboard", label: "Mission Control", icon: LayoutDashboard },
  { href: "/dashboard/risk", label: "Risk Heatmap", icon: AlertTriangle },
  { href: "/dashboard/calendar", label: "Timeline", icon: Calendar },
  { href: "/dashboard/future-self", label: "Future Self", icon: TrendingDown },
  { href: "/dashboard/rescue", label: "Rescue Mode", icon: Shield },
  { href: "/dashboard/chat", label: "AI Chief of Staff", icon: MessageSquare },
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
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{ x: -280, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -280, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed left-0 top-0 z-40 flex h-full w-64 flex-col border-r border-white/10 bg-zinc-950/80 backdrop-blur-2xl"
          >
            <div className="flex items-center gap-3 border-b border-white/10 p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 shadow-lg shadow-blue-500/30">
                <Hourglass className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-semibold text-white">Hourglass AI</h1>
                <p className="text-[10px] text-white/40">Predictive Execution OS</p>
              </div>
            </div>

            {rescueModeActive && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mx-3 mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2"
              >
                <p className="text-xs font-medium text-red-400">Rescue Mode Active</p>
                <p className="text-[10px] text-red-400/70">
                  {orchestration?.rescuePlans.length ?? 0} intervention(s)
                </p>
              </motion.div>
            )}

            <nav className="flex-1 space-y-1 p-3">
              {navItems.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all",
                      active
                        ? "bg-white/10 text-white shadow-sm"
                        : "text-white/50 hover:bg-white/5 hover:text-white/80"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="border-t border-white/10 p-3">
              <Link
                href="/dashboard/voice"
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/50 hover:bg-white/5 hover:text-white/80"
              >
                <Mic className="h-4 w-4" />
                Voice Coach
              </Link>

              <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                <p className="truncate text-sm font-medium text-white">
                  {profile?.displayName ?? "Authenticated user"}
                </p>
                <p className="truncate text-xs text-white/45">
                  {profile?.email ?? "Session protected"}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-3 w-full justify-between"
                  onClick={() => void signOutUser()}
                >
                  Sign out
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed left-4 top-4 z-50 flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 backdrop-blur-xl border border-white/10 text-white/70 hover:text-white lg:hidden"
        aria-label="Toggle sidebar"
      >
        {sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>
    </>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { sidebarOpen } = useHourglassStore();

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-80 w-80 rounded-full bg-blue-600/20 blur-[120px]" />
        <div className="absolute -right-40 top-1/3 h-96 w-96 rounded-full bg-violet-600/15 blur-[120px]" />
        <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-cyan-600/10 blur-[100px]" />
      </div>
      <Sidebar />
      <main
        className={cn(
          "relative min-h-screen transition-all duration-300",
          sidebarOpen ? "lg:pl-64" : "pl-0"
        )}
      >
        {children}
      </main>
    </div>
  );
}