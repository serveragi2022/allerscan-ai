import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata = {
  title: "AllerScan AI – Know What's in Your Food",
  description:
    "AI-assisted food allergen screening. Photograph a meal or an ingredient label and see detected, possible and unknown allergens. Informational only.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0d6b66",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:shadow-card"
        >
          Skip to content
        </a>
        <Navbar />
        <main id="main" className="mx-auto w-full max-w-5xl px-4 pb-28 pt-6 sm:px-6 md:pb-12">
          {children}
        </main>
      </body>
    </html>
  );
}
