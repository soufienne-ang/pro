"use client";

import { useState, useEffect, useCallback } from "react";

interface Job { id: string; code: string; titleFr: string; titleAr: string; }

interface RankingRow {
  applicationId: string;
  candidate: { fullName: string; email: string; cin: string; governorate: string };
  status: string;
  weightedScore: number;
  rank: number;
}

const STATUS_CFG: Record<string, { label: Record<string, string>; color: string }> = {
  PENDING: { label: { ar: "قيد الانتظار", fr: "En attente" }, color: "bg-amber-50 text-amber-700" },
  UNDER_REVIEW: { label: { ar: "قيد المراجعة", fr: "En cours" }, color: "bg-blue-50 text-blue-700" },
  APPROVED: { label: { ar: "مقبول", fr: "Approuvé" }, color: "bg-green-50 text-green-700" },
  REJECTED: { label: { ar: "مرفوض", fr: "Rejeté" }, color: "bg-red-50 text-red-700" },
  ORAL_TEST: { label: { ar: "اختبار شفوي", fr: "Oral" }, color: "bg-purple-50 text-purple-700" },
  FINAL_LIST: { label: { ar: "قائمة نهائية", fr: "Liste finale" }, color: "bg-teal-50 text-teal-700" },
};

export default function AdminResultsPage() {
  const [locale, setLocale] = useState("fr");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobId, setJobId] = useState("");
  const [rows, setRows] = useState<RankingRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState<"xlsx" | "pdf" | null>(null);

  useEffect(() => {
    const segments = window.location.pathname.split("/");
    setLocale(segments[1] || "fr");
  }, []);

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch("/api/jobs?status=ALL");
      if (res.ok) setJobs(await res.json());
    } catch (e) { console.error(e); }
  }, []);

  const fetchRanking = useCallback(async () => {
    if (!jobId) { setRows([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/scoring/ranking?jobId=${jobId}`);
      if (res.ok) {
        const d = await res.json();
        setRows(d.rankedCandidates || []);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [jobId]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);
  useEffect(() => { fetchRanking(); }, [fetchRanking]);

  const exportFile = async (format: "xlsx" | "pdf") => {
    if (!jobId) return;
    setExporting(format);
    try {
      const res = await fetch(`/api/scoring/export-${format}?jobId=${jobId}`);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `resultats-${jobId}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert(isRTL ? "خطأ في التصدير" : "Erreur lors de l'export");
    } finally {
      setExporting(null);
    }
  };

  const isRTL = locale === "ar";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{isRTL ? "إدارة النتائج" : "Gestion des résultats"}</h1>
        {jobId && rows.length > 0 && (
          <div className="flex gap-2">
            <button onClick={() => exportFile("xlsx")} disabled={exporting !== null}
              className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 cursor-pointer">
              {exporting === "xlsx" ? "..." : `XLSX`}
            </button>
            <button onClick={() => exportFile("pdf")} disabled={exporting !== null}
              className="px-3 py-1.5 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-700 disabled:opacity-50 cursor-pointer">
              {exporting === "pdf" ? "..." : `PDF`}
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border p-4 shadow-sm mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm text-muted-foreground">{isRTL ? "المنشور" : "Concours"}:</label>
          <select value={jobId} onChange={(e) => setJobId(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm min-w-[280px]">
            <option value="">{isRTL ? "اختر منشورًا" : "Sélectionner un concours"}</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.code} — {isRTL ? j.titleAr : j.titleFr}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!jobId ? (
        <div className="bg-white rounded-xl border p-12 text-center shadow-sm">
          <p className="text-muted-foreground">
            {isRTL ? "اختر منشورًا لعرض النتائج" : "Sélectionnez un concours pour voir les résultats"}
          </p>
        </div>
      ) : loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center shadow-sm">
          <p className="text-muted-foreground">
            {isRTL ? "لا توجد نتائج بعد" : "Aucun résultat disponible"}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-slate-50 text-sm">
                <th className="text-center p-3 font-medium w-16">#</th>
                <th className="text-left p-3 font-medium">{isRTL ? "المرشح" : "Candidat"}</th>
                <th className="text-left p-3 font-medium hidden md:table-cell">CIN</th>
                <th className="text-left p-3 font-medium hidden lg:table-cell">{isRTL ? "الولاية" : "Gouvernorat"}</th>
                <th className="text-center p-3 font-medium">{isRTL ? "النتيجة" : "Score"}</th>
                <th className="text-center p-3 font-medium">{isRTL ? "الحالة" : "Statut"}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const sc = STATUS_CFG[r.status] || { label: { ar: r.status, fr: r.status }, color: "bg-slate-100 text-slate-700" };
                return (
                  <tr key={r.applicationId} className="border-b last:border-0 hover:bg-slate-50 transition-colors">
                    <td className="p-3 text-center">
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                        r.rank === 1 ? "bg-yellow-100 text-yellow-800" :
                        r.rank === 2 ? "bg-slate-200 text-slate-700" :
                        r.rank === 3 ? "bg-orange-100 text-orange-700" :
                        "bg-slate-50 text-slate-600"
                      }`}>{r.rank}</span>
                    </td>
                    <td className="p-3">
                      <div className="text-sm font-medium">{r.candidate.fullName}</div>
                      <div className="text-xs text-muted-foreground">{r.candidate.email}</div>
                    </td>
                    <td className="p-3 text-sm font-mono hidden md:table-cell">{r.candidate.cin}</td>
                    <td className="p-3 text-sm hidden lg:table-cell">{r.candidate.governorate}</td>
                    <td className="p-3 text-center">
                      <span className="text-sm font-bold text-primary">{r.weightedScore.toFixed(2)}</span>
                    </td>
                    <td className="p-3 text-center">
                      <span className={`text-xs font-medium rounded-full px-2.5 py-1 ${sc.color}`}>
                        {isRTL ? sc.label.ar : sc.label.fr}
                      </span>
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
