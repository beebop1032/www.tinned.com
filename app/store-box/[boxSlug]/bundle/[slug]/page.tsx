import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getBundle } from "@/lib/api";
import { BundleClient } from "@/components/BundleClient";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const bundle = await getBundle(slug);
  return bundle ? { title: bundle.name, description: bundle.description ?? undefined } : { title: "Box" };
}

export default async function BundlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const bundle = await getBundle(slug);
  if (!bundle) notFound();
  return <BundleClient bundle={bundle} />;
}
