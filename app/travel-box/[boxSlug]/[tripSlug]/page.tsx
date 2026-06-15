import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getBox, getTrip } from "@/lib/api";

type Props = { params: Promise<{ boxSlug: string; tripSlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tripSlug } = await params;
  const trip = await getTrip(tripSlug);
  return {
    title: trip ? `${trip.title} — Tinned` : "Not found",
  };
}

export default async function TripPage({ params }: Props) {
  const { boxSlug, tripSlug } = await params;
  const [box, trip] = await Promise.all([
    getBox("travel", boxSlug),
    getTrip(tripSlug),
  ]);
  if (!box || !trip) notFound();

  return (
    <article className="container" style={{ maxWidth: "720px", paddingTop: "clamp(40px, 6vw, 72px)", paddingBottom: "clamp(40px, 6vw, 72px)" }}>
      <Link
        href={`/travel-box/${boxSlug}`}
        style={{ display: "inline-flex", alignItems: "center", gap: "8px", color: "var(--muted)", fontSize: "14px", fontWeight: 600, marginBottom: "32px" }}
      >
        ← {box.name}
      </Link>

      {trip.publishedAt && (
        <p style={{ color: "var(--muted)", fontSize: "13px", fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: "16px" }}>
          {new Date(trip.publishedAt).toLocaleDateString("fr-BE", { day: "numeric", month: "long", year: "numeric" })}
        </p>
      )}

      <h1 style={{ marginBottom: "32px" }}>{trip.title}</h1>

      {trip.imagePath && (
        <div style={{ position: "relative", width: "100%", aspectRatio: "16/7", borderRadius: "4px", overflow: "hidden", marginBottom: "40px" }}>
          <Image
            src={trip.imagePath}
            alt={trip.title}
            fill
            style={{ objectFit: "cover" }}
            priority
          />
        </div>
      )}

      {trip.body && (
        <div style={{ color: "var(--ink)", fontSize: "17px", lineHeight: 1.75, whiteSpace: "pre-wrap" }}>
          {trip.body}
        </div>
      )}
    </article>
  );
}
