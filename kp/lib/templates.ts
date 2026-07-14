import { OrderForm, Template } from "@/types/order";

// ⚠️ NEVER rename this key — changing it would erase all managers' saved templates.
// Add migration logic instead if the schema changes.
const STORAGE_KEY = "kp-templates-v1";

// ─── Load ─────────────────────────────────────────────────────────────────────
export function loadTemplates(): Template[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Template[]) : [];
  } catch {
    return [];
  }
}

// ─── Save ─────────────────────────────────────────────────────────────────────
export function saveTemplate(name: string, form: OrderForm): Template {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { clientName: _cn, ...data } = form;
  // Collapse all items, strip uploaded images (base64 imageDataUrl can be 1–3 MB each
  // and quickly fills localStorage's 5 MB quota). Catalog imagePath refs are kept —
  // they're just short strings like "/images/foo.jpg".
  const cleanData: Omit<OrderForm, "clientName"> = {
    ...data,
    items: data.items.map(({ imageDataUrl: _img, ...item }) => ({
      ...item,
      collapsed: false,
    })),
  };
  const template: Template = {
    id: crypto.randomUUID(),
    name: name.trim() || "Шаблон",
    createdAt: new Date().toISOString(),
    itemCount: form.items.length,
    data: cleanData,
  };
  const existing = loadTemplates();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([template, ...existing]));
  } catch (e) {
    // QuotaExceededError — storage full
    throw new Error("Не удалось сохранить шаблон: хранилище браузера переполнено. Удалите старые шаблоны или экспортируйте резервную копию.");
  }
  return template;
}

// ─── Delete ───────────────────────────────────────────────────────────────────
export function deleteTemplate(id: string): void {
  const updated = loadTemplates().filter((t) => t.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

// ─── Apply ────────────────────────────────────────────────────────────────────
/** Returns a new OrderForm ready to edit, with fresh item IDs */
export function applyTemplate(template: Template, clientName = ""): OrderForm {
  return {
    clientName,
    ...template.data,
    items: template.data.items.map((item) => ({
      ...item,
      id: crypto.randomUUID(),
      collapsed: false,
    })),
  };
}

// ─── Export ───────────────────────────────────────────────────────────────────
/** Triggers a JSON file download with all saved templates */
export function exportTemplates(): void {
  const templates = loadTemplates();
  const payload = JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), templates }, null, 2);
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `kp-templates-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Import ───────────────────────────────────────────────────────────────────
export type ImportResult = { added: number; skipped: number; error?: string };

/** Reads a JSON backup file and merges new templates (by ID) into localStorage */
export function importTemplates(file: File): Promise<ImportResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const raw = JSON.parse(e.target?.result as string);
        // Accept both bare array and wrapped { templates: [...] }
        const incoming: Template[] = Array.isArray(raw)
          ? raw
          : Array.isArray(raw?.templates)
          ? raw.templates
          : [];

        if (!incoming.length) return resolve({ added: 0, skipped: 0, error: "Файл не содержит шаблонов" });

        const existing = loadTemplates();
        const existingIds = new Set(existing.map((t) => t.id));

        const toAdd = incoming.filter((t) => t.id && t.name && t.data && !existingIds.has(t.id));
        const merged = [...toAdd, ...existing];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));

        resolve({ added: toAdd.length, skipped: incoming.length - toAdd.length });
      } catch {
        resolve({ added: 0, skipped: 0, error: "Не удалось прочитать файл. Проверьте формат." });
      }
    };
    reader.readAsText(file);
  });
}
