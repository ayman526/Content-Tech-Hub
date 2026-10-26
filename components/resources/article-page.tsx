"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, BookOpen, ChevronDown, ChevronUp, Tag } from "lucide-react";
import { cn } from "@/lib/utils";

type Article = {
  id: string; title: string; subtitle?: string | null; slug: string;
  excerpt?: string | null; body: string; contentType: string;
  audiences: string[]; tags: string[]; icon?: string | null; featured: boolean;
  seoTitle?: string | null; metaDescription?: string | null;
  category?: { name: string; slug: string; color?: string | null } | null;
  author?: { name: string | null } | null;
  createdAt: string; updatedAt: string;
  related: Array<{ id: string; title: string; slug: string; excerpt?: string | null; category?: { name: string; slug: string } | null }>;
};

function MarkdownBody({ body }: { body: string }) {
  const lines = body.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith("## ")) {
      elements.push(<h2 key={i} className="text-xl font-bold text-[#33475B] mt-8 mb-3">{line.slice(3)}</h2>);
    } else if (line.startsWith("### ")) {
      elements.push(<h3 key={i} className="text-lg font-semibold text-[#33475B] mt-6 mb-2">{line.slice(4)}</h3>);
    } else if (line.startsWith("# ")) {
      elements.push(<h1 key={i} className="text-2xl font-bold text-[#33475B] mt-6 mb-4">{line.slice(2)}</h1>);
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      const items: string[] = [];
      while (i < lines.length && (lines[i].startsWith("- ") || lines[i].startsWith("* "))) {
        items.push(lines[i].slice(2));
        i++;
      }
      elements.push(
        <ul key={`ul-${i}`} className="list-disc list-inside space-y-1.5 my-3 text-[#516F90]">
          {items.map((item, j) => <li key={j}>{item}</li>)}
        </ul>
      );
      continue;
    } else if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s/, ""));
        i++;
      }
      elements.push(
        <ol key={`ol-${i}`} className="list-decimal list-inside space-y-1.5 my-3 text-[#516F90]">
          {items.map((item, j) => <li key={j}>{item}</li>)}
        </ol>
      );
      continue;
    } else if (line.startsWith("> ")) {
      elements.push(
        <blockquote key={i} className="border-l-4 border-[#0091AE] pl-4 py-1 my-4 text-[#516F90] italic bg-[#F5F8FA] rounded-r-xl">
          {line.slice(2)}
        </blockquote>
      );
    } else if (line.startsWith("```") || line.startsWith("~~~")) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```") && !lines[i].startsWith("~~~")) {
        codeLines.push(lines[i]);
        i++;
      }
      elements.push(
        <pre key={`code-${i}`} className="bg-[#33475B] text-green-300 rounded-xl p-4 my-4 overflow-x-auto text-sm font-mono">
          {codeLines.join("\n")}
        </pre>
      );
    } else if (line.trim() === "") {
      elements.push(<div key={i} className="h-3" />);
    } else {
      const rendered = line
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.+?)\*/g, "<em>$1</em>")
        .replace(/`(.+?)`/g, '<code class="bg-gray-100 px-1.5 py-0.5 rounded text-[#FF5A36] text-[13px] font-mono">$1</code>')
        .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="text-[#0091AE] underline hover:no-underline">$1</a>');
      elements.push(
        <p key={i} className="text-[#516F90] leading-relaxed my-2" dangerouslySetInnerHTML={{ __html: rendered }} />
      );
    }
    i++;
  }
  return <div className="text-base">{elements}</div>;
}

export default function ArticlePage({ article }: { article: Article }) {
  const readingTime = Math.max(1, Math.ceil(article.body.split(/\s+/).length / 200));

  return (
    <div className="min-h-screen bg-white pt-24">
      {/* Top bar */}
      <div className="border-b border-gray-100 bg-white">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-2 text-sm text-[#516F90]">
          <Link href="/resources" className="hover:text-[#0091AE] transition-colors flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Resources
          </Link>
          {article.category && (
            <>
              <span>/</span>
              <Link href={`/resources/category/${article.category.slug}`} className="hover:text-[#0091AE] transition-colors">
                {article.category.name}
              </Link>
            </>
          )}
          <span>/</span>
          <span className="text-[#33475B] font-medium truncate">{article.title}</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-10">
          {article.icon && <div className="text-4xl mb-4">{article.icon}</div>}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {article.category && (
              <Link
                href={`/resources/category/${article.category.slug}`}
                className="text-xs font-semibold px-3 py-1 rounded-full"
                style={{
                  background: `${article.category.color ?? "#0091AE"}18`,
                  color: article.category.color ?? "#0091AE",
                }}
              >
                {article.category.name}
              </Link>
            )}
            {article.audiences.map((aud) => (
              <span key={aud} className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                {aud}
              </span>
            ))}
            <span className="text-xs text-[#99ACC2]">{readingTime} min read</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-[#33475B] mb-3 leading-tight">{article.title}</h1>
          {article.subtitle && (
            <p className="text-lg text-[#516F90] mb-3">{article.subtitle}</p>
          )}
          {article.excerpt && (
            <p className="text-base text-[#516F90] border-l-4 border-[#FF7A59] pl-4 italic">{article.excerpt}</p>
          )}
        </div>

        {/* Body */}
        <div className="mb-12">
          <MarkdownBody body={article.body} />
        </div>

        {/* Tags */}
        {article.tags.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap mb-12">
            <Tag className="w-3.5 h-3.5 text-[#99ACC2]" />
            {article.tags.map((tag) => (
              <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{tag}</span>
            ))}
          </div>
        )}

        {/* Related Articles */}
        {article.related.length > 0 && (
          <div className="border-t border-gray-100 pt-10">
            <h2 className="text-lg font-semibold text-[#33475B] mb-5">Related resources</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {article.related.map((rel) => (
                <Link
                  key={rel.id}
                  href={`/resources/${rel.slug}`}
                  className="group border border-[#CBD6E2] rounded-xl p-4 hover:border-[#0091AE] transition-all"
                  data-testid={`related-${rel.slug}`}
                >
                  {rel.category && (
                    <p className="text-[11px] font-semibold text-[#0091AE] mb-1.5 uppercase tracking-wide">{rel.category.name}</p>
                  )}
                  <p className="font-medium text-[#33475B] group-hover:text-[#0091AE] transition-colors text-sm">{rel.title}</p>
                  {rel.excerpt && <p className="text-xs text-[#516F90] mt-1 line-clamp-2">{rel.excerpt}</p>}
                  <div className="flex items-center gap-1 mt-2 text-[#0091AE] text-xs font-medium">
                    Read <ArrowRight className="w-3 h-3" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Back link */}
        <div className="border-t border-gray-100 pt-8 mt-10">
          <Link href="/resources" className="flex items-center gap-2 text-sm text-[#0091AE] font-medium hover:underline w-fit">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to all resources
          </Link>
        </div>
      </div>
    </div>
  );
}
