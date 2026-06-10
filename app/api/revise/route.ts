import { NextResponse } from "next/server";
import { revisePortfolio, MissingKeyError } from "@/lib/ai";
import { emptyPortfolio, findGaps, type PortfolioData } from "@/lib/portfolio-schema";

export const runtime = "nodejs";
export const maxDuration = 60;

// Accepts JSON: { current: PortfolioData, instructions: string, theme?: string }.
// Returns the AI-revised portfolio.
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      current?: Partial<PortfolioData>;
      instructions?: string;
      theme?: string;
    };
    const instructions = (body.instructions || "").trim();
    if (!instructions) {
      return NextResponse.json(
        { error: "Describe what you would like to change." },
        { status: 400 }
      );
    }

    const current = { ...emptyPortfolio(), ...(body.current || {}) };
    const data = await revisePortfolio({ current, instructions, theme: body.theme });
    return NextResponse.json({ data, gaps: findGaps(data) });
  } catch (e) {
    if (e instanceof MissingKeyError) {
      return NextResponse.json({ error: e.message, code: "NO_KEY" }, { status: 400 });
    }
    console.error("[/api/revise]", e);
    return NextResponse.json(
      { error: (e as Error)?.message || "Revision failed." },
      { status: 500 }
    );
  }
}
