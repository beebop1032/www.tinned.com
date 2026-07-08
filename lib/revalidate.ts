/**
 * Fire-and-forget cache invalidation. Called from the vendor/admin dashboards after a
 * catalog write so the public site reflects the change on the next request. Failures are
 * swallowed: a stale cache is not worth breaking the save flow over.
 */
export async function revalidateCatalog(tags: string[] = ["catalog"]): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    await fetch("/api/revalidate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tags }),
    });
  } catch {
    // Best-effort only.
  }
}
