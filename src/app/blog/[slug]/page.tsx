import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { BLOG_POSTS, getPost } from "@/lib/blog-posts";
import { ArrowLeft, Clock, Tag, ArrowRight, User } from "lucide-react";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return BLOG_POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return { title: "Not Found" };
  return {
    title: `${post.title} | Amanah AI Blog`,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      publishedTime: post.date,
      authors: [post.author],
      tags: post.tags,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
    },
  };
}

const categoryColors: Record<string, string> = {
  Certification: "bg-emerald-500/20 text-emerald-400",
  Ingredients: "bg-blue-500/20 text-blue-400",
  "Supply Chain": "bg-violet-500/20 text-violet-400",
  Industry: "bg-rose-500/20 text-rose-400",
  Marketing: "bg-amber-500/20 text-amber-400",
};

// Minimal markdown renderer (headings, bold, tables, lists, links, code)
function renderMarkdown(md: string) {
  const lines = md.trim().split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  const inlineRender = (text: string): React.ReactNode => {
    const parts: React.ReactNode[] = [];
    let remaining = text;
    let key = 0;

    while (remaining.length > 0) {
      // Bold
      const boldMatch = remaining.match(/^(.*?)\*\*(.+?)\*\*(.*)/s);
      if (boldMatch) {
        if (boldMatch[1]) parts.push(boldMatch[1]);
        parts.push(<strong key={key++} className="text-white font-semibold">{boldMatch[2]}</strong>);
        remaining = boldMatch[3];
        continue;
      }
      // Inline code
      const codeMatch = remaining.match(/^(.*?)`(.+?)`(.*)/s);
      if (codeMatch) {
        if (codeMatch[1]) parts.push(codeMatch[1]);
        parts.push(<code key={key++} className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[0.85em] text-emerald-300 font-mono">{codeMatch[2]}</code>);
        remaining = codeMatch[3];
        continue;
      }
      // Link
      const linkMatch = remaining.match(/^(.*?)\[(.+?)\]\((.+?)\)(.*)/s);
      if (linkMatch) {
        if (linkMatch[1]) parts.push(linkMatch[1]);
        parts.push(<Link key={key++} href={linkMatch[3]} className="text-emerald-400 underline underline-offset-2 hover:text-emerald-300 transition-colors">{linkMatch[2]}</Link>);
        remaining = linkMatch[4];
        continue;
      }
      parts.push(remaining);
      break;
    }
    return parts.length === 1 ? parts[0] : <>{parts}</>;
  };

  while (i < lines.length) {
    const line = lines[i];

    // Table
    if (line.startsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].startsWith("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      const rows = tableLines.filter((l) => !l.match(/^\|[-| ]+\|$/));
      const [header, ...bodyRows] = rows;
      const headers = header.split("|").filter((_, idx, arr) => idx > 0 && idx < arr.length - 1).map((h) => h.trim());
      elements.push(
        <div key={i} className="overflow-x-auto my-6">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-white/[0.08]">
                {headers.map((h, idx) => (
                  <th key={idx} className="py-2 px-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">{inlineRender(h)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bodyRows.map((row, rIdx) => {
                const cells = row.split("|").filter((_, idx, arr) => idx > 0 && idx < arr.length - 1).map((c) => c.trim());
                return (
                  <tr key={rIdx} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                    {cells.map((c, cIdx) => (
                      <td key={cIdx} className="py-2.5 px-3 text-slate-300">{inlineRender(c)}</td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    // Headings
    if (line.startsWith("### ")) {
      elements.push(<h3 key={i} className="text-lg font-bold text-white mt-8 mb-3">{inlineRender(line.slice(4))}</h3>);
    } else if (line.startsWith("## ")) {
      elements.push(<h2 key={i} className="text-2xl font-bold text-white mt-10 mb-4 pb-2 border-b border-white/[0.06]">{inlineRender(line.slice(3))}</h2>);
    }
    // List item
    else if (line.match(/^[-*] /)) {
      const listItems: string[] = [];
      while (i < lines.length && lines[i].match(/^[-*] /)) {
        listItems.push(lines[i].slice(2));
        i++;
      }
      elements.push(
        <ul key={i} className="my-4 space-y-2 ml-4">
          {listItems.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 text-slate-300">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
              <span>{inlineRender(item)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }
    // Numbered list
    else if (line.match(/^\d+\. /)) {
      const listItems: string[] = [];
      while (i < lines.length && lines[i].match(/^\d+\. /)) {
        listItems.push(lines[i].replace(/^\d+\. /, ""));
        i++;
      }
      elements.push(
        <ol key={i} className="my-4 space-y-2 ml-4 list-decimal list-inside">
          {listItems.map((item, idx) => (
            <li key={idx} className="text-slate-300 leading-relaxed">{inlineRender(item)}</li>
          ))}
        </ol>
      );
      continue;
    }
    // Empty line
    else if (line.trim() === "") {
      // skip
    }
    // Paragraph
    else {
      elements.push(<p key={i} className="text-slate-300 leading-relaxed my-4">{inlineRender(line)}</p>);
    }

    i++;
  }

  return <>{elements}</>;
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const related = BLOG_POSTS.filter((p) => p.slug !== post.slug).slice(0, 2);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    author: { "@type": "Organization", name: post.author },
    datePublished: post.date,
    publisher: { "@type": "Organization", name: "Amanah AI", logo: { "@type": "ImageObject", url: "/favicon.ico" } },
    keywords: post.tags.join(", "),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="min-h-screen bg-slate-950 text-white">
        {/* Nav */}
        <nav className="border-b border-white/[0.06] bg-slate-950/80 backdrop-blur-xl sticky top-0 z-40">
          <div className="mx-auto max-w-4xl px-6 flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-2 text-sm font-bold text-white">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-xs font-bold">A</span>
              Amanah AI
            </Link>
            <div className="flex items-center gap-4 text-sm">
              <Link href="/blog" className="text-slate-400 hover:text-white transition-colors flex items-center gap-1.5">
                <ArrowLeft className="h-3.5 w-3.5" /> Blog
              </Link>
              <Link href="/dashboard" className="rounded-lg bg-emerald-600 px-4 py-1.5 text-white text-xs font-semibold hover:bg-emerald-500 transition-colors">
                Dashboard
              </Link>
            </div>
          </div>
        </nav>

        <main className="mx-auto max-w-4xl px-6 py-12">
          {/* Header */}
          <header className="mb-10">
            <div className="flex flex-wrap items-center gap-3 mb-5">
              <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${categoryColors[post.category] ?? "bg-slate-700 text-slate-300"}`}>
                {post.category}
              </span>
              <span className="flex items-center gap-1 text-xs text-slate-500">
                <Clock className="h-3 w-3" /> {post.readTime}
              </span>
              <span className="flex items-center gap-1 text-xs text-slate-500">
                <User className="h-3 w-3" /> {post.author}
              </span>
              <span className="text-xs text-slate-600">
                {new Date(post.date).toLocaleDateString("en-MY", { year: "numeric", month: "long", day: "numeric" })}
              </span>
            </div>

            <h1 className="text-3xl md:text-4xl font-bold text-white leading-snug mb-5">{post.title}</h1>
            <p className="text-lg text-slate-400 leading-relaxed border-l-2 border-emerald-500/40 pl-4">{post.excerpt}</p>

            <div className="flex flex-wrap gap-2 mt-5">
              {post.tags.map((t) => (
                <span key={t} className="flex items-center gap-1 rounded-full border border-white/[0.06] px-2.5 py-1 text-[10px] text-slate-500">
                  <Tag className="h-2.5 w-2.5" /> {t}
                </span>
              ))}
            </div>
          </header>

          {/* Divider */}
          <div className={`h-1 w-full rounded-full bg-gradient-to-r ${post.coverGradient} opacity-60 mb-10`} />

          {/* Content */}
          <article className="prose-invert max-w-none">
            {renderMarkdown(post.content)}
          </article>

          {/* CTA Box */}
          <div className="mt-14 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-7 flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="flex-1">
              <h3 className="text-base font-bold text-white mb-1">Put this knowledge into practice</h3>
              <p className="text-sm text-slate-400">Scan your ingredient list with AI in seconds — no spreadsheets needed.</p>
            </div>
            <Link
              href="/dashboard/scanner"
              className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 transition-colors"
            >
              Start Free Scan <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Related Posts */}
          {related.length > 0 && (
            <section className="mt-14">
              <h2 className="text-lg font-bold text-white mb-5">Related Articles</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {related.map((p) => (
                  <Link key={p.slug} href={`/blog/${p.slug}`} className="group block rounded-xl border border-white/[0.06] bg-slate-900/60 p-5 hover:border-white/[0.12] transition-all">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold mb-3 ${categoryColors[p.category] ?? "bg-slate-700 text-slate-300"}`}>
                      {p.category}
                    </span>
                    <h3 className="text-sm font-semibold text-white group-hover:text-emerald-300 transition-colors line-clamp-2 mb-2">{p.title}</h3>
                    <span className="text-xs text-slate-600 flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {p.readTime}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </main>

        <footer className="border-t border-white/[0.06] mt-16 py-8 text-center text-xs text-slate-600">
          © {new Date().getFullYear()} Amanah AI · Built for Malaysian Halal Compliance
        </footer>
      </div>
    </>
  );
}
