"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  const t = useTranslations("auth");
  const params = useParams();
  const locale = (params.locale as string) || "fr";
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [userType, setUserType] = useState<"candidate" | "admin">("candidate");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        userType,
        redirect: false,
      });

      if (result?.error) {
        setError(t("invalidCredentials"));
        setLoading(false);
        return;
      }

      if (userType === "candidate") {
        router.push(`/${locale}/dashboard`);
      } else {
        router.push(`/${locale}/admin/dashboard`);
      }
    } catch {
      setError(t("invalidCredentials"));
      setLoading(false);
    }
  };

  const isRTL = locale === "ar";

  return (
    <div className="flex flex-1 items-center justify-center bg-gradient-to-br from-slate-100 to-blue-50 p-4" dir={isRTL ? "rtl" : "ltr"}>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-xl text-center">{t("login")}</CardTitle>
          <CardDescription className="text-center">
            {isRTL ? "أدخل بياناتك لتسجيل الدخول" : "Entrez vos identifiants pour vous connecter"}
          </CardDescription>
          <CardDescription className="text-xs text-amber-700 mt-1 text-center">
            {isRTL ? "تخضع المعلومات التي تقدمها في هذا النموذج للحماية بموجب القانون العام لحماية البيانات (GDPR). سيتم استخدام بياناتك فقط لأغراض معالجة طلب الترشح الخاص بك." : "Entrez vos identifiants pour vous connecter"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 mb-6">
            <Button
              variant={userType === "candidate" ? "default" : "outline"}
              onClick={() => setUserType("candidate")}
              className="text-sm"
            >
              {isRTL ? "مترشح" : "Candidat"}
            </Button>
            <Button
              variant={userType === "admin" ? "default" : "outline"}
              onClick={() => setUserType("admin")}
              className="text-sm"
            >
              {isRTL ? "مسؤول" : "Admin"}
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t("email")}</Label>
              <Input
                id="email"
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t("password")}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                {error}
              </div>
            )}

            <div className="text-sm">
              <Link href={`/${locale}/forgot-password`} className="text-primary hover:underline">
                {t("forgotPassword")}
              </Link>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (isRTL ? "جار التحميل..." : "Chargement...") : t("login")}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <div className="text-sm text-muted-foreground text-center">
            {t("noAccount")}{" "}
            <Link href={`/${locale}/register`} className="text-primary hover:underline">
              {t("register")}
            </Link>
          </div>
          <div className="flex gap-2 justify-center">
            <Link href={`/${locale === "ar" ? "fr" : "ar"}`}>
              <Button variant="ghost" size="sm">
                {locale === "ar" ? "Français" : "العربية"}
              </Button>
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}