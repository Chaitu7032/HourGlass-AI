import { AuthGate } from "@/components/auth/auth-gate";

export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return <AuthGate>{children}</AuthGate>;
}
