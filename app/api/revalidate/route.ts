import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

/**
 * On-demand cache invalidation. The vendor/admin dashboards call this (same-origin)
 * after a catalog write so edits show up immediately instead of waiting for the TTL.
 * Invalidation only clears Next's data cache — it is non-destructive — so it is left
 * open to same-origin callers. Set REVALIDATE_SECRET to require an "x-revalidate-secret"
 * header (server-to-server callers only).
 */
export async function POST(request: NextRequest) {
  const secret = process.env.REVALIDATE_SECRET;
  if (secret && request.headers.get("x-revalidate-secret") !== secret) {
    return NextResponse.json({ revalidated: false }, { status: 401 });
  }

  let tags: string[] = ["catalog"];
  try {
    const body = (await request.json()) as { tags?: unknown };
    if (Array.isArray(body.tags) && body.tags.every((tag) => typeof tag === "string")) {
      tags = body.tags as string[];
    }
  } catch {
    // No/invalid body → fall back to the whole catalog.
  }

  tags.forEach((tag) => revalidateTag(tag));
  return NextResponse.json({ revalidated: true, tags });
}
