"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

interface JobDetail {
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
  requiredDocs: string;
  exclusionConditions: string;
  pdfUrl: string | null;
  imageUrl: string | null;
}

type Tab = "description" | "documents" | "exclusion" | "inscription";

export default function ConcoursDetailPage() {
  const params = useParams();
  const locale = (params.locale as string) || "fr";
  const jobId = params.id as string;
  const isRTL = locale === "ar";

  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("description");

  useEffect(() => {
    fetch("/api/jobs/" + jobId)
      .then((res) => {
        if (!res.ok) throw new Error("API error");
        return res.json();
      })
      .then((data) => {
        setJob(data);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [jobId]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(isRTL ? "ar-TN" : "fr-FR");
  };

  const isExpired = (dateStr: string) => {
    return new Date(dateStr) < new Date();
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-slate-50 min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-slate-50 min-h-screen gap-4">
        <p className="text-slate-500">
          {isRTL ? "تعذر تحميل تفاصيل المناظرة" : "Impossible de charger les détails du concours"}
        </p>
        <Link href={"/" + locale + "/jobs"} className="text-blue-600 hover:underline text-sm">
          {isRTL ? "العودة إلى القائمة" : "Retour à la liste"}
        </Link>
      </div>
    );
  }

  const expired = isExpired(job.deadline);

  const tabs: { key: Tab; label: string; labelAr: string }[] = [
     { key: "inscription", label: "Inscription", labelAr: "التسجيل" },
      { key: "exclusion", label: "Conditions d'exclusion", labelAr: "شروط الإقصاء" },
      { key: "documents", label: "Documents obligatoires", labelAr: "الوثائق المطلوبة" },
    { key: "description", label: "Description", labelAr: "الوصف" },
   
  ];

  return (
    <div className="flex-1 bg-slate-50 min-h-screen" dir={isRTL ? "rtl" : "ltr"}>
      <div className="container mx-auto px-4 py-8">
        <Link
          href={"/" + locale + "/jobs"}
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-6"
        >
          <svg className={"w-4 h-4 " + (isRTL ? "rotate-180" : "")} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {isRTL ? "العودة إلى القائمة" : "Retour à la liste"}
        </Link>

        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="h-56 bg-gradient-to-br from-slate-800 via-slate-700 to-slate-600 flex items-center justify-center relative">
            {job.imageUrl ? (
              <img src={job.imageUrl} alt={isRTL ? job.titleAr : job.titleFr} className="w-full h-full object-cover" />
            ) : (
              <div className="text-slate-300 text-6xl tracking-widest font-light">{job.code}</div>
            )}
          </div>

          <div className="p-8">
            <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 mb-1">
                  {isRTL ? job.titleAr : job.titleFr}
                </h1>
                <p className="text-sm text-slate-500">{job.code}</p>
              </div>
              <span
                className={
                  "text-xs font-medium px-3 py-1 rounded-full " +
                  (expired ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700")
                }
              >
                {expired
                  ? isRTL ? "منتهية" : "Terminée"
                  : isRTL ? "مفتوحة للتسجيل" : "Ouvert"}
              </span>
            </div>

            <div className="flex flex-wrap gap-6 text-sm text-slate-600 mb-8 pb-6 border-b">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">📍</span>
                <span>{job.location}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-400">💼</span>
                <span>{job.jobType}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-400">👥</span>
                <span>
                  {job.openings}{" "}
                  {isRTL ? "خطة" : "poste(s)"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-400">📅</span>
                <span>
                  {isRTL ? "آخر موعد: " : "Date limite: "}{formatDate(job.deadline)}
                </span>
              </div>
            </div>

            <div className="flex justify-center mb-8">
              <div className="inline-flex items-center gap-1 bg-slate-100 rounded-xl p-1" dir="ltr">
                {tabs.map((tab) => {
                  const active = activeTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={
                        "relative px-5 py-2.5 text-lg font-medium rounded-lg transition-all duration-200 " +
                        (active
                          ? "bg-white text-primary shadow-sm border border-slate-200 scale-105"
                          : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 hover:scale-105")
                      }
                    >
                      {isRTL ? tab.labelAr : tab.label}
                      {active && (
                        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-primary rounded-full" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {activeTab === "description" && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 mb-3">
                    {isRTL ? "وصف المناظرة" : "Description du concours"}
                  </h2>
                  <div className="text-slate-700 leading-relaxed whitespace-pre-line">
                    {isRTL ? job.descriptionAr : job.descriptionFr}
                  </div>
                </div>

                <div>
                  <h2 className="text-lg font-semibold text-slate-900 mb-3">
                    {isRTL ? "الوثائق المطلوبة" : "Documents requis"}
                  </h2>
                  <div className="text-slate-700 leading-relaxed whitespace-pre-line">
                    {job.requiredDocs}
                  </div>
                </div>

                {job.pdfUrl && (
                  <div>
                    <a
                      href={job.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      {isRTL ? "تحميل الملف" : "Télécharger le PDF"}
                    </a>
                  </div>
                )}
              </div>
            )}

            {activeTab === "documents" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 mb-3">
                    {isRTL ? "الوثائق المطلوبة المكونة لملف الترشح" : "Documents obligatoires constituant le dossier de candidature"}
                  </h2>
                  {job.requiredDocs ? (
                    <ul className="text-slate-700 leading-relaxed space-y-2">
                      {job.requiredDocs.split("\n").filter(Boolean).map((doc, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <span className="text-blue-500 mt-1 flex-shrink-0">📄</span>
                          <span>{doc}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-slate-500 italic">
                      {isRTL ? "لم يتم تحديد أي وثائق مطلوبة" : "Aucun document requis spécifié"}
                    </p>
                  )}
                </div>

                {job.pdfUrl && (
                  <div className="p-5 bg-blue-50 rounded-lg border border-blue-100">
                    <p className="text-sm text-slate-700 mb-3">
                      {isRTL ? "يمكنك تحميل ملف PDF للاطلاع على جميع التفاصيل:" : "Vous pouvez télécharger le fichier PDF pour tous les détails :"}
                    </p>
                    <a
                      href={job.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      {isRTL ? "تحميل الملف" : "Télécharger le PDF"}
                    </a>
                  </div>
                )}
              </div>
            )}

            {activeTab === "exclusion" && (
              <div>
                <h2 className="text-lg font-semibold text-slate-900 mb-3">
                  {isRTL ? "شروط الإقصاء" : "Conditions d'exclusion"}
                </h2>
                {job.exclusionConditions ? (
                  <div className="text-slate-700 leading-relaxed whitespace-pre-line">
                    {job.exclusionConditions}
                  </div>
                ) : (
                  <div className="p-8 text-center bg-amber-50 rounded-lg border border-amber-200">
                    <p className="text-amber-700 font-medium">
                      {isRTL ? "لم يتم تحديد شروط الإقصاء لهذه المناظرة" : "Aucune condition d'exclusion spécifiée pour ce concours"}
                    </p>
                    <p className="text-amber-600 text-sm mt-2">
                      {isRTL ? "يرجى مراجعة الوثائق الرسمية للمناظرة لمزيد من المعلومات" : "Veuillez consulter les documents officiels du concours pour plus d'informations"}
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "inscription" && (
              <div className="space-y-6">
                <div className="p-6 bg-blue-50 rounded-lg border border-blue-100">
                  <h2 className="text-lg font-semibold text-slate-900 mb-2">
                    {isRTL ? "التقديم على المناظرة" : "Postuler à ce concours"}
                  </h2>
                  <p className="text-slate-600 text-sm mb-6">
                    {isRTL
                      ? "املأ استمارة التقديم الإلكترونية لإرسال طلبك. تأكد من تجهيز جميع الوثائق المطلوبة."
                      : "Remplissez le formulaire de candidature en ligne pour soumettre votre demande. Assurez-vous d'avoir préparé tous les documents requis."}
                  </p>

                  {job.requiredDocs && (
                    <div className="mb-6">
                      <h3 className="text-sm font-semibold text-slate-800 mb-2">
                        {isRTL ? "الوثائق المطلوبة:" : "Documents requis :"}
                      </h3>
                      <ul className="text-sm text-slate-600 space-y-1">
                        {job.requiredDocs.split("\n").filter(Boolean).map((doc, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-blue-500 mt-0.5">•</span>
                            <span>{doc}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex flex-col gap-3">
                    {expired ? (
                      <div className="px-4 py-3 bg-red-50 text-red-700 rounded-lg text-sm font-medium text-center border border-red-200">
                        {isRTL ? "انتهت مهلة التقديم لهذه المناظرة" : "La date limite de candidature est dépassée"}
                      </div>
                    ) : (
                      <Link
                        href={"/" + locale + "/apply?jobId=" + job.id}
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        {isRTL ? "تقديم طلب الترشح" : "Soumettre ma candidature"}
                      </Link>
                    )}

                    <Link
                      href={"/" + locale + "/jobs"}
                      className="text-sm text-blue-600 hover:underline text-center"
                    >
                      {isRTL ? "العودة إلى قائمة المناظرات" : "Retour à la liste des concours"}
                    </Link>
                  </div>
                </div>

                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-sm font-semibold text-slate-800 mb-2">
                      {isRTL ? "معلومات إضافية" : "Informations complémentaires"}
                    </h3>
                    <div className="grid grid-cols-2 gap-4 text-sm text-slate-600">
                      <div>
                        <span className="text-slate-400">{isRTL ? "الرمز" : "Code"} :</span> {job.code}
                      </div>
                      <div>
                        <span className="text-slate-400">{isRTL ? "الموقع" : "Lieu"} :</span> {job.location}
                      </div>
                      <div>
                        <span className="text-slate-400">{isRTL ? "نوع المناظرة" : "Type"} :</span> {job.jobType}
                      </div>
                      <div>
                        <span className="text-slate-400">{isRTL ? "عدد الخطط" : "Postes"} :</span> {job.openings}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
