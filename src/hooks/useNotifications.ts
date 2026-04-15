"use client";

/**
 * useNotifications
 * Fetches notifications from the `notifications` table in Supabase.
 * Merges in recent flagged scan alerts from `scans` table as well.
 *
 * Returns:
 *  - notifications  : merged, sorted list of Notif items
 *  - unreadCount    : number of unread items
 *  - markAllRead    : sets all items read in local state + DB
 *  - refresh        : re-fetch from DB
 */

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export interface Notif {
  id: string;
  icon: "halal" | "haram" | "doubtful" | "expiring" | "system";
  title: string;
  body: string;
  time: string;
  read: boolean;
  source: "db" | "scan";     // db = notifications table, scan = derived from scans table
  dbId?: string;             // uuid from notifications table (for marking read)
  href: string;              // where to navigate on click
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notif[]>([]);
  const [loading, setLoading]             = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const sb = createClient();
    const out: Notif[] = [];

    // ── 1. Expiry notifications from `notifications` table ─────────────────
    const { data: dbNotifs } = await sb
      .from("notifications")
      .select("id, type, title, message, read, created_at")
      .order("created_at", { ascending: false })
      .limit(20);

    (dbNotifs ?? []).forEach((n) => {
      out.push({
        id:     n.id,
        dbId:   n.id,
        icon:   n.type === "expiry" ? "expiring" : "system",
        title:  n.title,
        body:   n.message,
        time:   timeAgo(n.created_at),
        read:   n.read,
        source: "db",
        href:   "/dashboard/documents",
      });
    });

    // ── 2. Recent flagged scans ────────────────────────────────────────────
    const { data: scans } = await sb
      .from("scans")
      .select("scan_id, product_name, overall_status, created_at")
      .in("overall_status", ["haram", "doubtful"])
      .order("created_at", { ascending: false })
      .limit(5);

    (scans ?? []).forEach((s) => {
      out.push({
        id:     s.scan_id,
        icon:   s.overall_status as "haram" | "doubtful",
        title:  s.overall_status === "haram"
          ? "Haram ingredient detected"
          : "Doubtful ingredients found",
        body:   s.product_name,
        time:   timeAgo(s.created_at),
        read:   false,
        source: "scan",
        href:   "/dashboard/scanner",
      });
    });

    // Sort by time descending (most recent first)
    out.sort((a, b) => {
      // "Just now" / "Xm ago" / "Xh ago" — we already have ISO strings in DB
      // Re-sort by read status first (unread on top), then insertion order
      if (a.read !== b.read) return a.read ? 1 : -1;
      return 0;
    });

    setNotifications(out);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = useCallback(async () => {
    // Optimistic local update
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

    // Persist DB notifications as read
    const sb = createClient();
    const dbIds = notifications
      .filter((n) => n.source === "db" && !n.read && n.dbId)
      .map((n) => n.dbId!);

    if (dbIds.length > 0) {
      await sb
        .from("notifications")
        .update({ read: true })
        .in("id", dbIds);
    }
  }, [notifications]);

  return { notifications, unreadCount, markAllRead, refresh: fetch, loading };
}
