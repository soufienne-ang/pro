"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";

export function SiteHeader() {
  const params = useParams();
  const locale = (params.locale as string) || "fr";
  const navT = useTranslations("nav");

  return (
    <header className="border-b bg-white">
      <nav className="container mx-auto flex items-center justify-between p-4">
        <Link href={`/${locale}/jobs`}>
          <Image
            src="/log.jpg"
            alt="PROMOSPORT"
            width={200}
            height={200}
            className="h-20 w-auto"
            priority
          />
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
