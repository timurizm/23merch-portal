"use client";

import { useState, useEffect, useRef } from "react";
import { OrderForm, Template } from "@/types/order";
import {
  loadTemplates, saveTemplate, deleteTemplate, applyTemplate,
  exportTemplates, importTemplates, ImportResult,
} from "@/lib/templates";

const BRAND = "#1400c8";

interface Props {
  form: OrderForm;
  onApply: (form: OrderForm) => void;
  onClose: () => void;
}

export default function TemplatesModal({ form, onApply, onClose }: Props) {
  const [templates, setTemplates]       = useState<Template[]>([]);
  const [saveName, setSaveName]         = useState("");
  const [saved, setSaved]               = useState(false);
  const [saveError, setSaveError]       = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [importMsg, setImportMsg]       = useState<ImportResult | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setTemplates(loadTemplates()); }, []);

  // ── Save ────────────────────────────────────────────────────────────────────
  function handleSave() {
    if (!saveName.trim()) return;
    setSaveError(null);
    try {
      const t = saveTemplate(saveName, form);
      setTemplates((prev) => [t, ...prev]);
      setSaveName("");
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Не удалось сохранить шаблон.");
    }
  }

  // ── Delete ──────────────────────────────────────────────────────────────────
  function handleDelete(id: string) {
    deleteTemplate(id);
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    setConfirmDelete(null);
  }

  // ── Apply ───────────────────────────────────────────────────────────────────
  function handleApply(template: Template) {
    const hasContent = form.items.length > 0 || form.clientName.trim();
    if (hasContent && !confirm(`Загрузить шаблон «${template.name}»?\nТекущий черновик будет заменён.`)) return;
    onApply(applyTemplate(template, form.clientName));
    onClose();
  }

  // ── Export ──────────────────────────────────────────────────────────────────
  function handleExport() {
    exportTemplates();
  }

  // ── Import ──────────────────────────────────────────────────────────────────
  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await importTemplates(file);
    setTemplates(loadTemplates());
    setImportMsg(result);
    setTimeout(() => setImportMsg(null), 4000);
    // reset so same file can be re-imported
    e.target.value = "";
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────
  function fmt(iso: string) {
    return new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
  }

  const plural = (n: number) =>
    n === 1 ? "шаблон" : n < 5 ? "шаблона" : "шаблонов";

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 200 }} />

      {/* Drawer */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, width: "420px", maxWidth: "100vw",
        background: "white", zIndex: 201, display: "flex", flexDirection: "column",
        boxShadow: "-4px 0 24px rgba(0,0,0,0.15)",
      }}>

        {/* ── Header */}
        <div style={{ padding: "20px 22px 16px", borderBottom: "1px solid #f0f0f8", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "17px", fontWeight: 800, color: "#0d0d0d" }}>Шаблоны</h2>
            <p style={{ margin: "3px 0 0", fontSize: "12px", color: "#999" }}>Сохраняются в браузере</p>
          </div>
          <button
            onClick={onClose}
            style={{ width: "32px", height: "32px", borderRadius: "8px", border: "1px solid #e0e0ea", background: "white", fontSize: "18px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#666" }}
          >×</button>
        </div>

        {/* ── Save current KP as template */}
        <div style={{ padding: "16px 22px", borderBottom: "1px solid #f0f0f8", background: "#fafafa" }}>
          <p style={{ margin: "0 0 8px", fontSize: "11px", fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.8px" }}>
            Сохранить текущее КП как шаблон
          </p>
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              placeholder={`Шаблон${form.items.length > 0 ? ` (${form.items.length} поз.)` : ""}`}
              style={{ flex: 1, height: "38px", padding: "0 10px", borderRadius: "8px", border: "1.5px solid #e0e0ea", fontSize: "13px", color: "#0d0d0d", background: "white", outline: "none", fontFamily: "inherit" }}
            />
            <button
              onClick={handleSave}
              disabled={!saveName.trim()}
              style={{ height: "38px", padding: "0 14px", borderRadius: "8px", border: "none", background: saveName.trim() ? BRAND : "#ccc", color: "white", fontSize: "13px", fontWeight: 700, cursor: saveName.trim() ? "pointer" : "not-allowed", fontFamily: "inherit", whiteSpace: "nowrap" }}
            >
              {saved ? "Сохранено ✓" : "Сохранить"}
            </button>
          </div>
          {form.items.length === 0 && (
            <p style={{ margin: "6px 0 0", fontSize: "11px", color: "#f0a000" }}>Добавьте хотя бы одну позицию</p>
          )}
          {saveError && (
            <p style={{ margin: "6px 0 0", fontSize: "11px", color: "#cc0000", lineHeight: 1.4 }}>{saveError}</p>
          )}
        </div>

        {/* ── Templates list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "14px 22px" }}>
          {templates.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#bbb", fontSize: "13px" }}>
              <div style={{ fontSize: "32px", marginBottom: "10px" }}>📄</div>
              Шаблонов пока нет
              <br />
              <span style={{ fontSize: "12px" }}>Сохраните текущее КП как шаблон</span>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {templates.map((t) => (
                <div key={t.id} style={{ background: "#fafafa", borderRadius: "12px", border: "1.5px solid #ebebf4", padding: "14px 16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "14px", fontWeight: 700, color: "#0d0d0d", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {t.name}
                      </div>
                      <div style={{ fontSize: "11px", color: "#999", marginTop: "3px" }}>
                        {t.itemCount} {t.itemCount === 1 ? "позиция" : t.itemCount < 5 ? "позиции" : "позиций"} · {fmt(t.createdAt)}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                      <button
                        onClick={() => handleApply(t)}
                        style={{ height: "30px", padding: "0 12px", borderRadius: "7px", border: `1.5px solid ${BRAND}`, background: "white", color: BRAND, fontSize: "12px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
                      >
                        Загрузить
                      </button>
                      {confirmDelete === t.id ? (
                        <>
                          <button onClick={() => handleDelete(t.id)} style={{ height: "30px", padding: "0 10px", borderRadius: "7px", border: "1.5px solid #ff4444", background: "#ff4444", color: "white", fontSize: "12px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                            Удалить?
                          </button>
                          <button onClick={() => setConfirmDelete(null)} style={{ height: "30px", padding: "0 8px", borderRadius: "7px", border: "1px solid #e0e0ea", background: "white", color: "#888", fontSize: "12px", cursor: "pointer", fontFamily: "inherit" }}>
                            Отмена
                          </button>
                        </>
                      ) : (
                        <button onClick={() => setConfirmDelete(t.id)} style={{ height: "30px", padding: "0 10px", borderRadius: "7px", border: "1px solid #e0e0ea", background: "white", color: "#cc3333", fontSize: "12px", cursor: "pointer", fontFamily: "inherit" }}>
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                  <div style={{ marginTop: "8px", display: "flex", flexWrap: "wrap", gap: "4px" }}>
                    {t.data.items.slice(0, 5).map((item, i) => (
                      <span key={i} style={{ fontSize: "10px", background: "#eeeeff", color: BRAND, borderRadius: "4px", padding: "2px 7px", fontWeight: 500 }}>
                        {item.name || "Позиция"}
                      </span>
                    ))}
                    {t.data.items.length > 5 && (
                      <span style={{ fontSize: "10px", color: "#aaa", padding: "2px 4px" }}>+{t.data.items.length - 5}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Footer: Export / Import */}
        <div style={{ padding: "14px 22px", borderTop: "1px solid #f0f0f8" }}>
          {/* Import result message */}
          {importMsg && (
            <div style={{
              marginBottom: "10px", padding: "8px 12px", borderRadius: "8px", fontSize: "12px",
              background: importMsg.error ? "#fff0f0" : "#f0fff4",
              color: importMsg.error ? "#cc0000" : "#007722",
              border: `1px solid ${importMsg.error ? "#ffcccc" : "#bbf0cc"}`,
            }}>
              {importMsg.error
                ? `Ошибка: ${importMsg.error}`
                : `Импортировано: ${importMsg.added} ${plural(importMsg.added)}${importMsg.skipped > 0 ? `, ${importMsg.skipped} уже было` : ""}`}
            </div>
          )}

          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            {templates.length > 0 && (
              <button
                onClick={handleExport}
                style={{ flex: 1, height: "36px", borderRadius: "8px", border: "1.5px solid #e0e0ea", background: "white", fontSize: "12px", fontWeight: 600, color: "#444", cursor: "pointer", fontFamily: "inherit" }}
              >
                ↓ Скачать резервную копию
              </button>
            )}
            <button
              onClick={() => importRef.current?.click()}
              style={{ flex: 1, height: "36px", borderRadius: "8px", border: "1.5px solid #e0e0ea", background: "white", fontSize: "12px", fontWeight: 600, color: "#444", cursor: "pointer", fontFamily: "inherit" }}
            >
              ↑ Загрузить из файла
            </button>
            <input ref={importRef} type="file" accept=".json,application/json" style={{ display: "none" }} onChange={handleImport} />
          </div>

          <p style={{ margin: "8px 0 0", fontSize: "11px", color: "#bbb", textAlign: "center" }}>
            {templates.length > 0
              ? `${templates.length} ${plural(templates.length)} · Скачай копию, чтобы не потерять данные`
              : "Скачай копию шаблонов после сохранения"}
          </p>
        </div>
      </div>
    </>
  );
}
