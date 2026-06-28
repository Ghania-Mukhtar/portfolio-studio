// ============================================================
//  Server-only Airtable REST helpers for the "Submissions" intake.
//  The token is read from the environment and never reaches the
//  browser (used only by /api/intake). Talks to the base created
//  for Portfolio Studio Submissions.
//
//  Env:
//    AIRTABLE_TOKEN     a personal access token with scopes
//                       data.records:read + data.records:write,
//                       granted on the Submissions base.
//    AIRTABLE_BASE_ID   defaults to the base we created.
//    AIRTABLE_TABLE     table id or name, defaults to the Submissions table.
// ============================================================

const API = "https://api.airtable.com/v0";

// Defaults point at the base/table created for this project, so the only
// required env var is the token. Override either if you clone the base.
const BASE_ID = process.env.AIRTABLE_BASE_ID || "app0FoNp6bU4lMBpz";
const TABLE = process.env.AIRTABLE_TABLE || "tbl36jVy2Rgy6ibLW";

// Field names, kept in one place so a rename in Airtable is a one-line fix here.
export const F = {
  name: "Name",
  email: "Email",
  cvText: "CV Text",
  cvFile: "CV File",
  idea: "Idea",
  theme: "Theme",
  status: "Status",
  html: "Portfolio HTML",
  url: "Portfolio URL",
  submittedAt: "Submitted At",
} as const;

export type Status = "New" | "Generating" | "Generated" | "Delivered" | "Error";

export class MissingAirtableTokenError extends Error {
  constructor() {
    super(
      "No Airtable token. Add AIRTABLE_TOKEN to .env.local (a personal access token with data.records:read and data.records:write on the Submissions base) and restart the server."
    );
    this.name = "MissingAirtableTokenError";
  }
}

interface Attachment {
  url: string;
  filename: string;
  type: string;
}

export interface SubmissionRecord {
  id: string;
  fields: {
    [F.name]?: string;
    [F.email]?: string;
    [F.cvText]?: string;
    [F.cvFile]?: Attachment[];
    [F.idea]?: string;
    [F.theme]?: string;
    [F.status]?: Status;
  };
}

function token(): string {
  const t = process.env.AIRTABLE_TOKEN;
  if (!t) throw new MissingAirtableTokenError();
  return t;
}

async function call(path: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(`${API}/${BASE_ID}/${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token()}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Airtable ${res.status}: ${body}`);
  }
  return res.json();
}

/** Records still waiting to be built (Status is empty or "New"). */
export async function listNewSubmissions(): Promise<SubmissionRecord[]> {
  const formula = encodeURIComponent(`OR({${F.status}} = '', {${F.status}} = 'New')`);
  const data = (await call(`${encodeURIComponent(TABLE)}?filterByFormula=${formula}`)) as {
    records: SubmissionRecord[];
  };
  return data.records;
}

/** A single record by id. */
export async function getSubmission(id: string): Promise<SubmissionRecord> {
  return (await call(`${encodeURIComponent(TABLE)}/${id}`)) as SubmissionRecord;
}

/** Patch fields on one record. */
export async function updateSubmission(
  id: string,
  fields: Record<string, unknown>
): Promise<void> {
  await call(`${encodeURIComponent(TABLE)}/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ fields }),
  });
}

/** Download an Airtable attachment to a Buffer (server-side only). */
export async function fetchAttachment(att: Attachment): Promise<Buffer> {
  const res = await fetch(att.url);
  if (!res.ok) throw new Error(`Attachment fetch ${res.status} for ${att.filename}`);
  return Buffer.from(await res.arrayBuffer());
}
