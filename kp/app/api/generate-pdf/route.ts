import { NextRequest, NextResponse } from "next/server";
import { generatePdf } from "@/lib/generatePdf";
import { OrderForm } from "@/types/order";
import { buildFilename } from "@/lib/filename";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const form: OrderForm = await req.json();

    if (!form.clientName?.trim()) {
      return NextResponse.json({ error: "Введите название клиента" }, { status: 400 });
    }
    if (!form.items?.length) {
      return NextResponse.json({ error: "Добавьте хотя бы одну позицию" }, { status: 400 });
    }

    const buffer = await generatePdf(form);
    const filename = buildFilename(form.clientName, "pdf");

    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("PDF generate error:", err);
    return NextResponse.json({ error: "Ошибка генерации PDF" }, { status: 500 });
  }
}
