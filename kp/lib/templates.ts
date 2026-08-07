import { OrderForm, Template } from "@/types/order";

const API = "/api/kp/templates";

// ─── Load ─────────────────────────────────────────────────────────────────────
export async function loadTemplates(): Promise<Template[]> {
  try {
    const res = await fetch(API);
    if (!res.ok) throw new Error(await res.text());
    return (await res.json()) as Template[];
  } catch {
    return [];
  }
}

// ─── Save ─────────────────────────────────────────────────────────────────────
export async function saveTemplate(name: string, form: OrderForm): Promise<Template> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { clientName: _cn, ...data } = form;
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
  const res = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(template),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Не удалось сохранить шаблон.");
  }
  return template;
}

// ─── Delete ───────────────────────────────────────────────────────────────────
export async function deleteTemplate(id: string): Promise<void> {
  await fetch(`${API}/${id}`, { method: "DELETE" });
}

// ─── Apply ────────────────────────────────────────────────────────────────────
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
export async function exportTemplates(): Promise<void> {
  const templates = await loadTemplates();
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

export async function importTemplates(file: File): Promise<ImportResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const raw = JSON.parse(e.target?.result as string);
        const incoming: Template[] = Array.isArray(raw)
          ? raw
          : Array.isArray(raw?.templates)
          ? raw.templates
          : [];

        if (!incoming.length) return resolve({ added: 0, skipped: 0, error: "Файл не содержит шаблонов" });

        const existing = await loadTemplates();
        const existingIds = new Set(existing.map((t) => t.id));
        const toAdd = incoming.filter((t) => t.id && t.name && t.data && !existingIds.has(t.id));

        await Promise.all(
          toAdd.map((t) =>
            fetch(API, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(t),
            })
          )
        );

        resolve({ added: toAdd.length, skipped: incoming.length - toAdd.length });
      } catch {
        resolve({ added: 0, skipped: 0, error: "Не удалось прочитать файл. Проверьте формат." });
      }
    };
    reader.readAsText(file);
  });
}
