"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Sidebar } from "@/components/dashboard/sidebar";
import { CommandPalette } from "@/components/dashboard/CommandPalette";
import { NotificationPanel } from "@/components/dashboard/NotificationPanel";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Menu, Search, ChevronRight, ShieldCheck } from "lucide-react";

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  "/dashboard":           { title: "Overview",     subtitle: "Your compliance at a glance"        },
  "/dashboard/scanner":   { title: "AI Scanner",   subtitle: "Real-time ingredient analysis"      },
  "/dashboard/documents": { title: "Documents",    subtitle: "Certificates & audit reports"       },
  "/dashboard/settings":  { title: "Settings",     subtitle: "Manage your account & preferences"  },
  "/dashboard/leaderboard":{ title: "Leaderboard", subtitle: "Brand compliance rankings"          },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen]     = useState(false);
  const [paletteOpen, setPaletteOpen]     = useState(false);
  const pathname = usePathname();
  const page = pageTitles[pathname]
    ?? (pathname.startsWith("/dashboard/scanner/") ? { title: "Scan Details", subtitle: "Product compliance history & trends" } : null)
    ?? { title: "Dashboard", subtitle: "" };

  // ⌘K / Ctrl+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="flex h-screen bg-slate-950 text-white overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />

      {/* Main Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar */}
        <header className="relative z-20 flex h-16 shrink-0 items-center justify-between border-b border-white/[0.06] bg-slate-950/80 backdrop-blur-xl px-6">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="text-slate-400 hover:text-white md:hidden">
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2 text-sm">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              <span className="text-slate-500">Amanah AI</span>
              <ChevronRight className="h-3.5 w-3.5 text-slate-700" />
              <span className="font-medium text-white">{page.title}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Search trigger */}
            <button
              onClick={() => setPaletteOpen(true)}
              className="hidden sm:flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-slate-500 hover:text-slate-300 hover:border-white/10 transition-colors"
            >
              <Search className="h-4 w-4" />
              <span className="w-32 text-left text-sm">Search...</span>
              <kbd className="rounded border border-white/10 px-1.5 py-0.5 text-[10px] font-medium">⌘K</kbd>
            </button>

            {/* Notifications */}
            <NotificationPanel />

            {/* Avatar */}
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-sm font-bold text-white shadow-md select-none">
              N
            </div>
          </div>
        </header>

        {/* Page Header */}
        <div className="shrink-0 border-b border-white/[0.04] bg-slate-950 px-6 py-4">
          <motion.div key={pathname} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <h1 className="text-xl font-bold text-white">{page.title}</h1>
            <p className="text-sm text-slate-500">{page.subtitle}</p>
          </motion.div>
        </div>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="h-full"
          >
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </motion.div>
        </main>
      </div>
    </div>
  );
}
