"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface Application {
  id: string;
  status: string;
  submittedAt: string | null;
  createdAt: string;
  totalScore: number | null;
  rank: number | null;
  job: {
    id: string;
    code: string;
    titleFr: string;
    titleAr: string;
    location: string;
    jobType: string;
    deadline: string;
    status: string;
  };
  documents: Array<{
    id: string;
    type: string;
    fileName: string;
    fileUrl: string;
    uploadedAt: string;
  }>;
  scores: Array<{
    id: string;
    value: number;
    criteria: { name: string; weight: number };
  }>;
  statusHistory: Array<{
    id: string;
    status: string;
    note: string | null;
    changedAt: string;
  }>;
}

interface Notification {
  id: string;
  type: string;
  channel: string;
  subject: string;
  body: string;
  sentAt: string;
  status: string;
}

interface DashboardData {
  applications: Application[];
  notifications: Notification[];
  candidate: {
    id: string;
    fullName: string;
    email: string;
    smsOptIn: boolean;
  };
}

const STATUS_CONFIG: Record<string, { label: Record<string, string>; color: string }> = {
  DRAFT: {
    label: { ar: "مسودة", fr: "Brouillon" },
    color: "bg-gray-100 text-gray-700 border-gray-300",
  },
  PENDING: {
    label: { ar: "قيد الانتظار", fr: "En attente" },
    color: "bg-amber-50 text-amber-700 border-amber-300",
  },
  UNDER_REVIEW: {
    label: { ar: "قيد المراجعة", fr: "En cours d'examen" },
    color: "bg-blue-50 text-blue-700 border-blue-300",
  },
  APPROVED: {
    label: { ar: "مقبول", fr: "Approuvé" },
    color: "bg-green-50 text-green-700 border-green-300",
  },
  REJECTED: {
    label: { ar: "مرفوض", fr: "Rejeté" },
    color: "bg-red-50 text-red-700 border-red-300",
  },
  ORAL_TEST: {
    label: { ar: "اختبار شفوي", fr: "Test oral" },
    color: "bg-purple-50 text-purple-700 border-purple-300",
  },
  FINAL_LIST: {
    label: { ar: "القائمة النهائية", fr: "Liste finale" },
    color: "bg-teal-50 text-teal-700 border-teal-300",
  },
};

export default function DashboardPage() {
  const [locale, setLocale] = useState("fr");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const segments = window.location.pathname.split("/");
    const l = segments[1] || "fr";
    setLocale(l);
  }, []);

  const fetchDashboard = useCallback(async () => {
    try {
      const [appRes, notifRes, profRes] = await Promise.all([
        fetch("/api/candidate/applications"),
        fetch("/api/candidate/notifications"),
        fetch("/api/candidate/profile"),
      ]);

      if (!appRes.ok && !profRes.ok) {
        setError("Failed to load dashboard");
        setLoading(false);
        return;
      }

      const appData = appRes.ok ? await appRes.json() : { applications: [] };
      const notifData = notifRes.ok ? await notifRes.json() : { notifications: [] };
      const profData = profRes.ok ? await profRes.json() : { candidate: { id: "", fullName: "", email: "", smsOptIn: true } };

      setData({
        applications: appData.applications,
        notifications: notifData.notifications,
        candidate: profData.candidate,
      });
    } catch {
      setError("An error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const isRTL = locale === "ar";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-destructive mb-4">{error}</p>
        <button
          onClick={fetchDashboard}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
        >
          {isRTL ? "إعادة المحاولة" : "Réessayer"}
        </button>
      </div>
    );
  }

  const applications = data?.applications || [];
  const notifications = data?.notifications || [];

  const statusCounts = applications.reduce<Record<string, number>>((acc, app) => {
    acc[app.status] = (acc[app.status] || 0) + 1;
    return acc;
  }, {});

  const recentNotifications = notifications.slice(0, 5);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">
            {isRTL ? "مرحباً،" : "Bonjour,"} {data?.candidate?.fullName || ""}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isRTL
              ? `لديك ${applications.length} ${applications.length === 1 ? "طلب" : "طلبات"}`
              : `Vous avez ${applications.length} ${applications.length === 1 ? "candidature" : "candidatures"}`}
          </p>
        </div>
        <Link href={`/${locale}/apply`}>
          <span className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium cursor-pointer">
            {isRTL ? "تقديم طلب جديد" : "Nouvelle candidature"}
          </span>
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { key: "PENDING", label: isRTL ? "قيد الانتظار" : "En attente" },
          { key: "UNDER_REVIEW", label: isRTL ? "قيد المراجعة" : "En cours" },
          { key: "APPROVED", label: isRTL ? "مقبول" : "Approuvé" },
          { key: "REJECTED", label: isRTL ? "مرفوض" : "Rejeté" },
        ].map(({ key, label }) => (
          <div key={key} className="bg-white rounded-xl border p-4 shadow-sm">
            <p className="text-2xl font-bold">{statusCounts[key] || 0}</p>
            <p className="text-sm text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold">
            {isRTL ? "طلبات الترشح" : "Mes candidatures"}
          </h2>

          {applications.length === 0 ? (
            <div className="bg-white rounded-xl border p-10 text-center shadow-sm">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium mb-2">
                {isRTL ? "لا توجد طلبات بعد" : "Aucune candidature pour le moment"}
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                {isRTL
                  ? "ابدأ بتقديم طلبك الأول الآن"
                  : "Commencez à postuler dès maintenant"}
              </p>
              <Link href={`/${locale}/apply`}>
                <span className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium cursor-pointer">
                  {isRTL ? "تقديم طلب" : "Postuler"}
                </span>
              </Link>
            </div>
          ) : (
            applications.map((app) => {
              const statusCfg = STATUS_CONFIG[app.status] || STATUS_CONFIG.PENDING;
              return (
                <div key={app.id} className="bg-white rounded-xl border p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-base truncate">
                          {isRTL ? app.job.titleAr : app.job.titleFr}
                        </h3>
                        <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full border ${statusCfg.color} shrink-0`}>
                          {isRTL ? statusCfg.label.ar : statusCfg.label.fr}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <span>{app.job.code}</span>
                        <span>{app.job.location}</span>
                        {app.totalScore != null && (
                          <span className="font-medium text-foreground">
                            {isRTL ? "النتيجة: " : "Score: "}{app.totalScore}
                          </span>
                        )}
                        {app.rank != null && (
                          <span className="font-medium text-foreground">
                            {isRTL ? "الترتيب: " : "Rang: "}{app.rank}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                        <span>
                          {isRTL ? "تاريخ التقديم: " : "Soumis le: "}
                          {app.submittedAt
                            ? new Date(app.submittedAt).toLocaleDateString(locale === "ar" ? "ar-TN" : "fr-FR")
                            : new Date(app.createdAt).toLocaleDateString(locale === "ar" ? "ar-TN" : "fr-FR")}
                        </span>
                        {app.documents.length > 0 && (
                          <span>
                            {app.documents.length} {isRTL ? "وثيقة" : "document(s)"}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => {
                          const link = document.createElement("a");
                          link.href = `/api/candidate/applications/${app.id}/pdf`;
                          link.target = "_blank";
                          link.click();
                        }}
                        className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
                        title={isRTL ? "تحميل PDF" : "Télécharger PDF"}
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {app.statusHistory.length > 0 && (
                    <div className="mt-4 pt-3 border-t">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>
                          {isRTL ? "آخر تحديث: " : "Dernière mise à jour: "}
                          {new Date(app.statusHistory[0].changedAt).toLocaleDateString(locale === "ar" ? "ar-TN" : "fr-FR")}
                        </span>
                        {app.statusHistory[0].note && (
                          <span className="truncate">- {app.statusHistory[0].note}</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl border p-5 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">
              {isRTL ? "الإشعارات الأخيرة" : "Notifications récentes"}
            </h2>

            {recentNotifications.length === 0 ? (
              <div className="text-center py-6">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <p className="text-sm text-muted-foreground">
                  {isRTL ? "لا توجد إشعارات" : "Aucune notification"}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentNotifications.map((notif) => (
                  <div key={notif.id} className="pb-3 border-b last:border-0 last:pb-0">
                    <p className="text-sm font-medium">{notif.subject}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.body}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(notif.sentAt).toLocaleDateString(locale === "ar" ? "ar-TN" : "fr-FR")}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border p-5 shadow-sm">
            <h2 className="text-lg font-semibold mb-3">
              {isRTL ? "روابط سريعة" : "Liens rapides"}
            </h2>
            <div className="space-y-2">
              <Link href={`/${locale}/dashboard/settings`}>
                <span className="block p-3 rounded-lg text-sm hover:bg-slate-50 transition-colors cursor-pointer">
                  <span className="font-medium">{isRTL ? "الإعدادات" : "Paramètres"}</span>
                  <span className="block text-muted-foreground text-xs mt-0.5">
                    {isRTL ? "تعديل الملف الشخصي وكلمة المرور" : "Modifier le profil et mot de passe"}
                  </span>
                </span>
              </Link>
              <Link href={`/${locale}/apply`}>
                <span className="block p-3 rounded-lg text-sm hover:bg-slate-50 transition-colors cursor-pointer">
                  <span className="font-medium">{isRTL ? "تقديم طلب" : "Nouvelle candidature"}</span>
                  <span className="block text-muted-foreground text-xs mt-0.5">
                    {isRTL ? "التقديم على وظيفة جديدة" : "Postuler pour un nouveau poste"}
                  </span>
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
