import { Metadata } from "next";
import { notFound } from "next/navigation";
import ArticlePage from "@/components/resources/article-page";

export const dynamic = "force-dynamic";

async function getArticle(slug: string) {
  try {
    const base = process.env.NEXTAUTH_URL ?? "http://localhost:5000";
    const res = await fetch(`${base}/api/resources/articles/${slug}`, { cache: "no-store" });
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) return { title: "Not Found — Contentech" };
  return {
    title: article.seoTitle || `${article.title} — Contentech`,
    description: article.metaDescription || article.excerpt || undefined,
  };
}

export default async function ResourceArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) notFound();
  return <ArticlePage article={article} />;
}
