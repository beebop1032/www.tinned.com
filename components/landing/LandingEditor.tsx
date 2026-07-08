"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Loader2, Plus, Save, Trash2 } from "lucide-react";
import type { Block, BlockCatalog, BlockType } from "../../lib/blocks";
import { BLOCK_LABELS, fetchBlockCatalog } from "../../lib/blocks";
import { loadLanding, loadProductLanding, loadStandaloneLanding, saveLanding } from "../../lib/landing-api";
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

type LandingEditorProps =
  | { boxIri: string; boxSlug: string; standaloneSlug?: undefined; productIri?: undefined; productSlug?: undefined }
  | { standaloneSlug: string; boxIri?: undefined; boxSlug?: undefined; productIri?: undefined; productSlug?: undefined }
  | { productIri: string; productSlug: string; boxIri?: undefined; boxSlug?: undefined; standaloneSlug?: undefined };

export function LandingEditor(props: LandingEditorProps) {
  const standaloneSlug = props.standaloneSlug;
  const boxIri = props.boxIri;
  const boxSlug = props.boxSlug;
  const productIri = props.productIri;
  const productSlug = props.productSlug;
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
    const request = standaloneSlug
      ? loadStandaloneLanding(standaloneSlug, locale)
      : productSlug
      ? loadProductLanding(productSlug, locale)
      : loadLanding(boxSlug!, locale);
    request
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
  }, [boxSlug, standaloneSlug, productSlug, locale]);

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
        standaloneSlug
          ? { id, slug: standaloneSlug, locale, title, metaDescription: metaDescription || undefined, blocks }
          : productIri
          ? { id, productIri, locale, title, metaDescription: metaDescription || undefined, blocks }
          : { id, boxIri, locale, title, metaDescription: metaDescription || undefined, blocks },
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
      <div className="admin-locale-tabs">
        {LOCALES.map((l) => (
          <button
            key={l}
            type="button"
            className={l === locale ? "is-active" : undefined}
            onClick={() => setLocale(l)}
          >
            {l.toUpperCase()}
          </button>
        ))}
      </div>

      {error && (
        <div className="admin-alert is-error" role="status" style={{ whiteSpace: "pre-line" }}>
          {error}
        </div>
      )}

      {!loaded ? (
        <p className="admin-empty-inline">Chargement…</p>
      ) : (
        <>
          <div className="landing-meta">
            <label className="field">
              <span>Titre de la page</span>
              <input value={title} onChange={(e) => setTitle(e.target.value)} />
            </label>
            <label className="field">
              <span>Meta description</span>
              <input value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} />
            </label>
          </div>

          {blocks.map((b, i) => (
            <div key={b.id} className="admin-panel landing-block">
              <div className="landing-block-header">
                <span className="landing-block-type">{BLOCK_LABELS[b.type]}</span>
                <div className="landing-block-actions">
                  <button type="button" className="icon-button" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Monter le bloc">
                    <ChevronUp size={16} aria-hidden />
                  </button>
                  <button type="button" className="icon-button" disabled={i === blocks.length - 1} onClick={() => move(i, 1)} aria-label="Descendre le bloc">
                    <ChevronDown size={16} aria-hidden />
                  </button>
                  <button type="button" className="icon-button danger" onClick={() => removeAt(i)} aria-label="Supprimer le bloc">
                    <Trash2 size={16} aria-hidden />
                  </button>
                </div>
              </div>
              <div className="landing-block-body">
                <BlockForm block={b} onChange={(next) => updateBlockAt(i, next)} />
              </div>
            </div>
          ))}

          <div className="landing-editor-footer">
            <div className="landing-add">
              <span>Ajouter un bloc</span>
              <label className="field" style={{ minWidth: "200px" }}>
                <select value={addType} onChange={(e) => setAddType(e.target.value as BlockType)}>
                  {addableTypes.map((t) => (
                    <option key={t} value={t}>{BLOCK_LABELS[t]}</option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="button secondary"
                onClick={() => setBlocks((prev) => [...prev, makeBlock(addType)])}
              >
                <Plus size={16} aria-hidden />
                Ajouter
              </button>
            </div>
            <button type="button" className="button" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="spin" size={16} aria-hidden /> : <Save size={16} aria-hidden />}
              {saving ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
