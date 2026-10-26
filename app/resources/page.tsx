import { Metadata } from "next";
import Link from "next/link";
import ResourcesHub from "@/components/resources/resources-hub";

export const metadata: Metadata = {
  title: "Resources — Contentech",
  description: "Guides, integrations, AI & LLM education, file format support, credits explained, and role-based help for every user of the Contentech platform.",
};

export const dynamic = "force-dynamic";

async function getCategories() {
  try {
    const base = process.env.NEXTAUTH_URL ?? "http://localhost:5000";
    const res = await fetch(`${base}/api/resources/categories`, { cache: "no-store" });
    return res.ok ? res.json() : [];
  } catch { return []; }
}

async function getFeaturedArticles() {
  try {
    const base = process.env.NEXTAUTH_URL ?? "http://localhost:5000";
    const res = await fetch(`${base}/api/resources/articles?featured=true&limit=8`, { cache: "no-store" });
    return res.ok ? res.json() : [];
  } catch { return []; }
}

async function getFeaturedFaqs() {
  try {
    const base = process.env.NEXTAUTH_URL ?? "http://localhost:5000";
    const res = await fetch(`${base}/api/resources/faq?featured=true`, { cache: "no-store" });
    return res.ok ? res.json() : [];
  } catch { return []; }
}

export default async function ResourcesPage() {
  const [categories, featuredArticles, featuredFaqs] = await Promise.all([
    getCategories(),
    getFeaturedArticles(),
    getFeaturedFaqs(),
  ]);
  return <ResourcesHub categories={categories} featuredArticles={featuredArticles} featuredFaqs={featuredFaqs} />;
}
