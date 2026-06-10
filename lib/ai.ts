// ============================================================
//  Server-only Claude helpers. The API key is read from the
//  environment and never reaches the browser. Claude does the
//  heavy lifting: read a CV (PDF natively, Word/Text as text),
//  understand the person's idea, and return structured portfolio
//  content matching PortfolioData.
// ============================================================

import Anthropic from "@anthropic-ai/sdk";
import { emptyPortfolio, type PortfolioData } from "./portfolio-schema";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

export class MissingKeyError extends Error {
  constructor() {
    super(
      "No Anthropic API key. Add ANTHROPIC_API_KEY to .env.local (copy .env.local.example) and restart the dev server."
    );
    this.name = "MissingKeyError";
  }
}

function client(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new MissingKeyError();
  return new Anthropic({ apiKey });
}

// JSON Schema for the structured output. Everything is required so the model
// always returns the full shape (empty string / empty array where unknown).
const str = { type: "string" } as const;
const PORTFOLIO_SCHEMA = {
  type: "object",
  properties: {
    name: str,
    role: { type: "string", description: "professional title, e.g. 'AI Student & Developer'" },
    tagline: { type: "string", description: "the hero headline; punchy, <= 8 words, reflects their idea" },
    heroSub: { type: "string", description: "one or two lines under the headline, <= 24 words" },
    statement: { type: "string", description: "one strong positioning sentence for the About section" },
    about: { type: "string", description: "1-2 short paragraphs, separated by a blank line" },
    location: str,
    email: str,
    phone: str,
    whatsapp: {
      type: "string",
      description:
        "WhatsApp number in digits (with country code if given), only if a WhatsApp/mobile number is present or the idea asks for WhatsApp contact. Else empty.",
    },
    availability: { type: "string", description: "short availability line, or empty" },
    socials: {
      type: "array",
      description:
        "Profile/contact links as full https URLs (LinkedIn, GitHub, Instagram, Behance, Dribbble, YouTube, personal site, etc.). Add any the CV or idea mentions.",
      items: {
        type: "object",
        properties: { label: str, href: str },
        required: ["label", "href"],
        additionalProperties: false,
      },
    },
    skills: { type: "array", items: str },
    projects: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: str,
          discipline: { type: "string", description: "short tag, e.g. 'AI - Web app'" },
          year: str,
          summary: { type: "string", description: "1-2 sentences on what it was" },
          outcome: { type: "string", description: "the result; only real, never invented numbers" },
        },
        required: ["title", "discipline", "year", "summary", "outcome"],
        additionalProperties: false,
      },
    },
    experience: {
      type: "array",
      items: {
        type: "object",
        properties: { role: str, org: str, period: str, summary: str },
        required: ["role", "org", "period", "summary"],
        additionalProperties: false,
      },
    },
    certifications: {
      type: "array",
      items: {
        type: "object",
        properties: { title: str, issuer: str, note: str },
        required: ["title", "issuer", "note"],
        additionalProperties: false,
      },
    },
    education: {
      type: "array",
      items: {
        type: "object",
        properties: { degree: str, school: str, period: str },
        required: ["degree", "school", "period"],
        additionalProperties: false,
      },
    },
    stats: {
      type: "array",
      description: "up to 3 short, honest highlight figures (e.g. '3+' / 'Projects shipped')",
      items: {
        type: "object",
        properties: { value: str, label: str },
        required: ["value", "label"],
        additionalProperties: false,
      },
    },
    sections: {
      type: "array",
      description:
        "Any EXTRA sections the user asks for that the fields above do not cover (services, testimonials, FAQ, pricing, process, publications, awards, volunteering, etc.). Create them whenever the idea or CV calls for them, so the portfolio is exactly what the user wants. Leave empty if none are needed.",
      items: {
        type: "object",
        properties: {
          title: str,
          layout: {
            type: "string",
            enum: ["text", "list", "cards", "quote"],
            description:
              "text = paragraphs; list = heading+detail rows; cards = a grid of cards (good for services/FAQ); quote = testimonials (detail is the quote, heading is who said it)",
          },
          body: { type: "string", description: "intro paragraph(s), or empty" },
          items: {
            type: "array",
            items: {
              type: "object",
              properties: { heading: str, detail: str },
              required: ["heading", "detail"],
              additionalProperties: false,
            },
          },
        },
        required: ["title", "layout", "body", "items"],
        additionalProperties: false,
      },
    },
  },
  required: [
    "name", "role", "tagline", "heroSub", "statement", "about", "location",
    "email", "phone", "whatsapp", "availability", "socials", "skills", "projects",
    "experience", "certifications", "education", "stats", "sections",
  ],
  additionalProperties: false,
} as const;

const SYSTEM = `You are a senior portfolio designer and copywriter for a premium, luxury portfolio studio.
You turn a person's CV and their stated idea into polished portfolio content.

Rules:
- Extract every real detail you can from the CV: name, role, contact, skills, projects, experience, certifications, education.
- Write the tagline, heroSub, statement and about in a confident, premium, concise voice that matches the person's stated idea and tone. Short and scannable.
- Be strictly honest. NEVER invent employers, metrics, numbers, dates, or achievements that are not supported by the CV. If a value is unknown, return an empty string (or empty array). Do not guess contact details.
- HONOR FEATURE REQUESTS in the idea. The portfolio will turn certain fields into action buttons:
  - whatsapp -> a "Message on WhatsApp" button. Fill it if a WhatsApp/mobile number is given or the idea asks readers to message on WhatsApp.
  - email -> an "Email me" button. phone -> a "Call" button.
  - socials -> link buttons (use the exact platform, full https URL). If the idea says "let people reach me on Instagram/LinkedIn/etc.", add it.
  Only fill these from real details in the CV or idea; never fabricate a number, address, or handle.
- Keep copy free of em-dashes; use commas, periods, or hyphens.
- 'stats' should hold at most 3 short, real highlight figures, or be empty if nothing honest fits.
- BUILD WHATEVER THE USER WANTS. If the idea asks for a kind of portfolio or a section that the standard fields do not cover (services, testimonials, FAQ, pricing, process, publications, awards, etc.), add those as 'sections' with a fitting layout. The goal is a portfolio that matches the user's request exactly, while staying honest and premium.
- Always return the full structure via the build_portfolio tool.`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Block = any;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractPortfolio(msg: any): PortfolioData {
  const tool = (msg.content as Array<{ type: string; input?: unknown }>).find(
    (b) => b.type === "tool_use"
  );
  if (!tool) {
    throw new Error("The model did not return structured portfolio data.");
  }
  // Merge onto a blank shape so any missing field is safely defaulted.
  return { ...emptyPortfolio(), ...(tool.input as Partial<PortfolioData>) };
}

async function run(userBlocks: Block[]): Promise<PortfolioData> {
  const msg = await client().messages.create({
    model: MODEL,
    max_tokens: 8000,
    system: SYSTEM,
    tools: [
      {
        name: "build_portfolio",
        description: "Return the complete, structured portfolio content.",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        input_schema: PORTFOLIO_SCHEMA as any,
      },
    ],
    tool_choice: { type: "tool", name: "build_portfolio" },
    messages: [{ role: "user", content: userBlocks }],
  });
  return extractPortfolio(msg);
}

export interface GenerateInput {
  cvText?: string;
  pdf?: { base64: string };
  idea?: string;
  theme?: string;
}

/** Build a portfolio from a CV (text and/or a PDF document) + the user's idea. */
export async function generatePortfolio(input: GenerateInput): Promise<PortfolioData> {
  const blocks: Block[] = [];

  if (input.pdf) {
    blocks.push({
      type: "document",
      source: {
        type: "base64",
        media_type: "application/pdf",
        data: input.pdf.base64,
      },
    });
  }

  const parts: string[] = [];
  if (input.cvText && input.cvText.trim()) {
    parts.push("CV / resume text:\n\n" + input.cvText.trim());
  } else if (input.pdf) {
    parts.push("The attached PDF is the person's CV / resume.");
  }
  parts.push(
    input.idea && input.idea.trim()
      ? "The person's idea for how they want their portfolio (tone, focus, anything special):\n\n" +
          input.idea.trim()
      : "No specific idea was given. Infer a tasteful, premium positioning from the CV."
  );
  if (input.theme) {
    parts.push(`Chosen visual theme: ${input.theme}. Match the writing tone to it.`);
  }
  parts.push("Now produce the portfolio via the build_portfolio tool.");

  blocks.push({ type: "text", text: parts.join("\n\n") });
  return run(blocks);
}

export interface ReviseInput {
  current: PortfolioData;
  instructions: string;
  theme?: string;
}

/** Apply a free-text change request to an existing portfolio. */
export async function revisePortfolio(input: ReviseInput): Promise<PortfolioData> {
  const text = [
    "Here is the current portfolio content as JSON:",
    "```json",
    JSON.stringify(input.current, null, 2),
    "```",
    "The person requested these changes:",
    input.instructions.trim(),
    input.theme ? `Current visual theme: ${input.theme}.` : "",
    "Apply the changes and return the COMPLETE updated portfolio via the build_portfolio tool. Keep everything else the same. Stay honest, do not invent facts.",
  ]
    .filter(Boolean)
    .join("\n\n");
  return run([{ type: "text", text }]);
}
