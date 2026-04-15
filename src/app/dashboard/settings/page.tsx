"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, Bell, User, CheckCircle2, Loader2, Shield, ScanLine, BarChart2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUserRole } from "@/hooks/useUserRole";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Profile {
  companyName: string;
  industry: string;
  country: string;
  email: string;
  phone: string;
}

interface NotifSettings {
  flaggedScans: boolean;
  jakimUpdates: boolean;
  expiringDocs: boolean;
  weeklyReport: boolean;
}

const INDUSTRIES = [
  "Food Manufacturing",
  "Food & Beverage",
  "Pharmaceutical",
  "Cosmetics & Personal Care",
  "Restaurant & F&B",
  "Retail & Distribution",
  "Import & Export",
  "Other",
];

const COUNTRIES = ["Malaysia", "Indonesia", "Singapore", "Brunei", "Thailand", "Other"];

const DEFAULT_PROFILE: Profile = {
  companyName: "",
  industry: "Food Manufacturing",
  country: "Malaysia",
  email: "",
  phone: "",
};

const DEFAULT_NOTIF: NotifSettings = {
  flaggedScans: true,
  jakimUpdates: true,
  expiringDocs: true,
  weeklyReport: false,
};

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [notif, setNotif]     = useState<NotifSettings>(DEFAULT_NOTIF);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const { profile: roleProfile, loading: roleLoading } = useUserRole();

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const p = localStorage.getItem("amanah_profile");
      const n = localStorage.getItem("amanah_notif");
      if (p) setProfile(JSON.parse(p));
      if (n) setNotif(JSON.parse(n));
    } catch {}
  }, []);

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 600)); // smooth UX delay
    localStorage.setItem("amanah_profile", JSON.stringify(profile));
    localStorage.setItem("amanah_notif",   JSON.stringify(notif));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const setField = (key: keyof Profile, value: string) =>
    setProfile((p) => ({ ...p, [key]: value }));

  const toggleNotif = (key: keyof NotifSettings) =>
    setNotif((n) => ({ ...n, [key]: !n[key] }));

  return (
    <div className="p-6 space-y-6 max-w-2xl">

      {/* ── Organisation Profile ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="rounded-2xl border border-white/[0.06] bg-slate-900/60 p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Organisation</p>
            <p className="text-xs text-slate-500">Company details for compliance reports</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Company Name */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Company Name</label>
            <input
              value={profile.companyName}
              onChange={(e) => setField("companyName", e.target.value)}
              placeholder="e.g. My SME Sdn Bhd"
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none focus:border-emerald-500/40 transition-colors"
            />
          </div>

          {/* Industry */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Industry</label>
            <select
              value={profile.industry}
              onChange={(e) => setField("industry", e.target.value)}
              className="w-full rounded-xl border border-white/[0.08] bg-slate-800 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500/40 transition-colors"
            >
              {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>

          {/* Country */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Country</label>
            <select
              value={profile.country}
              onChange={(e) => setField("country", e.target.value)}
              className="w-full rounded-xl border border-white/[0.08] bg-slate-800 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500/40 transition-colors"
            >
              {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Email & Phone */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">Email</label>
              <input
                type="email"
                value={profile.email}
                onChange={(e) => setField("email", e.target.value)}
                placeholder="hello@company.com"
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none focus:border-emerald-500/40 transition-colors"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">Phone</label>
              <input
                type="tel"
                value={profile.phone}
                onChange={(e) => setField("phone", e.target.value)}
                placeholder="+60 12 345 6789"
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none focus:border-emerald-500/40 transition-colors"
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Notifications ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1 }}
        className="rounded-2xl border border-white/[0.06] bg-slate-900/60 p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10">
            <Bell className="h-4 w-4 text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Notifications</p>
            <p className="text-xs text-slate-500">Choose what alerts you receive</p>
          </div>
        </div>

        <div className="space-y-4">
          {(
            [
              { key: "flaggedScans", label: "Alert on flagged scans",      desc: "Notify when a scan returns Haram or Doubtful" },
              { key: "jakimUpdates", label: "JAKIM regulation updates",    desc: "Get notified on new halal standard changes"   },
              { key: "expiringDocs", label: "Expiring document reminders", desc: "Alert 30 days before a certificate expires"   },
              { key: "weeklyReport", label: "Weekly compliance report",    desc: "Summary of scans and compliance every Monday" },
            ] as { key: keyof NotifSettings; label: string; desc: string }[]
          ).map((item) => (
            <div key={item.key} className="flex items-center justify-between gap-4 rounded-xl border border-white/[0.04] bg-white/[0.02] px-4 py-3">
              <div>
                <p className="text-sm font-medium text-white">{item.label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
              </div>
              <button
                onClick={() => toggleNotif(item.key)}
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ${notif[item.key] ? "bg-emerald-600" : "bg-slate-700"}`}
              >
                <motion.span
                  animate={{ x: notif[item.key] ? 20 : 2 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow"
                />
              </button>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── Account Role ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.2 }}
        className="rounded-2xl border border-white/[0.06] bg-slate-900/60 p-6"
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10">
            <Shield className="h-4 w-4 text-violet-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Account Role</p>
            <p className="text-xs text-slate-500">Controls what you can access in the dashboard</p>
          </div>
        </div>

        {roleLoading ? (
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading role...
          </div>
        ) : (
          <div className="flex items-center gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-4">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
              roleProfile.role === "manager" ? "bg-violet-500/15" : "bg-blue-500/15"
            }`}>
              {roleProfile.role === "manager"
                ? <BarChart2 className="h-5 w-5 text-violet-400" />
                : <ScanLine className="h-5 w-5 text-blue-400" />}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-white capitalize">{roleProfile.role}</p>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                  roleProfile.role === "manager"
                    ? "bg-violet-500/20 text-violet-400 border-violet-500/30"
                    : "bg-blue-500/20 text-blue-400 border-blue-500/30"
                }`}>Active</span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {roleProfile.role === "manager"
                  ? "Full access: scanner, reports, admin panel"
                  : "Scan-only access: scanner and documents"}
              </p>
            </div>
            <p className="text-[10px] text-slate-600 text-right">Assigned by admin</p>
          </div>
        )}
      </motion.div>

      {/* ── Plan Info ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.3 }}
        className="rounded-2xl border border-white/[0.06] bg-slate-900/60 p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10">
            <User className="h-4 w-4 text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Plan</p>
            <p className="text-xs text-slate-500">Your current subscription</p>
          </div>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-white">Free Plan</p>
            <p className="text-xs text-slate-500">50 scans/month · 1 GB storage · Email support</p>
          </div>
          <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-400">Active</span>
        </div>
      </motion.div>

      {/* ── Save Button ── */}
      <div className="flex items-center gap-4">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-70 min-w-[140px]"
        >
          {saving
            ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
            : "Save Changes"}
        </Button>

        <AnimatePresence>
          {saved && (
            <motion.div
              initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
              className="flex items-center gap-2 text-sm text-emerald-400"
            >
              <CheckCircle2 className="h-4 w-4" /> Saved successfully
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
