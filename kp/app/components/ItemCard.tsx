"use client";

import { useRef } from "react";
import { OrderItem, PriceTier, emptyTier, DESC_LIMIT, FEAT_LIMIT, parsePrice, formatPrice } from "@/types/order";
import { PRODUCTS } from "@/data/products";

interface Props {
  item: OrderItem;
  index: number;
  totalItems: number;
  onChange: (patch: Partial<OrderItem>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

const BRAND = "#1400c8";
const WARN = "#cc4400";

export default function ItemCard({
  item, index, totalItems, onChange, onDelete, onDuplicate, onMoveUp, onMoveDown,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Price tiers ──────────────────────────────────────────────
  function patchTier(ti: number, patch: Partial<PriceTier>) {
    const tiers = item.priceTiers.map((t, i) => {
      if (i !== ti) return t;
      const next = { ...t, ...patch };
      // Auto-calc total when qty or price change
      if ("quantity" in patch || "unitPrice" in patch) {
        const q = parsePrice(next.quantity);
        const p = parsePrice(next.unitPrice);
        if (!isNaN(q) && !isNaN(p)) next.totalPrice = String(Math.round(q * p));
      }
      return next;
    });
    onChange({ priceTiers: tiers });
  }

  function addTier() {
    onChange({ priceTiers: [...item.priceTiers, emptyTier()] });
  }

  function removeTier(ti: number) {
    if (item.priceTiers.length === 1) return;
    onChange({ priceTiers: item.priceTiers.filter((_, i) => i !== ti) });
  }

  // ── Image upload ─────────────────────────────────────────────
  // Compress to max 1200px / JPEG 85% before storing as base64.
  // Prevents 413 "Request Entity Too Large" when submitting the form.
  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      const MAX = 1200;
      let { width, height } = img;
      if (width > MAX || height > MAX) {
        if (width >= height) { height = Math.round(height * MAX / width); width = MAX; }
        else                 { width  = Math.round(width  * MAX / height); height = MAX; }
      }
      const canvas = document.createElement("canvas");
      canvas.width  = width;
      canvas.height = height;
      canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      onChange({ imageDataUrl: dataUrl, imagePath: undefined });
      URL.revokeObjectURL(objectUrl);
    };
    img.src = objectUrl;
  }

  const hasImage = item.imageDataUrl || item.imagePath;
  const imgSrc = item.imageDataUrl || item.imagePath || null;
  const descOver = item.description.length > DESC_LIMIT;
  const featOver = item.features.length > FEAT_LIMIT;

  // Collapsed summary
  const firstTier = item.priceTiers[0];
  const collapseTotal = (() => {
    const t = parsePrice(firstTier?.totalPrice ?? "");
    const q = parsePrice(firstTier?.quantity ?? "");
    const p = parsePrice(firstTier?.unitPrice ?? "");
    if (!isNaN(t) && t > 0) return t;
    if (!isNaN(q) && !isNaN(p)) return q * p;
    return null;
  })();

  return (
    <div style={{
      background: "white",
      borderRadius: "12px",
      border: `1.5px solid ${item.collapsed ? "#e8e8f0" : BRAND}`,
      overflow: "hidden",
    }}>
      {/* Header */}
      <div
        style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px 14px", background: item.collapsed ? "white" : "#f8f7ff", cursor: "pointer", userSelect: "none" }}
        onClick={() => onChange({ collapsed: !item.collapsed })}
      >
        <span style={{ minWidth: "24px", height: "24px", borderRadius: "6px", background: BRAND, color: "white", fontSize: "11px", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          {index + 1}
        </span>
        <span style={{ fontSize: "13px", fontWeight: 600, color: item.name ? "#0d0d0d" : "#aaa", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {item.name || "Без названия"}
        </span>
        {item.collapsed && collapseTotal !== null && (
          <span style={{ fontSize: "12px", color: "#555", whiteSpace: "nowrap" }}>
            {firstTier?.quantity || "?"} шт · {formatPrice(collapseTotal)}
          </span>
        )}
        {item.collapsed && item.priceTiers.length > 1 && (
          <span style={{ fontSize: "10px", color: BRAND, background: "#eeeeff", borderRadius: "4px", padding: "2px 6px", fontWeight: 600 }}>
            {item.priceTiers.length} тиража
          </span>
        )}
        {item.source === "catalog" && (
          <span style={{ fontSize: "10px", background: "#eeeeff", color: BRAND, borderRadius: "4px", padding: "2px 6px", fontWeight: 600, flexShrink: 0 }}>
            каталог
          </span>
        )}
        <span style={{ color: "#aaa", fontSize: "14px", flexShrink: 0 }}>{item.collapsed ? "▼" : "▲"}</span>
      </div>

      {/* Body */}
      {!item.collapsed && (
        <div style={{ padding: "16px 14px 14px", borderTop: "1px solid #f0f0f8" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>

            {/* Name */}
            <div style={{ gridColumn: "1 / -1" }}>
              <FieldLabel>Название изделия</FieldLabel>
              <input style={inp} placeholder="Футболка Oversize Premium" value={item.name} onChange={(e) => onChange({ name: e.target.value })} />
            </div>

            {/* Description */}
            <div style={{ gridColumn: "1 / -1" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                <FieldLabel noMargin>Описание</FieldLabel>
                <span style={{ fontSize: "10px", color: descOver ? WARN : "#bbb" }}>
                  {item.description.length}/{DESC_LIMIT}
                  {descOver && " — слишком длинное"}
                </span>
              </div>
              <textarea
                style={{ ...inp, height: "72px", resize: "vertical", paddingTop: "8px", borderColor: descOver ? "#ffccaa" : undefined }}
                placeholder="Короткое продающее описание…"
                value={item.description}
                onChange={(e) => onChange({ description: e.target.value })}
              />
            </div>

            {/* Material */}
            <div>
              <FieldLabel>Материал / состав</FieldLabel>
              <input style={inp} placeholder="100% хлопок, 240 г/м²" value={item.material} onChange={(e) => onChange({ material: e.target.value })} />
            </div>

            {/* Features */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                <FieldLabel noMargin>Преимущества</FieldLabel>
                <span style={{ fontSize: "10px", color: featOver ? WARN : "#bbb" }}>
                  {item.features.length}/{FEAT_LIMIT}{featOver && " ↑"}
                </span>
              </div>
              <input style={{ ...inp, borderColor: featOver ? "#ffccaa" : undefined }} placeholder="Оверсайз, усиленные швы" value={item.features} onChange={(e) => onChange({ features: e.target.value })} />
            </div>

            {/* Branding */}
            <div style={{ gridColumn: "1 / -1" }}>
              <FieldLabel>Нанесение</FieldLabel>
              <input style={inp} placeholder="Шелкография, DTF-печать" value={item.branding} onChange={(e) => onChange({ branding: e.target.value })} />
            </div>

            {/* Lead time */}
            <div style={{ gridColumn: "1 / -1" }}>
              <FieldLabel>Срок производства</FieldLabel>
              <input style={inp} placeholder="15–20 рабочих дней" value={item.leadTime} onChange={(e) => onChange({ leadTime: e.target.value })} />
            </div>
          </div>

          {/* Price tiers */}
          <div style={{ marginTop: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <FieldLabel noMargin>Тиражи и цены</FieldLabel>
              {/* Price type toggle */}
              <div style={{ display: "flex", borderRadius: "7px", border: "1.5px solid #e0e0ea", overflow: "hidden" }}>
                {(["no_print", "with_print"] as const).map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => onChange({ priceType: val })}
                    style={{
                      padding: "0 10px", height: "26px", border: "none",
                      background: item.priceType === val ? BRAND : "white",
                      color: item.priceType === val ? "white" : "#888",
                      fontSize: "11px", cursor: "pointer", fontFamily: "inherit",
                      fontWeight: item.priceType === val ? 700 : 400,
                    }}
                  >
                    {val === "no_print" ? "Без нанесения" : "С нанесением"}
                  </button>
                ))}
              </div>
            </div>

            {/* Column headers */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 28px", gap: "6px", marginBottom: "4px" }}>
              {["Тираж, шт", "Цена / шт, ₽", "Итого, ₽", ""].map((h, i) => (
                <span key={i} style={{ fontSize: "10px", color: "#aaa", fontWeight: 500 }}>{h}</span>
              ))}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {item.priceTiers.map((tier, ti) => (
                <div key={ti} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 28px", gap: "6px", alignItems: "center" }}>
                  <input
                    style={{ ...inp, fontWeight: 600, height: "36px" }}
                    type="text" inputMode="numeric" placeholder="100"
                    value={tier.quantity}
                    onChange={(e) => patchTier(ti, { quantity: e.target.value })}
                  />
                  <input
                    style={{ ...inp, fontWeight: 600, height: "36px" }}
                    type="text" inputMode="decimal" placeholder="1 500"
                    value={tier.unitPrice}
                    onChange={(e) => patchTier(ti, { unitPrice: e.target.value })}
                  />
                  <input
                    style={{ ...inp, fontWeight: 700, color: BRAND, borderColor: "#c0b0ff", background: "#f8f7ff", height: "36px" }}
                    type="text" inputMode="decimal" placeholder="авто"
                    value={tier.totalPrice}
                    onChange={(e) => patchTier(ti, { totalPrice: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => removeTier(ti)}
                    disabled={item.priceTiers.length === 1}
                    style={{ width: "28px", height: "28px", borderRadius: "6px", border: "1px solid #e0e0ea", background: "white", color: "#999", cursor: item.priceTiers.length === 1 ? "not-allowed" : "pointer", fontSize: "14px", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            {item.priceTiers.length < 4 && (
              <button
                type="button"
                onClick={addTier}
                style={{ marginTop: "8px", padding: "0 12px", height: "30px", borderRadius: "8px", border: `1.5px dashed ${BRAND}`, background: "transparent", fontSize: "12px", color: BRAND, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
              >
                + Добавить тираж
              </button>
            )}
          </div>

          {/* Image upload */}
          <div style={{ marginTop: "12px" }}>
            <FieldLabel>Фото изделия (опционально)</FieldLabel>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              {imgSrc && (
                <img src={imgSrc} alt="" style={{ width: "52px", height: "52px", objectFit: "cover", borderRadius: "8px", border: "1px solid #e0e0ea" }} />
              )}
              <button type="button" onClick={() => fileRef.current?.click()} style={{ padding: "0 14px", height: "34px", borderRadius: "8px", border: "1.5px dashed #c0c0d8", background: "white", fontSize: "12px", color: "#666", cursor: "pointer", fontFamily: "inherit" }}>
                {hasImage ? "Заменить фото" : "+ Загрузить фото"}
              </button>
              {hasImage && (
                <button type="button" onClick={() => onChange({ imageDataUrl: undefined, imagePath: undefined })} style={ghostBtn}>Убрать</button>
              )}
              <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleImageUpload} />
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: "6px", marginTop: "14px", paddingTop: "12px", borderTop: "1px solid #f0f0f8", flexWrap: "wrap" }}>
            <button type="button" onClick={onMoveUp} disabled={index === 0} style={actionBtn}>↑</button>
            <button type="button" onClick={onMoveDown} disabled={index === totalItems - 1} style={actionBtn}>↓</button>
            <button type="button" onClick={onDuplicate} style={actionBtn}>Дублировать</button>
            <div style={{ flex: 1 }} />
            <button type="button" onClick={onDelete} style={{ ...actionBtn, color: "#cc3333", borderColor: "#ffcccc" }}>Удалить</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Catalog panel ────────────────────────────────────────────────────────────
interface CatalogPanelProps {
  activeIds: string[];
  onToggle: (productId: string) => void;
}

export function CatalogPanel({ activeIds, onToggle }: CatalogPanelProps) {
  return (
    <div>
      <p style={{ fontSize: "12px", color: "#888", marginBottom: "10px" }}>
        Нажмите — изделие добавится в список с данными из каталога
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
        {PRODUCTS.map((p) => {
          const active = activeIds.includes(p.id);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onToggle(p.id)}
              style={{ padding: "10px 12px", borderRadius: "10px", border: active ? `2px solid ${BRAND}` : "2px solid #e0e0ea", background: active ? "#f0eeff" : "white", cursor: "pointer", textAlign: "left", position: "relative" }}
            >
              {active && <span style={{ position: "absolute", top: "6px", right: "8px", fontSize: "11px", color: BRAND, fontWeight: 700 }}>✓</span>}
              <div style={{ fontSize: "12px", fontWeight: 600, color: active ? BRAND : "#0d0d0d", paddingRight: "14px" }}>{p.name}</div>
              <div style={{ fontSize: "11px", color: "#999", marginTop: "2px" }}>от {formatPrice(p.prices["50"])}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Shared styles ────────────────────────────────────────────────────────────
function FieldLabel({ children, noMargin }: { children: React.ReactNode; noMargin?: boolean }) {
  return (
    <label style={{ display: "block", fontSize: "11px", color: "#888", marginBottom: noMargin ? 0 : "4px", fontWeight: 500 }}>
      {children}
    </label>
  );
}

const inp: React.CSSProperties = {
  width: "100%",
  height: "38px",
  padding: "0 10px",
  borderRadius: "8px",
  border: "1.5px solid #e0e0ea",
  fontSize: "13px",
  color: "#0d0d0d",
  background: "white",
  outline: "none",
  fontFamily: "inherit",
};

const ghostBtn: React.CSSProperties = { padding: "0 10px", height: "30px", borderRadius: "6px", border: "1px solid #e0e0ea", background: "white", fontSize: "12px", color: "#666", cursor: "pointer", fontFamily: "inherit" };
const actionBtn: React.CSSProperties = { padding: "0 12px", height: "30px", borderRadius: "6px", border: "1.5px solid #e0e0ea", background: "white", fontSize: "12px", color: "#444", cursor: "pointer", fontFamily: "inherit" };
