"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useSession, signOut } from "next-auth/react";
import { Globe, ChevronDown, LogIn, LogOut } from "lucide-react";

export function SiteHeader() {
  const params = useParams();
  const locale = (params.locale as string) || "fr";
  const isRTL = locale === "ar";
  const navT = useTranslations("nav");

  const pathname = usePathname();
  const { data: session, status } = useSession();

  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);



  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const pathWithoutLocale = pathname?.replace(/^\/(fr|ar)(\/|$)/, "/") || "/";

  const logoConfig = {
    ar: { src: "/log2.png", alt: "الجمهورية التونسية" },
    fr: { src: "/log3.png", alt: "République Tunisienne" },
  };
  const currentLogo = logoConfig[locale as keyof typeof logoConfig] || logoConfig.fr;

  return (
    <header className="border-b bg-white">
      <nav className="container mx-auto flex items-center justify-between p-4">
        <Link href={`/${locale}/jobs`} className="flex items-center gap-3">
          <Image
            src={currentLogo.src}
            alt={currentLogo.alt}
            width={300}
            height={94}
            className="h-[94px] w-[300px]"
            priority
          />
        </Link>
        <div className="flex items-center gap-4">
          <Link href={`/${locale}`} className="px-3 py-2 text-sm hover:underline">
            {navT("about")}
          </Link>
          <Link href={`/${locale}/results`} className="px-3 py-2 text-sm hover:underline">
            {isRTL ? "نتائج المناظرات" : "Résultats"}
          </Link>
          <Link href={`/${locale}/guide`} className="px-3 py-2 text-sm hover:underline">
            {isRTL ? "دليل المساعدة" : "Guide"}
          </Link>
          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="flex items-center gap-1 rounded-md border px-3 py-2 text-sm hover:bg-slate-50"
            >
              <Globe className="h-4 w-4" />
              <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>
            {open && (
              <div
                className={`absolute ${isRTL ? "left-0" : "right-0"} mt-1 min-w-[140px] rounded-md border bg-white shadow-lg z-50`}
              >
                <Link
                  href={`/ar${pathWithoutLocale}`}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 ${locale === "ar" ? "font-bold text-primary" : "text-muted-foreground"}`}
                >
                  <span className={`w-2 h-2 rounded-full ${locale === "ar" ? "bg-primary" : "bg-transparent"}`} />
                  العربية
                </Link>
                <Link
                  href={`/fr${pathWithoutLocale}`}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 ${locale === "fr" ? "font-bold text-primary" : "text-muted-foreground"}`}
                >
                  <span className={`w-2 h-2 rounded-full ${locale === "fr" ? "bg-primary" : "bg-transparent"}`} />
                  Français
                </Link>
              </div>
            )}
          </div>
          {session?.user ? (
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: `/${locale}` })}
              className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-slate-50"
            >
              <LogOut className="h-4 w-4" />
              <span>{isRTL ? "تسجيل الخروج" : "Déconnexion"}</span>
            </button>
          ) : mounted && status !== "loading" ? (
            <Link
              href={`/${locale}/login`}
              className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-slate-50"
            >
              <LogIn className="h-4 w-4" />
              <span>{isRTL ? "تسجيل الدخول" : "Connexion"}</span>
            </Link>
          ) : null}
        </div>
      </nav>
    </header>
  );
}
