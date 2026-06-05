"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";

export function SiteHeader() {
  const params = useParams();
  const locale = (params.locale as string) || "fr";
  const isRTL = locale === "ar";
  const navT = useTranslations("nav");

  return (
    <header className="border-b bg-white">
      <nav className="container mx-auto flex items-center justify-between p-4">
        <Link href={`/${locale}/jobs`} className="flex items-center gap-3">
          <Image
            src="/log.jpg"
            alt={isRTL ? "الجمهورية التونسية" : "République Tunisienne"}
            width={200}
            height={200}
            className="h-20 w-auto"
          />
          <div className="flex flex-col">
            <span className="text-xs sm:text-sm font-bold text-red-700 leading-tight">
              {isRTL ? "الجمهورية التونسية" : "République Tunisienne"}
            </span>
            <span className="text-[10px] sm:text-xs text-red-600 leading-tight">
              {isRTL ? "وزارة الشباب والرياضة" : "Ministère de la Jeunesse et des Sports"}
            </span>
            {isRTL ? (
              <span className="text-[10px] sm:text-xs text-red-500 leading-tight">
                النهوض بالرياضة
              </span>
            ) : (
              <Image
                src="/promo.png"
                alt="Promotion du Sport"
                width={111}
                height={15}
                className="h-4 w-auto"
              />
            )}
          </div>
        </Link>
        <div className="flex items-center gap-4">
          <Link href={`/${locale}`} className="px-3 py-2 text-sm hover:underline">
            {navT("about")}
          </Link>
          <Link href="/ar" className="px-3 py-2 text-sm hover:underline">
            العربية
          </Link>
          <Link href="/fr" className="px-3 py-2 text-sm hover:underline">
            Français
          </Link>
          <Link
            href={`/${locale}/login`}
            className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
          >
            {navT("login")}
          </Link>
        </div>
      </nav>
    </header>
  );
}
