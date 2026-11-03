"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface Job {
  id: string;
  code: string;
  titleFr: string;
  titleAr: string;
  location: string;
  jobType: string;
  openings: number;
  deadline: string;
  status: "DRAFT" | "PUBLISHED" | "CLOSED";
}

const STATUS_CFG = {
  DRAFT: { label: { ar: "مسودة", fr: "Brouillon" }, color: "bg-gray-100 text-gray-700" },
  PUBLISHED: { label: { ar: "منشورة", fr: "Publié" }, color: "bg-green-50 text-green-700" },
  CLOSED: { label: { ar: "مغلقة", fr: "Fermé" }, color: "bg-red-50 text-red-700" },
};

export default function AdminJobsPage() {
  const [locale, setLocale] = useState("fr");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");

  useEffect(() => {
    const segments = window.location.pathname.split("/");
    setLocale(segments[1] || "fr");
  }, []);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/jobs?status=${filter}`);
      if (res.ok) setJobs(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  const toggleStatus = async (job: Job) => {
    const nextStatus = job.status === "DRAFT" ? "PUBLISHED" : job.status === "PUBLISHED" ? "CLOSED" : "DRAFT";
    const res = await fetch(`/api/jobs/${job.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    if (res.ok) fetchJobs();
  };

  const deleteJob = async (id: string) => {
    const ok = confirm(isRTL ? "هل أنت متأكد من الحذف؟" : "Confirmer la suppression ?");
    if (!ok) return;
    const res = await fetch(`/api/jobs/${id}`, { method: "DELETE" });
    if (res.ok) fetchJobs();
  };

  const isRTL = locale === "ar";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{isRTL ? "المناظرات" : "Offres d'emploi"}</h1>
        <Link href={`/${locale}/admin/jobs/new`}>
          <span className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium cursor-pointer">
            + {isRTL ? "إضافة" : "Ajouter"}
          </span>
        </Link>
      </div>

      <div className="flex gap-2 mb-6">
        {["ALL", "PUBLISHED", "DRAFT", "CLOSED"].map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
              filter === s ? "bg-primary text-primary-foreground" : "bg-white border hover:bg-slate-50"
            }`}
          >
            {s === "ALL" ? (isRTL ? "الكل" : "Tous") : isRTL ? STATUS_CFG[s as keyof typeof STATUS_CFG].label.ar : STATUS_CFG[s as keyof typeof STATUS_CFG].label.fr}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : jobs.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center shadow-sm">
          <p className="text-muted-foreground mb-4">{isRTL ? "لا توجد مناظرات" : "Aucune offre"}</p>
          <Link href={`/${locale}/admin/jobs/new`}>
            <span className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium cursor-pointer">
              {isRTL ? "إضافة مناظرة" : "Ajouter une offre"}
            </span>
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-slate-50 text-sm">
                <th className="text-right p-3 font-medium">{isRTL ? "الرمز" : "Code"}</th>
                <th className="text-right p-3 font-medium">{isRTL ? "العنوان" : "Titre"}</th>
                <th className="text-right p-3 font-medium hidden md:table-cell">{isRTL ? "الموقع" : "Lieu"}</th>
                <th className="text-center p-3 font-medium hidden md:table-cell">{isRTL ? "الخطط" : "Postes"}</th>
                <th className="text-center p-3 font-medium">{isRTL ? "الحالة" : "Statut"}</th>
                <th className="text-center p-3 font-medium">{isRTL ? "إجراءات" : "Actions"}</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => {
                const sc = STATUS_CFG[job.status];
                return (
                  <tr key={job.id} className="border-b last:border-0 hover:bg-slate-50 transition-colors">
                    <td className="p-3 text-sm font-mono">{job.code}</td>
                    <td className="p-3 text-sm font-medium">
                      <div>{isRTL ? job.titleAr : job.titleFr}</div>
                      <div className="text-xs text-muted-foreground">{isRTL ? job.titleFr : job.titleAr}</div>
                    </td>
                    <td className="p-3 text-sm text-muted-foreground hidden md:table-cell">{job.location}</td>
                    <td className="p-3 text-sm text-center hidden md:table-cell">{job.openings}</td>
                    <td className="p-3 text-center">
                      <button onClick={() => toggleStatus(job)}
                        className={`px-2.5 py-1 text-xs font-medium rounded-full ${sc.color} hover:opacity-80 transition-opacity cursor-pointer`}
                        title={isRTL ? "تغيير الحالة" : "Changer le statut"}
                      >
                        {isRTL ? sc.label.ar : sc.label.fr}
                      </button>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/${locale}/admin/jobs/${job.id}`}>
                          <span className="text-xs text-primary hover:underline cursor-pointer">
                            {isRTL ? "عرض" : "Voir"}
                          </span>
                        </Link>
                        <Link href={`/${locale}/admin/jobs/${job.id}/edit`}>
                          <span className="text-xs text-primary hover:underline cursor-pointer">
                            {isRTL ? "تعديل" : "Modifier"}
                          </span>
                        </Link>
                        <button onClick={() => deleteJob(job.id)}
                          className="text-xs text-destructive hover:underline cursor-pointer">
                          {isRTL ? "حذف" : "Supprimer"}
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
    </div>
  );
}
