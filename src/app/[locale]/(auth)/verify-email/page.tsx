"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

function VerifyEmailContent() {
  const t = useTranslations("auth");
  const params = useParams();
  const locale = (params.locale as string) || "fr";
  const router = useRouter();
  const [candidateId, setCandidateId] = useState("");
  const candidateIdMissing = !candidateId;

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("candidateId");
    const fromStorage = sessionStorage.getItem("verifyCandidateId");
    const id = fromUrl || fromStorage || "";
    setCandidateId(id);
    if (id && id !== fromStorage) {
      sessionStorage.setItem("verifyCandidateId", id);
    }
  }, []);

  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState("");
  const [resendError, setResendError] = useState("");
  const [alreadyVerified, setAlreadyVerified] = useState(false);

  useEffect(() => {
    if (!candidateId) return;
    fetch(`/api/candidate/profile`)
      .then((res) => res.json())
      .then((data) => {
        if (data.candidate?.isEmailVerified) {
          setAlreadyVerified(true);
          setTimeout(() => router.push(`/${locale}/login`), 2000);
        }
      })
      .catch(() => {});
  }, [candidateId, locale, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!candidateId) {
      setError(isRTL ? "معرّف المرشح غير موجود. الرجاء إعادة التسجيل." : "Identifiant candidat manquant. Veuillez vous réinscrire.");
      setLoading(false);
      return;
    }
    setLoading(true);

    try {
      const res = await fetch(`/api/auth/verify?locale=${locale}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId, code }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error?.includes("déjà vérifié") || data.error?.includes("مسبقاً")) {
          setAlreadyVerified(true);
          setTimeout(() => router.push(`/${locale}/login`), 2000);
          return;
        }
        const detail = data.details ? data.details.map((d: { path?: string[]; message: string }) => `${(d.path || []).join(".")}: ${d.message}`).join("; ") : "";
        setError(detail ? `${data.error}: ${detail}` : (data.error || t("wrongCode")));
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

  const handleResend = async () => {
    setResendLoading(true);
    setResendError("");
    setResendMessage("");
    try {
      const res = await fetch(`/api/auth/resend-code?locale=${locale}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error?.includes("déjà vérifié") || data.error?.includes("مسبقاً")) {
          setAlreadyVerified(true);
          setTimeout(() => router.push(`/${locale}/login`), 2000);
          return;
        }
        setResendError(data.error || "Erreur");
      } else {
        setResendMessage(
          isRTL
            ? "تم إعادة إرسال الرمز. تحقق من البريد المزعج أيضاً."
            : "Code renvoyé. Vérifiez aussi le dossier spam/courrier indésirable."
        );
      }
    } catch {
      setResendError(isRTL ? "خطأ في الاتصال" : "Erreur de connexion");
    } finally {
      setResendLoading(false);
    }
  };

  const isRTL = locale === "ar";

  if (alreadyVerified) {
    return (
      <div className="flex flex-1 items-center justify-center bg-gradient-to-br from-slate-100 to-blue-50">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="text-6xl mb-4">✓</div>
            <CardTitle className="text-xl">{isRTL ? "البريد الإلكتروني موثق بالفعل" : "Email déjà vérifié"}</CardTitle>
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
          {candidateIdMissing && (
            <div className="p-3 mb-4 text-sm text-destructive bg-destructive/10 rounded-md text-center">
              {isRTL ? "رابط التحقق غير صالح. الرجاء التسجيل أولاً." : "Lien de vérification invalide. Veuillez d'abord vous inscrire."}
            </div>
          )}
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
          <Button
            type="button"
            variant="link"
            className="text-sm"
            onClick={handleResend}
            disabled={resendLoading}
          >
            {resendLoading
              ? isRTL
                ? "جار الإرسال..."
                : "Envoi..."
              : t("resendCode")}
          </Button>
          {resendMessage && (
            <p className="text-xs text-green-600 text-center">{resendMessage}</p>
          )}
          {resendError && (
            <p className="text-xs text-destructive text-center">{resendError}</p>
          )}
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