"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

interface Job {
  id: string;
  code: string;
  titleFr: string;
  titleAr: string;
  descriptionFr: string;
  descriptionAr: string;
  location: string;
  jobType: string;
  openings: number;
  deadline: string;
  status: string;
  pdfUrl: string | null;
  imageUrl: string | null;
}

export default function JobsPage() {
  const [locale, setLocale] = useState("fr");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const segments = window.location.pathname.split("/");
    setLocale(segments[1] || "fr");
  }, []);

  useEffect(() => {
    fetch("/api/jobs?status=PUBLISHED")
      .then(res => {
        if (!res.ok) throw new Error("API error");
        return res.json();
      })
      .then(data => {
        setJobs(data);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, []);

  const isRTL = locale === "ar";

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(isRTL ? "ar-TN" : "fr-FR");
  };

  const isExpired = (dateStr: string) => {
    return new Date(dateStr) < new Date();
  };

  const getStatusBadge = (job: Job) => {
    const expired = isExpired(job.deadline);
    if (expired) {
      return {
        label: isRTL ? "منتهية" : "Terminée",
        color: "bg-red-100 text-red-700"
      };
    }
    return {
      label: isRTL ? "مفتوحة للتسجيل" : "Ouvert",
      color: "bg-green-100 text-green-700"
    };
  };

  const filteredJobs = jobs.filter(job =>
    job.titleFr.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.titleAr.includes(searchQuery) ||
    job.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-slate-50">
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            {isRTL ? "منصة المناظرات الخارجية" : "Platform des Concours"}
          </h1>
          <p className="text-slate-600 mb-8">
            {isRTL ? "اكتشف فرص الانتداب في مختلف المؤسسات والوهيئات" : "Découvrez les opportunités dans diverses institutions"}
          </p>

          <div className="flex justify-center mb-8">
            <div className="relative w-full max-w-md">
              <input
                type="text"
                placeholder={isRTL ? "ابحث عن مناظرة..." : "Rechercher une concurrence..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <span className="absolute right-3 top-3 text-slate-400">🔍</span>
            </div>
          </div>
        </div>

        {error ? (
          <div className="text-center py-12 text-slate-500">
            <p>{isRTL ? "تعذر تحميل المناظرات. حاول مرة أخرى لاحقاً." : "Impossible de charger les concours. Réessayez plus tard."}</p>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <p>{isRTL ? "لا توجد وظائف متاحة حالياً" : "Aucune offre disponible pour le moment"}</p>
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {filteredJobs.map((job) => {
              const statusBadge = getStatusBadge(job);
              return (
                <Card key={job.id} className="overflow-hidden hover:shadow-md transition-all">
                  <div className="h-48 bg-gradient-to-br from-slate-800 via-slate-700 to-slate-600 flex items-center justify-center rounded-t-3xl overflow-hidden relative">
                    {job.imageUrl ? (
                      <img src={job.imageUrl} alt={isRTL ? job.titleAr : job.titleFr} className="w-full h-full object-cover" />
                    ) : (
                      <>
                        <div className="absolute inset-0 opacity-20 bg-grid-pattern"></div>
                        <div className="text-slate-300 text-5xl">{'{ }'}</div>
                      </>
                    )}
                  </div>

                  <CardContent className="pt-6">
                    <h2 className="text-lg font-semibold text-center text-slate-900 mb-3">
                      {isRTL ? job.titleAr : job.titleFr}
                    </h2>

                    <div className="flex items-center justify-center gap-2 mb-3 text-sm text-slate-600">
                      <span>🏢 {job.location}</span>
                      <span className="text-slate-300">|</span>
                    </div>
                    <div className="text-center text-xs text-slate-500 mb-4">{job.code}</div>

                    <div className="flex items-center justify-center gap-2 text-sm text-slate-600 mb-4">
                      <span>📅</span>
                      <span>{isRTL ? "آخر موعد: " : "Date limite: "}{formatDate(job.deadline)}</span>
                    </div>

                    <div className="flex justify-center mb-4">
                      <span className={"text-xs font-medium px-3 py-1 rounded-full " + statusBadge.color}>
                        {statusBadge.label}
                      </span>
                    </div>

                    <Link
                      href={"/" + locale + "/concours/" + job.id}
                      className={"block w-full text-center py-2.5 rounded-lg text-sm font-semibold transition-all " + (isExpired(job.deadline) ? "bg-slate-200 text-slate-500 cursor-not-allowed" : "bg-blue-600 text-white hover:bg-blue-700")}
                    >
                      {isRTL ? "عرض التفاصيل" : "Voir Détails"}
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
