"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  LayoutDashboard,
  ScanLine,
  FolderOpen,
  Settings,
  X,
  LogOut,
  Trophy,
  Sparkles,
  Shield,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { createClient } from "@/lib/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

const AUDITOR_NAV = [
  { href: "/dashboard",             icon: LayoutDashboard, label: "Overview"  },
  { href: "/dashboard/scanner",     icon: ScanLine,        label: "Scanner",  badge: "AI" },
  { href: "/dashboard/documents",   icon: FolderOpen,      label: "Documents" },
  { href: "/dashboard/settings",    icon: Settings,        label: "Settings"  },
];

const MANAGER_NAV = [
  { href: "/dashboard",             icon: LayoutDashboard, label: "Overview"    },
  { href: "/dashboard/scanner",     icon: ScanLine,        label: "Scanner",    badge: "AI" },
  { href: "/dashboard/leaderboard", icon: Trophy,          label: "Leaderboard" },
  { href: "/dashboard/documents",   icon: FolderOpen,      label: "Documents"   },
  { href: "/dashboard/admin",       icon: Shield,          label: "Admin",      badge: "MGR" },
  { href: "/dashboard/settings",    icon: Settings,        label: "Settings"    },
];

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname  = usePathname();
  const router    = useRouter();
  const [docCount,  setDocCount]  = useState<number | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName,  setUserName]  = useState("User");
  const { profile: roleProfile } = useUserRole();
  const navItems = roleProfile.role === "manager" ? MANAGER_NAV : AUDITOR_NAV;

  useEffect(() => {
    const sb = createClient();
    sb.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserEmail(data.user.email ?? null);
        const name = data.user.user_metadata?.full_name as string | undefined;
        if (name) setUserName(name.split(" ")[0]);
      }
    });
  }, []);

  useEffect(() => {
    if (!supabase) return;
    supabase
      .from("documents")
      .select("id", { count: "exact", head: true })
      .then(({ count }) => setDocCount(count ?? 0));
  }, []);

  const handleLogout = async () => {
    const sb = createClient();
    await sb.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const initials = userName[0]?.toUpperCase() ?? "U";

  const content = (
    <div className="relative flex h-full flex-col overflow-hidden" style={{ background: "#080c14" }}>
      {/* Top ambient glow */}
      <div className="pointer-events-none absolute -top-16 -left-16 h-48 w-48 rounded-full bg-emerald-500/8 blur-3xl" />
      <div className="pointer-events-none absolute top-20 -right-10 h-32 w-32 rounded-full bg-teal-500/6 blur-2xl" />

      {/* ── Logo ── */}
      <div className="relative flex items-center justify-between px-5 pt-5 pb-4">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 shadow-lg shadow-emerald-900/50">
            <ShieldCheck className="h-5 w-5 text-white" />
            <div className="absolute inset-0 rounded-xl bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div>
            <p className="text-sm font-bold text-white tracking-tight">Amanah AI</p>
            <p className="text-[10px] font-medium text-emerald-400/70 tracking-wider uppercase">Halal Platform</p>
          </div>
        </Link>
        <button
          onClick={onClose}
          className="md:hidden rounded-lg p-1.5 text-slate-500 hover:text-white hover:bg-white/[0.06] transition-all"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Divider */}
      <div className="mx-4 h-px bg-gradient-to-r from-transparent via-white/[0.07] to-transparent" />

      {/* ── Navigation ── */}
      <nav className="relative flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {navItems.map((item) => {
          const Icon   = item.icon;
          const active = pathname === item.href;
          const showDocBadge = item.href === "/dashboard/documents" && docCount !== null && docCount > 0;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className="relative flex items-center gap-3 rounded-xl px-3 py-2.5 group transition-all duration-150"
            >
              {/* Active background */}
              {active && (
                <motion.div
                  layoutId="nav-pill"
                  className="absolute inset-0 rounded-xl bg-emerald-500/10"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}

              {/* Hover background */}
              {!active && (
                <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 bg-white/[0.04] transition-opacity" />
              )}

              {/* Active left bar */}
              {active && (
                <motion.div
                  layoutId="nav-bar"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-gradient-to-b from-emerald-400 to-teal-500"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}

              {/* Icon */}
              <div className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all ${
                active
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "text-slate-500 group-hover:text-slate-300 group-hover:bg-white/[0.06]"
              }`}>
                <Icon className="h-4 w-4" />
              </div>

              {/* Label */}
              <span className={`relative flex-1 text-sm font-medium transition-colors ${
                active ? "text-white" : "text-slate-400 group-hover:text-slate-200"
              }`}>
                {item.label}
              </span>

              {/* Badges */}
              {item.badge === "AI" && (
                <span className="relative flex items-center gap-1 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-400 border border-emerald-500/20">
                  <Sparkles className="h-2.5 w-2.5" />
                  AI
                </span>
              )}
              {item.badge === "MGR" && (
                <span className="relative flex items-center gap-1 rounded-full bg-violet-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-violet-400 border border-violet-500/20">
                  <Shield className="h-2.5 w-2.5" />
                  MGR
                </span>
              )}
              {showDocBadge && (
                <span className="relative min-w-[18px] rounded-full bg-amber-500/20 px-1.5 py-0.5 text-center text-[10px] font-semibold text-amber-400">
                  {docCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Divider */}
      <div className="mx-4 h-px bg-gradient-to-r from-transparent via-white/[0.07] to-transparent" />

      {/* ── User Profile ── */}
      <div className="relative p-3">
        <div className="flex items-center gap-3 rounded-xl p-2.5 hover:bg-white/[0.04] transition-colors group">
          {/* Avatar */}
          <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 text-xs font-bold text-white shadow-md">
            {initials}
            <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-[#080c14]" />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-semibold text-white truncate">{userName}</p>
              <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider border ${
                roleProfile.role === "manager"
                  ? "bg-violet-500/15 text-violet-400 border-violet-500/20"
                  : "bg-blue-500/15 text-blue-400 border-blue-500/20"
              }`}>
                {roleProfile.role === "manager" ? "Manager" : "Auditor"}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 truncate">{userEmail ?? "Free Plan"}</p>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            title="Sign out"
            className="shrink-0 rounded-lg p-1.5 text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 bg-black/70 backdrop-blur-sm md:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-60 md:shrink-0 md:flex-col h-screen sticky top-0 border-r border-white/[0.05]">
        {content}
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <motion.aside
            initial={{ x: -260 }}
            animate={{ x: 0 }}
            exit={{ x: -260 }}
            transition={{ type: "spring", stiffness: 380, damping: 38 }}
            className="fixed left-0 top-0 z-40 flex h-full w-60 flex-col md:hidden border-r border-white/[0.05]"
          >
            {content}
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
