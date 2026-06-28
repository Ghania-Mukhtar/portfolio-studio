import { NextResponse } from "next/server";
import mammoth from "mammoth";
import { generatePortfolio, MissingKeyError } from "@/lib/ai";
import { generatePortfolioHtml } from "@/lib/generate";
import type { GenerateInput } from "@/lib/ai";
import {
  F,
  listNewSubmissions,
  getSubmission,
  updateSubmission,
  fetchAttachment,
  MissingAirtableTokenError,
  type SubmissionRecord,
} from "@/lib/airtable";

export const runtime = "nodejs";
export const maxDuration = 60;

// The five theme ids the renderer accepts. Anything else falls back to cinematic.
const THEMES = ["cinematic", "editorial", "mono", "royal", "pastel"];

// Turn one Submissions row into the generator input, mirroring /api/generate:
// pasted text and/or an attached CV (PDF read natively, Word via mammoth).
async function buildInput(rec: SubmissionRecord): Promise<GenerateInput> {
  const f = rec.fields;
  let cvText = (f[F.cvText] || "").toString();
  let pdf: { base64: string } | undefined;

  const atts = f[F.cvFile];
  if (atts && atts.length) {
    const att = atts[0];
    const buf = await fetchAttachment(att);
    const name = (att.filename || "").toLowerCase();
    const type = (att.type || "").toLowerCase();
    if (name.endsWith(".pdf") || type === "application/pdf") {
      pdf = { base64: buf.toString("base64") };
    } else if (name.endsWith(".docx") || type.includes("officedocument.wordprocessingml")) {
      const { value } = await mammoth.extractRawText({ buffer: buf });
      cvText = (cvText ? cvText + "\n\n" : "") + value;
    } else {
      cvText = (cvText ? cvText + "\n\n" : "") + buf.toString("utf8");
    }
  }

  // Give Claude the submitted identity so the right name/email land in the copy.
  const who: string[] = [];
  if (f[F.name]) who.push(`Name: ${f[F.name]}`);
  if (f[F.email]) who.push(`Email: ${f[F.email]}`);
  if (who.length) cvText = who.join("\n") + (cvText ? "\n\n" + cvText : "");

  const theme = THEMES.includes((f[F.theme] || "").toString()) ? f[F.theme]! : "cinematic";
  return { cvText, pdf, idea: (f[F.idea] || "").toString(), theme };
}

// Build one record end to end and write the result + status back to Airtable.
async function processOne(rec: SubmissionRecord): Promise<{ id: string; ok: boolean; error?: string }> {
  try {
    await updateSubmission(rec.id, { [F.status]: "Generating" });
    const input = await buildInput(rec);
    if (!input.cvText?.trim() && !input.pdf) {
      throw new Error("No CV provided (CV Text empty and no CV File attached).");
    }
    const data = await generatePortfolio(input);
    // Prefer the submitted name/email if the CV did not yield one.
    if (rec.fields[F.name] && !data.name) data.name = rec.fields[F.name]!.toString();
    if (rec.fields[F.email] && !data.email) data.email = rec.fields[F.email]!.toString();

    const theme = input.theme || "cinematic";
    const html = generatePortfolioHtml(data, { theme });

    await updateSubmission(rec.id, { [F.status]: "Generated", [F.html]: html });
    return { id: rec.id, ok: true };
  } catch (e) {
    const error = (e as Error)?.message || "Generation failed.";
    // Best effort: flag the row so it is easy to see what failed.
    try {
      await updateSubmission(rec.id, { [F.status]: "Error", [F.html]: `ERROR: ${error}` });
    } catch {
      /* ignore secondary failure */
    }
    return { id: rec.id, ok: false, error };
  }
}

// POST { recordId } processes that one row; POST {} (or GET) processes every
// row whose Status is empty or "New". Returns a per-record result summary.
async function handle(recordId?: string) {
  const records = recordId ? [await getSubmission(recordId)] : await listNewSubmissions();
  if (!records.length) {
    return NextResponse.json({ processed: 0, results: [], message: "No new submissions." });
  }
  const results = [];
  for (const rec of records) {
    results.push(await processOne(rec));
  }
  return NextResponse.json({ processed: results.length, results });
}

export async function POST(req: Request) {
  try {
    let recordId: string | undefined;
    try {
      const body = (await req.json()) as { recordId?: string };
      recordId = body?.recordId;
    } catch {
      /* empty body is allowed: process all new submissions */
    }
    return await handle(recordId);
  } catch (e) {
    return errorResponse(e);
  }
}

export async function GET() {
  try {
    return await handle();
  } catch (e) {
    return errorResponse(e);
  }
}

function errorResponse(e: unknown) {
  if (e instanceof MissingKeyError || e instanceof MissingAirtableTokenError) {
    return NextResponse.json({ error: (e as Error).message, code: "NO_KEY" }, { status: 400 });
  }
  console.error("[/api/intake]", e);
  return NextResponse.json({ error: (e as Error)?.message || "Intake failed." }, { status: 500 });
}
