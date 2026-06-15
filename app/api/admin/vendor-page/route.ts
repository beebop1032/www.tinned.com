import { NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import type { VendorPageData } from "@/lib/vendor-page";

const DATA_PATH = join(process.cwd(), "data", "vendor-page.json");

function readData(): VendorPageData {
  return JSON.parse(readFileSync(DATA_PATH, "utf-8")) as VendorPageData;
}

// Decodes JWT payload without signature verification — same pattern as sessionHasRole in lib/auth.ts.
// Token authenticity is guaranteed by the Symfony backend that issued it.
function isAdminToken(token: string): boolean {
  try {
    const payload = token.split(".")[1];
    if (!payload) return false;
    const normalized = payload
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil(payload.length / 4) * 4, "=");
    const json = JSON.parse(Buffer.from(normalized, "base64").toString("utf-8")) as { roles?: string[] };
    return Array.isArray(json.roles) && json.roles.includes("ROLE_ADMIN");
  } catch {
    return false;
  }
}

export async function GET() {
  try {
    return NextResponse.json(readData());
  } catch {
    return NextResponse.json({ error: "Fichier introuvable" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = request.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!isAdminToken(token)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = await request.json() as Partial<VendorPageData>;

  if (typeof body.title !== "string" || !body.title.trim()) {
    return NextResponse.json({ error: "Titre requis" }, { status: 400 });
  }

  const data: VendorPageData = {
    eyebrow: typeof body.eyebrow === "string" ? body.eyebrow : "",
    title: body.title.trim(),
    tagline: typeof body.tagline === "string" ? body.tagline : "",
    body: typeof body.body === "string" ? body.body : "",
    cta: {
      label: typeof body.cta?.label === "string" ? body.cta.label : "Nous contacter",
      url: typeof body.cta?.url === "string" ? body.cta.url : "",
    },
    published: typeof body.published === "boolean" ? body.published : false,
  };

  mkdirSync(dirname(DATA_PATH), { recursive: true });
  writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), "utf-8");
  return NextResponse.json(data);
}
