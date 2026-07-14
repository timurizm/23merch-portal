import PptxGenJS from "pptxgenjs";
import { OrderForm, OrderItem, PriceTier, DESC_LIMIT, FEAT_LIMIT, parsePrice, formatPrice } from "@/types/order";
import path from "path";
import fs from "fs";

// ─── Brand ────────────────────────────────────────────────────────────────────
const BLUE  = "1400C8";
const BLUE2 = "0F00A8";
const WHITE = "FFFFFF";
const LIGHT = "F4F4F8";
const DARK  = "0D0D0D";
const GRAY  = "888899";
const FONT  = "Arial";

const W = 10;    // slide width  (inches)
const H = 7.5;   // slide height (inches)

// ─── Helpers ──────────────────────────────────────────────────────────────────
// Use PNG (not SVG) — SVG breaks in Google Slides import and PPTX→PDF conversion
const LOGO_WHITE = path.join(process.cwd(), "public", "logo-white.png");
const LOGO_GRAY  = path.join(process.cwd(), "public", "logo-gray.png");

type Slide = ReturnType<PptxGenJS["addSlide"]>;

function addLogo(slide: Slide, onDark = true) {
  const logoPath = onDark ? LOGO_WHITE : LOGO_GRAY;
  if (fs.existsSync(logoPath)) {
    slide.addImage({ path: logoPath, x: 0.38, y: 0.30, w: 0.68, h: 0.42 });
  } else {
    slide.addText("32°", { x: 0.4, y: 0.3, w: 1.1, h: 0.5, fontSize: 20, bold: true, color: onDark ? WHITE : BLUE, fontFace: FONT, margin: 0 });
  }
}

const fmt = formatPrice;

/** PPTX-specific formatter: replaces ₽ (U+20BD) with " руб."
 *  because Arial in Google Slides doesn't have the ruble glyph and shows ½ instead. */
function fmtP(n: number): string {
  return formatPrice(n).replace(/ ₽$/, " руб.");
}

function tierTotal(tier: PriceTier): number | null {
  const t = parsePrice(tier.totalPrice);
  if (!isNaN(t) && t > 0) return t;
  const q = parsePrice(tier.quantity);
  const p = parsePrice(tier.unitPrice);
  if (!isNaN(q) && !isNaN(p)) return Math.round(q * p);
  return null;
}

function itemFirstTotal(item: OrderItem): number | null {
  return item.priceTiers.length > 0 ? tierTotal(item.priceTiers[0]) : null;
}

function resolveImage(item: OrderItem): string | undefined {
  if (item.imagePath) {
    const abs = path.join(process.cwd(), "public", item.imagePath);
    if (fs.existsSync(abs)) return abs;
  }
  return undefined;
}

function resolveImageData(item: OrderItem): { data: string; extension: string } | undefined {
  if (item.imageDataUrl) {
    const match = item.imageDataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
    if (match) return { data: match[2], extension: match[1] };
  }
  return undefined;
}

function addProductImage(slide: Slide, item: OrderItem, x: number, y: number, w: number, h: number, prs: PptxGenJS) {
  const imgPath = resolveImage(item);
  const imgData = resolveImageData(item);

  if (imgPath) {
    slide.addImage({ path: imgPath, x, y, w, h, sizing: { type: "contain", w, h } });
  } else if (imgData) {
    slide.addImage({ data: `image/${imgData.extension};base64,${imgData.data}`, x, y, w, h, sizing: { type: "contain", w, h } });
  } else {
    slide.addShape(prs.ShapeType.roundRect, { x, y, w, h, rectRadius: 0.1, fill: { color: LIGHT }, line: { color: "DDDDEF" } });
    slide.addText("нет фото", { x, y: y + h / 2 - 0.2, w, h: 0.4, fontSize: 12, color: "BBBBCC", align: "center", fontFace: FONT, margin: 0 });
  }
}

function safeTruncate(text: string, limit: number): string {
  if (text.length <= limit) return text;
  return text.slice(0, limit - 1) + "…";
}

// ─── Slide 1 — Cover ─────────────────────────────────────────────────────────
function addCoverSlide(prs: PptxGenJS, form: OrderForm, today: string) {
  const slide = prs.addSlide();

  slide.addShape(prs.ShapeType.rect, { x: 0, y: 0, w: W, h: H, fill: { color: BLUE }, line: { color: BLUE } });
  slide.addShape(prs.ShapeType.rect, { x: 0, y: H - 1.15, w: W, h: 1.15, fill: { color: BLUE2 }, line: { color: BLUE2 } });

  addLogo(slide, true);

  slide.addText(today, { x: W - 2.1, y: 0.32, w: 1.72, h: 0.26, fontSize: 9, color: "9999CC", fontFace: FONT, align: "right", margin: 0 });

  // Title — tighter and more refined
  slide.addText("Коммерческое\nпредложение", { x: 0.55, y: 0.85, w: 5.5, h: 1.65, fontSize: 36, bold: true, color: WHITE, fontFace: FONT, lineSpacingMultiple: 1.08, margin: 0 });

  // Client name — subtle
  slide.addText(`для ${form.clientName}`, { x: 0.55, y: 2.6, w: 5.5, h: 0.42, fontSize: 15, color: "AAAADD", fontFace: FONT, margin: 0 });

  // Thin decorative separator
  slide.addShape(prs.ShapeType.rect, { x: 0.55, y: 3.12, w: 0.5, h: 0.022, fill: { color: "FFFFFF", transparency: 55 }, line: { color: "FFFFFF", transparency: 55 } });

  // Numbered compact item list
  const maxItems = Math.min(form.items.length, 9);
  form.items.slice(0, maxItems).forEach((item, i) => {
    const rowY = 3.28 + i * 0.30;
    if (rowY > H - 1.35) return;
    const name = item.name.length > 44 ? item.name.slice(0, 41) + "…" : (item.name || "Позиция");
    slide.addText(`${String(i + 1).padStart(2, "0")}`, {
      x: 0.55, y: rowY, w: 0.35, h: 0.25, fontSize: 8, color: "6666AA", fontFace: FONT, margin: 0,
    });
    slide.addText(name, {
      x: 0.93, y: rowY, w: 5.0, h: 0.25, fontSize: 11, color: "CCCCEE", fontFace: FONT, margin: 0,
    });
  });

  // Right card — slightly tighter
  slide.addShape(prs.ShapeType.roundRect, { x: 7.1, y: 1.35, w: 2.55, h: 3.95, rectRadius: 0.12, fill: { color: "FFFFFF", transparency: 90 }, line: { color: "FFFFFF", transparency: 70 } });
  slide.addText("Детали\nзаказа", { x: 7.25, y: 1.5, w: 2.2, h: 0.55, fontSize: 10, bold: true, color: "CCCCFF", fontFace: FONT, lineSpacingMultiple: 1.2, margin: 0 });

  const grandTotal = form.items.reduce((s, item) => { const t = itemFirstTotal(item); return t ? s + t : s; }, 0);
  const infos: [string, string][] = [
    ["ПОЗИЦИЙ", `${form.items.length} шт`],
    ["ИТОГО", grandTotal > 0 ? fmtP(grandTotal) : "—"],
    ["МЕНЕДЖЕР", form.managerName || "—"],
  ];
  infos.forEach(([label, value], i) => {
    const y = 2.2 + i * 0.9;
    slide.addText(label, { x: 7.25, y, w: 2.2, h: 0.18, fontSize: 7, color: "AAAACC", fontFace: FONT, margin: 0 });
    slide.addText(value, { x: 7.25, y: y + 0.18, w: 2.2, h: 0.45, fontSize: 11, bold: true, color: WHITE, fontFace: FONT, margin: 0 });
  });
}

// ─── Slide — Product info ─────────────────────────────────────────────────────
function addProductInfoSlide(prs: PptxGenJS, item: OrderItem) {
  const slide = prs.addSlide();

  slide.addShape(prs.ShapeType.rect, { x: 0, y: 0, w: W, h: H, fill: { color: WHITE }, line: { color: WHITE } });
  slide.addShape(prs.ShapeType.rect, { x: 0, y: 0, w: 0.07, h: H, fill: { color: BLUE }, line: { color: BLUE } });

  addLogo(slide, false);

  // Image (left half)
  addProductImage(slide, item, 0.25, 0.9, 4.2, 5.8, prs);

  // Right panel
  const rx = 5.1;
  const rw = 4.5;

  // Name
  const nameFontSize = item.name.length > 30 ? 20 : item.name.length > 20 ? 23 : 26;
  slide.addText(item.name || "Изделие", { x: rx, y: 0.9, w: rw, h: 1.0, fontSize: nameFontSize, bold: true, color: DARK, fontFace: FONT, lineSpacingMultiple: 1.1, margin: 0 });

  // Accent line
  slide.addShape(prs.ShapeType.rect, { x: rx, y: 2.0, w: 0.9, h: 0.035, fill: { color: BLUE }, line: { color: BLUE } });

  // Info blocks — show only non-empty, with safe limits
  const blocks: [string, string][] = ([
    ["ОПИСАНИЕ",  safeTruncate(item.description, DESC_LIMIT)],
    ["МАТЕРИАЛ",  safeTruncate(item.material, 150)],
    ["ПРЕИМУЩЕСТВА", safeTruncate(item.features, FEAT_LIMIT)],
    ["НАНЕСЕНИЕ", safeTruncate(item.branding, 120)],
  ] as [string, string][]).filter(([, v]) => v?.trim());

  // Adaptive vertical spacing based on number of blocks
  const totalContentH = H - 2.1 - 0.25; // from y=2.1 to near bottom
  const blockH = Math.min(1.3, totalContentH / Math.max(blocks.length, 1));
  const descH = blocks[0]?.[0] === "ОПИСАНИЕ"
    ? Math.min(blockH + 0.3, 1.5)   // description gets extra height
    : blockH;

  let y = 2.18;
  blocks.forEach(([label, text], i) => {
    const bh = i === 0 && label === "ОПИСАНИЕ" ? descH : blockH;
    const textH = bh - 0.28;

    slide.addText(label, { x: rx, y, w: rw, h: 0.22, fontSize: 8, bold: true, color: BLUE, fontFace: FONT, charSpacing: 1.5, margin: 0 });
    slide.addText(text, { x: rx, y: y + 0.22, w: rw, h: textH, fontSize: 12, color: DARK, fontFace: FONT, lineSpacingMultiple: 1.3, margin: 0, wrap: true });
    y += bh;
  });
}

// ─── Slide — Item pricing (per item) ─────────────────────────────────────────
function addItemPricingSlide(prs: PptxGenJS, item: OrderItem, showTotalsBar = true) {
  const slide = prs.addSlide();

  slide.addShape(prs.ShapeType.rect, { x: 0, y: 0, w: W, h: H, fill: { color: LIGHT }, line: { color: LIGHT } });
  slide.addShape(prs.ShapeType.rect, { x: 0, y: 0, w: W, h: 1.5, fill: { color: BLUE }, line: { color: BLUE } });

  // No logo on pricing slides — cleaner
  const priceTypeLabel = (item.priceType ?? "with_print") === "no_print" ? "Без нанесения" : "С нанесением";
  slide.addText("Стоимость изделия", { x: 0.55, y: 0.28, w: 7, h: 0.56, fontSize: 28, bold: true, color: WHITE, fontFace: FONT, margin: 0 });
  slide.addText(`${priceTypeLabel}  ·  Без НДС*`, { x: 0.55, y: 0.88, w: 7, h: 0.26, fontSize: 10, color: "AAAADD", fontFace: FONT, charSpacing: 0.5, margin: 0 });

  // Item name sub-header
  const shortName = item.name.length > 40 ? item.name.slice(0, 37) + "…" : item.name;
  slide.addText(shortName, { x: 0.55, y: 1.18, w: 9, h: 0.28, fontSize: 11, color: "DDDDFF", fontFace: FONT, margin: 0 });

  // Adaptive card layout based on tier count
  const tiers = item.priceTiers;
  const n = Math.min(tiers.length, 4);
  const GRAND_BAR = showTotalsBar ? 1.05 : 0;
  const LEAD_H = 0.7;
  const AVAIL_H = H - 1.55 - GRAND_BAR - LEAD_H - 0.15;

  let cardW: number, startX: number, gap: number;
  if (n === 1)      { cardW = 4.5; gap = 0; startX = (W - cardW) / 2; }
  else if (n === 2) { gap = 0.5; cardW = (W - 0.6 - gap) / 2; startX = 0.3; }
  else if (n === 3) { gap = 0.3; cardW = (W - 0.5 - gap * 2) / 3; startX = 0.25; }
  else              { gap = 0.22; cardW = (W - 0.44 - gap * 3) / 4; startX = 0.22; }

  const cardH = Math.min(AVAIL_H, 4.0);
  const startY = 1.65;

  tiers.slice(0, 4).forEach((tier, i) => {
    const x = startX + i * (cardW + gap);
    const total = tierTotal(tier);
    const qty = parsePrice(tier.quantity);
    const unit = parsePrice(tier.unitPrice);

    slide.addShape(prs.ShapeType.roundRect, { x, y: startY, w: cardW, h: cardH, rectRadius: 0.12, fill: { color: WHITE }, shadow: { type: "outer", blur: 8, offset: 3, angle: 270, color: "CCCCDD", opacity: 0.25 }, line: { color: "EEEEEE" } });

    const pad = Math.min(0.18, cardW * 0.06);
    const iw = cardW - pad * 2;

    // Tираж
    slide.addText("ТИРАЖ", { x: x + pad, y: startY + 0.2, w: iw, h: 0.2, fontSize: 7, color: GRAY, fontFace: FONT, charSpacing: 1.5, margin: 0 });
    slide.addText(!isNaN(qty) ? `${qty} шт` : tier.quantity || "—", { x: x + pad, y: startY + 0.38, w: iw, h: 0.45, fontSize: n <= 2 ? 20 : 15, bold: true, color: BLUE, fontFace: FONT, margin: 0 });

    slide.addShape(prs.ShapeType.rect, { x: x + pad, y: startY + 0.9, w: iw, h: 0.02, fill: { color: LIGHT }, line: { color: LIGHT } });

    // Unit price
    slide.addText("ЦЕНА / ШТ", { x: x + pad, y: startY + 1.02, w: iw, h: 0.2, fontSize: 7, color: GRAY, fontFace: FONT, charSpacing: 1.5, margin: 0 });
    slide.addText(!isNaN(unit) ? fmtP(unit) : "—", { x: x + pad, y: startY + 1.2, w: iw, h: 0.45, fontSize: n <= 2 ? 18 : 14, bold: true, color: DARK, fontFace: FONT, margin: 0 });

    // Total badge
    const badgeY = startY + cardH - 0.8;
    slide.addShape(prs.ShapeType.roundRect, { x: x + 0.1, y: badgeY, w: cardW - 0.2, h: 0.72, rectRadius: 0.08, fill: { color: BLUE }, line: { color: BLUE } });
    slide.addText("ИТОГО", { x: x + 0.16, y: badgeY + 0.07, w: cardW - 0.32, h: 0.2, fontSize: 7, color: "AAAAFF", fontFace: FONT, charSpacing: 1.5, margin: 0 });
    slide.addText(total !== null ? fmtP(total) : "—", { x: x + 0.16, y: badgeY + 0.26, w: cardW - 0.32, h: 0.38, fontSize: n <= 2 ? 16 : 13, bold: true, color: WHITE, fontFace: FONT, margin: 0 });
  });

  // Lead time block
  const leadY = startY + cardH + 0.15;
  slide.addShape(prs.ShapeType.roundRect, { x: 0.25, y: leadY, w: W - 0.5, h: LEAD_H, rectRadius: 0.1, fill: { color: WHITE }, line: { color: "EEEEEE" } });
  slide.addText("СРОК ПРОИЗВОДСТВА", { x: 0.55, y: leadY + 0.1, w: 4, h: 0.2, fontSize: 8, color: GRAY, fontFace: FONT, charSpacing: 1.5, margin: 0 });
  slide.addText(item.leadTime || "15–20 рабочих дней", { x: 0.55, y: leadY + 0.3, w: W - 1.5, h: 0.3, fontSize: 14, bold: true, color: DARK, fontFace: FONT, margin: 0 });

  // Bottom bar — split per tier (no misleading cross-tier sum)
  if (!showTotalsBar) return;
  // (GRAND_BAR=0 above already freed the space for cards)
  slide.addShape(prs.ShapeType.rect, { x: 0, y: H - GRAND_BAR, w: W, h: GRAND_BAR, fill: { color: DARK }, line: { color: DARK } });

  const tierCount = Math.min(tiers.length, 4);
  const colW = W / tierCount;
  const totalFontSize = tierCount === 1 ? 22 : tierCount === 2 ? 18 : tierCount === 3 ? 14 : 11;

  tiers.slice(0, 4).forEach((tier, i) => {
    const total = tierTotal(tier);
    const qty   = parsePrice(tier.quantity);
    const cx    = i * colW;

    // Thin divider between columns
    if (i > 0) {
      slide.addShape(prs.ShapeType.rect, { x: cx, y: H - GRAND_BAR + 0.1, w: 0.01, h: GRAND_BAR - 0.35, fill: { color: "333355" }, line: { color: "333355" } });
    }
    const label = !isNaN(qty) ? `ТИРАЖ  ${qty} ШТ` : (tier.quantity || "—");
    slide.addText(label, { x: cx + 0.2, y: H - GRAND_BAR + 0.12, w: colW - 0.4, h: 0.22, fontSize: 7.5, color: "777788", fontFace: FONT, charSpacing: 1, margin: 0 });
    slide.addText(total !== null ? fmtP(total) : "—", { x: cx + 0.2, y: H - GRAND_BAR + 0.35, w: colW - 0.4, h: 0.46, fontSize: totalFontSize, bold: true, color: WHITE, fontFace: FONT, margin: 0 });
  });

  slide.addText("*НДС не применяется в связи с применением УСН", { x: 0.2, y: H - 0.24, w: W - 0.4, h: 0.21, fontSize: 7.5, color: "555566", fontFace: FONT, margin: 0 });
}

// ─── Slide — Summary table ────────────────────────────────────────────────────
function addSummarySlide(prs: PptxGenJS, items: OrderItem[]) {
  interface SummaryRow {
    name: string;
    isFirst: boolean;
    itemIdx: number;
    qty: string;
    unit: string;
    total: string;
  }

  let grandTotal = 0; // sum of first tiers only (minimum order)
  const allRows: SummaryRow[] = [];
  items.forEach((item, itemIdx) => {
    const displayName = item.name.length > 36 ? item.name.slice(0, 33) + "…" : item.name || "—";
    item.priceTiers.forEach((tier, ti) => {
      const total = tierTotal(tier);
      const qty   = parsePrice(tier.quantity);
      const unit  = parsePrice(tier.unitPrice);
      if (total && ti === 0) grandTotal += total; // only first tier per item
      allRows.push({
        name: displayName,
        isFirst: ti === 0,
        itemIdx,
        qty:   !isNaN(qty)  ? `${qty} шт` : "—",
        unit:  !isNaN(unit) ? fmtP(unit)  : "—",
        total: total !== null ? fmtP(total) : "—",
      });
    });
  });

  const cols    = [3.9, 1.4, 1.8, 1.8];
  const xs      = [0.38, 4.42, 5.92, 7.78];
  const headers = ["Изделие", "Тираж", "Цена / шт", "Итого"];
  const FOOTER_H  = 0.9;
  const hY        = 1.35;
  const ROW_H     = 0.40;
  const rowStartY = hY + 0.30;
  const rowsPerPage = Math.floor((H - FOOTER_H - 0.1 - rowStartY) / ROW_H);

  const pages: SummaryRow[][] = [];
  for (let i = 0; i < allRows.length; i += rowsPerPage) {
    pages.push(allRows.slice(i, i + rowsPerPage));
  }
  if (pages.length === 0) pages.push([]);

  pages.forEach((pageRows, pageIdx) => {
    const isLast = pageIdx === pages.length - 1;
    const slide  = prs.addSlide();

    // Backgrounds
    slide.addShape(prs.ShapeType.rect, { x: 0, y: 0, w: W, h: H, fill: { color: "F5F5FA" }, line: { color: "F5F5FA" } });
    slide.addShape(prs.ShapeType.rect, { x: 0, y: 0, w: W, h: 1.2, fill: { color: BLUE }, line: { color: BLUE } });

    const title = pageIdx === 0 ? "Итог заказа" : "Итог заказа (продолжение)";
    slide.addText(title, { x: 0.42, y: 0.24, w: 8, h: 0.72, fontSize: 26, bold: true, color: WHITE, fontFace: FONT, margin: 0 });

    // White card container for the table
    const tableH = H - 1.25 - FOOTER_H - 0.15;
    slide.addShape(prs.ShapeType.roundRect, { x: 0.28, y: 1.25, w: W - 0.56, h: tableH, rectRadius: 0.1, fill: { color: WHITE }, line: { color: "E2E2EE" } });

    // Column headers
    headers.forEach((h, i) => {
      slide.addText(h.toUpperCase(), { x: xs[i], y: hY, w: cols[i], h: 0.22, fontSize: 7.5, bold: true, color: BLUE, fontFace: FONT, charSpacing: 0.8, margin: 0, align: i > 0 ? "right" : "left" });
    });
    slide.addShape(prs.ShapeType.rect, { x: 0.38, y: hY + 0.24, w: W - 0.76, h: 0.018, fill: { color: "DDDDE8" }, line: { color: "DDDDE8" } });

    // Rows
    let rowY = rowStartY;
    pageRows.forEach((row, rowIdx) => {
      // Subtle alternating stripe per item group
      if (row.itemIdx % 2 === 1) {
        slide.addShape(prs.ShapeType.rect, { x: 0.38, y: rowY, w: W - 0.76, h: ROW_H, fill: { color: "F4F4FA" }, line: { color: "F4F4FA" } });
      }
      // Thin hairline separator
      if (rowIdx > 0) {
        slide.addShape(prs.ShapeType.rect, { x: 0.38, y: rowY, w: W - 0.76, h: 0.01, fill: { color: "EAEAF2" }, line: { color: "EAEAF2" } });
      }

      // Name cell
      slide.addText(row.name, {
        x: xs[0] + 0.05, y: rowY + 0.07, w: cols[0] - 0.05, h: 0.27,
        fontSize: 11.5, bold: row.isFirst, color: row.isFirst ? DARK : "AAAAAA",
        fontFace: FONT, align: "left", margin: 0,
      });
      // Data cells
      [row.qty, row.unit, row.total].forEach((v, i) => {
        slide.addText(v, {
          x: xs[i + 1], y: rowY + 0.07, w: cols[i + 1], h: 0.27,
          fontSize: 11.5, color: DARK, fontFace: FONT, align: "right", margin: 0,
        });
      });
      rowY += ROW_H;
    });

    // Grand total footer — only on last page
    if (isLast) {
      slide.addShape(prs.ShapeType.rect, { x: 0, y: H - FOOTER_H, w: W, h: FOOTER_H, fill: { color: DARK }, line: { color: DARK } });
      slide.addText("ИТОГО ЗА ПЕРВЫЙ ТИРАЖ  ·  БЕЗ НДС*", { x: 0.42, y: H - FOOTER_H + 0.16, w: 5.5, h: 0.32, fontSize: 8.5, color: "777788", fontFace: FONT, charSpacing: 1.5, margin: 0 });
      slide.addText(grandTotal > 0 ? fmtP(grandTotal) : "—", { x: W - 4.0, y: H - FOOTER_H + 0.08, w: 3.65, h: 0.58, fontSize: 24, bold: true, color: WHITE, fontFace: FONT, align: "right", margin: 0 });
      slide.addText("*НДС не применяется в связи с применением УСН", { x: 0.42, y: H - 0.26, w: W - 1.1, h: 0.22, fontSize: 7.5, color: "555566", fontFace: FONT, margin: 0 });
    }
  });
}

// ─── Slide — Offer ────────────────────────────────────────────────────────────
function addOfferSlide(prs: PptxGenJS, form: OrderForm) {
  const slide = prs.addSlide();

  slide.addShape(prs.ShapeType.rect, { x: 0, y: 0, w: W, h: H, fill: { color: BLUE }, line: { color: BLUE } });
  slide.addShape(prs.ShapeType.ellipse, { x: 5.8, y: -2.5, w: 7, h: 7, fill: { color: BLUE2 }, line: { color: BLUE2 } });
  slide.addShape(prs.ShapeType.ellipse, { x: -2.5, y: 3.5, w: 5, h: 5, fill: { color: BLUE2 }, line: { color: BLUE2 } });

  addLogo(slide, true);

  slide.addText("Специальное\nпредложение", { x: 0.55, y: 1.1, w: 6, h: 1.8, fontSize: 42, bold: true, color: WHITE, fontFace: FONT, lineSpacingMultiple: 1.1, margin: 0 });
  slide.addShape(prs.ShapeType.rect, { x: 0.55, y: 3.1, w: 1.5, h: 0.04, fill: { color: WHITE }, line: { color: WHITE } });
  slide.addText(form.offerText || "Оформите заказ до конца недели —\nдоставка за наш счёт.", { x: 0.55, y: 3.3, w: 6.2, h: 1.3, fontSize: 16, color: "DDDDFF", fontFace: FONT, lineSpacingMultiple: 1.5, margin: 0 });

  slide.addShape(prs.ShapeType.roundRect, { x: 0.55, y: 5.05, w: 8.9, h: 1.8, rectRadius: 0.12, fill: { color: "FFFFFF", transparency: 85 }, line: { color: "FFFFFF", transparency: 70 } });
  slide.addText(form.managerName || "Ваш менеджер", { x: 0.85, y: 5.18, w: 3, h: 0.38, fontSize: 13, bold: true, color: WHITE, fontFace: FONT, margin: 0 });

  ([["TELEGRAM", form.managerTelegram || "—"], ["EMAIL", form.managerEmail || "—"]] as [string, string][]).forEach(([label, value], i) => {
    const x = 0.85 + i * 3.5;
    slide.addText(label, { x, y: 5.65, w: 3.2, h: 0.2, fontSize: 7, color: "AAAACC", fontFace: FONT, charSpacing: 1.5, margin: 0 });
    slide.addText(value, { x, y: 5.85, w: 3.2, h: 0.35, fontSize: 12, color: WHITE, fontFace: FONT, margin: 0 });
  });
}

// ─── Main export ──────────────────────────────────────────────────────────────
export async function generatePptx(form: OrderForm): Promise<Buffer> {
  const prs = new PptxGenJS();
  prs.defineLayout({ name: "CUSTOM", width: W, height: H });
  prs.layout = "CUSTOM";

  const today = new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });

  addCoverSlide(prs, form, today);

  for (const item of form.items) {
    addProductInfoSlide(prs, item);
    addItemPricingSlide(prs, item, form.showTierTotalsBar ?? true);
  }

  if (form.includeSummarySlide && form.items.length >= 2) {
    addSummarySlide(prs, form.items);
  }

  addOfferSlide(prs, form);

  const buf = await prs.write({ outputType: "nodebuffer" });
  return buf as unknown as Buffer;
}
