"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-4 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/20 border border-red-500/20">
        <AlertTriangle className="h-8 w-8 text-red-400" />
      </div>
      <p className="text-4xl font-bold text-white mb-2">500</p>
      <h1 className="text-xl font-semibold text-slate-300 mb-2">Something went wrong</h1>
      <p className="text-sm text-slate-500 mb-2 max-w-xs">
        An unexpected error occurred. Our team has been notified.
      </p>
      {error.digest && (
        <p className="text-xs text-slate-600 mb-6 font-mono">Error ID: {error.digest}</p>
      )}
      <div className="flex items-center gap-3">
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-slate-800 px-5 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-700 transition-colors"
        >
          <RotateCcw className="h-4 w-4" /> Try again
        </button>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 transition-colors"
        >
          Dashboard
        </Link>
      </div>
    </div>
  );
}
