import { NextRequest, NextResponse } from "next/server";
import { generatePptx } from "@/lib/generatePptx";
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

    const buffer = await generatePptx(form);
    const filename = buildFilename(form.clientName, "pptx");

    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("Generate error:", err);
    return NextResponse.json({ error: "Ошибка генерации" }, { status: 500 });
  }
}
