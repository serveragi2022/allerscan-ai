"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Camera, History, Home, ScanBarcode, ShieldCheck, UserRound } from "lucide-react";

const LINKS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/scan", label: "Scan Food", icon: Camera },
  { href: "/label", label: "Scan Label", icon: ScanBarcode },
  { href: "/allergies", label: "My Allergies", icon: UserRound },
  { href: "/history", label: "Scan History", icon: History },
];

export default function Navbar() {
  const pathname = usePathname();
  const isActive = (href) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 rounded-lg font-bold text-navy-900">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-700 text-white">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="text-lg">
              AllerScan <span className="text-brand-700">AI</span>
            </span>
          </Link>

          <nav aria-label="Main" className="hidden md:block">
            <ul className="flex items-center gap-1">
              {LINKS.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={isActive(href) ? "page" : undefined}
                    className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      isActive(href)
                        ? "bg-brand-50 text-brand-700"
                        : "text-navy-600 hover:bg-slate-100 hover:text-navy-900"
                    }`}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>

      {/* Mobile bottom navigation */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <ul className="mx-auto grid max-w-md grid-cols-5">
          {LINKS.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                aria-current={isActive(href) ? "page" : undefined}
                className={`flex min-h-[56px] flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-medium ${
                  isActive(href) ? "text-brand-700" : "text-navy-600"
                }`}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                <span className="leading-tight">{label.replace("Scan ", "")}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
