import { readFileSync } from "fs";
import { join } from "path";

export type NewsletterBlockData = {
  eyebrow: string;
  title: string;
  body: string;
  placeholder: string;
  cta: string;
  published: boolean;
};

const DATA_PATH = join(process.cwd(), "data", "newsletter-block.json");

export function readNewsletterBlock(): NewsletterBlockData | null {
  try {
    return JSON.parse(readFileSync(DATA_PATH, "utf-8")) as NewsletterBlockData;
  } catch {
    return null;
  }
}
