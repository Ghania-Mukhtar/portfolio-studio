// ============================================================
//  The single data model for a generated portfolio.
//  The builder fills one of these (from a pasted CV + the user
//  filling gaps), the preview renders it, and the download
//  serializes it to a standalone HTML file. One shape, everywhere.
// ============================================================

export interface SocialLink {
  label: string;
  href: string;
}

// An uploaded (data URL) or linked (https URL) image or video.
export interface MediaItem {
  type: "image" | "video";
  src: string;
  alt: string;
  /** User-set display box in px (drag handles). 200-900 wide, 200-700 tall. */
  w?: number;
  h?: number;
}

export interface ProjectItem {
  title: string;
  // Short tag, e.g. "AI - Health monitoring". Keep the vocabulary tight.
  discipline: string;
  year: string;
  // One or two sentences on what the work was.
  summary: string;
  // The result line. If it carries a number, that number must be real.
  outcome: string;
  // Optional images/videos for this project (user-added, not AI).
  media?: MediaItem[];
}

export interface ExperienceItem {
  role: string;
  org: string;
  period: string;
  summary: string;
}

export interface CertItem {
  title: string;
  issuer: string;
  note: string;
}

export interface EducationItem {
  degree: string;
  school: string;
  period: string;
}

export interface StatItem {
  value: string;
  label: string;
}

// A flexible, AI-creatable section so the portfolio can be ANY shape the user
// asks for (services, testimonials, FAQ, pricing, process, publications, ...).
export interface SectionItem {
  heading: string;
  detail: string;
}
export interface CustomSection {
  title: string;
  /** how the items render */
  layout: "text" | "list" | "cards" | "quote";
  /** intro paragraph(s) for "text", optional otherwise */
  body: string;
  items: SectionItem[];
}

export interface PortfolioData {
  // --- Identity (the most-scanned things; kept big in the output) ---
  name: string;
  role: string;
  /** Hero headline. The single loudest line. <= ~8 words. */
  tagline: string;
  /** Hero sub-line. <= ~20 words. */
  heroSub: string;

  // --- About ---
  /** One big positioning line in the About section. */
  statement: string;
  /** Body paragraphs. Separate paragraphs with a blank line (\n\n). */
  about: string;

  // --- Contact (each populated only if known; drives action buttons) ---
  location: string;
  email: string;
  phone: string;
  /** WhatsApp number (digits, optionally with country code). Renders a chat button. */
  whatsapp: string;
  availability: string;
  socials: SocialLink[];

  // --- Proof ---
  skills: string[];
  projects: ProjectItem[];
  experience: ExperienceItem[];
  certifications: CertItem[];
  education: EducationItem[];
  stats: StatItem[];

  // --- Anything else the user asks for ---
  sections: CustomSection[];

  // --- Work media (user-added images/videos shown as a gallery) ---
  gallery: MediaItem[];

  // --- Optional portrait images (replace the hero / about isometric art) ---
  heroImage?: MediaItem;
  aboutImage?: MediaItem;
}

/** Which fields are required for a credible portfolio (drives gap prompts). */
export const REQUIRED_FIELDS: { key: keyof PortfolioData; label: string }[] = [
  { key: "name", label: "Your name" },
  { key: "role", label: "Your role / title" },
  { key: "tagline", label: "Hero tagline" },
  { key: "email", label: "Contact email" },
  { key: "projects", label: "At least one project" },
];

/** Returns the labels of required things that are still empty. */
export function findGaps(d: PortfolioData): string[] {
  const gaps: string[] = [];
  for (const f of REQUIRED_FIELDS) {
    const v = d[f.key];
    const empty = Array.isArray(v)
      ? v.length === 0
      : typeof v === "string"
        ? v.trim() === ""
        : !v;
    if (empty) gaps.push(f.label);
  }
  return gaps;
}

export function emptyPortfolio(): PortfolioData {
  return {
    name: "",
    role: "",
    tagline: "",
    heroSub: "",
    statement: "",
    about: "",
    location: "",
    email: "",
    phone: "",
    whatsapp: "",
    availability: "",
    socials: [],
    skills: [],
    projects: [],
    experience: [],
    certifications: [],
    education: [],
    stats: [],
    sections: [],
    gallery: [],
  };
}

// ---- The built-in "Load Example" data: Ghania, AI student. ----
// Clearly illustrative demo content so a first-time visitor sees a finished,
// premium result instantly, then clears it and enters their own.
export function examplePortfolio(): PortfolioData {
  return {
    name: "Ghania",
    role: "AI Student & Developer",
    tagline: "I build intelligent things that help people.",
    heroSub:
      "Final-year AI student shipping machine-learning and full-stack projects, from real-time health monitoring to personal finance.",
    statement:
      "I like problems where data meets real life: a model is only good if it changes what someone does next.",
    about:
      "I am a final-year Artificial Intelligence student who learns by building. I take an idea from a rough notebook to a working product: framing the problem, training the model, and wrapping it in an interface a real person can use.\n\nMy focus is applied machine learning and clean, honest engineering. I care about the small details, accurate data, readable code, and interfaces that respect the person using them.",
    location: "Pakistan",
    email: "ghania@example.com",
    phone: "",
    whatsapp: "",
    availability: "Open to internships and collaboration.",
    socials: [
      { label: "GitHub", href: "https://github.com/" },
      { label: "LinkedIn", href: "https://linkedin.com/" },
    ],
    skills: [
      "Python",
      "TensorFlow",
      "PyTorch",
      "scikit-learn",
      "Pandas",
      "React",
      "Node.js",
      "SQL",
      "Git",
      "Figma",
    ],
    projects: [
      {
        title: "VitalWatch",
        discipline: "AI - Health monitoring",
        year: "2025",
        summary:
          "A health-monitoring app that reads wearable vitals and flags abnormal patterns in real time with a lightweight ML model.",
        outcome: "Early-warning alerts from continuous heart-rate and SpO2 data.",
      },
      {
        title: "Expense Management System",
        discipline: "Full-stack - Fintech",
        year: "2024",
        summary:
          "A web app to track, categorize, and forecast personal spending, with budgets, charts, and monthly summaries.",
        outcome: "Automatic categorization and a clear monthly spend forecast.",
      },
    ],
    experience: [
      {
        role: "Undergraduate Researcher",
        org: "University AI Lab",
        period: "2024 - present",
        summary:
          "Building and evaluating models for applied health and finance projects, and helping other students ship their work.",
      },
    ],
    certifications: [
      {
        title: "Machine Learning",
        issuer: "Coursera",
        note: "Supervised and unsupervised learning",
      },
      {
        title: "Deep Learning Specialization",
        issuer: "Coursera",
        note: "Neural networks, CNNs, sequence models",
      },
      {
        title: "Python for Everybody",
        issuer: "University of Michigan",
        note: "Programming and data foundations",
      },
    ],
    education: [
      {
        degree: "BS Artificial Intelligence",
        school: "University",
        period: "Expected 2026",
      },
    ],
    stats: [
      { value: "3+", label: "Projects shipped" },
      { value: "AI / ML", label: "Core focus" },
      { value: "2026", label: "Graduating" },
    ],
    sections: [],
    gallery: [],
  };
}
