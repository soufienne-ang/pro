"use client";

import { Suspense, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

function VerifyEmailContent() {
  const t = useTranslations("auth");
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = (params.locale as string) || "fr";
  const router = useRouter();
  const candidateId = searchParams.get("candidateId") || "";

  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`/api/auth/verify?locale=${locale}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId, code }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || t("wrongCode"));
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push(`/${locale}/login`);
      }, 2000);
    } catch {
      setError("An error occurred");
      setLoading(false);
    }
  };

  const isRTL = locale === "ar";

  if (success) {
    return (
      <div className="flex flex-1 items-center justify-center bg-gradient-to-br from-slate-100 to-blue-50">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="text-6xl mb-4">✓</div>
            <CardTitle className="text-xl">{t("emailVerified")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              {isRTL ? "جاري التحويل إلى صفحة تسجيل الدخول..." : "Redirection vers la page de connexion..."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-gradient-to-br from-slate-100 to-blue-50 p-4" dir={isRTL ? "rtl" : "ltr"}>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-xl text-center">{t("verifyEmail")}</CardTitle>
          <CardDescription className="text-center">
            {isRTL ? "أدخل رمز التحقق المرسل إلى بريدك الإلكتروني" : "Entrez le code de vérification envoyé à votre email"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="code">{t("verificationCode")}</Label>
              <Input
                id="code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                className="text-center text-2xl tracking-widest"
                required
              />
            </div>

            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">{error}</div>
            )}

            <Button type="submit" className="w-full" disabled={loading || code.length !== 6}>
              {loading ? (isRTL ? "جار التحقق..." : "Vérification...") : t("confirm")}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button variant="link" className="text-sm">
            {t("resendCode")}
          </Button>
          <Link href={`/${locale}/login`}>
            <Button variant="ghost" size="sm">{t("back")}</Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="flex flex-1 items-center justify-center">Loading...</div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}