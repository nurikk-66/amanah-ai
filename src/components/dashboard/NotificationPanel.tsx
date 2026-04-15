"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, CheckCircle2, AlertTriangle, XCircle, Clock, Info, X, RefreshCw } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import type { Notif } from "@/hooks/useNotifications";

const iconCfg: Record<Notif["icon"], { icon: React.ElementType; cls: string }> = {
  halal:    { icon: CheckCircle2,  cls: "bg-emerald-500/10 text-emerald-400" },
  haram:    { icon: XCircle,       cls: "bg-red-500/10 text-red-400"         },
  doubtful: { icon: AlertTriangle, cls: "bg-amber-500/10 text-amber-400"     },
  expiring: { icon: Clock,         cls: "bg-blue-500/10 text-blue-400"       },
  system:   { icon: Info,          cls: "bg-slate-500/10 text-slate-400"     },
};

export function NotificationPanel() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { notifications, unreadCount, markAllRead, refresh, loading } =
    useNotifications();

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleOpen = () => {
    setOpen((v) => !v);
    if (!open) markAllRead();
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleOpen}
        className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.03] text-slate-400 hover:text-white transition-colors"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-red-400" />
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -8 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-11 z-[200] w-80 rounded-2xl border border-white/[0.08] bg-slate-900 shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
              <p className="text-sm font-semibold text-white">Notifications</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => refresh()}
                  className="text-slate-500 hover:text-slate-300 transition-colors"
                  title="Refresh"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                </button>
                <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="max-h-96 overflow-y-auto">
              {loading && notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <RefreshCw className="h-6 w-6 text-slate-700 mb-3 animate-spin" />
                  <p className="text-sm text-slate-500">Loading…</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Bell className="h-8 w-8 text-slate-700 mb-3" />
                  <p className="text-sm text-slate-500">No notifications yet</p>
                  <p className="text-xs text-slate-700 mt-1">Expiry alerts & flagged scans will appear here</p>
                </div>
              ) : (
                notifications.map((n, i) => {
                  const cfg = iconCfg[n.icon];
                  const Icon = cfg.icon;
                  return (
                    <Link
                      key={`${n.source}-${n.id}-${i}`}
                      href={n.href}
                      onClick={() => setOpen(false)}
                      className={`flex gap-3 px-4 py-3 border-b border-white/[0.04] hover:bg-white/[0.05] transition-colors cursor-pointer ${
                        !n.read ? "bg-white/[0.02]" : ""
                      }`}
                    >
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${cfg.cls}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-white leading-snug">{n.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.body}</p>
                        <p className="text-[10px] text-slate-700 mt-1">{n.time}</p>
                      </div>
                      {!n.read && (
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                      )}
                    </Link>
                  );
                })
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="flex items-center justify-between border-t border-white/[0.06] px-4 py-2.5">
                <button
                  onClick={markAllRead}
                  className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  Mark all as read
                </button>
                <span className="text-[10px] text-slate-700">{notifications.length} total</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
