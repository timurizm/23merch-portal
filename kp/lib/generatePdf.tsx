import React from "react";
import { Document, Page, View, Text, Image, Font, Svg, Path, renderToBuffer } from "@react-pdf/renderer";
import { OrderForm, OrderItem, PriceTier, DESC_LIMIT, FEAT_LIMIT, parsePrice, formatPrice } from "@/types/order";
import path from "path";
import fs from "fs";

// ─── Fonts ────────────────────────────────────────────────────────────────────
Font.register({
  family: "Roboto",
  fonts: [
    { src: path.join(process.cwd(), "public/fonts/Roboto-Regular.ttf"), fontWeight: 400 },
    { src: path.join(process.cwd(), "public/fonts/Roboto-Bold.ttf"),    fontWeight: 700 },
  ],
});
Font.registerHyphenationCallback((w) => [w]);

// ─── Brand ────────────────────────────────────────────────────────────────────
const BLUE  = "#1400C8";
const BLUE2 = "#0F00A8";
const WHITE = "#FFFFFF";
const LIGHT = "#F4F4F8";
const DARK  = "#0D0D0D";
const GRAY  = "#888899";

// Page: 10" × 7.5" in points (72pt = 1in)
const PW = 720;
const PH = 540;
const p = (inch: number) => Math.round(inch * 72);

// ─── Helpers ──────────────────────────────────────────────────────────────────
/** PDF-specific formatter: replaces ₽ with " руб." (Roboto build on Vercel may lack the glyph) */
function fmt(n: number): string {
  return formatPrice(n).replace(/ ₽$/, " руб.");
}

function tierTotal(tier: PriceTier): number | null {
  const t = parsePrice(tier.totalPrice);
  if (!isNaN(t) && t > 0) return t;
  const q = parsePrice(tier.quantity);
  const up = parsePrice(tier.unitPrice);
  if (!isNaN(q) && !isNaN(up)) return Math.round(q * up);
  return null;
}

function resolveImageSrc(item: OrderItem): string | null {
  if (item.imageDataUrl) return item.imageDataUrl;
  if (item.imagePath) {
    const abs = path.join(process.cwd(), "public", item.imagePath);
    if (fs.existsSync(abs)) return abs;
  }
  return null;
}

function safeTruncate(text: string, limit: number): string {
  if (text.length <= limit) return text;
  return text.slice(0, limit - 1) + "…";
}

// ─── Logo ─────────────────────────────────────────────────────────────────────
// SVG viewBox: 0 0 216 133  (the "23°" brand mark)
const LOGO_D3  = "M140.625 0C150.672 0 159.205 1.69545 166.226 5.08706C173.367 8.47867 178.753 13.0213 182.384 18.7144C186.136 24.4074 188.013 30.6455 188.013 37.4288C188.013 42.7584 186.621 47.846 183.837 52.6912C181.053 57.4151 176.696 61.2912 170.765 64.3194C169.773 64.8054 168.733 65.2525 167.647 65.664C168.862 66.0759 170.022 66.536 171.128 67.0449C177.18 69.8308 181.658 73.6463 184.563 78.4913C187.468 83.3365 188.92 88.7877 188.92 94.8442C188.92 101.87 186.984 108.29 183.111 114.104C179.358 119.797 173.851 124.4 166.589 127.912C159.447 131.304 150.793 133 140.625 133C131.305 133 122.833 131.183 115.207 127.549C107.703 123.915 101.711 118.827 97.233 112.286C92.7545 105.745 90.5152 98.2355 90.5152 89.7565H111.394C111.758 94.6017 113.21 98.9019 115.752 102.657C118.294 106.291 121.743 109.198 126.101 111.378C130.458 113.437 135.421 114.467 140.989 114.467C146.92 114.467 151.882 113.559 155.877 111.742C159.992 109.804 163.079 107.26 165.137 104.11C167.194 100.961 168.223 97.5086 168.223 93.7537C168.223 87.4551 165.741 82.7311 160.779 79.5818C155.937 76.3113 148.675 74.6758 138.992 74.6758H128.28V56.5067H138.992C149.159 56.5067 156.422 54.9319 160.779 51.7825C165.136 48.5121 167.315 43.7274 167.315 37.4288C167.315 33.916 166.347 30.7664 164.41 27.9805C162.473 25.0734 159.568 22.7723 155.695 21.0765C151.822 19.3807 146.98 18.5327 141.17 18.5327C135.603 18.5327 130.64 19.5014 126.282 21.4394C121.925 23.3775 118.415 26.2241 115.752 29.9791C113.21 33.7341 111.758 38.1555 111.394 43.2429H90.5152C90.5152 34.6427 92.815 27.1328 97.4145 20.713C102.135 14.172 108.247 9.08447 115.752 5.45058C123.377 1.81674 131.669 1.42332e-05 140.625 0Z";
const LOGO_DOT = "M216 130.146H198.361V112.495H216V130.146Z";
const LOGO_D2  = "M47.5685 0C57.8568 7.71215e-06 66.4508 1.87729 73.3501 5.63229C80.3703 9.26614 85.6353 14.1719 89.1454 20.3495C92.7767 26.4059 94.5926 33.0078 94.5926 40.1544C94.5926 46.0896 93.5028 51.1768 91.3241 55.4162C89.2665 59.6557 86.4826 63.3503 82.9725 66.4997C79.5834 69.649 75.7103 72.4957 71.353 75.0393C66.9955 77.4619 62.5168 79.8847 57.9173 82.3073C53.3178 84.6087 48.8391 87.1523 44.4817 89.9382C40.2454 92.603 36.4328 95.7528 33.0437 99.3866C29.6547 103.02 27.0524 107.381 25.2368 112.468H94.9558V130.093H17.8525V112.495H0.638501V112.468C2.00003 107.408 3.90547 102.927 6.35465 99.0231C9.74375 93.8146 13.6773 89.3326 18.1557 85.5776C22.7552 81.8226 27.5969 78.5522 32.6805 75.7663C37.7642 72.8592 42.7269 70.1939 47.5685 67.7714C52.41 65.3488 56.7676 62.8659 60.6408 60.3222C64.635 57.7785 67.7819 54.9318 70.0816 51.7825C72.5024 48.6332 73.7132 44.878 73.7132 40.5173C73.7132 33.7342 71.4738 28.4046 66.9954 24.5285C62.517 20.5313 56.3439 18.5327 48.4764 18.5327C39.2774 18.5327 32.4988 20.8342 28.1414 25.4371C23.7841 29.9189 21.3029 35.8541 20.6977 43.2429H0C7.96913e-06 34.6427 2.05761 27.1328 6.17296 20.713C10.4094 14.172 16.0983 9.08447 23.2397 5.45058C30.381 1.81678 38.4906 0 47.5685 0Z";

function Logo({ dark = true }: { dark?: boolean }) {
  const fill = dark ? WHITE : "#DCDCDC";
  return (
    <Svg viewBox="0 0 216 133" style={{ position: "absolute", top: p(0.28), left: p(0.36), width: p(0.68), height: p(0.42) }}>
      <Path d={LOGO_D2}  fill={fill} />
      <Path d={LOGO_D3}  fill={fill} />
      <Path d={LOGO_DOT} fill={fill} />
    </Svg>
  );
}

// ─── Cover Page ───────────────────────────────────────────────────────────────
function CoverPage({ form, today }: { form: OrderForm; today: string }) {
  const grandTotal = form.items.reduce((s, item) => {
    const first = item.priceTiers[0];
    if (!first) return s;
    const t = tierTotal(first);
    return t ? s + t : s;
  }, 0);

  return (
    <Page size={[PW, PH]} style={{ fontFamily: "Roboto" }}>
      <View style={{ position: "absolute", top: 0, left: 0, width: PW, height: PH, backgroundColor: BLUE }} />
      <View style={{ position: "absolute", bottom: 0, left: 0, width: PW, height: p(1.15), backgroundColor: BLUE2 }} />
      <Logo dark={true} />
      <Text style={{ position: "absolute", top: p(0.32), right: p(0.32), fontSize: 7.5, color: "#9999CC" }}>{today}</Text>

      {/* Title — tighter, more refined */}
      <Text style={{ position: "absolute", top: p(0.85), left: p(0.55), width: p(5.5), fontSize: 34, fontWeight: 700, color: WHITE, lineHeight: 1.1 }}>
        {"Коммерческое\nпредложение"}
      </Text>

      {/* Client name */}
      <Text style={{ position: "absolute", top: p(2.55), left: p(0.55), fontSize: 13, color: "#AAAADD" }}>
        для {form.clientName}
      </Text>

      {/* Thin decorative line */}
      <View style={{ position: "absolute", top: p(3.05), left: p(0.55), width: p(0.5), height: 1.5, backgroundColor: "rgba(255,255,255,0.38)" }} />

      {/* Numbered compact item list */}
      {form.items.slice(0, 9).map((item, i) => {
        const rowY = 3.22 + i * 0.30;
        if (rowY > 6.0) return null;
        const name = item.name.length > 44 ? item.name.slice(0, 41) + "…" : (item.name || "Позиция");
        return (
          <View key={i}>
            <Text style={{ position: "absolute", top: p(rowY), left: p(0.55), fontSize: 7.5, color: "#6666AA" }}>
              {String(i + 1).padStart(2, "0")}
            </Text>
            <Text style={{ position: "absolute", top: p(rowY), left: p(0.93), width: p(4.9), fontSize: 10.5, color: "#CCCCEE" }}>
              {name}
            </Text>
          </View>
        );
      })}

      {/* Right card */}
      <View style={{ position: "absolute", top: p(1.35), left: p(7.1), width: p(2.55), height: p(3.95), borderRadius: 9, backgroundColor: "rgba(255,255,255,0.12)", borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" }} />
      <Text style={{ position: "absolute", top: p(1.5), left: p(7.25), fontSize: 10, fontWeight: 700, color: "#CCCCFF", lineHeight: 1.3 }}>{"Детали\nзаказа"}</Text>
      {([["ПОЗИЦИЙ", `${form.items.length} шт`], ["ИТОГО", grandTotal > 0 ? fmt(grandTotal) : "—"], ["МЕНЕДЖЕР", form.managerName || "—"]] as [string, string][]).map(([label, val], i) => (
        <View key={i}>
          <Text style={{ position: "absolute", top: p(2.2 + i * 0.88), left: p(7.25), fontSize: 7, color: "#AAAACC", letterSpacing: 1 }}>{label}</Text>
          <Text style={{ position: "absolute", top: p(2.38 + i * 0.88), left: p(7.25), width: p(2.2), fontSize: 11, fontWeight: 700, color: WHITE }}>{val}</Text>
        </View>
      ))}
    </Page>
  );
}

// ─── Product Info Page ────────────────────────────────────────────────────────
function ProductInfoPage({ item }: { item: OrderItem }) {
  const imgSrc = resolveImageSrc(item);
  const blocks: [string, string][] = ([
    ["ОПИСАНИЕ",    safeTruncate(item.description, DESC_LIMIT)],
    ["МАТЕРИАЛ",    safeTruncate(item.material, 150)],
    ["ПРЕИМУЩЕСТВА", safeTruncate(item.features, FEAT_LIMIT)],
    ["НАНЕСЕНИЕ",   safeTruncate(item.branding, 120)],
  ] as [string, string][]).filter(([, v]) => v?.trim());

  const totalContentH = PH - p(0.9) - p(0.25);
  const baseBlockH = Math.min(p(1.3), totalContentH / Math.max(blocks.length, 1));
  const descBonus = p(0.3);
  const nameFontSize = item.name.length > 30 ? 16 : item.name.length > 20 ? 19 : 22;

  let y = p(2.15);

  return (
    <Page size={[PW, PH]} style={{ fontFamily: "Roboto" }}>
      <View style={{ position: "absolute", top: 0, left: 0, width: PW, height: PH, backgroundColor: WHITE }} />
      <View style={{ position: "absolute", top: 0, left: 0, width: p(0.07), height: PH, backgroundColor: BLUE }} />
      <Logo dark={false} />

      {/* Image */}
      <View style={{ position: "absolute", top: p(0.9), left: p(0.25), width: p(4.2), height: p(5.8), borderRadius: 8, backgroundColor: LIGHT, overflow: "hidden" }}>
        {imgSrc ? (
          <Image src={imgSrc} style={{ width: p(4.2), height: p(5.8), objectFit: "contain", objectPosition: "center center" }} />
        ) : (
          <Text style={{ color: "#BBBBCC", fontSize: 11, textAlign: "center", marginTop: p(2.7) }}>нет фото</Text>
        )}
      </View>

      {/* Name */}
      <Text style={{ position: "absolute", top: p(0.9), left: p(5.1), width: p(4.5), fontSize: nameFontSize, fontWeight: 700, color: DARK, lineHeight: 1.2 }}>
        {item.name || "Изделие"}
      </Text>
      <View style={{ position: "absolute", top: p(1.95), left: p(5.1), width: p(0.9), height: 2, backgroundColor: BLUE }} />

      {/* Info blocks */}
      {blocks.map(([label, text], i) => {
        const bh = i === 0 && label === "ОПИСАНИЕ" ? baseBlockH + descBonus : baseBlockH;
        const top = y;
        y += bh;
        return (
          <View key={i}>
            <Text style={{ position: "absolute", top, left: p(5.1), fontSize: 7, fontWeight: 700, color: BLUE, letterSpacing: 1.5 }}>{label}</Text>
            <Text style={{ position: "absolute", top: top + 14, left: p(5.1), width: p(4.5), fontSize: 11, color: DARK, lineHeight: 1.4 }}>{text}</Text>
          </View>
        );
      })}
    </Page>
  );
}

// ─── Item Pricing Page ────────────────────────────────────────────────────────
function ItemPricingPage({ item, showTotalsBar = true }: { item: OrderItem; showTotalsBar?: boolean }) {
  const tiers = item.priceTiers;
  const n = Math.min(tiers.length, 4);
  const GRAND_BAR = showTotalsBar ? p(1.05) : 0;
  const LEAD_H = p(0.7);
  const START_Y = p(1.65);
  const AVAIL_H = PH - START_Y - GRAND_BAR - LEAD_H - p(0.15);
  const CARD_H = Math.min(AVAIL_H, p(4.0));

  let cardW: number, startX: number, gap: number;
  if (n === 1)      { cardW = p(4.5); gap = 0; startX = (PW - cardW) / 2; }
  else if (n === 2) { gap = p(0.5); cardW = (PW - p(0.6) - gap) / 2; startX = p(0.3); }
  else if (n === 3) { gap = p(0.3); cardW = (PW - p(0.5) - gap * 2) / 3; startX = p(0.25); }
  else              { gap = p(0.22); cardW = (PW - p(0.44) - gap * 3) / 4; startX = p(0.22); }

  const shortName = item.name.length > 40 ? item.name.slice(0, 37) + "…" : item.name;
  const allTotal = tiers.reduce((s, t) => { const v = tierTotal(t); return v ? s + v : s; }, 0);
  const priceTypeLabel = (item.priceType ?? "with_print") === "no_print" ? "Без нанесения" : "С нанесением";

  return (
    <Page size={[PW, PH]} style={{ fontFamily: "Roboto" }}>
      <View style={{ position: "absolute", top: 0, left: 0, width: PW, height: PH, backgroundColor: LIGHT }} />
      <View style={{ position: "absolute", top: 0, left: 0, width: PW, height: p(1.5), backgroundColor: BLUE }} />
      <Text style={{ position: "absolute", top: p(0.28), left: p(0.55), fontSize: 24, fontWeight: 700, color: WHITE }}>{"Стоимость изделия"}</Text>
      <Text style={{ position: "absolute", top: p(0.84), left: p(0.55), fontSize: 9, color: "#AAAADD", letterSpacing: 0.5 }}>{`${priceTypeLabel}  ·  Без НДС*`}</Text>
      <Text style={{ position: "absolute", top: p(1.18), left: p(0.55), fontSize: 10, color: "#DDDDFF" }}>{shortName}</Text>

      {/* Price cards */}
      {tiers.slice(0, 4).map((tier, i) => {
        const x = startX + i * (cardW + gap);
        const total = tierTotal(tier);
        const qty = parsePrice(tier.quantity);
        const unit = parsePrice(tier.unitPrice);
        const pad = Math.min(p(0.18), cardW * 0.06);
        const iw = cardW - pad * 2;
        const fontSize = n <= 2 ? 18 : 13;
        const badgeY = START_Y + CARD_H - p(0.8);

        return (
          <View key={i}>
            <View style={{ position: "absolute", top: START_Y, left: x, width: cardW, height: CARD_H, borderRadius: 9, backgroundColor: WHITE, borderWidth: 1, borderColor: "#EEEEEE" }} />
            <Text style={{ position: "absolute", top: START_Y + p(0.2), left: x + pad, fontSize: 7, color: GRAY, letterSpacing: 1.5 }}>ТИРАЖ</Text>
            <Text style={{ position: "absolute", top: START_Y + p(0.38), left: x + pad, width: iw, fontSize: fontSize, fontWeight: 700, color: BLUE }}>
              {!isNaN(qty) ? `${qty} шт` : tier.quantity || "—"}
            </Text>
            <View style={{ position: "absolute", top: START_Y + p(0.88), left: x + pad, width: iw, height: 1, backgroundColor: LIGHT }} />
            <Text style={{ position: "absolute", top: START_Y + p(1.0), left: x + pad, fontSize: 7, color: GRAY, letterSpacing: 1.5 }}>ЦЕНА / ШТ</Text>
            <Text style={{ position: "absolute", top: START_Y + p(1.18), left: x + pad, width: iw, fontSize: fontSize, fontWeight: 700, color: DARK }}>
              {!isNaN(unit) ? fmt(unit) : "—"}
            </Text>
            {/* Total badge */}
            <View style={{ position: "absolute", top: badgeY, left: x + p(0.1), width: cardW - p(0.2), height: p(0.72), borderRadius: 6, backgroundColor: BLUE }}>
              <Text style={{ position: "absolute", top: p(0.07), left: p(0.1), fontSize: 7, color: "#AAAAFF", letterSpacing: 1.5 }}>ИТОГО</Text>
              <Text style={{ position: "absolute", top: p(0.26), left: p(0.1), fontSize: n <= 2 ? 15 : 12, fontWeight: 700, color: WHITE }}>
                {total !== null ? fmt(total) : "—"}
              </Text>
            </View>
          </View>
        );
      })}

      {/* Lead time */}
      <View style={{ position: "absolute", top: START_Y + CARD_H + p(0.15), left: p(0.25), width: PW - p(0.5), height: LEAD_H, borderRadius: 8, backgroundColor: WHITE, borderWidth: 1, borderColor: "#EEEEEE" }}>
        <Text style={{ position: "absolute", top: p(0.1), left: p(0.3), fontSize: 8, color: GRAY, letterSpacing: 1.5 }}>СРОК ПРОИЗВОДСТВА</Text>
        <Text style={{ position: "absolute", top: p(0.3), left: p(0.3), fontSize: 13, fontWeight: 700, color: DARK }}>
          {item.leadTime || "15–20 рабочих дней"}
        </Text>
      </View>

      {/* Bottom bar — split per tier */}
      {showTotalsBar && <View style={{ position: "absolute", bottom: 0, left: 0, width: PW, height: GRAND_BAR, backgroundColor: DARK }}>
        {tiers.slice(0, 4).map((tier, i) => {
          const tierCount = Math.min(tiers.length, 4);
          const colW = PW / tierCount;
          const total = tierTotal(tier);
          const qty   = parsePrice(tier.quantity);
          const cx    = i * colW;
          const totalFs = tierCount === 1 ? 20 : tierCount === 2 ? 16 : tierCount === 3 ? 13 : 10;
          const label = !isNaN(qty) ? `ТИРАЖ  ${qty} ШТ` : (tier.quantity || "—");
          return (
            <View key={i}>
              {i > 0 && <View style={{ position: "absolute", top: p(0.1), left: cx, width: 1, height: GRAND_BAR - p(0.3), backgroundColor: "#333355" }} />}
              <Text style={{ position: "absolute", top: p(0.12), left: cx + p(0.2), fontSize: 7, color: "#777788", letterSpacing: 1 }}>{label}</Text>
              <Text style={{ position: "absolute", top: p(0.34), left: cx + p(0.2), width: colW - p(0.4), fontSize: totalFs, fontWeight: 700, color: WHITE }}>
                {total !== null ? fmt(total) : "—"}
              </Text>
            </View>
          );
        })}
        <Text style={{ position: "absolute", bottom: p(0.1), left: p(0.2), fontSize: 7, color: "#555566" }}>
          {"*НДС не применяется в связи с применением УСН"}
        </Text>
      </View>}
    </Page>
  );
}

// ─── Summary Pages (one per chunk of rows) ────────────────────────────────────
interface SummaryRow {
  name: string;
  isFirst: boolean;
  itemIdx: number;
  qty: string;
  unit: string;
  total: string;
}

function SummaryPages({ items }: { items: OrderItem[] }) {
  const cols    = [p(3.9), p(1.4), p(1.8), p(1.8)];
  const xs      = [p(0.38), p(4.42), p(5.92), p(7.78)];
  const headers = ["ИЗДЕЛИЕ", "ТИРАЖ", "ЦЕНА / ШТ", "ИТОГО"];

  const FOOTER_H   = p(0.9);
  const hY         = p(1.35);
  const ROW_H      = p(0.40);
  const rowStartY  = hY + p(0.30);
  const tableH     = PH - p(1.25) - FOOTER_H - p(0.15);
  const rowsPerPage = Math.floor((PH - FOOTER_H - p(0.1) - rowStartY) / ROW_H);

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
        unit:  !isNaN(unit) ? fmt(unit)   : "—",
        total: total !== null ? fmt(total) : "—",
      });
    });
  });

  const pages: SummaryRow[][] = [];
  for (let i = 0; i < allRows.length; i += rowsPerPage) {
    pages.push(allRows.slice(i, i + rowsPerPage));
  }
  if (pages.length === 0) pages.push([]);

  return (
    <>
      {pages.map((pageRows, pageIdx) => {
        const isLast = pageIdx === pages.length - 1;
        const title  = pageIdx === 0 ? "Итог заказа" : "Итог заказа (продолжение)";
        return (
          <Page key={pageIdx} size={[PW, PH]} style={{ fontFamily: "Roboto" }}>
            {/* Backgrounds */}
            <View style={{ position: "absolute", top: 0, left: 0, width: PW, height: PH, backgroundColor: "#F5F5FA" }} />
            <View style={{ position: "absolute", top: 0, left: 0, width: PW, height: p(1.2), backgroundColor: BLUE }} />

            <Text style={{ position: "absolute", top: p(0.24), left: p(0.42), fontSize: 24, fontWeight: 700, color: WHITE }}>{title}</Text>

            {/* White card */}
            <View style={{ position: "absolute", top: p(1.25), left: p(0.28), width: PW - p(0.56), height: tableH, borderRadius: 8, backgroundColor: WHITE, borderWidth: 1, borderColor: "#E2E2EE" }} />

            {/* Column headers */}
            {headers.map((h, i) => (
              <Text key={i} style={{ position: "absolute", top: hY, left: xs[i], width: cols[i], fontSize: 7.5, fontWeight: 700, color: BLUE, letterSpacing: 0.8, textAlign: i > 0 ? "right" : "left" }}>
                {h}
              </Text>
            ))}
            <View style={{ position: "absolute", top: hY + p(0.24), left: p(0.38), width: PW - p(0.76), height: 1.5, backgroundColor: "#DDDDE8" }} />

            {/* Rows */}
            {pageRows.map((row, idx) => {
              const rowY = rowStartY + idx * ROW_H;
              return (
                <View key={idx}>
                  {/* Alternating stripe */}
                  {row.itemIdx % 2 === 1 && (
                    <View style={{ position: "absolute", top: rowY, left: p(0.38), width: PW - p(0.76), height: ROW_H, backgroundColor: "#F4F4FA" }} />
                  )}
                  {/* Hairline separator */}
                  {idx > 0 && (
                    <View style={{ position: "absolute", top: rowY, left: p(0.38), width: PW - p(0.76), height: 1, backgroundColor: "#EAEAF2" }} />
                  )}
                  {/* Name */}
                  <Text style={{ position: "absolute", top: rowY + p(0.07), left: xs[0] + p(0.05), width: cols[0] - p(0.05), fontSize: 11, fontWeight: row.isFirst ? 700 : 400, color: row.isFirst ? DARK : "#AAAAAA" }}>
                    {row.name}
                  </Text>
                  {/* Data cells */}
                  {[row.qty, row.unit, row.total].map((v, i) => (
                    <Text key={i} style={{ position: "absolute", top: rowY + p(0.07), left: xs[i + 1], width: cols[i + 1], fontSize: 11, color: DARK, textAlign: "right" }}>
                      {v}
                    </Text>
                  ))}
                </View>
              );
            })}

            {/* Grand total — only last page */}
            {isLast && (
              <View style={{ position: "absolute", bottom: 0, left: 0, width: PW, height: FOOTER_H, backgroundColor: DARK }}>
                <Text style={{ position: "absolute", top: p(0.16), left: p(0.42), fontSize: 8.5, color: "#777788", letterSpacing: 1.5 }}>{"ИТОГО ЗА ПЕРВЫЙ ТИРАЖ  ·  БЕЗ НДС*"}</Text>
                <Text style={{ position: "absolute", top: p(0.08), right: p(0.35), fontSize: 22, fontWeight: 700, color: WHITE }}>
                  {grandTotal > 0 ? fmt(grandTotal) : "—"}
                </Text>
                <Text style={{ position: "absolute", bottom: p(0.1), left: p(0.42), fontSize: 7, color: "#555566" }}>
                  {"*НДС не применяется в связи с применением УСН"}
                </Text>
              </View>
            )}
          </Page>
        );
      })}
    </>
  );
}

// ─── Offer Page ───────────────────────────────────────────────────────────────
function OfferPage({ form }: { form: OrderForm }) {
  const contacts: [string, string][] = [["TELEGRAM", form.managerTelegram || "—"], ["EMAIL", form.managerEmail || "—"]];

  return (
    <Page size={[PW, PH]} style={{ fontFamily: "Roboto" }}>
      <View style={{ position: "absolute", top: 0, left: 0, width: PW, height: PH, backgroundColor: BLUE }} />
      <View style={{ position: "absolute", top: -p(2.5), left: p(5.8), width: p(7), height: p(7), borderRadius: p(3.5), backgroundColor: BLUE2 }} />
      <View style={{ position: "absolute", top: p(3.5), left: -p(2.5), width: p(5), height: PH - p(3.5), borderRadius: p(2.5), backgroundColor: BLUE2 }} />
      <Logo dark={true} />
      <Text style={{ position: "absolute", top: p(1.1), left: p(0.55), width: p(6), fontSize: 36, fontWeight: 700, color: WHITE, lineHeight: 1.15 }}>{"Специальное\nпредложение"}</Text>
      <View style={{ position: "absolute", top: p(3.1), left: p(0.55), width: p(1.5), height: 2, backgroundColor: WHITE }} />
      <Text style={{ position: "absolute", top: p(3.28), left: p(0.55), width: p(6.2), fontSize: 14, color: "#DDDDFF", lineHeight: 1.6 }}>
        {form.offerText || "Оформите заказ до конца недели —\nдоставка за наш счёт."}
      </Text>

      <View style={{ position: "absolute", top: p(5.05), left: p(0.55), width: p(8.9), height: p(1.8), borderRadius: 9, backgroundColor: "rgba(255,255,255,0.12)", borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" }} />
      <Text style={{ position: "absolute", top: p(5.18), left: p(0.85), fontSize: 12, fontWeight: 700, color: WHITE }}>{form.managerName || "Ваш менеджер"}</Text>
      {contacts.map(([label, val], i) => (
        <View key={i}>
          <Text style={{ position: "absolute", top: p(5.63), left: p(0.85 + i * 3.5), fontSize: 7, color: "#AAAACC", letterSpacing: 1.5 }}>{label}</Text>
          <Text style={{ position: "absolute", top: p(5.83), left: p(0.85 + i * 3.5), width: p(3.2), fontSize: 11, color: WHITE }}>{val}</Text>
        </View>
      ))}
    </Page>
  );
}

// ─── Document ─────────────────────────────────────────────────────────────────
function KPDocument({ form, today }: { form: OrderForm; today: string }) {
  return (
    <Document title={`КП — ${form.clientName}`} author="32° Мерч">
      <CoverPage form={form} today={today} />
      {form.items.map((item) => (
        <React.Fragment key={item.id}>
          <ProductInfoPage item={item} />
          <ItemPricingPage item={item} showTotalsBar={form.showTierTotalsBar ?? true} />
        </React.Fragment>
      ))}
      {form.includeSummarySlide && form.items.length >= 2 && <SummaryPages items={form.items} />}
      <OfferPage form={form} />
    </Document>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export async function generatePdf(form: OrderForm): Promise<Buffer> {
  const today = new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return renderToBuffer(<KPDocument form={form} today={today} /> as any);
}
