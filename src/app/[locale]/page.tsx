"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function HomePage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params.locale as string) || "fr";

  useEffect(() => {
    router.replace("/" + locale + "/jobs");
  }, [locale, router]);

  return null;
}
