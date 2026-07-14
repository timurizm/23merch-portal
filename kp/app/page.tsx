"use client";

import { useState, useEffect } from "react";
import { OrderItem, OrderForm, DEFAULT_FORM, EMPTY_ITEM, emptyTier, parsePrice, formatPrice, OFFER_BONUSES, BONUS_CATEGORIES } from "@/types/order";
import { PRODUCTS } from "@/data/products";
import ItemCard, { CatalogPanel } from "@/app/components/ItemCard";
import TemplatesModal from "@/app/components/TemplatesModal";

const BRAND = "#1400c8";
const DRAFT_KEY = "kp-draft-v3";

export default function Home() {
  const [form, setForm] = useState<OrderForm>(DEFAULT_FORM);
  const [loading, setLoading] = useState<false | "pptx" | "pdf">(false);
  const [format, setFormat] = useState<"pptx" | "pdf">("pptx");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [autoSaved, setAutoSaved] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);

  // Load draft on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as OrderForm;
        // Migrate old items that used single qty/price instead of priceTiers
        parsed.items = (parsed.items ?? []).map((item) => {
          if (!item.priceTiers) {
            const legacy = item as OrderItem & { quantity?: string; unitPrice?: string; totalPrice?: string };
            return {
              ...item,
              leadTime: item.leadTime ?? "15–20 рабочих дней",
              priceType: (item as OrderItem & { priceType?: string }).priceType ?? "with_print",
              priceTiers: [{ quantity: legacy.quantity ?? "", unitPrice: legacy.unitPrice ?? "", totalPrice: legacy.totalPrice ?? "" }],
            };
          }
          return { ...item, leadTime: item.leadTime ?? "15–20 рабочих дней", priceType: item.priceType ?? "with_print" };
        });
        if (parsed.includeSummarySlide === undefined) parsed.includeSummarySlide = true;
        if (parsed.offerBonuses === undefined) parsed.offerBonuses = [];
        if (parsed.showTierTotalsBar === undefined) parsed.showTierTotalsBar = true;
        setForm(parsed);
      }
    } catch {}
  }, []);

  // Auto-save draft — shows a brief "Сохранено" indicator
  useEffect(() => {
    const t = setTimeout(() => {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
      setAutoSaved(true);
      setTimeout(() => setAutoSaved(false), 1800);
    }, 800);
    return () => clearTimeout(t);
  }, [form]);

  function patchForm(patch: Partial<OrderForm>) {
    setForm((f) => ({ ...f, ...patch }));
  }

  function patchItem(id: string, patch: Partial<OrderItem>) {
    setForm((f) => ({ ...f, items: f.items.map((item) => (item.id === id ? { ...item, ...patch } : item)) }));
  }

  function addCatalogItem(productId: string) {
    const product = PRODUCTS.find((p) => p.id === productId);
    if (!product) return;
    // Toggle off if already added
    const exists = form.items.find((i) => i.source === "catalog" && i.productId === productId);
    if (exists) {
      setForm((f) => ({ ...f, items: f.items.filter((i) => !(i.source === "catalog" && i.productId === productId)) }));
      return;
    }
    // Build initial price tiers from catalog prices
    const quantities = [50, 100, 200] as const;
    const priceTiers = quantities
      .filter((q) => product.prices[String(q)])
      .slice(0, 3)
      .map((q) => ({
        quantity: String(q),
        unitPrice: String(product.prices[String(q)]),
        totalPrice: String(q * product.prices[String(q)]),
      }));

    const newItem: OrderItem = {
      id: crypto.randomUUID(),
      source: "catalog",
      productId,
      name: product.name,
      imagePath: product.image,
      description: product.description,
      material: product.material,
      features: product.features,
      branding: product.printing_options.join(", "),
      leadTime: "15–20 рабочих дней",
      priceTiers: priceTiers.length > 0 ? priceTiers : [emptyTier()],
      priceType: "with_print",
      collapsed: false,
    };
    setForm((f) => ({ ...f, items: [...f.items, newItem] }));
  }

  function addCustomItem() {
    setForm((f) => ({ ...f, items: [...f.items, EMPTY_ITEM()] }));
  }

  function deleteItem(id: string) {
    setForm((f) => ({ ...f, items: f.items.filter((i) => i.id !== id) }));
  }

  function duplicateItem(id: string) {
    setForm((f) => {
      const idx = f.items.findIndex((i) => i.id === id);
      if (idx === -1) return f;
      const copy: OrderItem = { ...f.items[idx], id: crypto.randomUUID(), collapsed: false };
      const items = [...f.items];
      items.splice(idx + 1, 0, copy);
      return { ...f, items };
    });
  }

  function moveItem(id: string, dir: -1 | 1) {
    setForm((f) => {
      const items = [...f.items];
      const idx = items.findIndex((i) => i.id === id);
      const target = idx + dir;
      if (target < 0 || target >= items.length) return f;
      [items[idx], items[target]] = [items[target], items[idx]];
      return { ...f, items };
    });
  }

  function handleClearDraft() {
    if (!confirm("Очистить форму и начать заново?")) return;
    localStorage.removeItem(DRAFT_KEY);
    setForm(DEFAULT_FORM);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    if (!form.clientName.trim()) return setError("Введите название клиента");
    if (!form.items.length) return setError("Добавьте хотя бы одну позицию");

    setLoading(format);
    const endpoint = format === "pdf" ? "/api/generate-pdf" : "/api/generate";

    async function attempt(): Promise<Response> {
      return fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    }

    try {
      let res: Response;
      try {
        res = await attempt();
      } catch {
        // Network-level failure ("Failed to fetch") — often transient (cold start,
        // connection reset on a large request). Retry once before giving up.
        res = await attempt();
      }
      if (!res.ok) {
        // res may return plain text (e.g. "Request Entity Too Large") — not always JSON
        let errMsg = "Ошибка сервера";
        try {
          const data = await res.json();
          errMsg = data.error || errMsg;
        } catch {
          if (res.status === 413) {
            errMsg = "Файл слишком большой. Попробуйте уменьшить фото товаров перед загрузкой.";
          } else {
            errMsg = `Ошибка сервера (${res.status})`;
          }
        }
        throw new Error(errMsg);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const date = new Date().toISOString().slice(0, 10);
      a.download = `KP_${form.clientName}_${date}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      setSuccess(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg === "Failed to fetch" || msg.includes("NetworkError") || msg.includes("network")) {
        setError("Не удалось связаться с сервером. Проверьте интернет-соединение и попробуйте снова.");
      } else {
        setError(msg || "Ошибка генерации");
      }
    } finally {
      setLoading(false);
    }
  }

  // Grand total: first tier per item (representative price)
  const grandTotal = form.items.reduce((sum, item) => {
    const firstTier = item.priceTiers[0];
    if (!firstTier) return sum;
    const t = parsePrice(firstTier.totalPrice);
    if (!isNaN(t) && t > 0) return sum + t;
    const q = parsePrice(firstTier.quantity);
    const p = parsePrice(firstTier.unitPrice);
    if (!isNaN(q) && !isNaN(p)) return sum + q * p;
    return sum;
  }, 0);

  const catalogActiveIds = form.items.filter((i) => i.source === "catalog" && i.productId).map((i) => i.productId!);

  return (
    <div style={{ minHeight: "100vh", background: "#f4f4f8" }}>
      {templatesOpen && (
        <TemplatesModal
          form={form}
          onApply={(newForm) => setForm({
            ...newForm,
            offerBonuses: newForm.offerBonuses ?? [],
            includeSummarySlide: newForm.includeSummarySlide ?? true,
            showTierTotalsBar: newForm.showTierTotalsBar ?? true,
            items: (newForm.items ?? []).map((item) => ({
              ...item,
              leadTime: item.leadTime ?? "15–20 рабочих дней",
              priceType: item.priceType ?? "with_print",
              priceTiers: item.priceTiers ?? [emptyTier()],
            })),
          })}
          onClose={() => setTemplatesOpen(false)}
        />
      )}

      {/* Header */}
      <header style={{ background: BRAND, padding: "0 2rem", height: "60px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-white.svg" alt="32°" style={{ height: "28px", width: "auto" }} />
          <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "13px" }}>Генератор КП</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {/* Auto-save indicator — quiet text, not a button */}
          <span style={{
            fontSize: "12px", color: "rgba(255,255,255,0.55)",
            opacity: autoSaved ? 1 : 0,
            transition: "opacity 0.4s ease",
            whiteSpace: "nowrap",
          }}>
            Автосохранение ✓
          </span>
          <button onClick={() => setTemplatesOpen(true)} type="button" style={{ ...headerBtn, background: "rgba(255,255,255,0.18)", fontWeight: 700 }}>
            Шаблоны
          </button>
          <button onClick={handleClearDraft} type="button" style={{ ...headerBtn, opacity: 0.6 }}>Очистить</button>
        </div>
      </header>

      <main style={{ maxWidth: "1080px", margin: "0 auto", padding: "2rem 1.5rem 4rem" }}>
        <div style={{ marginBottom: "1.8rem" }}>
          <h1 style={{ fontSize: "26px", fontWeight: 800, color: "#0d0d0d", margin: 0 }}>Новое коммерческое предложение</h1>
          <p style={{ color: "#888", marginTop: "5px", fontSize: "13px" }}>Заполните форму — КП готово за 60 секунд</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "1.5rem", alignItems: "start" }}>

            {/* ── Left column ── */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>

              <Card title="Клиент">
                <label style={lbl}>Название компании или имя клиента</label>
                <input style={inp} placeholder="например, Яндекс" value={form.clientName} onChange={(e) => patchForm({ clientName: e.target.value })} />
              </Card>

              <Card title="Каталог изделий">
                <CatalogPanel activeIds={catalogActiveIds} onToggle={addCatalogItem} />
              </Card>

              <Card
                title={`Позиции заказа${form.items.length > 0 ? ` (${form.items.length})` : ""}`}
                action={form.items.length > 1 ? (
                  <button type="button" onClick={() => setForm((f) => ({ ...f, items: f.items.map((i) => ({ ...i, collapsed: true })) }))} style={smallBtn}>
                    Свернуть все
                  </button>
                ) : null}
              >
                {form.items.length === 0 ? (
                  <p style={{ fontSize: "13px", color: "#bbb", textAlign: "center", padding: "20px 0" }}>
                    Выберите изделия из каталога или добавьте вручную
                  </p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {form.items.map((item, idx) => (
                      <ItemCard
                        key={item.id}
                        item={item}
                        index={idx}
                        totalItems={form.items.length}
                        onChange={(patch) => patchItem(item.id, patch)}
                        onDelete={() => deleteItem(item.id)}
                        onDuplicate={() => duplicateItem(item.id)}
                        onMoveUp={() => moveItem(item.id, -1)}
                        onMoveDown={() => moveItem(item.id, 1)}
                      />
                    ))}
                  </div>
                )}
                <button type="button" onClick={addCustomItem} style={{ marginTop: "12px", width: "100%", height: "40px", borderRadius: "10px", border: "2px dashed #c0c0d8", background: "transparent", fontSize: "13px", color: BRAND, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                  + Добавить позицию вручную
                </button>
              </Card>

              <Card title="Дожим">
                {BONUS_CATEGORIES.map((cat) => {
                  const catBonuses = OFFER_BONUSES.filter((b) => b.category === cat);
                  return (
                    <div key={cat} style={{ marginBottom: "12px" }}>
                      <div style={{ fontSize: "10px", fontWeight: 700, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: "5px" }}>{cat}</div>
                      {catBonuses.map((bonus) => {
                        const checked = form.offerBonuses.includes(bonus.id);
                        return (
                          <label key={bonus.id} style={{ display: "flex", alignItems: "flex-start", gap: "8px", cursor: "pointer", marginBottom: "5px" }}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                const next = checked
                                  ? form.offerBonuses.filter((id) => id !== bonus.id)
                                  : [...form.offerBonuses, bonus.id];
                                // Auto-fill the text field with selected bonuses
                                const text = next
                                  .map((id) => OFFER_BONUSES.find((b) => b.id === id))
                                  .filter(Boolean)
                                  .map((b) => `• ${b!.label}`)
                                  .join("\n");
                                patchForm({ offerBonuses: next, offerText: text });
                              }}
                              style={{ width: "14px", height: "14px", marginTop: "2px", flexShrink: 0, accentColor: BRAND }}
                            />
                            <span style={{ fontSize: "12px", color: checked ? "#0d0d0d" : "#666", lineHeight: "1.45" }}>{bonus.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  );
                })}
                <div style={{ borderTop: "1px solid #f0f0f8", marginTop: "4px", paddingTop: "10px" }}>
                  <label style={{ ...lbl, marginBottom: "4px" }}>Текст на слайде (можно отредактировать)</label>
                  <textarea
                    style={{ ...inp, height: "80px", resize: "vertical", paddingTop: "8px" }}
                    value={form.offerText}
                    onChange={(e) => patchForm({ offerText: e.target.value })}
                  />
                </div>
              </Card>

              <Card title="Менеджер">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  {([["managerName", "Имя", "Иван Иванов"], ["managerTelegram", "Telegram", "@ivan"], ["managerEmail", "Email", "ivan@company.ru"]] as const).map(([key, label, ph]) => (
                    <div key={key}>
                      <label style={lbl}>{label}</label>
                      <input style={inp} placeholder={ph} value={form[key]} onChange={(e) => patchForm({ [key]: e.target.value })} />
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* ── Right column ── */}
            <div style={{ position: "sticky", top: "76px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

                {/* Summary */}
                <Card title="Итог заказа">
                  {form.items.length === 0 ? (
                    <p style={{ fontSize: "12px", color: "#bbb" }}>Добавьте позиции</p>
                  ) : (
                    <>
                      {form.items.map((item) => {
                        const first = item.priceTiers[0];
                        const t = parsePrice(first?.totalPrice ?? "");
                        const q = parsePrice(first?.quantity ?? "");
                        const p = parsePrice(first?.unitPrice ?? "");
                        const display = !isNaN(t) && t > 0 ? t : (!isNaN(q) && !isNaN(p) ? q * p : null);
                        return (
                          <div key={item.id} style={{ display: "flex", justifyContent: "space-between", gap: "8px", marginBottom: "8px" }}>
                            <span style={{ fontSize: "12px", color: "#555", flex: 1 }}>
                              {item.name || "—"}
                              {item.priceTiers.length > 1 && <span style={{ color: "#aaa" }}> ×{item.priceTiers.length}</span>}
                            </span>
                            <span style={{ fontSize: "12px", fontWeight: 600, whiteSpace: "nowrap" }}>
                              {display !== null ? formatPrice(display) : "—"}
                            </span>
                          </div>
                        );
                      })}
                      <div style={{ borderTop: "1px solid #e8e8f0", marginTop: "6px", paddingTop: "8px", display: "flex", justifyContent: "space-between" }}>
                        <span style={{ fontSize: "11px", color: "#888" }}>Первый тираж</span>
                        <span style={{ fontSize: "16px", fontWeight: 800, color: BRAND }}>
                          {grandTotal > 0 ? formatPrice(grandTotal) : "—"}
                        </span>
                      </div>
                    </>
                  )}
                </Card>

                {/* Options */}
                <Card title="Параметры КП">
                  {([
                    ["includeSummarySlide", "Добавить итоговый слайд (таблица)"],
                    ["showTierTotalsBar",   "Показывать строку «Итого» на слайде цены"],
                  ] as const).map(([key, label]) => (
                    <label key={key} style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px", color: "#444", marginBottom: "8px" }}>
                      <input
                        type="checkbox"
                        checked={form[key]}
                        onChange={(e) => patchForm({ [key]: e.target.checked })}
                        style={{ width: "16px", height: "16px", accentColor: BRAND }}
                      />
                      {label}
                    </label>
                  ))}
                </Card>

                {error && (
                  <div style={{ background: "#fff0f0", border: "1px solid #ffcccc", borderRadius: "10px", padding: "10px 12px", fontSize: "13px", color: "#cc0000" }}>{error}</div>
                )}
                {success && (
                  <div style={{ background: "#f0fff4", border: "1px solid #bbf0cc", borderRadius: "10px", padding: "10px 12px", fontSize: "13px", color: "#007722" }}>КП скачивается ✓</div>
                )}

                {/* Format toggle */}
                <div style={{ display: "flex", gap: "6px", background: "#f0f0f8", borderRadius: "10px", padding: "4px" }}>
                  {(["pptx", "pdf"] as const).map((f) => (
                    <button key={f} type="button" onClick={() => setFormat(f)} style={{ flex: 1, height: "34px", borderRadius: "8px", border: "none", background: format === f ? BRAND : "transparent", color: format === f ? "white" : "#666", fontSize: "13px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                      .{f.toUpperCase()}
                    </button>
                  ))}
                </div>

                <button type="submit" disabled={!!loading} style={{ width: "100%", height: "52px", background: loading ? "#888" : BRAND, color: "white", border: "none", borderRadius: "12px", fontSize: "15px", fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
                  {loading ? `Генерирую ${String(loading).toUpperCase()}…` : `Скачать .${format.toUpperCase()} →`}
                </button>
                <p style={{ fontSize: "11px", color: "#aaa", textAlign: "center", margin: 0 }}>
                  {format === "pptx" ? "Редактируемый файл PowerPoint" : "Готов к отправке клиенту"}
                </p>
              </div>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}

function Card({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div style={{ background: "white", borderRadius: "14px", padding: "18px 20px", border: "1px solid #e8e8f0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <h2 style={{ fontSize: "12px", fontWeight: 700, color: "#0d0d0d", margin: 0, textTransform: "uppercase", letterSpacing: "0.8px" }}>{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

const lbl: React.CSSProperties = { display: "block", fontSize: "11px", color: "#888", marginBottom: "4px", fontWeight: 500 };
const inp: React.CSSProperties = { width: "100%", height: "40px", padding: "0 12px", borderRadius: "8px", border: "1.5px solid #e0e0ea", fontSize: "14px", color: "#0d0d0d", background: "white", outline: "none", fontFamily: "inherit" };
const headerBtn: React.CSSProperties = { padding: "0 14px", height: "32px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.3)", background: "transparent", color: "white", fontSize: "12px", cursor: "pointer", fontFamily: "inherit" };
const smallBtn: React.CSSProperties = { padding: "0 10px", height: "26px", borderRadius: "6px", border: "1px solid #e0e0ea", background: "white", fontSize: "11px", color: "#666", cursor: "pointer", fontFamily: "inherit" };
