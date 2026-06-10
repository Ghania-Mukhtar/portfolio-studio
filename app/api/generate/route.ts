import { NextResponse } from "next/server";
import mammoth from "mammoth";
import { generatePortfolio, MissingKeyError } from "@/lib/ai";
import { findGaps } from "@/lib/portfolio-schema";

export const runtime = "nodejs";
export const maxDuration = 60;

// Accepts multipart/form-data: { file?, cvText?, idea?, theme? }.
// Reads PDF natively via Claude, Word via mammoth, anything else as text,
// then asks Claude to build structured portfolio content.
export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const idea = ((form.get("idea") as string) || "").toString();
    const theme = ((form.get("theme") as string) || "").toString();
    let cvText = ((form.get("cvText") as string) || "").toString();
    let pdf: { base64: string } | undefined;

    const file = form.get("file");
    if (file && file instanceof File && file.size > 0) {
      const buf = Buffer.from(await file.arrayBuffer());
      const name = file.name.toLowerCase();
      const type = (file.type || "").toLowerCase();

      if (name.endsWith(".pdf") || type === "application/pdf") {
        pdf = { base64: buf.toString("base64") };
      } else if (
        name.endsWith(".docx") ||
        type.includes("officedocument.wordprocessingml")
      ) {
        const { value } = await mammoth.extractRawText({ buffer: buf });
        cvText = (cvText ? cvText + "\n\n" : "") + value;
      } else {
        // .txt, .md, .doc (best effort), anything text-like
        cvText = (cvText ? cvText + "\n\n" : "") + buf.toString("utf8");
      }
    }

    if (!cvText.trim() && !pdf) {
      return NextResponse.json(
        { error: "Please provide a CV: upload a file or paste the text." },
        { status: 400 }
      );
    }

    const data = await generatePortfolio({ cvText, pdf, idea, theme });
    return NextResponse.json({ data, gaps: findGaps(data) });
  } catch (e) {
    if (e instanceof MissingKeyError) {
      return NextResponse.json({ error: e.message, code: "NO_KEY" }, { status: 400 });
    }
    console.error("[/api/generate]", e);
    return NextResponse.json(
      { error: (e as Error)?.message || "Generation failed." },
      { status: 500 }
    );
  }
}
