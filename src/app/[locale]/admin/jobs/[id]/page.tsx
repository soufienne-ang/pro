"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

interface JobDetail {
  id: string;
  code: string;
  titleFr: string;
  titleAr: string;
  descriptionFr: string;
  descriptionAr: string;
  location: string;
  jobType: string;
  profile: string;
  minEduLevel: string;
  openings: number;
  deadline: string;
  status: string;
  requiredDocs: string;
  exclusionConditions: string | null;
  pdfUrl: string | null;
  imageUrl: string | null;
}

interface Application {
  id: string;
  status: string;
  totalScore: number | null;
  candidate: { fullName: string; email: string; cin: string };
}

interface Exam {
  id: string;
  titleFr: string;
  titleAr: string;
  type: string;
  coefficient: number;
}

const STATUS_CFG: Record<string, { label: Record<string, string>; color: string }> = {
  DRAFT: { label: { ar: "مسودة", fr: "Brouillon" }, color: "bg-gray-100 text-gray-700" },
  PUBLISHED: { label: { ar: "منشورة", fr: "Publié" }, color: "bg-green-50 text-green-700" },
  CLOSED: { label: { ar: "مغلقة", fr: "Fermé" }, color: "bg-red-50 text-red-700" },
};

const APP_STATUS_CFG: Record<string, { label: Record<string, string>; color: string }> = {
  PENDING: { label: { ar: "قيد الانتظار", fr: "En attente" }, color: "bg-amber-50 text-amber-700" },
  UNDER_REVIEW: { label: { ar: "قيد المراجعة", fr: "En cours" }, color: "bg-blue-50 text-blue-700" },
  APPROVED: { label: { ar: "مقبول", fr: "Approuvé" }, color: "bg-green-50 text-green-700" },
  REJECTED: { label: { ar: "مرفوض", fr: "Rejeté" }, color: "bg-red-50 text-red-700" },
  ORAL_TEST: { label: { ar: "اختبار شفوي", fr: "Oral" }, color: "bg-purple-50 text-purple-700" },
  FINAL_LIST: { label: { ar: "قائمة نهائية", fr: "Liste finale" }, color: "bg-teal-50 text-teal-700" },
};

const TABS = [
  { key: "details", fr: "Détails", ar: "التفاصيل" },
  { key: "candidatures", fr: "Candidatures", ar: "الترشيحات" },
  { key: "epreuves", fr: "Épreuves", ar: "الاختبارات" },
  { key: "scoring", fr: "Scoring", ar: "التقييم" },
];

export default function JobDetailPage() {
  const [locale, setLocale] = useState("fr");
  const [job, setJob] = useState<JobDetail | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("details");
  const [appPage, setAppPage] = useState(1);
  const [appTotal, setAppTotal] = useState(0);

  useEffect(() => {
    const segments = window.location.pathname.split("/");
    setLocale(segments[1] || "fr");
  }, []);

  const params = useParams();
  const jobId = params.id as string;

  const isRTL = locale === "ar";

  useEffect(() => {
    if (!jobId) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/jobs/${jobId}`).then(r => r.ok ? r.json() : null),
      fetch(`/api/applications?jobId=${jobId}&page=${appPage}&limit=10`).then(r => r.ok ? r.json() : null),
      fetch(`/api/epreuves?jobId=${jobId}`).then(r => r.ok ? r.json() : null),
    ])
      .then(([jobData, appData, examData]) => {
        if (jobData) setJob(jobData);
        if (appData) { setApplications(appData.applications || []); setAppTotal(appData.pagination?.total || 0); }
        if (examData) setExams(Array.isArray(examData) ? examData : examData.exams || []);
      })
      .finally(() => setLoading(false));
  }, [jobId, appPage]);

  if (loading || !job) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const sc = STATUS_CFG[job.status] || STATUS_CFG.DRAFT;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/${locale}/admin/jobs`} className="text-muted-foreground hover:text-foreground transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{isRTL ? job.titleAr : job.titleFr}</h1>
          <p className="text-sm text-muted-foreground">{job.code} — {job.location}</p>
        </div>
        <span className={`px-3 py-1 text-xs font-medium rounded-full ${sc.color}`}>
          {isRTL ? sc.label.ar : sc.label.fr}
        </span>
        <Link href={`/${locale}/admin/jobs/${job.id}/edit`}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
          {isRTL ? "تعديل" : "Modifier"}
        </Link>
      </div>

      <div className="flex justify-center mb-8">
        <div className="inline-flex items-center gap-1 bg-slate-100 rounded-xl p-1" dir="ltr">
          {TABS.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`relative px-5 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                  active
                    ? "bg-white text-primary shadow-sm border border-slate-200 scale-105"
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/50"
                }`}
              >
                {isRTL ? tab.ar : tab.fr}
                {active && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-primary rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === "details" && (
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="bg-white rounded-xl border p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">{isRTL ? "معلومات المناظرة" : "Informations du concours"}</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-muted-foreground">{isRTL ? "الرمز" : "Code"}:</span> <span className="font-medium">{job.code}</span></div>
              <div><span className="text-muted-foreground">{isRTL ? "الموقع" : "Lieu"}:</span> <span className="font-medium">{job.location}</span></div>
              <div><span className="text-muted-foreground">{isRTL ? "النوع" : "Type"}:</span> <span className="font-medium">{job.jobType}</span></div>
              <div>
                <span className="text-muted-foreground">{isRTL ? "فئة المترشحين" : "Candidate track"}:</span>{" "}
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                  job.profile === "MANUAL" ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"
                }`}>
                  {job.profile === "MANUAL"
                    ? (isRTL ? "بدون شهادة دراسية" : "Manual (no diploma)")
                    : (isRTL ? "يتطلب شهادة دراسية" : "Academic (diploma required)")}
                </span>
              </div>
              {job.profile === "MANUAL" && (
                <div>
                  <span className="text-muted-foreground">{isRTL ? "المستوى الأدنى" : "Minimum level"}:</span>{" "}
                  <span className="font-medium">{job.minEduLevel}</span>
                </div>
              )}
              <div><span className="text-muted-foreground">{isRTL ? "عدد المناصب" : "Postes"}:</span> <span className="font-medium">{job.openings}</span></div>
              <div><span className="text-muted-foreground">{isRTL ? "آخر أجل" : "Date limite"}:</span> <span className="font-medium">{new Date(job.deadline).toLocaleDateString()}</span></div>
              <div><span className="text-muted-foreground">{isRTL ? "الحالة" : "Statut"}:</span> <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${sc.color}`}>{isRTL ? sc.label.ar : sc.label.fr}</span></div>
            </div>
          </div>

          <div className="bg-white rounded-xl border p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">{isRTL ? "الوصف" : "Description"}</h2>
            <div className="text-sm leading-relaxed whitespace-pre-line">{isRTL ? job.descriptionAr : job.descriptionFr}</div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {job.requiredDocs && (
              <div className="bg-white rounded-xl border p-6 shadow-sm">
                <h2 className="text-lg font-semibold mb-4">{isRTL ? "الوثائق المطلوبة" : "Documents requis"}</h2>
                <div className="text-sm leading-relaxed whitespace-pre-line">{isRTL ? job.requiredDocs : job.requiredDocs}</div>
              </div>
            )}
            {job.exclusionConditions && (
              <div className="bg-white rounded-xl border p-6 shadow-sm">
                <h2 className="text-lg font-semibold mb-4">{isRTL ? "شروط الاستبعاد" : "Conditions d'exclusion"}</h2>
                <div className="text-sm leading-relaxed whitespace-pre-line">{isRTL ? job.exclusionConditions : job.exclusionConditions}</div>
              </div>
            )}
          </div>

          {(job.pdfUrl || job.imageUrl) && (
            <div className="bg-white rounded-xl border p-6 shadow-sm">
              <h2 className="text-lg font-semibold mb-4">{isRTL ? "الملفات المرفقة" : "Fichiers joints"}</h2>
              <div className="flex gap-4">
                {job.pdfUrl && (
                  <a href={job.pdfUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-50 text-red-700 text-sm font-medium hover:bg-red-100 transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    PDF
                  </a>
                )}
                {job.imageUrl && (
                  <a href={job.imageUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-50 text-blue-700 text-sm font-medium hover:bg-blue-100 transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Image
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "candidatures" && (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          {applications.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              {isRTL ? "لا توجد ترشيحات بعد" : "Aucune candidature pour le moment"}
            </div>
          ) : (
            <>
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-slate-50 text-sm">
                    <th className="text-right p-3 font-medium">{isRTL ? "المترشح" : "Candidat"}</th>
                    <th className="text-right p-3 font-medium hidden md:table-cell">CIN</th>
                    <th className="text-center p-3 font-medium">{isRTL ? "الحالة" : "Statut"}</th>
                    <th className="text-center p-3 font-medium">{isRTL ? "النتيجة" : "Score"}</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.map((app) => {
                    const asc = APP_STATUS_CFG[app.status] || APP_STATUS_CFG.PENDING;
                    return (
                      <tr key={app.id} className="border-b last:border-0 hover:bg-slate-50 transition-colors">
                        <td className="p-3 text-sm font-medium">{app.candidate.fullName}</td>
                        <td className="p-3 text-sm font-mono hidden md:table-cell">{app.candidate.cin}</td>
                        <td className="p-3 text-center">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${asc.color}`}>
                            {isRTL ? asc.label.ar : asc.label.fr}
                          </span>
                        </td>
                        <td className="p-3 text-center text-sm">{app.totalScore != null ? app.totalScore : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {appTotal > 10 && (
                <div className="flex justify-between items-center p-4 border-t text-sm text-muted-foreground">
                  <span>{isRTL ? `صفحة ${appPage}` : `Page ${appPage}`}</span>
                  <div className="flex gap-2">
                    <button disabled={appPage <= 1} onClick={() => setAppPage(p => p - 1)}
                      className="px-3 py-1 border rounded hover:bg-slate-50 disabled:opacity-50">←</button>
                    <button disabled={appPage * 10 >= appTotal} onClick={() => setAppPage(p => p + 1)}
                      className="px-3 py-1 border rounded hover:bg-slate-50 disabled:opacity-50">→</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === "epreuves" && (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          {exams.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              {isRTL ? "لا توجد اختبارات بعد" : "Aucune épreuve pour le moment"}
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b bg-slate-50 text-sm">
                  <th className="text-right p-3 font-medium">{isRTL ? "العنوان" : "Titre"}</th>
                  <th className="text-center p-3 font-medium">{isRTL ? "النوع" : "Type"}</th>
                  <th className="text-center p-3 font-medium">{isRTL ? "المعامل" : "Coefficient"}</th>
                </tr>
              </thead>
              <tbody>
                {exams.map((exam) => (
                  <tr key={exam.id} className="border-b last:border-0 hover:bg-slate-50 transition-colors">
                    <td className="p-3 text-sm font-medium">{isRTL ? exam.titleAr : exam.titleFr}</td>
                    <td className="p-3 text-center text-sm">{exam.type}</td>
                    <td className="p-3 text-center text-sm">{exam.coefficient}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === "scoring" && (
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="bg-white rounded-xl border p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">{isRTL ? "التقييم" : "Scoring"}</h2>
            <p className="text-sm text-muted-foreground">
              {isRTL
                ? "إدارة معايير التقييم ونتائج المترشحين لهذه المناظرة."
                : "Gérez les critères d'évaluation et les résultats des candidats pour ce concours."}
            </p>
            <div className="mt-4 flex gap-3">
              <Link href={`/${locale}/admin/scoring/${job.id}`}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
                {isRTL ? "الذهاب إلى التقييم" : "Accéder au scoring"}
              </Link>
              <Link href={`/${locale}/admin/results?jobId=${job.id}`}
                className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
                {isRTL ? "عرض النتائج" : "Voir les résultats"}
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-xl border p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">{isRTL ? "إحصائيات سريعة" : "Aperçu statistique"}</h2>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-2xl font-bold">{applications.length}</p>
                <p className="text-xs text-muted-foreground">{isRTL ? "إجمالي الترشيحات" : "Total candidatures"}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-2xl font-bold">{applications.filter(a => a.status === "APPROVED").length}</p>
                <p className="text-xs text-muted-foreground">{isRTL ? "مقبول" : "Approuvées"}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-2xl font-bold">{exams.length}</p>
                <p className="text-xs text-muted-foreground">{isRTL ? "الاختبارات" : "Épreuves"}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}