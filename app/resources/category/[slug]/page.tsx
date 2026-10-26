import { Metadata } from "next";
import { notFound } from "next/navigation";
import CategoryHub from "@/components/resources/category-hub";

export const dynamic = "force-dynamic";

async function getCategoryData(slug: string) {
  try {
    const base = process.env.NEXTAUTH_URL ?? "http://localhost:5000";
    const [catsRes, articlesRes, faqsRes] = await Promise.all([
      fetch(`${base}/api/resources/categories`, { cache: "no-store" }),
      fetch(`${base}/api/resources/articles?category=${slug}`, { cache: "no-store" }),
      fetch(`${base}/api/resources/faq?category=${slug}`, { cache: "no-store" }),
    ]);
    const cats = catsRes.ok ? await catsRes.json() : [];
    const category = cats.find((c: any) => c.slug === slug);
    const articles = articlesRes.ok ? await articlesRes.json() : [];
    const faqs = faqsRes.ok ? await faqsRes.json() : [];
    return { category, articles, faqs };
  } catch { return { category: null, articles: [], faqs: [] }; }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const { category } = await getCategoryData(slug);
  if (!category) return { title: "Not Found — Contentech" };
  return {
    title: `${category.name} — Resources — Contentech`,
    description: category.description ?? `Resources and guides for ${category.name}`,
  };
}

export default async function ResourceCategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { category, articles, faqs } = await getCategoryData(slug);
  if (!category) notFound();
  return <CategoryHub category={category} articles={articles} faqs={faqs} />;
}
