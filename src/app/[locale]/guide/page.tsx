import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { VideoPlayer } from "@/components/video-player";
import { BookOpen, UserPlus, Send, LayoutDashboard, Mail, HelpCircle } from "lucide-react";
import type { Metadata } from "next";

type Props = {
  params: { locale: string };
};

export async function generateStaticParams() {
  return [{ locale: "fr" }, { locale: "ar" }];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const title = locale === "ar" ? "دليل المساعدة - PROMOSPORT" : "Guide d'aide - PROMOSPORT";
  const description =
    locale === "ar"
      ? "تعلم كيفية استخدام منصة PROMOSPORT من خلال الفيديوهات المرئية خطوة بخطوة."
      : "Apprenez à utiliser la plateforme PROMOSPORT avec nos tutoriels vidéo.";
  return { title, description };
}

export default async function GuidePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <GuideContent locale={locale} />;
}

function GuideContent({ locale }: { locale: string }) {
  const t = useTranslations("guide");
  const isRTL = locale === "ar";

  const registerSteps = [
    { step: 1, key: "step1", video: "/videos/register-step1.mp4" },
    { step: 2, key: "step2", video: "/videos/register-step2.mp4" },
    { step: 3, key: "step3", video: "/videos/register-step3.mp4" },
    { step: 4, key: "step4", video: "/videos/register-step4.mp4" },
    { step: 5, key: "step5", video: "/videos/register-step5.mp4" },
    { step: 6, key: "step6", video: "/videos/register-step6.mp4" },
  ];

  const applyVideos = [
    { key: "direct", video: "/videos/apply-direct.mp4", icon: Send },
    { key: "verify", video: "/videos/verify-email.mp4", icon: Mail },
  ];

  const dashboardVideos = [
    { key: "overview", video: "/videos/dashboard.mp4", icon: LayoutDashboard },
    { key: "results", video: "/videos/results.mp4", icon: BookOpen },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50" dir={isRTL ? "rtl" : "ltr"}>
      {/* Hero */}
      <div className="bg-white border-b border-slate-200">
        <div className="container mx-auto px-4 py-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <HelpCircle className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">{t("title")}</h1>
          <p className="text-slate-600 max-w-2xl mx-auto">{t("subtitle")}</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-10 space-y-16 max-w-6xl">
        {/* Section: Register */}
        <section id="register">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-100">
              <UserPlus className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">{t("register.title")}</h2>
              <p className="text-sm text-slate-500">{t("register.description")}</p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {registerSteps.map((item) => (
              <div key={item.key} className="relative">
                <div className="absolute -top-2 -left-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white text-sm font-bold shadow-md">
                  {item.step}
                </div>
                <VideoPlayer
                  src={item.video}
                  title={t(`register.${item.key}.title`)}
                  description={t(`register.${item.key}.description`)}
                />
              </div>
            ))}
          </div>
        </section>

        {/* Section: Apply */}
        <section id="apply">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-green-100">
              <Send className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">{t("apply.title")}</h2>
              <p className="text-sm text-slate-500">{t("apply.description")}</p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {applyVideos.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.key}>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="h-4 w-4 text-slate-400" />
                    <span className="text-sm font-medium text-slate-700">{t(`apply.${item.key}.title`)}</span>
                  </div>
                  <VideoPlayer
                    src={item.video}
                    title={t(`apply.${item.key}.title`)}
                    description={t(`apply.${item.key}.description`)}
                  />
                </div>
              );
            })}
          </div>
        </section>

        {/* Section: Dashboard */}
        <section id="dashboard">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-purple-100">
              <LayoutDashboard className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">{t("dashboard.title")}</h2>
              <p className="text-sm text-slate-500">{t("dashboard.description")}</p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {dashboardVideos.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.key}>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="h-4 w-4 text-slate-400" />
                    <span className="text-sm font-medium text-slate-700">{t(`dashboard.${item.key}.title`)}</span>
                  </div>
                  <VideoPlayer
                    src={item.video}
                    title={t(`dashboard.${item.key}.title`)}
                    description={t(`dashboard.${item.key}.description`)}
                  />
                </div>
              );
            })}
          </div>
        </section>

        {/* Contact Support */}
        <section className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 text-center">
          <HelpCircle className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600 mb-2">{t("contactSupport")}</p>
          <a
            href="mailto:support@promosport.tn"
            className="inline-flex items-center gap-2 text-primary font-semibold hover:underline"
          >
            <Mail className="h-4 w-4" />
            {t("contactEmail")}
          </a>
        </section>
      </div>
    </div>
  );
}
