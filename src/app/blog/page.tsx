import type { Metadata } from "next";
import Link from "next/link";
import { BLOG_POSTS } from "@/lib/blog-posts";
import { ArrowRight, Clock, Tag } from "lucide-react";

export const metadata: Metadata = {
  title: "Halal Compliance Blog | Amanah AI",
  description:
    "Expert guides on JAKIM halal certification, E-number safety, supply chain management, and halal compliance for Malaysian SMEs.",
  openGraph: {
    title: "Halal Compliance Blog | Amanah AI",
    description:
      "Expert guides on JAKIM halal certification, E-number safety, supply chain management, and halal compliance for Malaysian SMEs.",
    type: "website",
  },
};

const categoryColors: Record<string, string> = {
  Certification: "bg-emerald-500/20 text-emerald-400",
  Ingredients:   "bg-blue-500/20 text-blue-400",
  "Supply Chain":"bg-violet-500/20 text-violet-400",
  Industry:      "bg-rose-500/20 text-rose-400",
  Marketing:     "bg-amber-500/20 text-amber-400",
};

export default function BlogPage() {
  const [featured, ...rest] = BLOG_POSTS;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Nav */}
      <nav className="border-b border-white/[0.06] bg-slate-950/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="mx-auto max-w-6xl px-6 flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-sm font-bold text-white">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-xs font-bold">A</span>
            Amanah AI
          </Link>
          <div className="flex items-center gap-6 text-sm text-slate-400">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <Link href="/blog" className="text-white font-medium">Blog</Link>
            <Link href="/dashboard" className="rounded-lg bg-emerald-600 px-4 py-1.5 text-white text-xs font-semibold hover:bg-emerald-500 transition-colors">
              Dashboard
            </Link>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-6 py-16">
        {/* Header */}
        <div className="mb-12 text-center">
          <span className="inline-block rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1 text-xs font-semibold text-emerald-400 mb-4">
            Halal Compliance Knowledge Base
          </span>
          <h1 className="text-4xl font-bold text-white mb-4">Expert Insights for<br />Halal Manufacturers</h1>
          <p className="text-slate-400 max-w-xl mx-auto">
            Practical guides on JAKIM certification, ingredient safety, supply chain compliance, and digital marketing for Malaysian halal businesses.
          </p>
        </div>

        {/* Featured Post */}
        <Link href={`/blog/${featured.slug}`} className="group block mb-12">
          <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${featured.coverGradient} p-px`}>
            <div className="rounded-3xl bg-slate-900 p-8 md:p-10">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${categoryColors[featured.category] ?? "bg-slate-700 text-slate-300"}`}>
                  {featured.category}
                </span>
                <span className="flex items-center gap-1 text-xs text-slate-500">
                  <Clock className="h-3 w-3" />{featured.readTime}
                </span>
                <span className="text-xs text-slate-600">{new Date(featured.date).toLocaleDateString("en-MY", { year: "numeric", month: "long", day: "numeric" })}</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-3 group-hover:text-emerald-300 transition-colors leading-snug">
                {featured.title}
              </h2>
              <p className="text-slate-400 mb-6 max-w-2xl leading-relaxed">{featured.excerpt}</p>
              <div className="flex flex-wrap gap-2 mb-6">
                {featured.tags.slice(0, 4).map((t) => (
                  <span key={t} className="flex items-center gap-1 rounded-full border border-white/[0.06] px-2.5 py-1 text-[10px] text-slate-500">
                    <Tag className="h-2.5 w-2.5" />{t}
                  </span>
                ))}
              </div>
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-400 group-hover:gap-3 transition-all">
                Read article <ArrowRight className="h-4 w-4" />
              </span>
            </div>
          </div>
        </Link>

        {/* Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
          {rest.map((post) => (
            <Link key={post.slug} href={`/blog/${post.slug}`} className="group block">
              <article className="h-full rounded-2xl border border-white/[0.06] bg-slate-900/60 p-6 hover:border-white/[0.12] hover:bg-slate-900 transition-all duration-200">
                <div className="flex items-center gap-3 mb-4">
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${categoryColors[post.category] ?? "bg-slate-700 text-slate-300"}`}>
                    {post.category}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-slate-600">
                    <Clock className="h-3 w-3" />{post.readTime}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-white mb-2 group-hover:text-emerald-300 transition-colors leading-snug line-clamp-2">
                  {post.title}
                </h2>
                <p className="text-sm text-slate-500 mb-4 line-clamp-3 leading-relaxed">{post.excerpt}</p>
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {post.tags.slice(0, 3).map((t) => (
                    <span key={t} className="rounded-full border border-white/[0.04] px-2 py-0.5 text-[10px] text-slate-600">{t}</span>
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-600">{new Date(post.date).toLocaleDateString("en-MY", { month: "short", year: "numeric" })}</span>
                  <span className="text-xs font-semibold text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                    Read <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </article>
            </Link>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-16 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-8 text-center">
          <h2 className="text-xl font-bold text-white mb-2">Ready to automate your halal compliance?</h2>
          <p className="text-slate-400 text-sm mb-6">Scan ingredient labels in seconds with AI-powered analysis. Free to start.</p>
          <Link
            href="/dashboard/scanner"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-500 transition-colors"
          >
            Start Free Scan <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] mt-16 py-8 text-center text-xs text-slate-600">
        © {new Date().getFullYear()} Amanah AI · Built for Malaysian Halal Compliance
      </footer>
    </div>
  );
}
