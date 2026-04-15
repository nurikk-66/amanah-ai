import Link from "next/link";
import { ShieldCheck, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-4 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-600/20 border border-emerald-500/20">
        <ShieldCheck className="h-8 w-8 text-emerald-400" />
      </div>
      <p className="text-6xl font-bold text-white mb-2">404</p>
      <h1 className="text-xl font-semibold text-slate-300 mb-2">Page not found</h1>
      <p className="text-sm text-slate-500 mb-8 max-w-xs">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-slate-800 px-5 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Home
        </Link>
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
