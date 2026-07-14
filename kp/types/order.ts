export interface PriceTier {
  quantity: string;
  unitPrice: string;
  totalPrice: string; // auto or manual
}

export interface OrderItem {
  id: string;
  source: "catalog" | "custom";
  productId?: string;
  name: string;
  imagePath?: string;     // /public/images/... for catalog items
  imageDataUrl?: string;  // base64 data URL for uploaded images
  description: string;
  material: string;
  features: string;
  branding: string;
  leadTime: string;       // e.g. "15–20 рабочих дней"
  priceTiers: PriceTier[];
  priceType: "no_print" | "with_print";
  collapsed: boolean;
}

export interface OrderForm {
  clientName: string;
  items: OrderItem[];
  managerName: string;
  managerTelegram: string;
  managerWhatsapp: string;
  managerEmail: string;
  offerText: string;
  offerBonuses: string[];   // array of OfferBonus.id
  includeSummarySlide: boolean;
  showTierTotalsBar: boolean;
}

// ─── Offer bonuses ("Дожим") ──────────────────────────────────────────────────
export interface OfferBonus {
  id: string;
  label: string;
  category: string;
}

export const BONUS_CATEGORIES = [
  "Упаковка и брендинг",
  "Логистика",
  "Производство",
  "Срочность и дефицит",
] as const;

export const OFFER_BONUSES: OfferBonus[] = [
  { id: "zip-packages",   category: "Упаковка и брендинг", label: "Зип-пакеты с логотипом — индивидуальная упаковка каждого изделия" },
  { id: "name-tags",      category: "Упаковка и брендинг", label: "Бирки с логотипом на каждое изделие" },
  { id: "postcards",      category: "Упаковка и брендинг", label: "Открытки с логотипом в каждую упаковку" },
  { id: "delivery-week",  category: "Логистика",           label: "Бесплатная доставка по Москве при оплате до конца недели" },
  { id: "delivery-100",   category: "Логистика",           label: "Бесплатная доставка от 100 шт" },
  { id: "priority-ship",  category: "Логистика",           label: "Приоритетная отправка — доставим раньше срока" },
  { id: "free-mockup",    category: "Производство",        label: "Бесплатная разработка макета" },
  { id: "free-sample",    category: "Производство",        label: "Бесплатный тестовый образец (при заказе от 500К)" },
  { id: "reserve-line",   category: "Срочность и дефицит", label: "Бронь производственной линии / машины" },
  { id: "limited-color",  category: "Срочность и дефицит", label: "Остаток в их цвете ограничен — успейте занять" },
  { id: "price-deadline", category: "Срочность и дефицит", label: "Цена актуальна до конца недели" },
];

export function emptyTier(): PriceTier {
  return { quantity: "", unitPrice: "", totalPrice: "" };
}

export const EMPTY_ITEM = (): OrderItem => ({
  id: crypto.randomUUID(),
  source: "custom",
  name: "",
  description: "",
  material: "",
  features: "",
  branding: "",
  leadTime: "15–20 рабочих дней",
  priceTiers: [emptyTier()],
  priceType: "with_print",
  collapsed: false,
});

export const DEFAULT_FORM: OrderForm = {
  clientName: "",
  items: [],
  managerName: "",
  managerTelegram: "",
  managerWhatsapp: "",
  managerEmail: "",
  offerText: "Оформите заказ до конца недели —\nдоставка за наш счёт.",
  offerBonuses: [],
  includeSummarySlide: true,
  showTierTotalsBar: true,
};

// ─── Templates ────────────────────────────────────────────────────────────────
export interface Template {
  id: string;
  name: string;
  createdAt: string;     // ISO date string
  itemCount: number;
  /** Full form state minus clientName (it's always per-КП) */
  data: Omit<OrderForm, "clientName">;
}

export const DESC_LIMIT = 380;
export const FEAT_LIMIT = 200;

/** Parse a price string that may use comma or dot as decimal separator,
 *  and may contain spaces as thousands separators.
 *  Examples: "2500", "2500.50", "2500,50", "2 500,50" → 2500.5 */
export function parsePrice(s: string): number {
  const normalized = s.replace(/\s/g, "").replace(/,/g, ".");
  return parseFloat(normalized);
}

/** Format a number as a price string in Russian style.
 *  Avoids toLocaleString() which can produce vulgar fraction chars (½ ¼ etc.)
 *  on some Node.js/ICU builds deployed on Vercel.
 *  Output examples: "3 650 ₽", "3 650,50 ₽", "1 200,75 ₽" */
export function formatPrice(n: number): string {
  const abs = Math.abs(n);
  const rounded = Math.round(abs * 100) / 100;
  const intPart = Math.floor(rounded);
  const fracPart = Math.round((rounded - intPart) * 100);
  // Non-breaking space as thousands separator (Russian standard)
  const intStr = intPart.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "\u00A0");
  const fracStr = fracPart > 0 ? "," + fracPart.toString().padStart(2, "0") : "";
  return (n < 0 ? "−" : "") + intStr + fracStr + "\u00A0₽";
}
