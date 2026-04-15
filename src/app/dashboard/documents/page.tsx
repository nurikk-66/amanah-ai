"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import {
  Upload, FileText, CheckCircle2, Clock, AlertTriangle,
  Download, Trash2, X, Loader2, Plus, FolderOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Doc {
  id: string;
  name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  doc_type: string;
  expires_at: string | null;
  created_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const DOC_TYPES = ["Certificate", "Declaration", "Lab Report", "MSDS", "Audit Report", "Other"];

function getStatus(expiresAt: string | null): "valid" | "expiring" | "expired" {
  if (!expiresAt) return "valid";
  const exp = new Date(expiresAt);
  const now = new Date();
  if (exp < now) return "expired";
  if (exp < new Date(now.getTime() + 30 * 86400000)) return "expiring";
  return "valid";
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const statusCfg = {
  valid:    { icon: CheckCircle2,  cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", label: "Valid"    },
  expiring: { icon: Clock,         cls: "bg-amber-500/10 text-amber-400 border-amber-500/20",       label: "Expiring" },
  expired:  { icon: AlertTriangle, cls: "bg-red-500/10 text-red-400 border-red-500/20",             label: "Expired"  },
};

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DocumentsPage() {
  const [docs, setDocs]         = useState<Doc[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting]  = useState<string | null>(null);
  const [error, setError]        = useState<string | null>(null);

  // Form state
  const [file, setFile]         = useState<File | null>(null);
  const [docName, setDocName]   = useState("");
  const [docType, setDocType]   = useState("Certificate");
  const [expiresAt, setExpiresAt] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocs = useCallback(async () => {
    if (!supabase) { setLoading(false); return; }
    const { data, error: err } = await supabase
      .from("documents")
      .select("*")
      .order("created_at", { ascending: false });
    if (!err) setDocs((data as Doc[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  const resetForm = () => {
    setFile(null);
    setDocName("");
    setDocType("Certificate");
    setExpiresAt("");
    setError(null);
  };

  const handleUpload = async () => {
    if (!file || !supabase) return;
    setUploading(true);
    setError(null);

    try {
      const filePath = `${Date.now()}-${file.name.replace(/\s+/g, "_")}`;

      const { error: storageErr } = await supabase.storage
        .from("DOCUMENT")
        .upload(filePath, file);
      if (storageErr) throw storageErr;

      const { error: dbErr } = await supabase.from("documents").insert({
        name:      docName || file.name,
        file_path: filePath,
        file_size: file.size,
        file_type: file.type,
        doc_type:  docType,
        expires_at: expiresAt || null,
      });
      if (dbErr) throw dbErr;

      resetForm();
      setShowModal(false);
      fetchDocs();
    } catch (err) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      setError(msg);
      console.error("[upload]", err);
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = (doc: Doc) => {
    if (!supabase) return;
    const { data } = supabase.storage.from("DOCUMENT").getPublicUrl(doc.file_path);
    window.open(data.publicUrl, "_blank");
  };

  const handleDelete = async (doc: Doc) => {
    if (!supabase) return;
    setDeleting(doc.id);
    await supabase.storage.from("DOCUMENT").remove([doc.file_path]);
    await supabase.from("documents").delete().eq("id", doc.id);
    setDeleting(null);
    fetchDocs();
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl">

      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {loading ? "Loading..." : `${docs.length} document${docs.length !== 1 ? "s" : ""} stored`}
        </p>
        <Button onClick={() => setShowModal(true)} className="bg-emerald-600 text-white hover:bg-emerald-500">
          <Plus className="mr-2 h-4 w-4" /> Upload Document
        </Button>
      </div>

      {/* Error banner */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3"
          >
            <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
            <p className="flex-1 text-sm text-red-300">{error}</p>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Documents list */}
      <div className="rounded-2xl border border-white/[0.06] bg-slate-900/60 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
          </div>
        ) : docs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800/80 mb-4">
              <FolderOpen className="h-7 w-7 text-slate-600" />
            </div>
            <p className="text-sm font-medium text-slate-400 mb-1">No documents yet</p>
            <p className="text-xs text-slate-600 mb-5">Upload certificates, lab reports, and supplier declarations</p>
            <Button onClick={() => setShowModal(true)} className="bg-emerald-600 text-white hover:bg-emerald-500">
              <Plus className="mr-2 h-4 w-4" /> Upload first document
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {docs.map((doc, i) => {
              const status = getStatus(doc.expires_at);
              const cfg = statusCfg[status];
              const Icon = cfg.icon;
              return (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="group flex items-center gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.04]">
                    <FileText className="h-5 w-5 text-slate-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{doc.name}</p>
                    <p className="text-xs text-slate-500">
                      {doc.doc_type} · {formatSize(doc.file_size)}
                      {doc.expires_at && ` · Expires: ${new Date(doc.expires_at).toLocaleDateString("en-MY")}`}
                    </p>
                  </div>
                  <span className={`hidden sm:inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${cfg.cls}`}>
                    <Icon className="h-3 w-3" />{cfg.label}
                  </span>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleDownload(doc)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.05] text-slate-400 hover:text-white transition-colors"
                      title="Download"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(doc)}
                      disabled={deleting === doc.id}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.05] text-slate-400 hover:text-red-400 transition-colors disabled:opacity-50"
                      title="Delete"
                    >
                      {deleting === doc.id
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Trash2 className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Upload Modal ── */}
      <AnimatePresence>
        {showModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
              onClick={() => { if (!uploading) { setShowModal(false); resetForm(); } }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-white/[0.08] bg-slate-900 p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-base font-semibold text-white">Upload Document</h2>
                <button
                  onClick={() => { if (!uploading) { setShowModal(false); resetForm(); } }}
                  className="text-slate-500 hover:text-white transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* File picker */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${
                    file
                      ? "border-emerald-500/40 bg-emerald-500/5"
                      : "border-white/10 hover:border-white/20 hover:bg-white/[0.02]"
                  }`}
                >
                  <Upload className={`mb-2 h-6 w-6 ${file ? "text-emerald-400" : "text-slate-500"}`} />
                  {file ? (
                    <>
                      <p className="text-sm font-medium text-emerald-400 truncate max-w-full px-4">{file.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{formatSize(file.size)}</p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-slate-400">Click to select file</p>
                      <p className="text-xs text-slate-600 mt-0.5">PDF, JPG, PNG, DOC — max 50 MB</p>
                    </>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) { setFile(f); if (!docName) setDocName(f.name.replace(/\.[^/.]+$/, "")); }
                    e.target.value = "";
                  }}
                />

                {/* Document name */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-400">Document Name</label>
                  <input
                    value={docName}
                    onChange={(e) => setDocName(e.target.value)}
                    placeholder="e.g. JAKIM Halal Cert — Palm Oil"
                    className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none focus:border-emerald-500/40 transition-colors"
                  />
                </div>

                {/* Doc type */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-400">Document Type</label>
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value)}
                    className="w-full rounded-xl border border-white/[0.08] bg-slate-800 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500/40 transition-colors"
                  >
                    {DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                {/* Expiry date */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-400">
                    Expiry Date <span className="text-slate-600">(optional)</span>
                  </label>
                  <input
                    type="date"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500/40 transition-colors"
                  />
                </div>

                {/* Upload error */}
                {error && (
                  <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>
                )}
              </div>

              <div className="mt-6 flex gap-3">
                <Button
                  variant="ghost"
                  onClick={() => { if (!uploading) { setShowModal(false); resetForm(); } }}
                  disabled={uploading}
                  className="flex-1 border border-white/10 text-slate-400 hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpload}
                  disabled={!file || uploading}
                  className="flex-1 bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50"
                >
                  {uploading
                    ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Uploading...</>
                    : <><Upload className="mr-2 h-4 w-4" />Upload</>}
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" className="hidden" />
    </div>
  );
}
