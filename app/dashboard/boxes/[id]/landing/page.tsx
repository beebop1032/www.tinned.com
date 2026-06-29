"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { readStoredSession } from "@/lib/auth";
import { fetchMyBoxes } from "@/lib/vendor-api";
import { LandingEditor } from "@/components/landing/LandingEditor";
import type { Box, BoxType } from "@/lib/types";

const RESOURCE_PATH: Record<BoxType, string> = {
  store: "store_boxes",
  business: "business_boxes",
  blog: "blog_boxes",
  travel: "travel_boxes",
};

export default function VendorLandingPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const typeParam = (searchParams.get("type") ?? "store") as BoxType;
  const [box, setBox] = useState<Box | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const session = readStoredSession();
    if (!session?.token) {
      setError("Non connecté");
      setLoading(false);
      return;
    }
    fetchMyBoxes(session.token)
      .then((boxes) => {
        const found = boxes.find((b) => b.id === Number(id));
        if (found) {
          setBox(found);
        } else {
          setError("Box introuvable.");
        }
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p>Chargement…</p>;
  if (error) return <p>{error}</p>;
  if (!box) return <p>Box introuvable.</p>;

  const boxType = box.type ?? typeParam;
  const boxIri = `/api/${RESOURCE_PATH[boxType]}/${id}`;

  return (
    <div>
      <h1>Landing — {box.name}</h1>
      <LandingEditor boxIri={boxIri} boxSlug={box.slug} />
    </div>
  );
}
