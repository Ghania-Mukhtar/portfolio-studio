import type { Metadata } from "next";
import { Bricolage_Grotesque, Inter_Tight, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { DEFAULT_THEME, THEME_STORAGE_KEY } from "@/lib/themes";
import "./globals.css";

// Display: expressive grotesk. Body: neutral, highly readable. Mono: labels/numbers.
const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
});
const body = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-inter-tight",
  display: "swap",
});
const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Portfolio Studio - build a premium portfolio from your CV",
  description:
    "Paste your CV, fill the gaps, and download a single, premium, theme-switchable portfolio file that opens offline.",
  openGraph: {
    title: "Portfolio Studio",
    description:
      "Build a premium, downloadable portfolio from your CV in minutes.",
    type: "website",
  },
};

// Runs before paint: applies the saved theme so there is no flash of the
// wrong palette. Mirrors lib/themes.ts (kept inline so it has no imports).
const themeScript = `(function(){try{var t=localStorage.getItem('${THEME_STORAGE_KEY}')||'${DEFAULT_THEME}';document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','${DEFAULT_THEME}');}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      data-theme={DEFAULT_THEME}
      suppressHydrationWarning
      className={`${display.variable} ${body.variable} ${mono.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="grain antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
