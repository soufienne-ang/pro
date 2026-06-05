"use client";

import { useTranslations } from "next-intl";

export function SiteFooter() {
  const t = useTranslations("footer");

  return (
    <footer className="border-t bg-background py-8 text-center text-sm text-muted-foreground">
      {t("copyright")}
    </footer>
  );
}
