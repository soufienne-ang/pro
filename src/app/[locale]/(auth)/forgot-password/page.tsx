"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function ForgotPasswordPage() {
  const t = useTranslations("auth");
  const params = useParams();
  const locale = (params.locale as string) || "fr";
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"email" | "code" | "reset">("email");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`/api/auth/forgot-password?locale=${locale}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
        setLoading(false);
        return;
      }

      setMessage(data.message);
      setStep("code");
      setLoading(false);
    } catch {
      setError("An error occurred");
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`/api/auth/verify?locale=${locale}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
        setLoading(false);
        return;
      }

      setStep("reset");
      setLoading(false);
    } catch {
      setError("An error occurred");
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError(t("passwordMismatch"));
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`/api/auth/reset-password?locale=${locale}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
        setLoading(false);
        return;
      }

      router.push(`/${locale}/login?reset=success`);
    } catch {
      setError("An error occurred");
      setLoading(false);
    }
  };

  const isRTL = locale === "ar";

  return (
    <div className="flex flex-1 items-center justify-center bg-gradient-to-br from-slate-100 to-blue-50 p-4" dir={isRTL ? "rtl" : "ltr"}>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-xl text-center">
            {step === "email" ? t("forgotPassword") : step === "code" ? t("verificationCode") : t("password")}
          </CardTitle>
          <CardDescription className="text-center">
            {step === "email"
              ? isRTL ? "أدخل بريدك الإلكتروني لإرسال رمز الاستعادة" : "Entrez votre email pour recevoir le code de récupération"
              : step === "code"
              ? isRTL ? "أدخل رمز التحقق المرسل إلى بريدك" : "Entrez le code de vérification envoyé à votre email"
              : isRTL ? "أدخل كلمة المرور الجديدة" : "Entrez votre nouveau mot de passe"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === "email" && (
            <form onSubmit={handleSendEmail} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t("email")}</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              {error && <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">{error}</div>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (isRTL ? "جار الإرسال..." : "Envoi...") : (isRTL ? "إرسال" : "Envoyer")}
              </Button>
            </form>
          )}

          {step === "code" && (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              {message && (
                <div className="p-3 text-sm text-green-700 bg-green-50 rounded-md">{message}</div>
              )}
              <div className="space-y-2">
                <Label htmlFor="code">{t("verificationCode")}</Label>
                <Input id="code" type="text" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} placeholder="000000" className="text-center text-2xl tracking-widest" required />
              </div>
              {error && <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">{error}</div>}
              <Button type="submit" className="w-full" disabled={loading || code.length !== 6}>
                {loading ? (isRTL ? "جار التحقق..." : "Vérification...") : t("confirm")}
              </Button>
            </form>
          )}

          {step === "reset" && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">{t("password")}</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{t("confirmPassword")}</Label>
                <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
              </div>
              {error && <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">{error}</div>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (isRTL ? "جار التغيير..." : "Changement...") : (isRTL ? "تغيير كلمة المرور" : "Changer le mot de passe")}
              </Button>
            </form>
          )}
        </CardContent>
        <CardFooter className="flex justify-center">
          <Link href={`/${locale}/login`}>
            <Button variant="ghost" size="sm">{t("back")}</Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}