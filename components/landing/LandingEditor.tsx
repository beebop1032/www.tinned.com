"use client";

import { useEffect, useState } from "react";
import type { Block, BlockCatalog, BlockType } from "../../lib/blocks";
import { BLOCK_LABELS, fetchBlockCatalog } from "../../lib/blocks";
import { loadLanding, saveLanding } from "../../lib/landing-api";
import { readStoredSession } from "../../lib/auth";
import { BlockForm } from "./BlockForm";

const LOCALES = ["fr", "nl", "en", "it", "es", "de"] as const;

function genId(): string {
  return "b_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function makeBlock(type: BlockType): Block {
  const id = genId();
  switch (type) {
    case "hero":        return { id, type, title: "" };
    case "richText":    return { id, type, markdown: "" };
    case "gallery":     return { id, type, images: [] };
    case "cta":         return { id, type, heading: "", button: { label: "", href: "" } };
    case "collection":  return { id, type, source: "products" };
    case "features":    return { id, type, items: [] };
    case "stats":       return { id, type, items: [] };
    case "testimonial": return { id, type, quote: "" };
    case "faq":         return { id, type, items: [] };
    case "video":       return { id, type, url: "" };
    case "newsletter":  return { id, type, title: "" };
  }
}

export function LandingEditor({ boxIri, boxSlug }: { boxIri: string; boxSlug: string }) {
  const [locale, setLocale] = useState("fr");
  const [id, setId] = useState<number | undefined>(undefined);
  const [title, setTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [catalog, setCatalog] = useState<BlockCatalog | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [addType, setAddType] = useState<BlockType>("hero");

  // Types proposés au menu « Ajouter un bloc » : pilotés par le catalogue de l'API
  // (/api/block_catalog = source de vérité), repli sur le miroir statique si l'endpoint
  // est indisponible, filtrés aux types connus du front (qui ont un libellé).
  const addableTypes = (catalog ? Object.keys(catalog.types) : Object.keys(BLOCK_LABELS))
    .filter((t): t is BlockType => t in BLOCK_LABELS);

  useEffect(() => {
    fetchBlockCatalog(process.env.NEXT_PUBLIC_API_URL ?? "").then(setCatalog);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    loadLanding(boxSlug, locale)
      .then((landing) => {
        if (cancelled) return;
        if (landing) {
          setId(landing.id);
          setTitle(landing.title);
          setMetaDescription(landing.metaDescription ?? "");
          setBlocks(landing.blocks);
        } else {
          setId(undefined);
          setTitle("");
          setMetaDescription("");
          setBlocks([]);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setId(undefined);
        setTitle("");
        setMetaDescription("");
        setBlocks([]);
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [boxSlug, locale]);

  function updateBlockAt(i: number, next: Block) {
    setBlocks((prev) => prev.map((b, idx) => (idx === i ? next : b)));
  }

  function move(i: number, dir: -1 | 1) {
    setBlocks((prev) => {
      const copy = [...prev];
      const j = i + dir;
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  }

  function removeAt(i: number) {
    setBlocks((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSave() {
    const session = readStoredSession();
    if (!session?.token) {
      setError("Non connecté");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const result = await saveLanding(
        { id, boxIri, locale, title, metaDescription: metaDescription || undefined, blocks },
        session.token,
      );
      setId(result.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      {/* Locale selector */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
        {LOCALES.map((l) => (
          <button
            key={l}
            type="button"
            className={l === locale ? "pill" : undefined}
            onClick={() => setLocale(l)}
          >
            {l.toUpperCase()}
          </button>
        ))}
      </div>

      {error && (
        <p style={{ color: "crimson", whiteSpace: "pre-line", marginBottom: "1rem" }}>{error}</p>
      )}

      {!loaded ? (
        <p>Chargement…</p>
      ) : (
        <>
          <label className="field">
            <span>Titre de la page</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>

          <label className="field">
            <span>Meta description</span>
            <input value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} />
          </label>

          {/* Blocks list */}
          {blocks.map((b, i) => (
            <div key={b.id} className="admin-panel" style={{ marginBottom: "1rem", padding: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
                <strong>{BLOCK_LABELS[b.type]}</strong>
                <button type="button" disabled={i === 0} onClick={() => move(i, -1)}>↑</button>
                <button type="button" disabled={i === blocks.length - 1} onClick={() => move(i, 1)}>↓</button>
                <button type="button" onClick={() => removeAt(i)}>✕</button>
              </div>
              <BlockForm block={b} onChange={(next) => updateBlockAt(i, next)} />
            </div>
          ))}

          {/* Add block */}
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "1rem" }}>
            <select value={addType} onChange={(e) => setAddType(e.target.value as BlockType)}>
              {addableTypes.map((t) => (
                <option key={t} value={t}>{BLOCK_LABELS[t]}</option>
              ))}
            </select>
            <button
              type="button"
              className="button"
              onClick={() => setBlocks((prev) => [...prev, makeBlock(addType)])}
            >
              Ajouter
            </button>
          </div>

          {/* Save */}
          <button type="button" className="button" onClick={handleSave} disabled={saving}>
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </>
      )}
    </div>
  );
}
