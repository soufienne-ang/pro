"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Job {
  id: string;
  code: string;
  titleFr: string;
  titleAr: string;
  status: string;
  openings: number;
}

interface AppCount {
  total: number;
  scored: number;
}

interface RankedCandidateSummary {
  weightedScore: number;
}

export default function AdminScoringPage() {
  const [locale, setLocale] = useState("fr");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [appCounts, setAppCounts] = useState<Record<string, AppCount>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const segments = window.location.pathname.split("/");
    setLocale(segments[1] || "fr");
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/jobs?status=ALL");
        if (!res.ok) return;
        const allJobs: Job[] = await res.json();
        setJobs(allJobs);

        const counts: Record<string, AppCount> = {};
        await Promise.all(
          allJobs.map(async (job) => {
            const appsRes = await fetch(`/api/applications?jobId=${job.id}&limit=1`);
            if (appsRes.ok) {
              const appsData = await appsRes.json();
              const scoredRes = await fetch(`/api/scoring/ranking?jobId=${job.id}`);
              let scored = 0;
              if (scoredRes.ok) {
                const scoredData = await scoredRes.json();
                scored = scoredData.rankedCandidates?.filter((c: RankedCandidateSummary) => c.weightedScore > 0).length || 0;
              }
              counts[job.id] = {
                total: appsData.pagination?.total || 0,
                scored,
              };
            }
          })
        );
        setAppCounts(counts);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const isRTL = locale === "ar";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">
          {isRTL ? "التقييم والترتيب" : "Scoring & Résultats"}
        </h1>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : jobs.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center shadow-sm">
          <p className="text-muted-foreground">
            {isRTL ? "لا توجد وظائف للمنافسة" : "Aucune offre à évaluer"}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-slate-50 text-sm">
                <th className="text-left p-3 font-medium">{isRTL ? "الرمز" : "Code"}</th>
                <th className="text-left p-3 font-medium">{isRTL ? "العنوان" : "Titre"}</th>
                <th className="text-center p-3 font-medium">{isRTL ? "المناصب" : "Postes"}</th>
                <th className="text-center p-3 font-medium">{isRTL ? "الطلبات" : "Candidatures"}</th>
                <th className="text-center p-3 font-medium">{isRTL ? "مُقيّم" : "Notés"}</th>
                <th className="text-right p-3 font-medium">{isRTL ? "إجراءات" : "Actions"}</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => {
                const count = appCounts[job.id] || { total: 0, scored: 0 };
                return (
                  <tr key={job.id} className="border-b last:border-0 hover:bg-slate-50 transition-colors">
                    <td className="p-3 text-sm font-mono">{job.code}</td>
                    <td className="p-3 text-sm font-medium">
                      {isRTL ? job.titleAr : job.titleFr}
                    </td>
                    <td className="p-3 text-sm text-center">{job.openings}</td>
                    <td className="p-3 text-sm text-center">{count.total}</td>
                    <td className="p-3 text-sm text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        count.scored > 0 ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
                      }`}>
                        {count.scored}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <Link href={`/${locale}/admin/scoring/${job.id}`}>
                        <span className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors cursor-pointer">
                          {isRTL ? "تقييم" : "Évaluer"}
                        </span>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
