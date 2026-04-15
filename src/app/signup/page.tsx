"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck, Mail, Lock, Loader2, AlertCircle,
  Eye, EyeOff, User, ArrowLeft,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// ─── OTP Input ────────────────────────────────────────────────────────────────
function OtpInput({ onComplete }: { onComplete: (code: string) => void }) {
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => { refs.current[0]?.focus(); }, []);

  const handleChange = (idx: number, val: string) => {
    const digit = val.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[idx] = digit;
    setDigits(next);
    if (digit && idx < 5) refs.current[idx + 1]?.focus();
    if (next.every(Boolean)) onComplete(next.join(""));
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[idx] && idx > 0) {
      refs.current[idx - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      const next = pasted.split("");
      setDigits(next);
      refs.current[5]?.focus();
      onComplete(pasted);
    }
  };

  return (
    <div className="flex gap-2 justify-center" onPaste={handlePaste}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          className={`h-14 w-12 rounded-xl border text-center text-xl font-bold text-white outline-none transition-all
            ${d
              ? "border-emerald-500/50 bg-emerald-500/10 ring-2 ring-emerald-500/20"
              : "border-white/[0.08] bg-slate-800 focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/10"
            }`}
        />
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
type Step = "form" | "otp";

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep]         = useState<Step>("form");
  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Countdown timer for resend button
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown((n) => n - 1), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });

    setLoading(false);
    if (error) {
      setError(error.message);
    } else if (data.session) {
      // Email confirmation disabled — already logged in
      router.push("/dashboard");
      router.refresh();
    } else {
      setStep("otp");
      setResendCooldown(60);
    }
  };

  const handleVerify = async (code: string) => {
    setVerifying(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "signup",
    });

    if (error) {
      setError("Invalid code. Please check your email and try again.");
      setVerifying(false);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    const supabase = createClient();
    await supabase.auth.resend({ type: "signup", email });
    setResendCooldown(60);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/4 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-emerald-500/5 blur-[100px]" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-900/40">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">Amanah <span className="text-emerald-400">AI</span></span>
          </Link>
        </div>

        <AnimatePresence mode="wait">

          {/* ── STEP 1: Registration form ── */}
          {step === "form" && (
            <motion.div
              key="form"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
            >
              <div className="rounded-2xl border border-white/[0.08] bg-slate-900/80 backdrop-blur-sm p-8">
                <h1 className="text-xl font-bold text-white mb-1">Create your account</h1>
                <p className="text-sm text-slate-500 mb-6">Start scanning for free — no credit card needed</p>

                {error && (
                  <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                    className="mb-5 flex items-center gap-2.5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3">
                    <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                    <p className="text-sm text-red-300">{error}</p>
                  </motion.div>
                )}

                <form onSubmit={handleSignup} className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-400">Full name</label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                      <input type="text" value={name} onChange={(e) => setName(e.target.value)} required
                        placeholder="Ahmad bin Abdullah"
                        className="w-full rounded-xl border border-white/[0.08] bg-slate-800 py-3 pl-10 pr-4 text-sm text-white placeholder-slate-500 outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all" />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-400">Email address</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                        placeholder="you@company.com"
                        className="w-full rounded-xl border border-white/[0.08] bg-slate-800 py-3 pl-10 pr-4 text-sm text-white placeholder-slate-500 outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all" />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-400">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                      <input type={showPw ? "text" : "password"} value={password}
                        onChange={(e) => setPassword(e.target.value)} required placeholder="Min. 6 characters"
                        className="w-full rounded-xl border border-white/[0.08] bg-slate-800 py-3 pl-10 pr-11 text-sm text-white placeholder-slate-500 outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all" />
                      <button type="button" onClick={() => setShowPw(!showPw)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                        {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <button type="submit" disabled={loading}
                    className="w-full rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-900/30 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                    {loading ? "Creating account..." : "Create free account"}
                  </button>
                </form>

                <p className="mt-6 text-center text-sm text-slate-500">
                  Already have an account?{" "}
                  <Link href="/login" className="font-medium text-emerald-400 hover:text-emerald-300 transition-colors">Sign in</Link>
                </p>
              </div>
            </motion.div>
          )}

          {/* ── STEP 2: OTP verification ── */}
          {step === "otp" && (
            <motion.div
              key="otp"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.25 }}
            >
              <div className="rounded-2xl border border-white/[0.08] bg-slate-900/80 backdrop-blur-sm p-8">
                <button onClick={() => { setStep("form"); setError(null); }}
                  className="mb-5 flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors">
                  <ArrowLeft className="h-3.5 w-3.5" /> Back
                </button>

                <div className="mb-6 text-center">
                  <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/20 border border-emerald-500/20 mb-4">
                    <Mail className="h-7 w-7 text-emerald-400" />
                  </div>
                  <h1 className="text-xl font-bold text-white mb-1">Check your email</h1>
                  <p className="text-sm text-slate-400">
                    We sent a 6-digit code to<br />
                    <span className="font-medium text-white">{email}</span>
                  </p>
                </div>

                {error && (
                  <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                    className="mb-5 flex items-center gap-2.5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3">
                    <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                    <p className="text-sm text-red-300">{error}</p>
                  </motion.div>
                )}

                <div className="mb-6">
                  <OtpInput onComplete={handleVerify} />
                </div>

                {verifying && (
                  <div className="mb-4 flex items-center justify-center gap-2 text-sm text-slate-400">
                    <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
                    Verifying...
                  </div>
                )}

                <p className="text-center text-sm text-slate-500">
                  Didn&apos;t receive it?{" "}
                  <button
                    onClick={handleResend}
                    disabled={resendCooldown > 0}
                    className="font-medium text-emerald-400 hover:text-emerald-300 disabled:text-slate-600 disabled:cursor-not-allowed transition-colors"
                  >
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
                  </button>
                </p>
              </div>
            </motion.div>
          )}

        </AnimatePresence>

        <p className="mt-6 text-center text-xs text-slate-600">
          © {new Date().getFullYear()} Amanah AI · Halal Compliance Platform
        </p>
      </div>
    </div>
  );
}
