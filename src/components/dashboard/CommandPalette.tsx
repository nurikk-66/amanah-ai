"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ScanLine, FileText, X, ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

interface ScanRow  { id: string; scan_id: string; product_name: string; overall_status: string; }
interface DocRow   { id: string; name: string; doc_type: string; }

type Result =
  | { kind: "scan"; data: ScanRow }
  | { kind: "doc";  data: DocRow  }
  | { kind: "nav";  label: string; href: string };

const NAV_LINKS: Result[] = [
  { kind: "nav", label: "Overview",  href: "/dashboard" },
  { kind: "nav", label: "Scanner",   href: "/dashboard/scanner" },
  { kind: "nav", label: "Documents", href: "/dashboard/documents" },
  { kind: "nav", label: "Settings",  href: "/dashboard/settings" },
];

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery]     = useState("");
  const [results, setResults] = useState<Result[]>(NAV_LINKS);
  const [loading, setLoading] = useState(false);
  const [active, setActive]   = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (open) { setQuery(""); setResults(NAV_LINKS); setActive(0); setTimeout(() => inputRef.current?.focus(), 50); }
  }, [open]);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults(NAV_LINKS); return; }
    setLoading(true);
    const out: Result[] = [];

    if (supabase) {
      const [{ data: scans }, { data: docs }] = await Promise.all([
        supabase.from("scans").select("id,scan_id,product_name,overall_status").ilike("product_name", `%${q}%`).limit(5),
        supabase.from("documents").select("id,name,doc_type").ilike("name", `%${q}%`).limit(5),
      ]);
      (scans ?? []).forEach((s) => out.push({ kind: "scan", data: s as ScanRow }));
      (docs  ?? []).forEach((d) => out.push({ kind: "doc",  data: d as DocRow  }));
    }

    NAV_LINKS.filter((n) => n.kind === "nav" && n.label.toLowerCase().includes(q.toLowerCase()))
      .forEach((n) => out.push(n));

    setResults(out.length ? out : []);
    setLoading(false);
    setActive(0);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => search(query), 200);
    return () => clearTimeout(t);
  }, [query, search]);

  const select = (r: Result) => {
    if (r.kind === "nav")  router.push(r.href);
    if (r.kind === "scan") router.push("/dashboard/scanner");
    if (r.kind === "doc")  router.push("/dashboard/documents");
    onClose();
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    if (e.key === "Enter" && results[active]) select(results[active]);
    if (e.key === "Escape") onClose();
  };

  const statusColor = (s: string) =>
    s === "halal" ? "text-emerald-400" : s === "haram" ? "text-red-400" : "text-amber-400";

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ duration: 0.15 }}
            className="fixed left-1/2 top-[20vh] z-50 w-full max-w-xl -translate-x-1/2 rounded-2xl border border-white/[0.08] bg-slate-900 shadow-2xl overflow-hidden"
          >
            {/* Input */}
            <div className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-3">
              {loading ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-slate-500" /> : <Search className="h-4 w-4 shrink-0 text-slate-500" />}
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKey}
                placeholder="Search scans, documents, pages..."
                className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-600 outline-none"
              />
              {query && (
                <button onClick={() => setQuery("")} className="text-slate-600 hover:text-slate-400">
                  <X className="h-4 w-4" />
                </button>
              )}
              <kbd className="rounded border border-white/10 px-1.5 py-0.5 text-[10px] text-slate-600">ESC</kbd>
            </div>

            {/* Results */}
            <div className="max-h-80 overflow-y-auto py-2">
              {results.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-slate-600">No results found</p>
              ) : (
                results.map((r, i) => (
                  <button
                    key={i}
                    onClick={() => select(r)}
                    onMouseEnter={() => setActive(i)}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${i === active ? "bg-white/[0.06]" : "hover:bg-white/[0.03]"}`}
                  >
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                      r.kind === "scan" ? "bg-emerald-500/10" : r.kind === "doc" ? "bg-blue-500/10" : "bg-slate-800"
                    }`}>
                      {r.kind === "scan" ? <ScanLine className="h-3.5 w-3.5 text-emerald-400" /> :
                       r.kind === "doc"  ? <FileText  className="h-3.5 w-3.5 text-blue-400"    /> :
                                           <ArrowRight className="h-3.5 w-3.5 text-slate-400"  />}
                    </div>
                    <div className="flex-1 min-w-0">
                      {r.kind === "scan" && (
                        <>
                          <p className="text-sm font-medium text-white truncate">{r.data.product_name}</p>
                          <p className={`text-xs ${statusColor(r.data.overall_status)}`}>{r.data.scan_id} · {r.data.overall_status}</p>
                        </>
                      )}
                      {r.kind === "doc" && (
                        <>
                          <p className="text-sm font-medium text-white truncate">{r.data.name}</p>
                          <p className="text-xs text-slate-500">{r.data.doc_type}</p>
                        </>
                      )}
                      {r.kind === "nav" && (
                        <p className="text-sm font-medium text-white">{r.label}</p>
                      )}
                    </div>
                    {i === active && <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-600" />}
                  </button>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-white/[0.06] px-4 py-2 flex items-center gap-4 text-[10px] text-slate-600">
              <span><kbd className="mr-1 rounded border border-white/10 px-1">↑↓</kbd>Navigate</span>
              <span><kbd className="mr-1 rounded border border-white/10 px-1">↵</kbd>Select</span>
              <span><kbd className="mr-1 rounded border border-white/10 px-1">ESC</kbd>Close</span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
