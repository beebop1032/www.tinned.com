import { readFileSync } from "fs";
import { join } from "path";

export type VendorPageData = {
  eyebrow: string;
  title: string;
  tagline: string;
  body: string;
  cta: { label: string; url: string };
  published: boolean;
};

const DATA_PATH = join(process.cwd(), "data", "vendor-page.json");

export function readVendorPage(): VendorPageData | null {
  try {
    return JSON.parse(readFileSync(DATA_PATH, "utf-8")) as VendorPageData;
  } catch {
    return null;
  }
}
