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

interface ApplicationScore {
  id: string;
  candidate: { fullName: string; email: string; cin: string };
  job: { code: string; titleFr: string; titleAr: string };
  status: string;
  applicationScore: number;
}

export default function AdminScoringPage() {
  const [locale, setLocale] = useState("fr");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [appCounts, setAppCounts] = useState<Record<string, AppCount>>({});
  const [loading, setLoading] = useState(true);
  const [scores, setScores] = useState<ApplicationScore[]>([]);
  const [scoresLoading, setScoresLoading] = useState(true);

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

    fetch("/api/admin/dashboard/scores")
      .then(r => r.ok ? r.json() : [])
      .then(data => setScores(data || []))
      .catch(() => {})
      .finally(() => setScoresLoading(false));
  }, []);

  const isRTL = locale === "ar";
  const topScores = scores.filter(s => s.applicationScore > 0).slice(0, 10);

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
            {isRTL ? "لا توجد خطط للمنافسة" : "Aucune offre à évaluer"}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-slate-50 text-sm">
                <th className="text-right p-3 font-medium">{isRTL ? "الرمز" : "Code"}</th>
                <th className="text-right p-3 font-medium">{isRTL ? "العنوان" : "Titre"}</th>
                <th className="text-center p-3 font-medium">{isRTL ? "الخطط" : "Postes"}</th>
                <th className="text-center p-3 font-medium">{isRTL ? "الطلبات" : "Candidatures"}</th>
                <th className="text-center p-3 font-medium">{isRTL ? "مُقيّم" : "Notés"}</th>
                <th className="text-center p-3 font-medium">{isRTL ? "إجراءات" : "Actions"}</th>
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
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/${locale}/admin/scoring/${job.id}`}>
                          <span className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors cursor-pointer">
                            {isRTL ? "تقييم" : "Évaluer"}
                          </span>
                        </Link>
                        <button onClick={async () => {
                          if (!window.confirm(isRTL ? "هل أنت متأكد من حذف بيانات التقييم لهذه المناظرة؟" : "Confirmer la suppression des données de scoring ?")) return;
                          const res = await fetch(`/api/scoring/job/${job.id}`, { method: "DELETE" });
                          if (res.ok) {
                            setAppCounts(prev => ({ ...prev, [job.id]: { total: prev[job.id]?.total || 0, scored: 0 } }));
                          } else alert(isRTL ? "فشل الحذف" : "Échec de la suppression");
                        }} className="px-2 py-1.5 border border-red-200 text-red-600 rounded-lg text-xs font-medium hover:bg-red-50 transition-colors">
                          {isRTL ? "حذف" : "Suppr."}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Scores Dossier */}
      <div className="bg-white rounded-xl border p-5 shadow-sm mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            {isRTL ? "نتائج الملفات (Score Dossier)" : "Scores Dossier"}
          </h2>
          <span className="text-xs text-muted-foreground">
            {isRTL ? "أفضل 10 مترشحين" : "Top 10 candidats"}
          </span>
        </div>
        <div className="text-xs text-muted-foreground mb-4 p-3 bg-slate-50 rounded-lg">
          {isRTL
            ? "يتم احتساب النتيجة تلقائياً حسب الصيغة: عدد النقاط المسندة للملف = (معدل أعداد شهادة الباكالوريا * 0.5) + (معدل الثلاث سنوات الجامعية الأخيرة التي أجتيزت بنجاح للحصول على الشهادة العلمية المطلوبة باعتبار سنة التخرج x 0.5)"
            : "Calcul automatique : Score dossier = (Moyenne Bac * 0.5) + ((Moyenne 1ère + Moyenne 2ème + Moyenne 3ème) / 3 x 0.5)"}
        </div>
        {scoresLoading ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            {isRTL ? "جاري التحميل..." : "Chargement..."}
          </p>
        ) : topScores.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            {isRTL ? "لا توجد نتائج حالياً" : "Aucun résultat pour le moment"}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="text-right p-3 font-medium">#</th>
                  <th className="text-right p-3 font-medium">{isRTL ? "المترشح" : "Candidat"}</th>
                  <th className="text-right p-3 font-medium hidden md:table-cell">{isRTL ? "رقم بطاقة التعريف" : "CIN"}</th>
                  <th className="text-right p-3 font-medium hidden lg:table-cell">{isRTL ? "المناظرة" : "Offre"}</th>
                  <th className="text-center p-3 font-medium">{isRTL ? "الحالة" : "Statut"}</th>
                  <th className="text-center p-3 font-medium">{isRTL ? "النتيجة" : "Score"}</th>
                </tr>
              </thead>
              <tbody>
                {topScores.map((s, idx) => (
                  <tr key={s.id} className="border-b last:border-0 hover:bg-slate-50 transition-colors">
                    <td className="p-3 text-center font-bold text-muted-foreground">{idx + 1}</td>
                    <td className="p-3">
                      <div className="font-medium">{s.candidate.fullName}</div>
                      <div className="text-xs text-muted-foreground">{s.candidate.email}</div>
                    </td>
                    <td className="p-3 text-xs font-mono hidden md:table-cell">{s.candidate.cin}</td>
                    <td className="p-3 text-xs hidden lg:table-cell">{isRTL ? s.job.titleAr : s.job.titleFr}</td>
                    <td className="p-3 text-center">
                      <span className={`text-xs font-medium rounded-full px-2 py-0.5 ${
                        s.status === "APPROVED" ? "bg-green-50 text-green-700" :
                        s.status === "REJECTED" ? "bg-red-50 text-red-700" :
                        s.status === "ORAL_TEST" ? "bg-purple-50 text-purple-700" :
                        s.status === "FINAL_LIST" ? "bg-teal-50 text-teal-700" :
                        "bg-amber-50 text-amber-700"
                      }`}>{s.status}</span>
                    </td>
                    <td className="p-3 text-center font-bold text-blue-600 text-lg">{s.applicationScore}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {scores.length > 10 && (
          <p className="text-xs text-muted-foreground text-center mt-4">
            {isRTL ? `و ${scores.length - 10} آخرون` : `Et ${scores.length - 10} autres`}
          </p>
        )}
      </div>
    </div>
  );
}
