import type { Metadata } from "next";
import { Button } from "@/components/ui/Button";
import { ArrowRight } from "@/components/ui/icons";
import { generatePortfolioHtml } from "@/lib/generate";
import { examplePortfolio } from "@/lib/portfolio-schema";

export const metadata: Metadata = {
  title: "Example portfolio - built with Portfolio Studio",
  description: "A finished example of what the builder produces.",
};

// A finished portfolio (the "Load example" data, Ghania) rendered exactly as
// the builder generates and downloads it. Shown full-screen in an iframe so it
// reads as a real, standalone site.
export default function ExamplePage() {
  const html = generatePortfolioHtml(examplePortfolio());

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden">
      <iframe
        title="Example portfolio"
        srcDoc={html}
        sandbox="allow-scripts"
        className="h-full w-full border-0"
      />
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center p-5">
        <div className="pointer-events-auto">
          <Button href="/" variant="primary">
            Build your own <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
