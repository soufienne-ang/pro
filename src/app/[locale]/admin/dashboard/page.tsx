"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function AdminDashboardPage() {
  const [locale, setLocale] = useState("fr");
  const [stats, setStats] = useState({ candidates: 0, pending: 0, publishedJobs: 0, approved: 0 });

  useEffect(() => {
    const segments = window.location.pathname.split("/");
    setLocale(segments[1] || "fr");
  }, []);

  useEffect(() => {
    Promise.all([
      fetch("/api/candidates").then(r => r.ok ? r.json() : { pagination: { total: 0 } }),
      fetch("/api/applications?limit=1").then(r => r.ok ? r.json() : { pagination: { total: 0 } }),
      fetch("/api/applications?status=PENDING&limit=1").then(r => r.ok ? r.json() : { pagination: { total: 0 } }),
      fetch("/api/applications?status=APPROVED&limit=1").then(r => r.ok ? r.json() : { pagination: { total: 0 } }),
      fetch("/api/jobs?status=PUBLISHED").then(r => r.ok ? r.json() : []),
    ]).then(([candidates, , pendingApps, approvedApps, jobs]) => {
      setStats({
        candidates: candidates?.pagination?.total || 0,
        pending: pendingApps?.pagination?.total || 0,
        publishedJobs: Array.isArray(jobs) ? jobs.length : 0,
        approved: approvedApps?.pagination?.total || 0,
      });
    }).catch(() => {});
  }, []);

  const isRTL = locale === "ar";

  const cards = [
    { label: isRTL ? "إجمالي المرشحين" : "Total Candidats", value: stats.candidates, href: "candidates", color: "bg-blue-50 text-blue-700" },
    { label: isRTL ? "طلبات معلقة" : "En attente", value: stats.pending, href: "applications?status=PENDING", color: "bg-amber-50 text-amber-700" },
    { label: isRTL ? "وظائف منشورة" : "Offres publiées", value: stats.publishedJobs, href: "jobs", color: "bg-green-50 text-green-700" },
    { label: isRTL ? "طلبات مقبولة" : "Acceptées", value: stats.approved, href: "applications?status=APPROVED", color: "bg-purple-50 text-purple-700" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">
        {isRTL ? "لوحة تحكم المسؤول" : "Tableau de bord Admin"}
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((card) => (
          <Link key={card.label} href={`/${locale}/admin/${card.href}`}>
            <div className="bg-white rounded-xl border p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
              <p className={`inline-block px-2 py-1 rounded text-xs font-medium mb-3 ${card.color}`}>
                {card.label}
              </p>
              <p className="text-3xl font-bold">{card.value}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border p-5 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">
            {isRTL ? "روابط سريعة" : "Actions rapides"}
          </h2>
          <div className="space-y-3">
            <Link href={`/${locale}/admin/jobs/new`}>
              <span className="block p-3 rounded-lg border hover:bg-slate-50 transition-colors cursor-pointer">
                <span className="font-medium text-sm">{isRTL ? "إضافة وظيفة جديدة" : "Ajouter une nouvelle offre"}</span>
                <span className="block text-xs text-muted-foreground mt-0.5">
                  {isRTL ? "إنشاء إعلان وظيفة جديد" : "Créer une nouvelle annonce"}
                </span>
              </span>
            </Link>
            <Link href={`/${locale}/admin/applications?status=PENDING`}>
              <span className="block p-3 rounded-lg border hover:bg-slate-50 transition-colors cursor-pointer">
                <span className="font-medium text-sm">{isRTL ? "مراجعة الطلبات" : "Examiner les candidatures"}</span>
                <span className="block text-xs text-muted-foreground mt-0.5">
                  {isRTL ? "مراجعة الطلبات المعلقة" : "Voir les candidatures en attente"}
                </span>
              </span>
            </Link>
            <Link href={`/${locale}/admin/candidates`}>
              <span className="block p-3 rounded-lg border hover:bg-slate-50 transition-colors cursor-pointer">
                <span className="font-medium text-sm">{isRTL ? "البحث عن مرشح" : "Rechercher un candidat"}</span>
                <span className="block text-xs text-muted-foreground mt-0.5">
                  {isRTL ? "البحث بالاسم أو رقم بطاقة التعريف" : "Recherche par nom ou CIN"}
                </span>
              </span>
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-xl border p-5 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">
            {isRTL ? "آخر النشاطات" : "Activités récentes"}
          </h2>
          <p className="text-sm text-muted-foreground text-center py-8">
            {isRTL ? "سيتم عرض آخر النشاطات هنا" : "Les activités récentes apparaîtront ici"}
          </p>
        </div>
      </div>
    </div>
  );
}
