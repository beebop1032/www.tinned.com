import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadStandaloneLanding } from "@/lib/landing-api";
import { LandingBlocks } from "@/components/landing/LandingBlocks";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const landing = await loadStandaloneLanding(slug, "fr");
  return {
    title: landing ? landing.title : "Not found",
    description: landing?.metaDescription ?? undefined,
  };
}

export default async function StandaloneLandingPage({ params }: Props) {
  const { slug } = await params;
  const landing = await loadStandaloneLanding(slug, "fr");
  if (!landing) notFound();

  return <LandingBlocks landing={landing} box={null} />;
}
