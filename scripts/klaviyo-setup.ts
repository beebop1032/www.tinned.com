import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const envPath = join(process.cwd(), ".env.local");
const envContent = readFileSync(envPath, "utf-8");
const apiKey = envContent.match(/^KLAVIYO_API_KEY=(.+)$/m)?.[1]?.trim();

if (!apiKey) {
  console.error("❌ KLAVIYO_API_KEY introuvable dans .env.local");
  process.exit(1);
}

async function main() {
  console.log("Création de la liste Klaviyo \"Tinned Newsletter\"...");

  const res = await fetch("https://a.klaviyo.com/api/lists/", {
    method: "POST",
    headers: {
      "Authorization": `Klaviyo-API-Key ${apiKey}`,
      "revision": "2024-02-15",
      "content-type": "application/json",
      "accept": "application/json",
    },
    body: JSON.stringify({
      data: {
        type: "list",
        attributes: { name: "Tinned Newsletter" },
      },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error("❌ Erreur Klaviyo :", JSON.stringify(err, null, 2));
    process.exit(1);
  }

  const data = await res.json() as { data: { id: string } };
  const listId = data.data.id;

  // Écrire le List ID dans .env.local
  const updated = envContent.replace(/^KLAVIYO_LIST_ID=.*$/m, `KLAVIYO_LIST_ID=${listId}`);
  writeFileSync(envPath, updated, "utf-8");

  console.log(`\n✅ Liste créée ! List ID : ${listId}`);
  console.log("✅ KLAVIYO_LIST_ID écrit dans .env.local");
  console.log("\n⚠️  Active le double opt-in dans Klaviyo :");
  console.log("   Klaviyo → Lists → Tinned Newsletter → Settings → Double Opt-In → Enable\n");
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
