"use client";

import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  ShieldCheck, ScanLine, FileSearch, ActivitySquare,
  CheckCircle2, AlertTriangle, XCircle, ArrowRight,
  Menu, X, ChevronRight, Star,
} from "lucide-react";

// ─── Variants ─────────────────────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: "easeOut" } },
};
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.09 } } };

// ─── Navbar ────────────────────────────────────────────────────────────────────
function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <motion.nav
      initial={{ y: -56, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="fixed top-0 z-50 w-full transition-all duration-500"
      style={{
        background: scrolled ? "rgba(5,8,16,0.92)" : "transparent",
        backdropFilter: scrolled ? "blur(20px)" : "none",
        borderBottom: scrolled ? "1px solid rgba(255,255,255,0.05)" : "none",
      }}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          {/* Custom logo mark */}
          <div className="relative flex h-8 w-8 items-center justify-center">
            <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-[#00c67a] to-[#0091ff] opacity-90" />
            <svg viewBox="0 0 24 24" fill="none" className="relative h-5 w-5">
              <path d="M12 2L4 6v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V6L12 2z" fill="white" fillOpacity="0.15" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="text-[15px] font-bold tracking-tight text-white">
            Amanah<span style={{ color: "#00c67a" }}>.</span>
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-7">
          {["Features", "How it works", "Pricing"].map(l => (
            <a key={l} href={`#${l.toLowerCase().replace(" ", "-")}`}
              className="text-[13px] font-medium text-white/50 hover:text-white transition-colors">
              {l}
            </a>
          ))}
          <Link href="/blog" className="text-[13px] font-medium text-white/50 hover:text-white transition-colors">
            Blog
          </Link>
        </div>

        {/* CTAs */}
        <div className="hidden md:flex items-center gap-3">
          <Link href="/login" className="text-[13px] font-medium text-white/50 hover:text-white transition-colors px-3 py-2">
            Sign in
          </Link>
          <Link href="/signup"
            className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-[13px] font-semibold text-white transition-all"
            style={{ background: "#00c67a", boxShadow: "0 0 20px rgba(0,198,122,0.3)" }}>
            Get started <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <button onClick={() => setOpen(!open)} className="md:hidden p-2 text-white/50 hover:text-white">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="md:hidden overflow-hidden border-t border-white/[0.05]"
            style={{ background: "rgba(5,8,16,0.98)" }}>
            <div className="px-6 py-5 space-y-1">
              {["Features", "How it works", "Pricing"].map(l => (
                <a key={l} href={`#${l.toLowerCase()}`} onClick={() => setOpen(false)}
                  className="block py-2.5 text-sm text-white/50 hover:text-white transition-colors">{l}</a>
              ))}
              <div className="pt-4 border-t border-white/[0.05] space-y-2">
                <Link href="/login" className="block py-2.5 text-sm text-white/50">Sign in</Link>
                <Link href="/signup" className="flex justify-center rounded-lg py-2.5 text-sm font-semibold text-white" style={{ background: "#00c67a" }}>
                  Get started free
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}

// ─── Ingredient badge ──────────────────────────────────────────────────────────
function IngBadge({ name, status, delay }: { name: string; status: "halal" | "doubtful" | "haram"; delay: number }) {
  const cfg = {
    halal:    { color: "#00c67a", bg: "rgba(0,198,122,0.08)",  border: "rgba(0,198,122,0.2)",  icon: CheckCircle2  },
    doubtful: { color: "#f59e0b", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.2)", icon: AlertTriangle },
    haram:    { color: "#ef4444", bg: "rgba(239,68,68,0.08)",  border: "rgba(239,68,68,0.2)",  icon: XCircle       },
  }[status];
  const Icon = cfg.icon;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5"
      style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
      <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: cfg.color }} />
      <span className="text-[13px] font-medium text-white/80 truncate">{name}</span>
      <span className="ml-auto text-[11px] font-bold shrink-0" style={{ color: cfg.color }}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    </motion.div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY   = useTransform(scrollYProgress, [0, 1], [0, -80]);
  const heroOp  = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  return (
    <div className="overflow-x-hidden" style={{ background: "#050810", color: "#fff", fontFamily: "var(--font-geist-sans)" }}>
      <Navbar />

      {/* ── HERO ─────────────────────────────────────────────────────────────── */}
      <section ref={heroRef} className="relative flex min-h-screen flex-col items-center justify-center px-6 pt-24 pb-20 overflow-hidden">
        {/* Background layers */}
        <div className="pointer-events-none absolute inset-0">
          {/* Primary glow */}
          <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 h-[700px] w-[700px] rounded-full opacity-20"
            style={{ background: "radial-gradient(circle, #00c67a 0%, transparent 65%)" }} />
          {/* Left glow */}
          <div className="absolute top-[30%] left-[-15%] h-[500px] w-[500px] rounded-full opacity-10"
            style={{ background: "radial-gradient(circle, #0091ff 0%, transparent 70%)" }} />
          {/* Right glow */}
          <div className="absolute top-[20%] right-[-15%] h-[400px] w-[400px] rounded-full opacity-8"
            style={{ background: "radial-gradient(circle, #7c3aed 0%, transparent 70%)" }} />
          {/* Noise texture overlay */}
          <div className="absolute inset-0 opacity-[0.025]"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`, backgroundRepeat: "repeat", backgroundSize: "256px" }} />
          {/* Dot grid */}
          <div className="absolute inset-0 opacity-[0.04]"
            style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
        </div>

        <motion.div style={{ y: heroY, opacity: heroOp }} className="relative z-10 max-w-[860px] mx-auto text-center">
          {/* Category label */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 mb-9"
            style={{ borderColor: "rgba(0,198,122,0.2)", background: "rgba(0,198,122,0.06)" }}>
            <div className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: "#00c67a" }} />
            <span className="text-[12px] font-semibold tracking-wide uppercase" style={{ color: "#00c67a" }}>
              Halal Compliance Platform
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="mb-6 font-black tracking-tight leading-[1.02]"
            style={{ fontSize: "clamp(2.8rem, 8vw, 5.5rem)" }}
          >
            Know what&apos;s in<br />
            <span style={{ background: "linear-gradient(135deg, #00c67a 0%, #00d4ff 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              every product
            </span>
            <br />instantly.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.16 }}
            className="mx-auto mb-10 max-w-xl text-[17px] leading-relaxed"
            style={{ color: "rgba(255,255,255,0.45)" }}
          >
            Upload a product label. Amanah scans every ingredient against
            JAKIM halal standards and returns a full compliance report in seconds.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.22 }}
            className="flex flex-wrap items-center justify-center gap-3 mb-16"
          >
            <Link href="/signup"
              className="group flex items-center gap-2 rounded-xl px-6 py-3 text-[15px] font-bold text-white transition-all"
              style={{ background: "#00c67a", boxShadow: "0 0 40px rgba(0,198,122,0.25)", border: "1px solid rgba(0,198,122,0.4)" }}>
              Start for free
              <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link href="/login"
              className="flex items-center gap-2 rounded-xl border px-6 py-3 text-[15px] font-semibold text-white/70 hover:text-white transition-all"
              style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}>
              Sign in
            </Link>
          </motion.div>

          {/* Social proof */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
            className="flex flex-wrap items-center justify-center gap-2">
            <div className="flex -space-x-2">
              {["#00c67a","#0091ff","#7c3aed","#f59e0b","#ef4444"].map((c,i) => (
                <div key={i} className="h-7 w-7 rounded-full border-2 flex items-center justify-center text-[10px] font-bold text-white"
                  style={{ borderColor: "#050810", background: c }}>
                  {String.fromCharCode(65 + i)}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-1.5 rounded-full border px-3 py-1.5"
              style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.03)" }}>
              <div className="flex">
                {[0,1,2,3,4].map(i => <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />)}
              </div>
              <span className="text-[12px] font-medium" style={{ color: "rgba(255,255,255,0.4)" }}>
                500+ SMEs trust Amanah
              </span>
            </div>
          </motion.div>
        </motion.div>

        {/* Floating ingredient cards */}
        <motion.div style={{ y: heroY }} className="relative z-10 mt-20 w-full max-w-lg mx-auto">
          <div className="rounded-2xl border p-5 space-y-2.5"
            style={{ background: "rgba(10,14,28,0.9)", borderColor: "rgba(255,255,255,0.07)", backdropFilter: "blur(20px)", boxShadow: "0 40px 80px rgba(0,0,0,0.5)" }}>
            {/* Card header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[13px] font-bold text-white">Instant Noodle Seasoning</p>
                <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>5 ingredients analysed</p>
              </div>
              <div className="rounded-lg px-2.5 py-1 text-[11px] font-bold"
                style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}>
                NON-COMPLIANT
              </div>
            </div>
            <IngBadge name="Salt (Sodium Chloride)" status="halal"    delay={0.5} />
            <IngBadge name="MSG (E621)"              status="halal"    delay={0.6} />
            <IngBadge name="Disodium Inosinate (E631)" status="doubtful" delay={0.7} />
            <IngBadge name="Lard"                    status="haram"    delay={0.8} />
            <IngBadge name="Palm Oil"                status="halal"    delay={0.9} />
            {/* Score bar */}
            <div className="pt-3 mt-1 border-t" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.3)" }}>Compliance Score</span>
                <span className="text-[13px] font-black" style={{ color: "#ef4444" }}>32 / 100</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                <motion.div className="h-full rounded-full" style={{ background: "#ef4444", width: "32%" }}
                  initial={{ width: 0 }} animate={{ width: "32%" }} transition={{ duration: 1, delay: 1, ease: "easeOut" }} />
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── STATS ────────────────────────────────────────────────────────────── */}
      <section className="relative py-20 px-6" style={{ borderTop: "1px solid rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <div className="mx-auto max-w-5xl">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
            className="grid grid-cols-2 gap-y-12 gap-x-8 md:grid-cols-4">
            {[
              { value: "50K+",  label: "Ingredients indexed",  color: "#00c67a" },
              { value: "98.7%", label: "Accuracy rate",        color: "#0091ff" },
              { value: "<3s",   label: "Per scan",             color: "#7c3aed" },
              { value: "500+",  label: "Companies onboarded",  color: "#f59e0b" },
            ].map((s, i) => (
              <motion.div key={i} variants={fadeUp} className="text-center">
                <p className="text-4xl font-black mb-1.5" style={{ color: s.color }}>{s.value}</p>
                <p className="text-[13px]" style={{ color: "rgba(255,255,255,0.35)" }}>{s.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-28 px-6">
        <div className="mx-auto max-w-6xl">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
            className="grid gap-16 lg:grid-cols-2 items-center">

            {/* Left: steps */}
            <div className="space-y-5">
              <motion.div variants={fadeUp}>
                <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "#00c67a" }}>How it works</span>
                <h2 className="mt-3 text-[2.4rem] font-black leading-[1.1] tracking-tight text-white">
                  From label to report<br />in 3 steps.
                </h2>
              </motion.div>

              {[
                { n: "01", title: "Upload the label", desc: "Photo, PDF, or screenshot. Drag & drop or browse. Batch mode handles dozens of files at once.", color: "#00c67a" },
                { n: "02", title: "AI scans every ingredient", desc: "Each compound is identified by name, E-code, or chemical alias — then checked against JAKIM standards.", color: "#0091ff" },
                { n: "03", title: "Download your report", desc: "Receive a full PDF with ingredient-level verdicts, risk scores, and JAKIM reference codes.", color: "#7c3aed" },
              ].map((s, i) => (
                <motion.div key={i} variants={fadeUp}
                  className="flex gap-5 rounded-2xl p-5 transition-all"
                  style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[13px] font-black"
                    style={{ background: `${s.color}15`, color: s.color, border: `1px solid ${s.color}25` }}>
                    {s.n}
                  </div>
                  <div>
                    <p className="text-[15px] font-bold text-white mb-1">{s.title}</p>
                    <p className="text-[13px] leading-relaxed" style={{ color: "rgba(255,255,255,0.4)" }}>{s.desc}</p>
                  </div>
                </motion.div>
              ))}

              <motion.div variants={fadeUp}>
                <Link href="/signup"
                  className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-[14px] font-bold text-white transition-all"
                  style={{ background: "#00c67a", boxShadow: "0 0 24px rgba(0,198,122,0.2)" }}>
                  Try it now <ArrowRight className="h-4 w-4" />
                </Link>
              </motion.div>
            </div>

            {/* Right: visual */}
            <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>
              <div className="rounded-2xl p-6 space-y-3"
                style={{ background: "rgba(10,14,28,0.8)", border: "1px solid rgba(255,255,255,0.06)", boxShadow: "0 32px 64px rgba(0,0,0,0.4)" }}>
                {/* Upload zone mock */}
                <div className="rounded-xl p-8 text-center"
                  style={{ border: "2px dashed rgba(0,198,122,0.25)", background: "rgba(0,198,122,0.03)" }}>
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl"
                    style={{ background: "rgba(0,198,122,0.1)" }}>
                    <ScanLine className="h-6 w-6" style={{ color: "#00c67a" }} />
                  </div>
                  <p className="text-[14px] font-semibold text-white mb-1">Drop product label here</p>
                  <p className="text-[12px]" style={{ color: "rgba(255,255,255,0.3)" }}>JPG, PNG, PDF · Max 25MB</p>
                </div>

                {/* Processing mock */}
                <div className="space-y-2">
                  {[
                    { label: "Extracting ingredient list", done: true },
                    { label: "Cross-referencing 50K+ records", done: true },
                    { label: "Running compliance check", active: true },
                    { label: "Generating PDF report", done: false },
                  ].map((s, i) => (
                    <div key={i} className={`flex items-center gap-3 rounded-lg px-3.5 py-2.5 ${s.active ? "bg-white/[0.04]" : ""}`}>
                      <div className={`h-2 w-2 rounded-full shrink-0 ${
                        s.done ? "" : s.active ? "animate-pulse" : ""
                      }`} style={{
                        background: s.done ? "#00c67a" : s.active ? "#00c67a" : "rgba(255,255,255,0.1)"
                      }} />
                      <span className="text-[13px] font-medium" style={{
                        color: s.done ? "rgba(255,255,255,0.5)" : s.active ? "#fff" : "rgba(255,255,255,0.2)"
                      }}>{s.label}</span>
                      {s.done && <CheckCircle2 className="ml-auto h-3.5 w-3.5 shrink-0" style={{ color: "#00c67a" }} />}
                    </div>
                  ))}
                </div>

                {/* Progress */}
                <div>
                  <div className="flex justify-between text-[11px] mb-1.5" style={{ color: "rgba(255,255,255,0.3)" }}>
                    <span>Analysing</span><span style={{ color: "#00c67a" }} className="font-mono font-bold">74%</span>
                  </div>
                  <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                    <motion.div className="h-full rounded-full" style={{ background: "linear-gradient(90deg, #00c67a, #00d4ff)" }}
                      initial={{ width: 0 }} whileInView={{ width: "74%" }} transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }} viewport={{ once: true }} />
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────────────────── */}
      <section id="features" className="py-28 px-6" style={{ background: "rgba(255,255,255,0.015)", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        <div className="mx-auto max-w-6xl">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
            className="mb-16 text-center">
            <motion.span variants={fadeUp} className="block text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: "#00c67a" }}>
              Platform
            </motion.span>
            <motion.h2 variants={fadeUp} className="text-[2.6rem] font-black tracking-tight text-white leading-[1.1]">
              Everything your compliance<br />team needs.
            </motion.h2>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
            className="grid gap-4 md:grid-cols-3">
            {[
              {
                icon: ScanLine, title: "Ingredient Scanner",
                desc: "Upload product images or PDFs. AI identifies every compound — by name, E-code, or chemical alias — and checks JAKIM compliance in seconds.",
                tags: ["E-code detection", "Batch mode", "Multi-language"],
                color: "#00c67a",
              },
              {
                icon: FileSearch, title: "Document Auditor",
                desc: "Verify halal certificates and supplier declarations. Flags expired certifications, discrepancies, and suspicious documents automatically.",
                tags: ["Certificate check", "Expiry alerts", "Forgery detection"],
                color: "#0091ff",
              },
              {
                icon: ActivitySquare, title: "Compliance Dashboard",
                desc: "Live overview of your entire product portfolio. Instant alerts when regulations change or certifications are about to lapse.",
                tags: ["Live monitoring", "Audit trail", "Regulatory feed"],
                color: "#7c3aed",
              },
            ].map((f) => {
              const Icon = f.icon;
              return (
                <motion.div key={f.title} variants={fadeUp}
                  className="group rounded-2xl p-6 transition-all hover:translate-y-[-2px]"
                  style={{ background: "rgba(10,14,28,0.6)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl"
                    style={{ background: `${f.color}12`, border: `1px solid ${f.color}20` }}>
                    <Icon className="h-5 w-5" style={{ color: f.color }} />
                  </div>
                  <h3 className="text-[16px] font-bold text-white mb-2">{f.title}</h3>
                  <p className="text-[13px] leading-relaxed mb-5" style={{ color: "rgba(255,255,255,0.38)" }}>{f.desc}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {f.tags.map(t => (
                      <span key={t} className="rounded-lg px-2.5 py-1 text-[11px] font-semibold"
                        style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.35)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        {t}
                      </span>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ── PRICING ──────────────────────────────────────────────────────────── */}
      <section id="pricing" className="py-28 px-6">
        <div className="mx-auto max-w-4xl">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
            className="mb-14 text-center">
            <motion.span variants={fadeUp} className="block text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: "#00c67a" }}>Pricing</motion.span>
            <motion.h2 variants={fadeUp} className="text-[2.4rem] font-black tracking-tight text-white">Simple pricing.</motion.h2>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
            className="grid gap-4 md:grid-cols-2">
            {/* Free */}
            <motion.div variants={fadeUp}
              className="rounded-2xl p-7"
              style={{ background: "rgba(10,14,28,0.6)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <p className="text-[13px] font-bold mb-5" style={{ color: "rgba(255,255,255,0.4)" }}>Free</p>
              <div className="mb-7">
                <span className="text-[3.2rem] font-black text-white leading-none">$0</span>
                <span className="text-[14px] ml-1" style={{ color: "rgba(255,255,255,0.3)" }}>/month</span>
              </div>
              <div className="space-y-3 mb-7">
                {["10 scans per month", "Single file upload", "Basic PDF report", "Dashboard access"].map(f => (
                  <div key={f} className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: "#00c67a" }} />
                    <span className="text-[14px]" style={{ color: "rgba(255,255,255,0.5)" }}>{f}</span>
                  </div>
                ))}
              </div>
              <Link href="/signup"
                className="flex items-center justify-center rounded-xl py-2.5 text-[14px] font-semibold transition-all"
                style={{ border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)" }}>
                Get started free
              </Link>
            </motion.div>

            {/* Pro */}
            <motion.div variants={fadeUp}
              className="relative rounded-2xl p-7 overflow-hidden"
              style={{ background: "rgba(0,198,122,0.05)", border: "1px solid rgba(0,198,122,0.2)", boxShadow: "0 0 60px rgba(0,198,122,0.08)" }}>
              <div className="absolute top-5 right-5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                style={{ background: "rgba(0,198,122,0.15)", color: "#00c67a", border: "1px solid rgba(0,198,122,0.25)" }}>
                Most popular
              </div>
              <p className="text-[13px] font-bold mb-5" style={{ color: "#00c67a" }}>Pro</p>
              <div className="mb-7">
                <span className="text-[3.2rem] font-black text-white leading-none">$49</span>
                <span className="text-[14px] ml-1" style={{ color: "rgba(255,255,255,0.3)" }}>/month</span>
              </div>
              <div className="space-y-3 mb-7">
                {["Unlimited scans", "Batch processing", "Full PDF reports", "Regulatory news feed", "Priority support", "API access"].map(f => (
                  <div key={f} className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: "#00c67a" }} />
                    <span className="text-[14px] text-white">{f}</span>
                  </div>
                ))}
              </div>
              <Link href="/signup"
                className="flex items-center justify-center gap-2 rounded-xl py-2.5 text-[14px] font-bold text-white transition-all"
                style={{ background: "#00c67a", boxShadow: "0 0 24px rgba(0,198,122,0.25)" }}>
                Start Pro trial <ArrowRight className="h-4 w-4" />
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────────── */}
      <section className="relative py-28 px-6 overflow-hidden" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full opacity-15"
            style={{ background: "radial-gradient(circle, #00c67a 0%, transparent 65%)" }} />
        </div>
        <div className="relative mx-auto max-w-3xl text-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
            <motion.h2 variants={fadeUp} className="text-[2.8rem] font-black tracking-tight text-white leading-[1.1] mb-5">
              Start ensuring<br />compliance today.
            </motion.h2>
            <motion.p variants={fadeUp} className="text-[16px] mb-10" style={{ color: "rgba(255,255,255,0.38)" }}>
              Join 500+ Malaysian food manufacturers who use Amanah to maintain JAKIM compliance.
            </motion.p>
            <motion.div variants={fadeUp} className="flex flex-wrap gap-3 justify-center">
              <Link href="/signup"
                className="flex items-center gap-2 rounded-xl px-7 py-3 text-[15px] font-bold text-white"
                style={{ background: "#00c67a", boxShadow: "0 0 40px rgba(0,198,122,0.3)" }}>
                Get started free <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/login"
                className="flex items-center gap-2 rounded-xl border px-7 py-3 text-[15px] font-semibold text-white/60 hover:text-white transition-colors"
                style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}>
                Sign in
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        <div className="mx-auto max-w-6xl px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-2.5">
            <div className="relative flex h-7 w-7 items-center justify-center">
              <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-[#00c67a] to-[#0091ff]" />
              <svg viewBox="0 0 24 24" fill="none" className="relative h-4 w-4">
                <path d="M12 2L4 6v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V6L12 2z" fill="white" fillOpacity="0.15" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="text-[14px] font-bold text-white">Amanah<span style={{ color: "#00c67a" }}>.</span></span>
          </div>
          <p className="text-[12px]" style={{ color: "rgba(255,255,255,0.2)" }}>
            © {new Date().getFullYear()} Amanah. Built for Malaysian SMEs.
          </p>
          <div className="flex gap-6">
            {["Privacy", "Terms", "Contact"].map(l => (
              <a key={l} href="#" className="text-[12px] transition-colors" style={{ color: "rgba(255,255,255,0.25)" }}>{l}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
